/*
 * GAON 비트 퍼펙트 재생기입니다. Electron 메인 프로세스가 실행하며, 표준 입력으로 명령을 받고
 * 표준 출력으로 JSON 이벤트를 한 줄씩 보냅니다.
 *
 *   load <경로> | play | pause | seek <초> | stop | quit
 *
 * 운영체제 믹서를 거치지 않도록 macOS는 hog 모드와 장치 샘플레이트 변경 후 HAL에 직접 쓰고, Windows는
 * 곡의 형식으로 WASAPI 독점 모드를 엽니다. 조건이 맞지 않으면 재생은 하되 bitPerfect=false와 이유를 알립니다.
 *
 *   --verify <파일> <출력> <형식>  실제 콜백으로 장치에 쓸 버퍼를 만들어 PCM으로 되돌려 저장합니다.
 *   --backend null                 소리 장치가 없는 환경에서 시험합니다.
 */
#ifdef _WIN32
#define COBJMACROS
#include <windows.h>
#include <objbase.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <avrt.h>
#include <mmreg.h>
#ifndef E_NOTFOUND
#define E_NOTFOUND HRESULT_FROM_WIN32(ERROR_NOT_FOUND)
#endif
#endif

#define MA_NO_ENCODING
#define MA_NO_GENERATION
#define MA_NO_MP3
#define MA_NO_WAV
#define MA_NO_VORBIS
#define MINIAUDIO_IMPLEMENTATION
#include "../vendor/miniaudio.h"

#include <signal.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <windows.h>
typedef HANDLE thread_t;
static void thread_start(thread_t *t, DWORD(WINAPI *fn)(LPVOID)) { *t = CreateThread(NULL, 0, fn, NULL, 0, NULL); }
#define THREAD_FN(name) static DWORD WINAPI name(LPVOID unused)
#define THREAD_RET return 0
static void sleep_ms(unsigned ms) { Sleep(ms); }
#else
#include <pthread.h>
#include <unistd.h>
typedef pthread_t thread_t;
static void thread_start(thread_t *t, void *(*fn)(void *)) { pthread_create(t, NULL, fn, NULL); }
#define THREAD_FN(name) static void *name(void *unused)
#define THREAD_RET return NULL
static void sleep_ms(unsigned ms) { usleep(ms * 1000); }
#endif

#ifdef __APPLE__
#include <CoreAudio/CoreAudio.h>
#endif

#define RING_SECONDS 2
#define CHUNK_FRAMES 4096

static ma_context g_context;
static ma_bool32 g_nullBackend = MA_FALSE;
static ma_mutex g_outputLock; /* 표준 출력 */
static ma_mutex g_stateLock;  /* 디코더와 장치 상태 */

static ma_device g_device;
static ma_bool32 g_deviceOpen = MA_FALSE;
static ma_dr_flac *g_flac = NULL;
static ma_pcm_rb g_ring;
static ma_bool32 g_ringReady = MA_FALSE;

static volatile ma_bool32 g_playing = MA_FALSE;
static volatile ma_bool32 g_decodedAll = MA_FALSE;
static volatile ma_bool32 g_endedPending = MA_FALSE;
static volatile ma_bool32 g_quit = MA_FALSE;
static volatile ma_uint64 g_framesPlayed = 0;
static volatile ma_uint64 g_underruns = 0;
static ma_uint64 g_baseFrame = 0;

/* ---------- 출력 ---------- */

static void emit(const char *fmt, ...) {
    va_list args;
    ma_mutex_lock(&g_outputLock);
    va_start(args, fmt);
    vprintf(fmt, args);
    va_end(args);
    putchar('\n');
    fflush(stdout);
    ma_mutex_unlock(&g_outputLock);
}

static void emit_error(const char *message) { emit("{\"event\":\"error\",\"message\":\"%s\"}", message); }

/* ---------- 샘플 변환 ---------- */

