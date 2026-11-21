# AGENTS.md — GAON

이 저장소에서 일하는 AI 에이전트(Codex, Claude Code 등)를 위한 안내입니다. 자세한 내용은 [개발 가이드](docs/development.md), [CI · 배포](docs/ci-deploy.md), [로그인](docs/auth.md)에 있습니다.

## 1. 프로젝트 개요

- 손실 압축 없이 Hi-Res FLAC만 스트리밍하는 음악 앱입니다. 백엔드 없이 정적 카탈로그와 FLAC을 받아 동작하고, 가수·앨범·가사·순위는 가상 데이터, 음원·앨범 아트는 코드로 합성합니다.
- 화면 축 2개: 모바일 앱(iOS·Android, Expo) · PC 앱(Electron, Windows·macOS). 웹 데모는 모바일 앱의 웹 빌드입니다.
- 웹 데모: https://ryushin01.github.io/GAON/ · PC 설치본: https://github.com/ryushin01/GAON/releases/latest
- 공개 미디어(카탈로그·FLAC): `https://ryushin01.github.io/GAON/media`

## 2. 기술 스택과 구조

- Expo SDK 58(expo-router, expo-audio), React Native 0.88 + React Native Web, React 19, TypeScript 6, Unistyles, TanStack Query, Zustand, Supabase(선택), Electron 45(PC 앱), C 비트 퍼펙트 재생기(`native/gaon-audio`, macOS Core Audio HAL·Windows WASAPI 독점).
- Feature-Sliced Design(Expo Router `app/`와 겹치지 않게 층 이름을 바꿈): `src/_app` → `_pages` → `widgets` → `features` → `entities` → `shared`. 슬라이스는 공개 API(`index.ts`)로만 가져옵니다. `pnpm lint:fsd`(Steiger)로 검사하고 예외는 `steiger.config.ts`에 이유와 함께 적습니다.
- `ios/`·`android/`는 `expo prebuild`로 만드는 폴더라 커밋하지 않습니다. 네이티브 설정은 `app.json`에서 바꿉니다.
- 재생 엔진은 `features/player/model/engine.ts`입니다. 큐를 바꾸는 작업은 `serial` 줄을 거치게 합니다.

## 3. 설치·개발 명령

- Node.js 22(`.nvmrc`), pnpm 12, Python 3(numpy·soundfile·pillow). 네이티브 빌드에는 Xcode 또는 Android Studio(JDK 21).

```bash
nvm use
corepack enable pnpm
pnpm install
pip install numpy soundfile pillow
pnpm media:generate      # 카탈로그와 FLAC 생성(public-media/, 커밋하지 않음)
pnpm media:serve         # http://localhost:8787
pnpm web                 # 또는 pnpm ios, pnpm android
pnpm desktop             # 웹 빌드를 PC 앱으로 실행
```

- 환경 변수(`.env.example`): `EXPO_PUBLIC_MEDIA_BASE_URL`(로컬 미디어 서버를 쓸 때만 `.env.local`에), `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(로그인을 켤 때만). PC 앱 검사용: `GAON_EXECUTABLE`, `GAON_AUDIO_BACKEND`.
- `pnpm ios`·`pnpm android`는 빌드 전에 `expo prebuild --no-clean`으로 `app.json`을 다시 적용합니다. 설정을 빼거나 끈 뒤에는 `--no-clean` 없이 prebuild합니다.
- Expo SDK가 버전을 정하는 패키지(`expo*`, `jest-expo`, `react`, `react-native*`, `@react-native-*`)는 `npx expo install --fix`로만 올리고 `npx expo install --check`로 확인합니다(Dependabot에서 제외).

## 4. 검사·테스트 명령

CI(`.github/workflows/ci.yml`) 순서입니다. PR 전에 로컬에서 같은 순서로 돌립니다.

```bash
pnpm lint            # expo lint
pnpm lint:fsd        # Steiger
pnpm typecheck
pnpm test            # Jest(jest-expo)
pnpm build:storybook
python scripts/generate-media.py public-media
pnpm build:native
pnpm test:native public-media/audio/glass-city-1.flac public-media/audio/glass-city-2.flac public-media/audio/album-28-1.flac
SMOKE_SKIP_REAL=1 pnpm test:native:smoke public-media/audio/glass-city-1.flac public-media/audio/glass-city-2.flac
EXPO_PUBLIC_MEDIA_BASE_URL=http://localhost:8787 pnpm build:web
pnpm test:e2e        # 프로덕션 웹 빌드, phone·wide·dark, axe
```

- CI의 `native-windows` 작업은 Windows에서 재생기를 컴파일·검사합니다. 재생기 코드가 바뀐 PR에서는 `오디오 장치 검사`(`audio-device.yml`, Windows 가상 장치 VB-CABLE)도 돕니다.
- 그 밖: `pnpm test:desktop`(설치본 실행 검사, `GAON_EXECUTABLE` 필요), `pnpm test:native:device`(실제 출력 장치, 소리가 남), `pnpm fonts`(화면 글자가 바뀌면 다시 실행, 빠진 글자는 단위 테스트가 잡음), `pnpm screenshots`.
- 새 화면은 `e2e/app.spec.ts`의 axe 검사 목록에 더합니다.

## 5. 코드 스타일

- ESLint(`eslint-config-expo`), TypeScript strict. 색은 `shared/config/theme.ts` 토큰으로만 씁니다. 아이콘은 `shared/ui`의 `Icon`으로 그리고 `@expo/vector-icons`에서 직접 가져오지 않습니다(새 아이콘은 `scripts/subset-icons.py`).
- 접근성(KWCAG 2.2): 네이티브 요소 먼저, 텍스트 대비 4.5:1 이상, 키보드 조작과 보이는 초점, 조작 크기 24×24px 이상.
  - 누를 수 있는 요소의 이름은 보이는 글자에서 나오게 하고, 덧붙일 정보는 `aria-label` 대신 `VisuallyHidden`으로(6.5.3).
  - 상태를 색으로만 나타내지 않습니다(5.4.1). 되돌릴 수 없는 삭제는 `ConfirmDialog`로 한 번 더 묻습니다(7.3.1).
  - 입력 오류는 `FieldError`로 보여 주고 `aria-describedby`·`aria-errormessage`로 연결합니다. 빈 칸에는 `aria-invalid`를 붙이지 않습니다.
  - 알림은 처음부터 있는 `LiveRegion`(`role="status"`·`role="alert"`)의 내용만 바꿉니다. 대화상자는 `Modal`에 `aria-label`을 넘깁니다.
  - axe 통과가 KWCAG 준수는 아닙니다. 키보드·초점·대체 텍스트는 직접 확인합니다.

## 6. Git·PR

- `main`에 직접 커밋·푸시하지 않습니다. 최신 `main`에서 `feat/…`, `fix/…`, `docs/…`, `chore/…`, `test/…` 브랜치를 만들어 PR을 올립니다.
- 커밋·PR 제목은 한국어 요약 뒤 괄호 버전: `feat: 좋아요·플레이리스트 곡 오프라인 저장 (0.14.0)`, `fix: … (0.11.2)`. 버전 공개 PR은 `chore: 1.0.2 - Expo SDK 58 패키지 권장 버전, …`. 문서·테스트만 바꾸면 버전 없이 `docs: …`, `test: …`.
- 버전을 올릴 때는 `package.json`과 `app.json`의 `version`, README 배지, `CHANGELOG.md`(`## 1.0.2 - 2026-11-20` 형식 제목과 목록)를 함께 고칩니다.
- 병합은 squash(`제목 (#번호)`)이고 병합한 브랜치는 저장소 설정이 지웁니다. CI가 통과하면 바로 병합하고 CodeRabbit 리뷰는 기다리지 않습니다.

