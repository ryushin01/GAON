# 개발 가이드

## 환경 변수

| 이름 | 설명 |
|---|---|
| `EXPO_PUBLIC_MEDIA_BASE_URL` | 카탈로그와 FLAC을 받을 주소입니다. 비워 두면 공개 주소 `https://ryushin01.github.io/GAON/media`를 씁니다. 빌드할 때 번들에 들어갑니다. |

로컬 미디어 서버를 쓸 때만 `.env.local`에 `http://localhost:8787`을 지정합니다.

## 데모 미디어

`scripts/generate-media.py`가 가상의 카탈로그와 앨범 아트, CD 윗면 라벨, 24bit FLAC을 합성해 `public-media/`에 만듭니다.

CD 라벨(`disc/*.webp`)은 `scripts/disc_labels.py`가 실제 CD 구조(테두리, 인쇄 면, 미러 밴드의 품번, 투명 허브)를 따라 그립니다. 디자인은 장르별로 실제 음반에서 널리 쓰는 방식(흑백 미니멀, 별색 실크 인쇄, 은색 노출, 바이닐 모양, 커버 전면, 동심원, 사선 분할, 둥근 글자 띠)에서 고르고, 특정 음반의 디자인을 옮기지 않습니다. 유신의 「빛」은 흑백 블랙홀로 따로 정했습니다(`OVERRIDES`). 앱의 디스크는 라벨을, 정사각형 커버는 `art/`를 씁니다. 용량이 커서(약 630MB) 저장소에는 올리지 않습니다.

- 곡 102개 중 100개가 TOP 100에 들어갑니다.
- 차트 1위는 유신의 「빛 (The Light)」로 고정합니다. 유신은 싱어송라이터이므로 곡마다 작사·작곡을 유신으로 표기합니다.
- `pnpm media:serve`는 재생 위치 이동에 필요한 Range 요청을 지원합니다.

## 네이티브 빌드

`ios/`와 `android/`는 `expo prebuild`로 만드는 폴더이고 저장소에 올리지 않습니다. 네이티브 설정(아이콘·스플래시·권한·플러그인)은 `app.json`에서 바꿉니다.

`expo run:ios`·`expo run:android`는 이 폴더가 없을 때만 prebuild를 하고, 이미 있으면 `app.json`이 바뀌어도 다시 반영하지 않습니다. 그래서 0.8.1에서 아이콘·스플래시를 바꾼 뒤에도 로컬 빌드에는 예전 아이콘이 남았습니다. `pnpm ios`·`pnpm android`는 빌드 전에 `expo prebuild --no-clean`으로 지금 폴더에 설정을 다시 적용합니다(pod install은 `expo run:ios`가 함). Pods·빌드 캐시는 남지만, 아이콘·스플래시·권한·Info.plist처럼 설정에서 만드는 부분은 `app.json` 기준으로 다시 쓰므로 그 부분을 손으로 고친 내용은 덮어씁니다. `expo run:*`을 직접 쓸 때도 먼저 `pnpm exec expo prebuild --no-clean`을 실행합니다.

`--no-clean`은 뺀 설정을 되돌리지 않습니다. 예를 들어 끈 권한이 매니페스트에 남을 수 있습니다. 설정을 빼거나 끈 뒤에는 `--no-clean` 없이 `pnpm exec expo prebuild`를 실행해 폴더를 새로 만듭니다(Expo CLI 58의 기본은 폴더를 지우고 새로 만드는 clean 모드). 이때 `--platform`을 주면 그 플랫폼 폴더만, 빼면 `ios/`·`android/`를 모두 지우므로 Pods·빌드 캐시와 손으로 고친 파일도 사라집니다. 남길 파일은 먼저 옮겨 둡니다. 또 `expo run:ios`는 `Pods/`·`Podfile.lock`이 없거나 `package.json`의 의존성이 바뀌었을 때만 pod install을 하므로, 플러그인의 Pod 설정처럼 `Podfile`만 바뀌는 설정을 고친 뒤에는 `pnpm exec expo prebuild --platform ios --no-clean --no-install`로 `Podfile`을 먼저 다시 만들고 `cd ios && pod install`을 실행합니다.