/* dr_flac은 샘플을 s32의 위쪽 비트에 맞춰 줍니다. 24비트 이하 값은 float32 가수에 그대로 들어가 손실이 없습니다. */
static void write_samples(const ma_int32 *in, void *out, ma_uint64 samples, ma_format format) {
    ma_uint64 i;
    switch (format) {
    case ma_format_s32:
        memcpy(out, in, (size_t)samples * 4);
        break;
    case ma_format_s24: {
        ma_uint8 *b = (ma_uint8 *)out;
        for (i = 0; i < samples; i += 1) {
            ma_uint32 v = (ma_uint32)in[i];
            b[i * 3 + 0] = (ma_uint8)(v >> 8);
            b[i * 3 + 1] = (ma_uint8)(v >> 16);
            b[i * 3 + 2] = (ma_uint8)(v >> 24);
        }
        break;
    }
    case ma_format_s16: {
        ma_int16 *s = (ma_int16 *)out;
        for (i = 0; i < samples; i += 1) s[i] = (ma_int16)(in[i] >> 16);
        break;
    }
    case ma_format_f32: {
        float *f = (float *)out;
        for (i = 0; i < samples; i += 1) f[i] = (float)((double)in[i] / 2147483648.0);
        break;
    }
    default:
        memset(out, 0, (size_t)samples * ma_get_bytes_per_sample(format));
    }
}

/* 이 비트 수를 해당 형식에 넣어도 값이 그대로인지 봅니다. */
static ma_bool32 format_holds(ma_format format, ma_uint32 bits) {
    switch (format) {
    case ma_format_s32: return MA_TRUE;
    case ma_format_f32: return bits <= 24;
    case ma_format_s24: return bits <= 24;
    case ma_format_s16: return bits <= 16;
    default: return MA_FALSE;
    }
}

static const char *format_name(ma_format format) {
    switch (format) {
    case ma_format_s32: return "s32";
    case ma_format_f32: return "f32";
    case ma_format_s24: return "s24";
    case ma_format_s16: return "s16";
    case ma_format_u8: return "u8";
    default: return "unknown";
    }
}

/* ---------- 장치 콜백 ---------- */

static void fill_output(void *output, ma_uint32 frameCount, ma_uint32 channels, ma_format format) {
    ma_uint32 bytesPerFrame = ma_get_bytes_per_frame(format, channels);
    ma_uint8 *cursor = (ma_uint8 *)output;
    ma_uint32 remaining = frameCount;

    while (remaining > 0 && g_ringReady) {
        ma_uint32 available = remaining;
        void *read = NULL;
        if (ma_pcm_rb_acquire_read(&g_ring, &available, &read) != MA_SUCCESS || available == 0) break;
        write_samples((const ma_int32 *)read, cursor, (ma_uint64)available * channels, format);
        ma_pcm_rb_commit_read(&g_ring, available);
        cursor += available * bytesPerFrame;
        remaining -= available;
        g_framesPlayed += available;
    }
    if (remaining > 0) {
        memset(cursor, 0, remaining * bytesPerFrame);
        if (g_decodedAll) g_endedPending = MA_TRUE;
        else if (g_playing) g_underruns += 1;
    }
}

static void data_callback(ma_device *device, void *output, const void *input, ma_uint32 frameCount) {
    (void)input;
    fill_output(output, frameCount, device->playback.channels, device->playback.format);
}

#ifdef _WIN32
#include "wasapi.inc.h"
#endif

/* ---------- 장치 준비 (macOS) ---------- */

#ifdef __APPLE__
static AudioObjectID g_macDevice = kAudioObjectUnknown;
static Float64 g_macOriginalRate = 0;
static ma_bool32 g_macHogged = MA_FALSE;

static AudioObjectPropertyAddress mac_addr(AudioObjectPropertySelector selector) {
    AudioObjectPropertyAddress a = {selector, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain};
    return a;
}

static ma_bool32 mac_rate_available(AudioObjectID device, Float64 rate) {
    AudioObjectPropertyAddress a = mac_addr(kAudioDevicePropertyAvailableNominalSampleRates);
    AudioValueRange ranges[64];
    UInt32 size = sizeof(ranges);
    UInt32 i;
    if (AudioObjectGetPropertyData(device, &a, 0, NULL, &size, ranges) != noErr) return MA_FALSE;
    for (i = 0; i < size / sizeof(AudioValueRange); i += 1) {
        if (rate >= ranges[i].mMinimum && rate <= ranges[i].mMaximum) return MA_TRUE;
    }
    return MA_FALSE;
}

