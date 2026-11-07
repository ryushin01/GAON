/*
 * Windows 독점 출력입니다. miniaudio는 독점 모드에서 장치의 기본 형식으로만 열기 때문에, 곡의 샘플레이트와
 * 비트 수로 장치를 직접 엽니다. COM 객체는 모두 전용 스레드에서 만들고 씁니다.
 */
typedef struct {
    WORD container;
    WORD valid;
    ma_format format;
    const char *name;
} WasapiCandidate;

/* 비트 수가 정확한 형식부터 시도합니다. 더 큰 형식은 아래쪽을 0으로 채워 값이 그대로입니다. */
static const WasapiCandidate g_wasCandidates[] = {
    {16, 16, ma_format_s16, "s16"},
    {24, 24, ma_format_s24, "s24"},
    {32, 24, ma_format_s32, "s32"},
    {32, 32, ma_format_s32, "s32"},
};

static const CLSID GAON_CLSID_MMDeviceEnumerator = {0xBCDE0395, 0xE52F, 0x467C, {0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E}};
static const IID GAON_IID_IMMDeviceEnumerator = {0xA95664D2, 0x9614, 0x4F35, {0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6}};
static const IID GAON_IID_IAudioClient = {0x1CB9AD4C, 0xDBFA, 0x4C32, {0xB1, 0x78, 0xC2, 0xF5, 0x68, 0xA7, 0x03, 0xB2}};
static const IID GAON_IID_IAudioRenderClient = {0xF294ACFC, 0x3146, 0x4483, {0xA7, 0xBF, 0xAD, 0xDC, 0xA7, 0xC2, 0x60, 0xE2}};
static const GUID GAON_SUBTYPE_PCM = {0x00000001, 0x0000, 0x0010, {0x80, 0x00, 0x00, 0xAA, 0x00, 0x38, 0x9B, 0x71}};

static HANDLE g_wasThread = NULL;
static HANDLE g_wasReady = NULL;
static HANDLE g_wasStop = NULL;
static volatile ma_bool32 g_wasRunning = MA_FALSE;
static const char *g_wasReason = NULL;
static ma_uint32 g_wasChannels = 0;
static ma_uint32 g_wasRate = 0;
static ma_uint32 g_wasBits = 0;
static ma_format g_wasFormat = ma_format_unknown;
static const char *g_wasFormatName = "unknown";

static void wasapi_fill_format(WAVEFORMATEXTENSIBLE *wfx, const WasapiCandidate *candidate, ma_uint32 channels, ma_uint32 rate) {
    ZeroMemory(wfx, sizeof(*wfx));
    wfx->Format.wFormatTag = WAVE_FORMAT_EXTENSIBLE;
    wfx->Format.nChannels = (WORD)channels;
    wfx->Format.nSamplesPerSec = rate;
    wfx->Format.wBitsPerSample = candidate->container;
    wfx->Format.nBlockAlign = (WORD)(channels * candidate->container / 8);
    wfx->Format.nAvgBytesPerSec = rate * wfx->Format.nBlockAlign;
    wfx->Format.cbSize = sizeof(WAVEFORMATEXTENSIBLE) - sizeof(WAVEFORMATEX);
    wfx->Samples.wValidBitsPerSample = candidate->valid;
    wfx->dwChannelMask = channels == 2 ? (SPEAKER_FRONT_LEFT | SPEAKER_FRONT_RIGHT) : channels == 1 ? SPEAKER_FRONT_CENTER : 0;
    wfx->SubFormat = GAON_SUBTYPE_PCM;
}

static const char *wasapi_reason(HRESULT hr) {
    if (hr == AUDCLNT_E_DEVICE_IN_USE) return "device_busy";
    if (hr == AUDCLNT_E_EXCLUSIVE_MODE_NOT_ALLOWED) return "exclusive_not_allowed";
    if (hr == AUDCLNT_E_UNSUPPORTED_FORMAT) return "rate_unsupported";
    if (hr == E_NOTFOUND || hr == AUDCLNT_E_DEVICE_INVALIDATED) return "no_device";
    return "exclusive_unavailable";
}