```bash
pnpm ios --configuration Release
pnpm android --variant release   # JDK 21 필요(Android Studio에 들어 있는 JDK 25로도 빌드됨, 2026-11-20 확인)
```

Android 에뮬레이터에서 로컬 미디어 서버를 쓰려면 `adb reverse tcp:8787 tcp:8787`을 먼저 실행합니다. Android Release 빌드는 평문 HTTP를 막으므로, 로컬 서버로 검사할 때는 Debug 빌드를 쓰거나 `android/app/src/release/AndroidManifest.xml`에 `usesCleartextTraffic`을 임시로 켭니다. 공개 주소는 HTTPS라 이 설정이 필요 없습니다.

## 화면 이동

탭과 상세 화면은 모두 `app/(tabs)`의 `Stack` 하나로 이동합니다. `Tabs`의 숨김 탭(`href: null`)으로 상세 화면을 두면 웹에서 경로가 홈으로 풀리는 문제가 있어 쓰지 않습니다. 하단 탭과 상단 메뉴는 `widgets/app-shell`에 직접 구현했습니다.

이전 화면은 숨겨진 채 DOM에 남습니다. 그래서 `Screen`은 현재 화면에만 `id="main"`을 달아 본문 바로가기 대상을 하나로 유지합니다.

## 음질

### 기본 출력

2026-11-07에 Chromium(웹과 PC 앱이 쓰는 엔진)에서 24bit/192kHz 파일로 측정했습니다.

| 단계 | 결과 |
|---|---|
| 앱에 저장한 파일 | SHA-256이 원본과 같음 |
| 디코딩한 PCM (192kHz 그대로) | MD5가 FLAC 헤더에 기록된 원본 PCM의 MD5와 같음 |
| 출력 (시험 환경의 장치 샘플레이트 48kHz) | 재생할 때 Chromium이 48kHz로 재샘플링함 |

iOS(AVPlayer)와 Android(ExoPlayer)도 일반 재생 경로라 운영체제의 믹서를 거칩니다. 이 두 플랫폼은 위와 같은 측정을 하지 않았습니다. 블루투스는 전송 코덱에 따라 다시 압축될 수 있습니다.

### 비트 퍼펙트 출력 (PC 앱)

설정의 **비트 퍼펙트 (독점)** 를 켜면 `native/gaon-audio` 재생기가 Chromium 대신 소리를 냅니다. Electron 메인 프로세스가 재생기를 실행하고 `electron/preload.cjs`로 화면과 잇습니다.

| 운영체제 | 방식 |
|---|---|
| macOS | 기본 출력 장치를 hog 모드로 쥐고, 샘플레이트를 곡에 맞춘 뒤 Core Audio HAL에 직접 씁니다. 멈추거나 끝나면 원래 샘플레이트로 되돌립니다. |
| Windows | 곡의 샘플레이트와 비트 수로 WASAPI 독점 모드를 직접 엽니다(`native/gaon-audio/wasapi.inc.h`). miniaudio는 장치의 기본 형식으로만 열기 때문에 쓰지 않습니다. 장치가 형식을 받지 않거나 독점이 꺼져 있으면 공유 모드로 재생하고 이유를 표시합니다. |

재생기는 조건이 모두 맞을 때만 `bitPerfect: true`를 보고하고, 플레이어 화면은 그 값을 그대로 보여 줍니다. 장치가 샘플레이트를 지원하지 않거나 다른 앱이 쥐고 있으면 공유 모드로 재생하고 이유를 표시합니다.