static Float64 mac_current_rate(AudioObjectID device) {
    AudioObjectPropertyAddress a = mac_addr(kAudioDevicePropertyNominalSampleRate);
    Float64 rate = 0;
    UInt32 size = sizeof(rate);
    AudioObjectGetPropertyData(device, &a, 0, NULL, &size, &rate);
    return rate;
}

/* 장치 샘플레이트 변경은 비동기로 끝나므로 바뀔 때까지 기다립니다. */
static ma_bool32 mac_set_rate(AudioObjectID device, Float64 rate) {
    AudioObjectPropertyAddress a = mac_addr(kAudioDevicePropertyNominalSampleRate);
    int i;
    if (mac_current_rate(device) == rate) return MA_TRUE;
    if (AudioObjectSetPropertyData(device, &a, 0, NULL, sizeof(rate), &rate) != noErr) return MA_FALSE;
    for (i = 0; i < 100; i += 1) {
        if (mac_current_rate(device) == rate) return MA_TRUE;
        sleep_ms(10);
    }
    return MA_FALSE;
}

/* hog 소유자를 확인한 뒤에만 바꿉니다. 다른 앱이 쥔 장치를 건드리지 않습니다. */
static ma_bool32 mac_hog(AudioObjectID device, ma_bool32 take) {
    AudioObjectPropertyAddress a = mac_addr(kAudioDevicePropertyHogMode);
    pid_t owner = -1;
    UInt32 size = sizeof(owner);
    pid_t self = getpid();
    if (AudioObjectGetPropertyData(device, &a, 0, NULL, &size, &owner) != noErr) return MA_FALSE;
    if (take) {
        if (owner == self) return MA_TRUE;
        if (owner != -1) return MA_FALSE;
        owner = self;
    } else {
        if (owner != self) return MA_TRUE;
        owner = -1;
    }
    if (AudioObjectSetPropertyData(device, &a, 0, NULL, sizeof(owner), &owner) != noErr) return MA_FALSE;
    size = sizeof(owner);
    AudioObjectGetPropertyData(device, &a, 0, NULL, &size, &owner);
    return take ? owner == self : owner == -1;
}

static void mac_close_hal(void);

static void mac_release(void) {
    if (g_macDevice == kAudioObjectUnknown) return;
    mac_close_hal();
    if (g_macHogged) mac_hog(g_macDevice, MA_FALSE);
    g_macHogged = MA_FALSE;
    /* 다른 앱이 쓰도록 원래 샘플레이트로 되돌립니다. */
    if (g_macOriginalRate > 0) mac_set_rate(g_macDevice, g_macOriginalRate);
    g_macOriginalRate = 0;
    g_macDevice = kAudioObjectUnknown;
}

static AudioDeviceIOProcID g_macIoProc = NULL;
static ma_uint32 g_macChannels = 0;
static ma_uint32 g_macPhysicalBits = 0;
static ma_uint32 g_macRate = 0;

static OSStatus mac_io_proc(AudioObjectID device, const AudioTimeStamp *now, const AudioBufferList *in, const AudioTimeStamp *inTime,
                            AudioBufferList *out, const AudioTimeStamp *outTime, void *user) {
    (void)device; (void)now; (void)in; (void)inTime; (void)outTime; (void)user;
    if (out->mNumberBuffers > 0 && g_macChannels > 0) {
        AudioBuffer *buffer = &out->mBuffers[0];
        fill_output(buffer->mData, buffer->mDataByteSize / (g_macChannels * 4), g_macChannels, ma_format_f32);
    }
    return noErr;
}