static DWORD WINAPI wasapi_thread(LPVOID unused) {
    IMMDeviceEnumerator *enumerator = NULL;
    IMMDevice *endpoint = NULL;
    IAudioClient *client = NULL;
    IAudioRenderClient *render = NULL;
    HANDLE bufferEvent = NULL;
    HANDLE task = NULL;
    DWORD taskIndex = 0;
    WAVEFORMATEXTENSIBLE wfx;
    const WasapiCandidate *chosen = NULL;
    REFERENCE_TIME period = 0;
    UINT32 frames = 0;
    BYTE *data = NULL;
    HRESULT hr;
    size_t i;
    ma_bool32 announced = MA_FALSE;
    (void)unused;

    hr = CoInitializeEx(NULL, COINIT_MULTITHREADED);
    if (FAILED(hr)) goto fail;
    hr = CoCreateInstance(&GAON_CLSID_MMDeviceEnumerator, NULL, CLSCTX_ALL, &GAON_IID_IMMDeviceEnumerator, (void **)&enumerator);
    if (FAILED(hr)) goto fail;
    hr = IMMDeviceEnumerator_GetDefaultAudioEndpoint(enumerator, eRender, eConsole, &endpoint);
    if (FAILED(hr)) goto fail;
    hr = IMMDevice_Activate(endpoint, &GAON_IID_IAudioClient, CLSCTX_ALL, NULL, (void **)&client);
    if (FAILED(hr)) goto fail;

    /* 장치가 곡의 샘플레이트와 비트 수를 그대로 받는 형식만 고릅니다. */
    hr = AUDCLNT_E_UNSUPPORTED_FORMAT;
    for (i = 0; i < sizeof(g_wasCandidates) / sizeof(g_wasCandidates[0]); i += 1) {
        const WasapiCandidate *candidate = &g_wasCandidates[i];
        if (candidate->valid < g_wasBits) continue;
        wasapi_fill_format(&wfx, candidate, g_wasChannels, g_wasRate);
        hr = IAudioClient_IsFormatSupported(client, AUDCLNT_SHAREMODE_EXCLUSIVE, (WAVEFORMATEX *)&wfx, NULL);
        if (hr == S_OK) {
            chosen = candidate;
            break;
        }
        if (hr == AUDCLNT_E_EXCLUSIVE_MODE_NOT_ALLOWED || hr == AUDCLNT_E_DEVICE_IN_USE) goto fail;
    }
    if (!chosen) {
        hr = AUDCLNT_E_UNSUPPORTED_FORMAT;
        goto fail;
    }

    hr = IAudioClient_GetDevicePeriod(client, &period, NULL);
    if (FAILED(hr)) goto fail;
    hr = IAudioClient_Initialize(client, AUDCLNT_SHAREMODE_EXCLUSIVE, AUDCLNT_STREAMFLAGS_EVENTCALLBACK, period, period, (WAVEFORMATEX *)&wfx, NULL);
    if (hr == AUDCLNT_E_BUFFER_SIZE_NOT_ALIGNED) {
        /* 장치가 원하는 버퍼 크기로 맞춰 클라이언트를 다시 만듭니다. */
        hr = IAudioClient_GetBufferSize(client, &frames);
        if (FAILED(hr)) goto fail;
        period = (REFERENCE_TIME)(10000000.0 * frames / g_wasRate + 0.5);
        IAudioClient_Release(client);
        client = NULL;
        hr = IMMDevice_Activate(endpoint, &GAON_IID_IAudioClient, CLSCTX_ALL, NULL, (void **)&client);
        if (FAILED(hr)) goto fail;
        hr = IAudioClient_Initialize(client, AUDCLNT_SHAREMODE_EXCLUSIVE, AUDCLNT_STREAMFLAGS_EVENTCALLBACK, period, period, (WAVEFORMATEX *)&wfx, NULL);
    }
    if (FAILED(hr)) goto fail;

    bufferEvent = CreateEventW(NULL, FALSE, FALSE, NULL);
    if (!bufferEvent) {
        hr = E_FAIL;
        goto fail;
    }
    hr = IAudioClient_SetEventHandle(client, bufferEvent);
    if (FAILED(hr)) goto fail;
    hr = IAudioClient_GetBufferSize(client, &frames);
    if (FAILED(hr)) goto fail;
    hr = IAudioClient_GetService(client, &GAON_IID_IAudioRenderClient, (void **)&render);
    if (FAILED(hr)) goto fail;

    g_wasFormat = chosen->format;
    g_wasFormatName = chosen->name;
    task = AvSetMmThreadCharacteristicsW(L"Pro Audio", &taskIndex);

    /* 시작 전에 첫 버퍼를 채웁니다. 독점 이벤트 모드는 비어 있으면 시작 때 끊깁니다. */
    hr = IAudioRenderClient_GetBuffer(render, frames, &data);
    if (FAILED(hr)) goto fail;
    fill_output(data, frames, g_wasChannels, g_wasFormat);
    hr = IAudioRenderClient_ReleaseBuffer(render, frames, 0);
    if (FAILED(hr)) goto fail;
    hr = IAudioClient_Start(client);
    if (FAILED(hr)) goto fail;

    g_wasReason = NULL;
    g_wasRunning = MA_TRUE;
    announced = MA_TRUE;
    SetEvent(g_wasReady);

    for (;;) {
        HANDLE waits[2] = {g_wasStop, bufferEvent};
        DWORD result = WaitForMultipleObjects(2, waits, FALSE, 2000);
        if (result == WAIT_OBJECT_0) break;
        if (result != WAIT_OBJECT_0 + 1) {
            emit_error("device_lost");
            break;
        }
        hr = IAudioRenderClient_GetBuffer(render, frames, &data);
        if (hr == AUDCLNT_E_BUFFER_TOO_LARGE) continue;
        if (FAILED(hr)) {
            emit_error("device_lost");
            break;
        }
        fill_output(data, frames, g_wasChannels, g_wasFormat);
        hr = IAudioRenderClient_ReleaseBuffer(render, frames, 0);
        if (FAILED(hr)) {
            emit_error("device_lost");
            break;
        }
    }
    IAudioClient_Stop(client);
    goto done;

fail:
    g_wasReason = wasapi_reason(hr);
done:
    g_wasRunning = MA_FALSE;
    if (task) AvRevertMmThreadCharacteristics(task);
    if (render) IAudioRenderClient_Release(render);
    if (client) IAudioClient_Release(client);
    if (endpoint) IMMDevice_Release(endpoint);
    if (enumerator) IMMDeviceEnumerator_Release(enumerator);
    if (bufferEvent) CloseHandle(bufferEvent);
    CoUninitialize();
    if (!announced) SetEvent(g_wasReady);
    return 0;
}