| 검증 | 방법 | 범위 |
|---|---|---|
| 무손실 변환 | `pnpm test:native <FLAC>`: 장치 버퍼를 PCM으로 되돌려 FLAC 헤더의 MD5와 비교 | CI에서 macOS, Windows, Linux |
| 곡 이어 붙이기 | `pnpm test:native <FLAC> <다음 FLAC>`: 형식이 같으면 이어 붙인 PCM의 두 곡이 각각 원본 MD5와 같고 길이가 정확히 두 곡의 합인지(경계에서 샘플을 더하거나 빠뜨리지 않음), 다르면 이어 붙이지 않는지 비교 | CI에서 macOS, Windows, Linux |
| 재생기 스레드 | `pnpm test:native:smoke <FLAC> <다음 FLAC>`: 실제 출력이 없어도 충돌하지 않는지, 시험 출력에서 다음 곡으로 넘어가기(advanced), 이어 붙인 곡 버리기, 멈춤 알림(stopped) 확인 | CI에서 Windows, Linux |
| 앱 동작 | `pnpm test:desktop`: 시험 출력(`GAON_AUDIO_BACKEND=null`)으로 재생, 위치 이동, 다음 곡, 같은 앨범 곡 이어 재생(갭리스), 로컬 FLAC 확인 | CI에서 macOS, Windows |
| 실제 출력 | `pnpm test:native:device <FLAC> <다음 FLAC> [다른 형식 FLAC]`: 실제 출력 장치에서 독점·비트 퍼펙트로 열리는지, 같은 형식 곡이 끝남 알림 없이 이어 넘어가는지(갭리스), 다른 형식 곡에서 장치를 그 형식으로 다시 여는지, 버퍼 부족 횟수(위치 이동 직후와 이어 넘어가기를 나눠 셈). 소리가 남 | macOS 수동(MacBook Pro 스피커), Windows 가상 장치 CI(`오디오 장치 검사`) |
| 실제 장치 | MacBook Pro 스피커에서 곡별 샘플레이트 전환, 독점, 갭리스, 복원 확인 | macOS 수동 |

알아 둘 점:

- 비트 퍼펙트는 앱이 장치로 보내는 데이터까지 보장합니다. 장치의 볼륨, EQ, DSP는 앱 밖에 있습니다. MacBook 내장 스피커처럼 자체 처리를 하는 장치는 소리까지 원본 그대로라고 할 수 없어, 외장 DAC를 권합니다.
- macOS HAL 입력은 float32입니다. 24비트 이하 값은 손실 없이 들어가고, 장치 실제 비트 수가 곡보다 낮으면 비트 퍼펙트로 표시하지 않습니다. 32비트 FLAC은 macOS에서 지원하지 않습니다.
- **Windows WASAPI 독점은 하드웨어 장치로는 아직 시험하지 못했습니다.** `오디오 장치 검사` 워크플로(`.github/workflows/audio-device.yml`)가 Windows 러너에 가상 장치(VB-CABLE)를 설치해, 독점·비트 퍼펙트로 열기, 갭리스 이어 넘어가기, 곡 형식에 맞춰 장치 다시 열기를 실제 WASAPI로 확인합니다. 재생기 코드가 바뀐 PR과 손으로 실행할 때 돕니다. DAC에서 듣는 확인과 장치마다 다른 형식 지원·볼륨 처리는 남았습니다. 평소 CI는 컴파일, 무손실 변환, 장치가 없을 때 충돌하지 않는지를 검사합니다(`pnpm test:native:smoke <FLAC>`).
- 곡은 재생 전에 끝까지 내려받아 캐시합니다(최대 2GB). 받는 대로 파일에 써서 메모리에 곡 전체를 올리지 않고, 캐시가 차면 가장 오래 안 들은 곡부터 지웁니다. 재생 중 출력 장치 변경 대응은 아직 없습니다.
- **갭리스:** 지금 곡을 불러오면 다음 곡도 미리 받아 재생기에 알립니다(`next`). 재생기는 지금 곡을 끝까지 읽으면 형식(샘플레이트, 채널, 비트 수)이 같은 다음 곡을 같은 링 버퍼에 바로 이어 써서, 장치를 다시 열지 않고 곡 사이 끊김 없이 재생합니다. 다음 곡이 들리기 시작하면 `advanced`를 알리고 화면은 곡 정보만 바꿉니다. 형식이 다르면 장치를 새 형식으로 다시 열어야 해서 이어 붙이지 않고, 곡이 끝나면(`ended`) 미리 받아 둔 다음 곡을 불러옵니다.
- 이어 붙인 뒤에 큐가 바뀌면(다음 곡 빼기, 셔플, 반복 바꾸기) 재생기는 이어 붙인 곳에서 끊고 그 뒤에 쓴 곡을 버립니다. 화면은 `stop`을 보낸 뒤 재생기가 처리했다는 알림(`stopped`)이 오기 전의 이벤트를 멈추기 전 곡의 것으로 보고 버립니다.
- 재생기는 Media Session으로 곡 정보와 재생 상태를 운영체제에 알려, 키보드 미디어 키와 macOS 제어 센터·Windows 미디어 오버레이로 재생·일시정지·이전·다음·위치 이동을 할 수 있습니다.
- Android(14 이상, USB DAC)와 iOS는 아직 지원하지 않습니다. iOS에는 독점 API가 없습니다.

