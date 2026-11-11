# 개발 가이드

## 환경 변수

| 이름 | 설명 |
|---|---|
| `EXPO_PUBLIC_MEDIA_BASE_URL` | 카탈로그와 FLAC을 받을 주소입니다. 비워 두면 공개 주소 `https://ryushin01.github.io/GAON/media`를 씁니다. 빌드할 때 번들에 들어갑니다. |

로컬 미디어 서버를 쓸 때만 `.env.local`에 `http://localhost:8787`을 지정합니다.

## 데모 미디어

`scripts/generate-media.py`가 가상의 카탈로그와 앨범 아트, 24bit FLAC을 합성해 `public-media/`에 만듭니다. 용량이 커서(약 630MB) 저장소에는 올리지 않습니다.

- 곡 102개 중 100개가 TOP 100에 들어갑니다.
- 차트 1위는 유신의 「빛 (The Light)」로 고정합니다. 유신은 싱어송라이터이므로 곡마다 작사·작곡을 유신으로 표기합니다.
- `pnpm media:serve`는 재생 위치 이동에 필요한 Range 요청을 지원합니다.

## 네이티브 빌드

`ios/`와 `android/`는 `expo prebuild`로 만드는 폴더이고 저장소에 올리지 않습니다. 네이티브 설정은 `app.json`에서 바꿉니다.

```bash
pnpm exec expo prebuild
pnpm exec expo run:ios --configuration Release
pnpm exec expo run:android --variant release   # JDK 21 필요
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
| 앱 동작 | `pnpm test:desktop`: 시험 출력(`GAON_AUDIO_BACKEND=null`)으로 재생, 위치 이동, 다음 곡, 로컬 FLAC 확인 | CI에서 macOS, Windows |
| 실제 장치 | MacBook Pro 스피커에서 곡별 샘플레이트 전환, 독점, 복원 확인 | macOS 수동 |

알아 둘 점:

- 비트 퍼펙트는 앱이 장치로 보내는 데이터까지 보장합니다. 장치의 볼륨, EQ, DSP는 앱 밖에 있습니다. MacBook 내장 스피커처럼 자체 처리를 하는 장치는 소리까지 원본 그대로라고 할 수 없어, 외장 DAC를 권합니다.
- macOS HAL 입력은 float32입니다. 24비트 이하 값은 손실 없이 들어가고, 장치 실제 비트 수가 곡보다 낮으면 비트 퍼펙트로 표시하지 않습니다. 32비트 FLAC은 macOS에서 지원하지 않습니다.
- **Windows WASAPI 독점은 실제 장치로 시험하지 못했습니다.** CI는 컴파일, 무손실 변환, 장치가 없을 때 충돌하지 않는지만 검사합니다(`pnpm test:native:smoke <FLAC>`).
- 곡은 재생 전에 끝까지 내려받아 캐시합니다(최대 2GB). 곡 사이 무간격 재생과 재생 중 출력 장치 변경 대응은 아직 없습니다.
- Android(14 이상, USB DAC)와 iOS는 아직 지원하지 않습니다. iOS에는 독점 API가 없습니다.

## 테마

색은 `shared/config/theme.ts`의 토큰으로만 씁니다. 기본값은 시스템 설정을 따르고, 설정 화면에서 라이트나 다크로 고르면 `features/change-theme`이 저장합니다. 플레이어와 하단 재생 바는 `stage` 색을 쓰며, `stage`는 각 테마의 바탕과 글자색으로 만들어 라이트·다크 테마를 따릅니다. Storybook은 상단 도구 모음에서 테마를 바꿔 볼 수 있습니다.

제목 글꼴은 Nanum Myeongjo(OFL)입니다. 앱은 `assets/fonts/NanumMyeongjo-Regular.ttf` 원본을, 웹과 PC 앱은 KS X 1001 한글과 라틴 문자만 남긴 `GaonSerif-subset.woff2`를 씁니다. OFL의 예약 이름 때문에 글자를 줄인 파일은 글꼴 이름을 GaonSerif로 바꿨습니다.

## 아이콘

아이콘은 `shared/ui`의 `Icon`으로 그립니다. Ionicons에서 쓰는 아이콘만 남긴 8KB 글꼴(`assets/fonts/GaonIcons.ttf`)이라, `@expo/vector-icons`에서 직접 가져오지 않습니다. 패키지 입구에서 가져오면 모든 아이콘 묶음의 글리프 표가 함께 실립니다.

새 아이콘은 `scripts/subset-icons.py`의 `ICONS`에 이름을 넣고 `python scripts/subset-icons.py`(fontTools 필요)로 글꼴과 `iconGlyphs.ts`를 다시 만듭니다. 목록에 없는 이름은 타입 검사에서 걸립니다.

## 첫 화면 성능

- 카탈로그는 앱 입구(`src/_app/prefetch.ts`)에서 바로 요청하고, Pages 배포는 HTML에 미리 받기 태그를 넣습니다.
- Supabase SDK는 로그인 키가 있는 빌드에서 처음 필요할 때만 받습니다(`getSupabase`).
- 홈 디스크는 지금 순위에서 두 칸 앞까지만 이미지를 받고, 가운데 디스크를 먼저 받습니다.

## 품질 기준

- 구조는 `pnpm lint:fsd`(Steiger)로 검사합니다. 예외는 `steiger.config.ts`에 이유와 함께 적습니다.
- 새 화면은 `e2e/app.spec.ts`의 axe 검사 목록에 추가합니다. 프로덕션 빌드에서 360px과 1280px 너비, 다크 테마로 검사합니다.
- axe를 통과해도 KWCAG 준수는 아닙니다. 키보드 조작, 초점 표시, 대체 텍스트는 직접 확인합니다.
- 누를 수 있는 요소의 이름은 보이는 글자에서 나오게 합니다. 동작이나 부가 정보는 `aria-label` 대신 `VisuallyHidden`으로 덧붙입니다. (KWCAG 6.5.3 레이블과 네임)
- 상태를 색으로만 나타내지 않습니다. 선택은 체크 표시, 재생 중은 아이콘, 켜짐은 `IconButton`의 `badge`를 함께 씁니다. (KWCAG 5.4.1)
- 대화상자는 `Modal`에 `aria-label`을 넘겨 이름을 답니다. 웹의 `Modal`이 바깥에 `role="dialog"`를 만들므로 안쪽에 역할을 또 달지 않습니다.
- 되돌릴 수 없는 삭제는 `ConfirmDialog`로 한 번 더 묻습니다. (KWCAG 7.3.1)
- 앨범 아트 대체 텍스트는 `AlbumArt`의 `label`로 넘깁니다. 옆에 곡 정보가 있는 꾸밈 이미지라면 비워 둡니다.
- 슬라이스는 공개 API(`index.ts`)로만 가져옵니다.