/* 믹서와 변환기를 거치지 않도록 HAL의 IOProc에 직접 씁니다. 성공하면 NULL을 돌려줍니다. */
static const char *mac_open_hal(void) {
    AudioObjectPropertyAddress a = {kAudioDevicePropertyStreams, kAudioObjectPropertyScopeOutput, kAudioObjectPropertyElementMain};
    AudioStreamID streams[16];
    UInt32 size = sizeof(streams);
    AudioStreamBasicDescription virtualFormat, physicalFormat;

    if (AudioObjectGetPropertyData(g_macDevice, &a, 0, NULL, &size, streams) != noErr || size < sizeof(AudioStreamID)) return "no_output_stream";
    a.mScope = kAudioObjectPropertyScopeGlobal;
    a.mSelector = kAudioStreamPropertyVirtualFormat;
    size = sizeof(virtualFormat);
    if (AudioObjectGetPropertyData(streams[0], &a, 0, NULL, &size, &virtualFormat) != noErr) return "no_stream_format";
    if (virtualFormat.mFormatID != kAudioFormatLinearPCM || !(virtualFormat.mFormatFlags & kAudioFormatFlagIsFloat) ||
        virtualFormat.mBitsPerChannel != 32 || (virtualFormat.mFormatFlags & kAudioFormatFlagIsNonInterleaved)) return "format_converted";
    if (virtualFormat.mChannelsPerFrame != g_flac->channels) return "channels_converted";
    if ((ma_uint32)virtualFormat.mSampleRate != g_flac->sampleRate) return "rate_converted";

    a.mSelector = kAudioStreamPropertyPhysicalFormat;
    size = sizeof(physicalFormat);
    if (AudioObjectGetPropertyData(streams[0], &a, 0, NULL, &size, &physicalFormat) != noErr) return "no_stream_format";
    g_macPhysicalBits = physicalFormat.mBitsPerChannel;
    /* IOProc는 float32로 씁니다. 24비트를 넘는 값은 정확히 담지 못합니다. */
    if (g_macPhysicalBits < g_flac->bitsPerSample || !format_holds(ma_format_f32, g_flac->bitsPerSample)) return "format_truncated";

    g_macChannels = virtualFormat.mChannelsPerFrame;
    g_macRate = (ma_uint32)virtualFormat.mSampleRate;
    if (AudioDeviceCreateIOProcID(g_macDevice, mac_io_proc, NULL, &g_macIoProc) != noErr) return "ioproc_failed";
    return NULL;
}

static void mac_close_hal(void) {
    if (!g_macIoProc) return;
    AudioDeviceStop(g_macDevice, g_macIoProc);
    AudioDeviceDestroyIOProcID(g_macDevice, g_macIoProc);
    g_macIoProc = NULL;
}

/* 성공하면 NULL, 실패하면 이유를 돌려줍니다. 실패하면 장치를 쥐지 않습니다. */
static const char *mac_prepare(Float64 rate) {
    AudioObjectPropertyAddress a = mac_addr(kAudioHardwarePropertyDefaultOutputDevice);
    AudioObjectID device = kAudioObjectUnknown;
    UInt32 size = sizeof(device);
    if (AudioObjectGetPropertyData(kAudioObjectSystemObject, &a, 0, NULL, &size, &device) != noErr) return "default_device";
    g_macDevice = device;
    if (g_macOriginalRate == 0) g_macOriginalRate = mac_current_rate(device);
    if (!mac_rate_available(device, rate)) return "rate_unsupported";
    g_macHogged = mac_hog(device, MA_TRUE);
    if (!g_macHogged) return "device_busy";
    if (!mac_set_rate(device, rate)) {
        mac_hog(device, MA_FALSE);
        g_macHogged = MA_FALSE;
        return "rate_change_failed";
    }
    return NULL;
}
#endif

/* ---------- 장치 열기와 닫기 ---------- */

/* miniaudio 장치를 썼는지 표시합니다. macOS 독점 출력은 HAL에 직접 씁니다. */
static ma_bool32 g_usesMiniaudio = MA_FALSE;

static void close_device(void) {
#ifdef __APPLE__
    mac_release();
#endif
#ifdef _WIN32
    wasapi_stop();
#endif
    if (g_deviceOpen && g_usesMiniaudio) ma_device_uninit(&g_device);
    g_usesMiniaudio = MA_FALSE;
    g_deviceOpen = MA_FALSE;
}