## 재생

- 재생 엔진은 `features/player/model/engine.ts`입니다. 큐를 바꾸는 작업(새 큐 올리기, 셔플 재배치, 곡 더하기·빼기)은 한 줄로 세워 하나씩 실행합니다(`serial`). 곡 주소를 구하느라 기다리는 동안 다른 작업이 끼어들지 않으므로, 새 작업을 넣을 때도 이 줄을 거치게 합니다. 재생 요청은 마지막 것만 실행하고(요청 번호), 멈춤은 줄을 서지 않고 바로 처리합니다(줄을 선 작업은 멈춤 번호를 보고 그만둠).
- 큐와 지금 곡은 앱을 다시 켜도 남습니다. 미니 플레이어에 그대로 보이고, 재생을 누르면 그 곡의 처음부터 이어 듣습니다. 재생 위치는 저장하지 않습니다. 저장은 같은 내용이면 다시 쓰지 않습니다(`shared/lib/unchangedWrites.ts`).
- 재생 오류는 미니 플레이어와 플레이어 화면의 알림 영역(`PlaybackError`)에 나오고, 다시 재생되면 지워집니다.
- 오디오 모드(`setAudioModeAsync`: 무음 모드에서 재생, 백그라운드 재생, 다른 앱 소리와 섞지 않기)는 처음 재생할 때 한 번만 설정합니다. 설정에 실패하면 기억하지 않아 다음 재생에서 다시 시도합니다(`shared/lib`의 `onceAsync`).
- 기본 출력(expo-audio)은 운영체제·브라우저의 재생기가 다음 곡을 미리 받아 이어 재생합니다. 곡 사이 무간격은 그 재생기에 달려 있습니다.
- 웹·PC 앱에서 내 FLAC은 IndexedDB의 파일을 blob 주소로 재생합니다. 큐에서 빠진 곡의 주소는 놓아 파일 데이터가 메모리에 남지 않게 합니다.

## 오프라인 저장

좋아요 탭과 플레이리스트 화면의 `오프라인 저장`, 곡 메뉴의 `오프라인 저장`으로 스트리밍 곡을 기기에 저장해 인터넷 없이 듣습니다(`features/save-offline`). 저장한 곡은 보관함의 `오프라인` 탭에 모이고, 거기서 곡마다 또는 모두 지웁니다.