static void wasapi_stop(void) {
    if (!g_wasThread) return;
    SetEvent(g_wasStop);
    WaitForSingleObject(g_wasThread, 5000);
    CloseHandle(g_wasThread);
    g_wasThread = NULL;
    g_wasRunning = MA_FALSE;
}

/* 성공하면 NULL, 실패하면 이유를 돌려줍니다. */
static const char *wasapi_start(ma_uint32 channels, ma_uint32 rate, ma_uint32 bits) {
    wasapi_stop();
    if (!g_wasReady) g_wasReady = CreateEventW(NULL, FALSE, FALSE, NULL);
    if (!g_wasStop) g_wasStop = CreateEventW(NULL, TRUE, FALSE, NULL);
    ResetEvent(g_wasReady);
    ResetEvent(g_wasStop);
    g_wasChannels = channels;
    g_wasRate = rate;
    g_wasBits = bits;
    g_wasReason = "exclusive_unavailable";
    g_wasThread = CreateThread(NULL, 0, wasapi_thread, NULL, 0, NULL);
    if (!g_wasThread) return "exclusive_unavailable";
    WaitForSingleObject(g_wasReady, 5000);
    if (!g_wasRunning) {
        const char *reason = g_wasReason ? g_wasReason : "exclusive_unavailable";
        wasapi_stop();
        return reason;
    }
    return NULL;
}
