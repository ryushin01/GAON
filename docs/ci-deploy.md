# CI · 배포

## 워크플로

| 파일 | 실행 시점 | 내용 |
|---|---|---|
| `ci.yml` | `main` 푸시, PR | lint, 타입 검사, 단위 테스트, 프로덕션 웹 빌드 E2E |
| `deploy-media.yml` | `main` 푸시(앱·미디어 변경), 수동 | 카탈로그와 FLAC, 웹 데모를 GitHub Pages에 배포 |
| `desktop.yml` | `v*` 태그, 수동 | Windows·macOS 설치본 빌드, 설치본 실행 검사, 아티팩트 업로드 |

## 공개 미디어

설치한 앱은 `https://ryushin01.github.io/GAON/media`에서 카탈로그와 FLAC을 받습니다. 첫 배포 전에 저장소의 **Settings → Pages → Source**를 **GitHub Actions**로 지정합니다. 이 주소가 열리기 전에는 설치본에서 스트리밍이 동작하지 않고, 내 FLAC만 재생할 수 있습니다.

## PC 설치본

`desktop.yml`은 먼저 로컬 미디어 주소로 빌드해 실행 검사를 하고, 통과하면 공개 주소로 다시 빌드해 올립니다. 결과물은 실행 화면의 아티팩트에서 30일 동안 받을 수 있습니다.

Apple Silicon Mac에서 Windows 설치본(NSIS)을 만들려면 Rosetta가 필요합니다. 설치 파일을 Windows에서 실제로 실행해 보는 검사까지 하므로 `desktop.yml`로 만드는 것을 권장합니다.

설치본에는 코드 서명이 없습니다. 처음 실행할 때 Windows SmartScreen과 macOS Gatekeeper가 경고를 표시합니다.