- 파일은 내 FLAC과 같은 저장소에 둡니다(웹·PC 앱 IndexedDB `gaon-local-library`, iOS·Android 문서 폴더 `local-library`). 곡 정보는 보관함 저장소(`offlineTracks`)에 둡니다. 앨범 아트도 함께 받고, CD 라벨은 받지 않아 커버로 대신합니다.
- 한 번에 한 곡씩 받아 재생 중인 스트리밍을 방해하지 않습니다. 받는 동안 멈출 수 있고, 받지 못한 곡은 까닭(인터넷 연결, 기기 저장 공간 부족)과 고치는 방법을 알린 뒤 `남은 곡 저장`으로 다시 받습니다. 받던 곡은 앱을 다시 켜면 다시 저장해야 합니다.
- 진행은 목록 위 요약 글자로 보여 주고, 화면 낭독기에는 시작과 끝만 알립니다(`role="status"`). 실패는 `role="alert"`로 알립니다.
- 저장한 곡은 스트리밍 대신 저장한 파일로 재생합니다. 파일을 찾지 못하면 스트리밍합니다.
- 인터넷이 없어 카탈로그를 받지 못하면, 보관함은 저장한 곡의 정보로 목록을 보여 줍니다(`useTrackLookup`).
- 웹은 브라우저에 저장소 유지(`navigator.storage.persist`)를 요청합니다. 허락하지 않으면 저장 공간이 모자랄 때 브라우저가 지울 수 있습니다.
- 지운 곡이 재생 목록에 있으면 재생이 끊기지 않게, 웹은 재생 주소(blob, 파일 데이터를 붙잡음)를, 앱은 곡 파일을 곡이 큐에서 빠질 때까지 남겨 둡니다. 엔진은 큐를 바꿀 때마다 큐의 곡을 저장소에 알립니다(`releaseAudioUris`). 앨범 아트는 바로 지웁니다.
- 지울 파일은 보관함의 `fileTrash`에 지울 때까지 기억합니다. 미뤄 둔 채 앱을 끄거나 지우다 실패한 파일은 앱을 켤 때 지웁니다(`restoreOffline`). 지운 곡을 다시 저장하면 목록에서 빠집니다.
- 곡 목록의 행마다 저장 상태를 구독하지 않도록, 곡 메뉴의 항목은 메뉴를 열 때 한 번 구합니다.
- 오프라인 저장 목록은 기기마다 따로이고 동기화하지 않습니다.

## PC 앱 보안

- 화면 문서에 콘텐츠 보안 정책(CSP)을 붙입니다(`electron/main.cjs`). 스크립트는 앱에 든 파일과 `index.html`의 테마 스크립트(빌드 결과에서 해시를 계산, 브라우저처럼 줄바꿈을 LF로 맞춘 뒤 계산해 Windows의 CRLF 체크아웃에서도 맞음)만 실행하고, 스타일은 React Native Web·Unistyles가 런타임에 넣어 인라인을 허용합니다. 미디어·이미지·요청은 https와 개발용 미디어 서버(`localhost:8787`), blob만 받습니다.
- Electron fuses(`electron-builder.json`의 `electronFuses`): `ELECTRON_RUN_AS_NODE`와 `NODE_OPTIONS`를 무시하고, `app.asar`에서만 앱 코드를 읽으며, `file://` 추가 권한을 끕니다. `--inspect` 인자는 Playwright가 설치본을 검사할 때 써서 켜 둡니다. 서명하지 않은 macOS 앱은 fuse를 바꾼 뒤 ad-hoc 서명을 다시 합니다(`resetAdHocDarwinSignature`).
- `pnpm test:desktop`이 정책 위반이 없는지, 정책 밖의 인라인 스크립트가 막히는지, 테마 스크립트가 실제로 실행됐는지(`data-theme`) 확인합니다. 첫 문서에서 난 위반은 콘솔 감시가 놓칠 수 있어 마지막 확인이 필요합니다.
- 설정 화면의 앱 정보에서 GitHub의 최신 Release가 더 새 버전이면 내려받는 링크를 보여 줍니다(PC 앱만, 자동 업데이트는 코드 서명이 필요해 아직 없음).

## 테마

색은 `shared/config/theme.ts`의 토큰으로만 씁니다. 기본값은 시스템 설정을 따르고, 설정 화면에서 라이트나 다크로 고르면 `features/change-theme`이 저장합니다. 플레이어와 하단 재생 바는 `stage` 색을 쓰며, `stage`는 각 테마의 바탕과 글자색으로 만들어 라이트·다크 테마를 따릅니다. Storybook은 상단 도구 모음에서 테마를 바꿔 볼 수 있습니다.

