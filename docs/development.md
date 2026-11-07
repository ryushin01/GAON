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

탭과 상세 화면은 모두 `app/(tabs)`의 `Stack` 하나로 이동합니다. `Tabs`의 숨김 탭(`href: null`)으로 상세 화면을 두면 웹에서 경로가 홈으로 풀리는 문제가 있어 쓰지 않습니다. 하단 탭과 사이드바는 `widgets/app-shell`에 직접 구현했습니다.

이전 화면은 숨겨진 채 DOM에 남습니다. 그래서 `Screen`은 현재 화면에만 `id="main"`을 달아 본문 바로가기 대상을 하나로 유지합니다.

## 음질

2026-11-07에 Chromium(웹과 PC 앱이 쓰는 엔진)에서 24bit/192kHz 파일로 측정했습니다.

| 단계 | 결과 |
|---|---|
| 앱에 저장한 파일 | SHA-256이 원본과 같음 |
| 디코딩한 PCM (192kHz 그대로) | MD5가 FLAC 헤더에 기록된 원본 PCM의 MD5와 같음 |
| 출력 (시험 환경의 장치 샘플레이트 48kHz) | 재생할 때 Chromium이 48kHz로 재샘플링함 |

즉 파일과 디코딩은 무손실이지만 **비트 퍼펙트 출력은 아닙니다.** iOS(AVPlayer)와 Android(ExoPlayer)도 일반 재생 경로라 운영체제의 믹서를 거치며, 이 두 플랫폼은 위와 같은 측정을 하지 않았습니다. 블루투스는 전송 코덱에 따라 다시 압축될 수 있습니다. 장치 독점 출력을 지원하려면 expo-audio가 아닌 플랫폼별 네이티브 오디오 구현이 필요합니다.

## 테마

색은 `shared/config/theme.ts`의 토큰으로만 씁니다. 기본값은 시스템 설정을 따르고, 설정 화면에서 라이트나 다크로 고르면 `features/change-theme`이 저장합니다. 플레이어는 앨범 아트가 돋보이도록 테마와 상관없이 어두운 `stage` 색을 씁니다. Storybook은 상단 도구 모음에서 테마를 바꿔 볼 수 있습니다.

## 품질 기준

- 새 화면은 `e2e/app.spec.ts`의 axe 검사 목록에 추가합니다. 프로덕션 빌드에서 360px과 1280px 너비, 다크 테마로 검사합니다.
- axe를 통과해도 KWCAG 준수는 아닙니다. 키보드 조작, 초점 표시, 대체 텍스트는 직접 확인합니다.
- 누를 수 있는 요소의 이름은 보이는 글자에서 나오게 합니다. 동작이나 부가 정보는 `aria-label` 대신 `VisuallyHidden`으로 덧붙입니다. (KWCAG 6.5.3 레이블과 네임)
- 상태를 색으로만 나타내지 않습니다. 선택은 체크 표시, 재생 중은 아이콘, 켜짐은 `IconButton`의 `badge`를 함께 씁니다. (KWCAG 5.4.1)
- 대화상자는 `Modal`에 `aria-label`을 넘겨 이름을 답니다. 웹의 `Modal`이 바깥에 `role="dialog"`를 만들므로 안쪽에 역할을 또 달지 않습니다.
- 되돌릴 수 없는 삭제는 `ConfirmDialog`로 한 번 더 묻습니다. (KWCAG 7.3.1)
- 앨범 아트 대체 텍스트는 `AlbumArt`의 `label`로 넘깁니다. 옆에 곡 정보가 있는 꾸밈 이미지라면 비워 둡니다.
- 슬라이스는 공개 API(`index.ts`)로만 가져옵니다.