static ma_bool32 output_start(void) {
#ifdef __APPLE__
    if (g_macIoProc) return AudioDeviceStart(g_macDevice, g_macIoProc) == noErr;
#endif
#ifdef _WIN32
    if (!g_usesMiniaudio) {
        if (g_wasRunning) return MA_TRUE;
        return wasapi_start(g_flac->channels, g_flac->sampleRate, g_flac->bitsPerSample) == NULL;
    }
#endif
    return ma_device_start(&g_device) == MA_SUCCESS;
}

static void output_stop(void) {
#ifdef __APPLE__
    if (g_macIoProc) {
        AudioDeviceStop(g_macDevice, g_macIoProc);
        return;
    }
#endif
#ifdef _WIN32
    if (!g_usesMiniaudio) {
        wasapi_stop();
        return;
    }
#endif
    ma_device_stop(&g_device);
}

static ma_result init_device(ma_format format, ma_share_mode share) {
    ma_device_config config = ma_device_config_init(ma_device_type_playback);
    config.playback.format = format;
    config.playback.channels = g_flac->channels;
    config.playback.shareMode = share;
    config.sampleRate = g_flac->sampleRate;
    config.dataCallback = data_callback;
    config.noClip = MA_TRUE;
    config.noPreSilencedOutputBuffer = MA_TRUE;
    config.performanceProfile = ma_performance_profile_conservative;
    /* 공유 모드에서 시스템 출력 설정을 바꾸지 않습니다. 샘플레이트는 독점으로 쥔 뒤에만 직접 바꿉니다. */
    config.coreaudio.allowNominalSampleRateChange = MA_FALSE;
    return ma_device_init(&g_context, &config, &g_device);
}

static ma_bool32 open_device(void) {
    const char *reason = NULL;
    ma_bool32 exclusive = MA_FALSE;
    ma_uint32 deviceRate, deviceChannels;
    const char *deviceFormat;

    if (g_deviceOpen) return MA_TRUE;
    if (g_nullBackend) {
        reason = "simulated";
    } else {
#ifdef __APPLE__
        reason = mac_prepare((Float64)g_flac->sampleRate);
        if (!reason) reason = mac_open_hal();
        if (!reason) exclusive = MA_TRUE;
        else mac_release();
#else
#ifdef _WIN32
        reason = wasapi_start(g_flac->channels, g_flac->sampleRate, g_flac->bitsPerSample);
        if (!reason) exclusive = MA_TRUE;
#else
        reason = "exclusive_unavailable";
#endif
#endif
    }
    if (!exclusive) {
        /* 독점이 안 되면 공유 모드로라도 재생하고, 비트 퍼펙트가 아니라고 알립니다. */
        if (init_device(ma_format_s32, ma_share_mode_shared) != MA_SUCCESS) {
            emit_error("device_open_failed");
            return MA_FALSE;
        }
        g_usesMiniaudio = MA_TRUE;
    }
    g_deviceOpen = MA_TRUE;
#ifdef __APPLE__
    if (exclusive) {
        deviceRate = g_macRate;
        deviceChannels = g_macChannels;
        deviceFormat = "f32";
    } else
#endif
#ifdef _WIN32
    if (exclusive) {
        deviceRate = g_wasRate;
        deviceChannels = g_wasChannels;
        deviceFormat = g_wasFormatName;
    } else
#endif
    {
        deviceRate = g_device.playback.internalSampleRate;
        deviceChannels = g_device.playback.internalChannels;
        deviceFormat = format_name(g_device.playback.internalFormat);
    }
    emit("{\"event\":\"output\",\"bitPerfect\":%s,\"reason\":\"%s\",\"backend\":\"%s\",\"exclusive\":%s,"
         "\"fileRate\":%u,\"fileBits\":%u,\"fileChannels\":%u,\"deviceRate\":%u,\"deviceFormat\":\"%s\",\"deviceChannels\":%u}",
         reason ? "false" : "true", reason ? reason : "", ma_get_backend_name(g_context.backend), exclusive ? "true" : "false",
         g_flac->sampleRate, g_flac->bitsPerSample, g_flac->channels, deviceRate, deviceFormat, deviceChannels);
    return MA_TRUE;
}