디자인은 데이터 관제 화면 스타일입니다(레퍼런스: The Lobby의 Overwatch). 점 격자 바탕(`DotGrid`), 네 귀퉁이 꺾쇠를 단 가는 테두리 패널(`Panel`), 넓게 띄운 고정폭 라벨(`AppText` `label`), 가늘고 촘촘한 큰 제목과 깜빡이는 커서(`Cursor`), 칸을 나눈 막대 계기(`SegmentMeter`), 상태 표시등(`StatusDot`), `> 라벨` 모양의 명령 버튼(`AppButton` `command`)을 씁니다. 준비됨과 Hi-Res는 신호색(`signal`), 재생 중은 표시등 색(`live`)이며 늘 글자와 함께 보여 줍니다. 커서는 네 번만 깜빡이고 멈추며, 동작 줄이기에서는 깜빡이지 않습니다. 홈의 디스크 배치와 움직임, CD 라벨 그림은 이 스타일과 따로 둡니다.

| 역할 | 앱(iOS·Android) | 웹·PC 앱 |
|---|---|---|
| 제목·본문 `SANS_FONT`, `sansFont()` | LINE Seed Thin·Regular·Bold (`LINESeedKR-*-subset.ttf`) | 영문·숫자 Lexend, 한글 함렛(`public/fonts`, 줄인 이름 GaonSans) |
| 라벨·수치 `MONO_FONT` | Nanum Gothic Coding을 줄인 `GaonMono-app.ttf` (한글 포함) | `GaonMono-subset.woff2` (라틴 문자만, 한글은 다음 글꼴) |

- 웹·PC 앱의 함렛은 화면에 쓰는 글자만 담은 파일을 먼저 받고, 나머지 글자는 글자 묶음별 조각으로 나눠 그 글자를 쓸 때만 받습니다(`pnpm fonts`). 화면 글자가 바뀌면 `pnpm fonts`를 다시 돌립니다. 빠진 글자가 있으면 단위 테스트(`pnpm fonts --check`)가 실패합니다.
- 앱 글꼴은 KS X 1001 한글 2,350자와 라틴·문장 부호만 남긴 TTF입니다(`python scripts/subset-fonts.py`, fontTools 필요). 원본 12.5MB가 약 3MB가 됩니다. 원본 TTF는 다시 만들 때와 검사에 쓰고 앱에는 넣지 않습니다. 원본에 있던 화면 글자(카탈로그 자료 `scripts/generate-media.py` 포함)가 줄인 파일에서 빠지면 `pnpm fonts --check`가 실패합니다. 사용자가 가져온 FLAC 태그의 드문 한글은 운영체제가 시스템 글꼴로 대신 그립니다.
- OFL의 예약 이름(Nanum) 때문에 줄인 고정폭 글꼴은 이름을 GaonMono로 바꿨습니다. `assets/fonts`의 Diphylleia와 Nanum Myeongjo는 CD 라벨을 그릴 때만 씁니다(`scripts/disc_labels.py`).

## 아이콘

아이콘은 `shared/ui`의 `Icon`으로 그립니다. Ionicons에서 쓰는 아이콘만 남긴 8KB 글꼴(`assets/fonts/GaonIcons.ttf`)이라, `@expo/vector-icons`에서 직접 가져오지 않습니다. 패키지 입구에서 가져오면 모든 아이콘 묶음의 글리프 표가 함께 실립니다.

새 아이콘은 `scripts/subset-icons.py`의 `ICONS`에 이름을 넣고 `python scripts/subset-icons.py`(fontTools 필요)로 글꼴과 `iconGlyphs.ts`를 다시 만듭니다. 목록에 없는 이름은 타입 검사에서 걸립니다.

## 첫 화면 성능