## 7. 배포·릴리스

- **웹 데모와 공개 미디어:** `main`에 앱·미디어 관련 파일(`src/**`, `app/**`, `public/**`, `app.json`, 미디어 스크립트)이 들어가면 `deploy-media.yml`이 GitHub Pages(`/GAON`)에 배포합니다. 즉 병합이 곧 배포입니다. 사용자가 배포일을 정해 두면 그 전에는 병합하지 않고 PR만 올려 둡니다. 감시 경로 밖만 바꿨으면 워크플로를 직접 실행합니다. Pages 동기화가 시간 초과로 실패하면 Re-run보다 새로 실행합니다.
- **데모 모드:** Supabase 키가 없는 빌드(지금 공개 데모)는 데모 로그인으로 이 기기에만 저장합니다.
- **PC 설치본·릴리스:** 버전을 올려 `main`에 병합한 뒤 `git tag vX.Y.Z && git push origin vX.Y.Z`. `desktop.yml`이 Windows·macOS 설치본을 만들어 실행 검사 후 GitHub Release(제목 `GAON X.Y.Z`, 본문은 CHANGELOG 해당 절 + `.github/release-notes.md`)를 공개합니다. 태그·`package.json`·`app.json` 버전이 다르거나 기록이 없으면 멈춥니다. 공개된 Release는 덮어쓰지 않습니다. 설치본은 코드 서명이 없습니다.
- 릴리스 뒤 백업 `bash ~/Documents/Archive/Backup/backup.sh`(DONE 확인), 보관함 계획 문서 `~/Documents/Obsidian Vault/GAON v1.0.0 고도화 계획.md`에 날짜와 진행 기록. 소개가 크게 바뀌면 프로필 저장소 `ryushin01/ryushin01` README 표를 고칩니다.

## 8. 보안·주의사항

- 비밀값과 `.env*`는 커밋하지 않습니다. Supabase publishable 키는 공개용이라 저장소 변수(`vars`)로 빌드에 넣습니다. 그 밖의 키를 화면 코드에 넣지 않습니다.
- 소유자 로그인 토큰은 Gist 권한만 줍니다(`docs/auth.md`). 내 FLAC과 오프라인 저장 곡은 서버에 올리지 않습니다.
- PC 앱의 CSP(`electron/main.cjs`)와 Electron fuses(`electron-builder.json`)를 느슨하게 바꾸지 않습니다. `pnpm test:desktop`이 정책 위반을 검사합니다.
- Windows WASAPI 독점은 하드웨어 장치로는 아직 시험하지 못했습니다. 비트 퍼펙트·갭리스를 "확인됨"이라고 쓸 때는 검사 범위(docs/development.md 표)를 따릅니다.

## 9. 공통 규칙

공통 규칙은 `~/Documents/GitHub/CLAUDE.md`에 있습니다(이 파일과 충돌하면 이 파일이 우선). 요점:

- 답변·커밋·PR·문서는 한국어로 씁니다.
- 허락을 묻지 않고 끝까지 진행한 뒤 결과를 한 번에 보고합니다. 비용·비밀값·디자인 결정·되돌릴 수 없는 공개 행동은 하지 않고 보고합니다.
- 사용자의 진행 중인 작업을 보호합니다. 로컬 변경이 있으면 `git worktree add /tmp/<이름> -b <브랜치> origin/main`에서 작업하고 끝나면 지웁니다.
- 다른 세션에 공지할 때는 ryushin01 그룹 세션에만 보냅니다.