/* ---------- 디코더 스레드 ---------- */

THREAD_FN(decoder_thread) {
    (void)unused;
    while (!g_quit) {
        ma_bool32 wrote = MA_FALSE;
        ma_mutex_lock(&g_stateLock);
        if (g_flac && g_ringReady && !g_decodedAll) {
            ma_uint32 want = ma_pcm_rb_available_write(&g_ring);
            if (want > CHUNK_FRAMES) want = CHUNK_FRAMES;
            if (want > 0) {
                void *write = NULL;
                if (ma_pcm_rb_acquire_write(&g_ring, &want, &write) == MA_SUCCESS && want > 0) {
                    ma_uint64 got = ma_dr_flac_read_pcm_frames_s32(g_flac, want, (ma_int32 *)write);
                    ma_pcm_rb_commit_write(&g_ring, (ma_uint32)got);
                    if (got == 0) g_decodedAll = MA_TRUE;
                    wrote = got > 0;
                }
            }
        }
        ma_mutex_unlock(&g_stateLock);
        if (!wrote) sleep_ms(5);
    }
    THREAD_RET;
}

THREAD_FN(status_thread) {
    (void)unused;
    while (!g_quit) {
        sleep_ms(250);
        ma_mutex_lock(&g_stateLock);
        if (g_flac) {
            double rate = (double)g_flac->sampleRate;
            ma_uint64 frame = g_baseFrame + g_framesPlayed;
            emit("{\"event\":\"status\",\"playing\":%s,\"time\":%.3f,\"duration\":%.3f,\"underruns\":%llu}",
                 g_playing ? "true" : "false", (double)frame / rate, (double)g_flac->totalPCMFrameCount / rate,
                 (unsigned long long)g_underruns);
            if (g_endedPending && g_playing) {
                g_endedPending = MA_FALSE;
                g_playing = MA_FALSE;
                close_device();
                emit("{\"event\":\"ended\"}");
            }
        }
        ma_mutex_unlock(&g_stateLock);
    }
    THREAD_RET;
}

/* ---------- 명령 ---------- */

static void reset_position(ma_uint64 frame) {
    ma_pcm_rb_reset(&g_ring);
    g_baseFrame = frame;
    g_framesPlayed = 0;
    g_decodedAll = MA_FALSE;
    g_endedPending = MA_FALSE;
}

static void cmd_stop(void) {
    g_playing = MA_FALSE;
    close_device();
    if (g_ringReady) {
        ma_pcm_rb_uninit(&g_ring);
        g_ringReady = MA_FALSE;
    }
    if (g_flac) {
        ma_dr_flac_close(g_flac);
        g_flac = NULL;
    }
}

static ma_dr_flac *open_flac(const char *path) {
#ifdef _WIN32
    wchar_t wide[4096];
    if (MultiByteToWideChar(CP_UTF8, 0, path, -1, wide, 4096) == 0) return NULL;
    return ma_dr_flac_open_file_w(wide, NULL);
#else
    return ma_dr_flac_open_file(path, NULL);
#endif
}

static void cmd_load(const char *path) {
    ma_dr_flac *flac = open_flac(path);
    if (!flac) {
        emit_error("not_flac");
        return;
    }
    ma_mutex_lock(&g_stateLock);
    cmd_stop();
    g_flac = flac;
    if (ma_pcm_rb_init(ma_format_s32, flac->channels, flac->sampleRate * RING_SECONDS, NULL, NULL, &g_ring) != MA_SUCCESS) {
        ma_dr_flac_close(flac);
        g_flac = NULL;
        ma_mutex_unlock(&g_stateLock);
        emit_error("out_of_memory");
        return;
    }
    g_ringReady = MA_TRUE;
    reset_position(0);
    g_underruns = 0;
    emit("{\"event\":\"loaded\",\"duration\":%.3f,\"rate\":%u,\"bits\":%u,\"channels\":%u}",
         (double)flac->totalPCMFrameCount / (double)flac->sampleRate, flac->sampleRate, flac->bitsPerSample, flac->channels);
    ma_mutex_unlock(&g_stateLock);
}