- 카탈로그는 앱 입구(`src/_app/prefetch.ts`)에서 바로 요청하고, Pages 배포는 HTML에 미리 받기 태그를 넣습니다.
- Supabase SDK는 로그인 키가 있는 빌드에서 처음 필요할 때만 받습니다(`getSupabase`).
- 홈의 가운데 디스크 이미지를 혼자 먼저 받습니다(`shared/lib/firstImage.ts`). 옆 디스크와 아래 구역의 이미지는 그 이미지가 도착한 뒤에 받고, 오지 않으면 4초 뒤에 받습니다.
- 한글 웹 글꼴(함렛)은 화면 글자 파일만 먼저 받고, 나머지 조각 CSS는 페이지를 다 받은 뒤 한가할 때 붙입니다(`src/_app/attachFonts.ts`).
- 첫 묶음(gzip 약 520KB)의 대부분은 expo-router, React Native Web, Reanimated, react-dom입니다. Supabase(약 900KB 원본)는 따로 늦게 받고, 설정 화면의 `expo-web-browser`도 그 화면 묶음에만 있습니다. Reanimated가 Worklets 버전 확인에 `semver`를 함께 싣지만 라이브러리 안쪽이라 그대로 둡니다.
- 홈 디스크는 지금 순위에서 두 칸 앞까지만 이미지를 받습니다.

## 의존성 갱신 (Dependabot)

`.github/dependabot.yml`이 npm 패키지를 매주 확인해 부 버전·패치를 한 PR로 묶고, GitHub Actions는 매달 올립니다.

Expo SDK가 버전을 정하는 패키지(`expo*`, `jest-expo`, `react`, `react-native*`, `@react-native-*`)는 Dependabot에서 뺐습니다. Dependabot이 올리면 SDK 권장 버전과 어긋나 네이티브 빌드나 Expo Go에서 깨질 수 있고, CI는 네이티브 빌드를 하지 않아 이를 잡지 못합니다. 이 패키지들은 `npx expo install --fix`(SDK를 올릴 때는 `npx expo install expo@^새버전 --fix`)로만 올리고 `npx expo install --check`로 확인합니다.

## 품질 기준

- 구조는 `pnpm lint:fsd`(Steiger)로 검사합니다. 예외는 `steiger.config.ts`에 이유와 함께 적습니다.
- 새 화면은 `e2e/app.spec.ts`의 axe 검사 목록에 추가합니다. 프로덕션 빌드에서 360px과 1280px 너비, 다크 테마로 검사합니다.
- axe를 통과해도 KWCAG 준수는 아닙니다. 키보드 조작, 초점 표시, 대체 텍스트는 직접 확인합니다.
- 누를 수 있는 요소의 이름은 보이는 글자에서 나오게 합니다. 동작이나 부가 정보는 `aria-label` 대신 `VisuallyHidden`으로 덧붙입니다. (KWCAG 6.5.3 레이블과 네임)
- 상태를 색으로만 나타내지 않습니다. 선택은 체크 표시, 재생 중은 아이콘, 켜짐은 `IconButton`의 `badge`를 함께 씁니다. (KWCAG 5.4.1)
- 대화상자는 `Modal`에 `aria-label`을 넘겨 이름을 답니다. 웹의 `Modal`이 바깥에 `role="dialog"`를 만들므로 안쪽에 역할을 또 달지 않습니다.
- 되돌릴 수 없는 삭제는 `ConfirmDialog`로 한 번 더 묻습니다. (KWCAG 7.3.1)
- 앨범 아트 대체 텍스트는 `AlbumArt`의 `label`로 넘깁니다. 옆에 곡 정보가 있는 꾸밈 이미지라면 비워 둡니다.
- 알림 영역은 `LiveRegion`(`role="status"`·`role="alert"`)으로 처음부터 두고 내용만 바꿉니다. 영역이 내용과 함께 새로 생기면 읽지 않는 화면 낭독기가 있습니다. 비어 있을 때는 흐름 밖에 있어 간격을 바꾸지 않습니다.
- 입력 오류는 `FieldError`로 보여 주고 입력 칸의 `aria-describedby`·`aria-errormessage`로 연결합니다. 빈 칸은 잘못된 값이 아니라 `aria-invalid`를 붙이지 않습니다. 오류 문구에는 원인과 고치는 방법을 씁니다.
- 화면을 그리다 오류가 나면 루트의 `ErrorBoundary`(`src/_app/RouteError.tsx`)가 다시 시도와 홈으로 가기를 보여 줍니다.
- 슬라이스는 공개 API(`index.ts`)로만 가져옵니다.
