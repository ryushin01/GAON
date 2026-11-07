# CI · 배포

## 워크플로

| 파일 | 실행 시점 | 내용 |
|---|---|---|
| `ci.yml` | `main` 푸시, PR | lint, 타입 검사, 단위 테스트, 프로덕션 웹 빌드 E2E |
| `deploy-media.yml` | `main` 푸시(앱·미디어 변경), 수동 | 카탈로그와 FLAC, 웹 데모를 GitHub Pages에 배포 |
| `desktop.yml` | `v*` 태그, 수동 | Windows·macOS 설치본 빌드, 설치본 실행 검사, 아티팩트 업로드 |

## 공개 미디어

설치한 앱은 `https://ryushin01.github.io/GAON/media`에서 카탈로그와 FLAC을 받습니다. 첫 배포 전에 저장소의 **Settings → Pages → Source**를 **GitHub Actions**로 지정합니다. 이 주소가 열리기 전에는 설치본에서 스트리밍이 동작하지 않고, 내 FLAC만 재생할 수 있습니다.

미디어가 약 630MB라 Pages 동기화가 오래 걸릴 수 있습니다. `deploy-pages`가 10분 제한으로 실패하면 **Re-run failed jobs**로 배포 단계만 다시 실행합니다. 빌드 결과물은 그대로 쓰며, 첫 배포에서는 재시도 한 번으로 4분 만에 끝났습니다. `pnpm-workspace.yaml`처럼 감시 경로 밖의 파일만 바꾸면 자동으로 돌지 않으니, 필요하면 직접 실행합니다.

## PC 설치본

`desktop.yml`은 먼저 로컬 미디어 주소로 빌드해 실행 검사를 하고, 통과하면 공개 주소로 다시 빌드해 올립니다. 결과물은 실행 화면의 아티팩트에서 30일 동안 받을 수 있습니다. 오래 제공할 버전은 검사를 통과한 아티팩트를 [GitHub Release](https://github.com/ryushin01/GAON/releases)에 올립니다. `v*` 태그를 올리면 이 워크플로가 다시 돌지만, Release에 자동으로 올리지는 않습니다.

Apple Silicon Mac에서 Windows 설치본(NSIS)을 만들려면 Rosetta가 필요합니다. Windows 환경에서 앱을 실제로 실행해 보는 검사까지 하므로 `desktop.yml`로 만드는 것을 권장합니다. 이 검사는 설치 전 폴더의 앱으로 하며, 설치 마법사는 검사하지 않습니다.

설치본에는 코드 서명이 없습니다. 처음 실행할 때 Windows SmartScreen과 macOS Gatekeeper가 경고를 표시합니다.