static void cmd_play(void) {
    ma_mutex_lock(&g_stateLock);
    if (g_flac && open_device()) {
        if (output_start()) g_playing = MA_TRUE;
        else emit_error("device_start_failed");
    }
    ma_mutex_unlock(&g_stateLock);
}

/* 멈춘 동안 다른 앱의 소리를 막지 않도록 장치를 놓아 줍니다. */
static void cmd_pause(void) {
    ma_mutex_lock(&g_stateLock);
    g_playing = MA_FALSE;
    close_device();
    ma_mutex_unlock(&g_stateLock);
}

static void cmd_seek(double seconds) {
    ma_uint64 frame;
    ma_bool32 wasPlaying;
    ma_mutex_lock(&g_stateLock);
    if (!g_flac) {
        ma_mutex_unlock(&g_stateLock);
        return;
    }
    if (seconds < 0) seconds = 0;
    frame = (ma_uint64)(seconds * (double)g_flac->sampleRate);
    if (frame > g_flac->totalPCMFrameCount) frame = g_flac->totalPCMFrameCount;
    wasPlaying = g_playing;
    if (g_deviceOpen) output_stop();
    ma_dr_flac_seek_to_pcm_frame(g_flac, frame);
    reset_position(frame);
    if (wasPlaying && g_deviceOpen) output_start();
    ma_mutex_unlock(&g_stateLock);
}

/* ---------- 자체 검사 ---------- */

static ma_format parse_format(const char *name) {
    if (strcmp(name, "s32") == 0) return ma_format_s32;
    if (strcmp(name, "s24") == 0) return ma_format_s24;
    if (strcmp(name, "s16") == 0) return ma_format_s16;
    if (strcmp(name, "f32") == 0) return ma_format_f32;
    return ma_format_unknown;
}

/* 장치 버퍼에 쓴 값을 FLAC 원본 비트 수의 PCM으로 되돌립니다. 손실이 있으면 MD5가 달라집니다. */
static void read_back(const void *buffer, ma_uint64 samples, ma_format format, ma_uint32 bits, FILE *out) {
    ma_uint32 bytes = (bits + 7) / 8;
    ma_uint64 i;
    for (i = 0; i < samples; i += 1) {
        ma_int32 v = 0;
        ma_uint32 b;
        switch (format) {
        case ma_format_s32: v = ((const ma_int32 *)buffer)[i]; break;
        case ma_format_s16: v = (ma_int32)((const ma_int16 *)buffer)[i] * 65536; break;
        case ma_format_f32: v = (ma_int32)((double)((const float *)buffer)[i] * 2147483648.0); break;
        case ma_format_s24: {
            const ma_uint8 *p = (const ma_uint8 *)buffer + i * 3;
            v = (ma_int32)(((ma_uint32)p[0] << 8) | ((ma_uint32)p[1] << 16) | ((ma_uint32)p[2] << 24));
            break;
        }
        default: break;
        }
        v >>= (32 - bits);
        for (b = 0; b < bytes; b += 1) fputc((v >> (8 * b)) & 0xFF, out);
    }
}

