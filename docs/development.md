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

## 품질 기준

- 새 화면은 `e2e/app.spec.ts`의 axe 검사 목록에 추가합니다. 프로덕션 빌드에서 360px과 1280px 너비로 검사합니다.
- axe를 통과해도 KWCAG 준수는 아닙니다. 키보드 조작, 초점 표시, 대체 텍스트는 직접 확인합니다.
- 누를 수 있는 요소의 이름은 보이는 글자에서 나오게 합니다. 동작이나 부가 정보는 `aria-label` 대신 `VisuallyHidden`으로 덧붙입니다. (KWCAG 6.5.3 레이블과 네임)
- 앨범 아트 대체 텍스트는 `AlbumArt`의 `label`로 넘깁니다. 옆에 곡 정보가 있는 꾸밈 이미지라면 비워 둡니다.
- 슬라이스는 공개 API(`index.ts`)로만 가져옵니다.