/* 재생과 같은 링 버퍼와 data_callback을 거쳐, 장치 없이 파일 끝까지 돌립니다. */
static int run_verify(const char *path, const char *outPath, const char *formatName) {
    ma_format format = parse_format(formatName);
    FILE *out;
    ma_device fake;
    void *buffer;
    ma_uint32 bytesPerFrame;
    ma_uint64 total = 0;

    g_flac = open_flac(path);
    if (!g_flac || format == ma_format_unknown) {
        fprintf(stderr, "cannot open\n");
        return 2;
    }
    out = fopen(outPath, "wb");
    if (!out) return 2;
    ma_pcm_rb_init(ma_format_s32, g_flac->channels, g_flac->sampleRate * RING_SECONDS, NULL, NULL, &g_ring);
    g_ringReady = MA_TRUE;
    MA_ZERO_OBJECT(&fake);
    fake.playback.channels = g_flac->channels;
    fake.playback.format = format;
    bytesPerFrame = ma_get_bytes_per_frame(format, g_flac->channels);
    buffer = malloc(CHUNK_FRAMES * bytesPerFrame);

    for (;;) {
        ma_uint64 before;
        ma_uint32 want = CHUNK_FRAMES;
        void *write = NULL;
        ma_uint64 got = 0;
        if (ma_pcm_rb_acquire_write(&g_ring, &want, &write) == MA_SUCCESS && want > 0) {
            got = ma_dr_flac_read_pcm_frames_s32(g_flac, want, (ma_int32 *)write);
            ma_pcm_rb_commit_write(&g_ring, (ma_uint32)got);
        }
        if (got == 0) break;
        before = g_framesPlayed;
        data_callback(&fake, buffer, NULL, (ma_uint32)got);
        if (g_framesPlayed - before != got) {
            fprintf(stderr, "frame count mismatch\n");
            return 3;
        }
        read_back(buffer, got * g_flac->channels, format, g_flac->bitsPerSample, out);
        total += got;
    }
    fclose(out);
    printf("{\"frames\":%llu,\"rate\":%u,\"bits\":%u,\"channels\":%u,\"format\":\"%s\",\"holds\":%s}\n", (unsigned long long)total,
           g_flac->sampleRate, g_flac->bitsPerSample, g_flac->channels, formatName, format_holds(format, g_flac->bitsPerSample) ? "true" : "false");
    return 0;
}

/* ---------- 시작 ---------- */

static void on_signal(int sig) {
    (void)sig;
    /* 종료 신호를 받아도 장치를 쥔 채로 끝나지 않게 합니다. */
#ifdef __APPLE__
    mac_release();
#endif
    _Exit(0);
}

int main(int argc, char **argv) {
    char line[8192];
    thread_t decoder, status;
    ma_backend backends[1];
    ma_uint32 backendCount = 0;
    int i;

    if (argc >= 5 && strcmp(argv[1], "--verify") == 0) return run_verify(argv[2], argv[3], argv[4]);
    for (i = 1; i + 1 < argc; i += 1) {
        if (strcmp(argv[i], "--backend") == 0 && strcmp(argv[i + 1], "null") == 0) {
            g_nullBackend = MA_TRUE;
            backends[0] = ma_backend_null;
            backendCount = 1;
        }
    }
    ma_mutex_init(&g_outputLock);
    ma_mutex_init(&g_stateLock);
    if (ma_context_init(backendCount ? backends : NULL, backendCount, NULL, &g_context) != MA_SUCCESS) {
        emit_error("no_audio_backend");
        return 1;
    }
    signal(SIGINT, on_signal);
    signal(SIGTERM, on_signal);

    thread_start(&decoder, decoder_thread);
    thread_start(&status, status_thread);
    emit("{\"event\":\"ready\",\"backend\":\"%s\"}", ma_get_backend_name(g_context.backend));

    while (fgets(line, sizeof(line), stdin)) {
        size_t n = strlen(line);
        while (n > 0 && (line[n - 1] == '\n' || line[n - 1] == '\r')) line[--n] = '\0';
        if (strncmp(line, "load ", 5) == 0) cmd_load(line + 5);
        else if (strcmp(line, "play") == 0) cmd_play();
        else if (strcmp(line, "pause") == 0) cmd_pause();
        else if (strncmp(line, "seek ", 5) == 0) cmd_seek(atof(line + 5));
        else if (strcmp(line, "stop") == 0) {
            ma_mutex_lock(&g_stateLock);
            cmd_stop();
            ma_mutex_unlock(&g_stateLock);
        } else if (strcmp(line, "quit") == 0) break;
    }
    /* 부모가 죽어 입력이 닫혀도 여기로 와서 장치를 놓습니다. */
    g_quit = MA_TRUE;
    ma_mutex_lock(&g_stateLock);
    cmd_stop();
    ma_mutex_unlock(&g_stateLock);
    ma_context_uninit(&g_context);
    return 0;
}
