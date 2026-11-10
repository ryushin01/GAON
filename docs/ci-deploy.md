# CI · 배포

## 워크플로

| 파일 | 실행 시점 | 내용 |
|---|---|---|
| `ci.yml` | `main` 푸시, PR | lint, 타입 검사, 단위 테스트, 프로덕션 웹 빌드 E2E |
| `deploy-media.yml` | `main` 푸시(앱·미디어 변경), 수동 | 카탈로그와 FLAC, 웹 데모를 GitHub Pages에 배포 |
| `desktop.yml` | `v*` 태그, 수동 | Windows·macOS 설치본 빌드, 설치본 실행 검사, 아티팩트 업로드, 태그일 때 GitHub Release 공개 |

## 공개 미디어

설치한 앱은 `https://ryushin01.github.io/GAON/media`에서 카탈로그와 FLAC을 받습니다. 첫 배포 전에 저장소의 **Settings → Pages → Source**를 **GitHub Actions**로 지정합니다. 이 주소가 열리기 전에는 설치본에서 스트리밍이 동작하지 않고, 내 FLAC만 재생할 수 있습니다.

미디어가 약 630MB라 Pages 동기화가 기본 제한인 10분을 넘기는 일이 잦아, `deploy-pages`의 제한 시간을 30분으로 늘려 두었습니다. 그래도 실패하면 **Re-run failed jobs**보다 워크플로를 새로 실행하는 편이 낫습니다. 시간 초과로 취소된 배포를 같은 커밋으로 다시 실행하면 곧바로 취소되는 경우가 있었습니다. `pnpm-workspace.yaml`처럼 감시 경로 밖의 파일만 바꾸면 자동으로 돌지 않으니, 필요하면 직접 실행합니다.

## PC 설치본

`desktop.yml`은 비트 퍼펙트 재생기를 빌드해 무손실 검사를 한 뒤, 로컬 미디어 주소로 빌드해 실행 검사를 하고, 통과하면 공개 주소로 다시 빌드해 올립니다. 결과물은 실행 화면의 아티팩트에서 30일 동안 받을 수 있습니다.

### 새 버전 공개

1. `package.json`과 `app.json`의 `version`을 함께 올립니다.
2. `CHANGELOG.md`에 `## [0.2.0](https://github.com/ryushin01/GAON/releases/tag/v0.2.0) - 날짜` 형식으로 변경 내용을 적고 `main`에 올립니다.
3. 같은 버전의 태그를 올립니다.

```bash
git tag v0.2.0
git push origin v0.2.0
```

Windows와 macOS가 모두 통과하면 [GitHub Release](https://github.com/ryushin01/GAON/releases)가 공개됩니다. 설명은 `CHANGELOG.md`의 해당 버전과 `.github/release-notes.md`로 만듭니다.

- 태그, `package.json`, `app.json`의 버전이 다르거나 버전 기록이 없으면 빌드 전에 멈춥니다.
- 파일을 초안에 모두 올린 뒤 공개합니다. 중간에 실패하면 **Re-run failed jobs**로 이어서 올립니다.
- 이미 공개된 Release는 덮어쓰지 않습니다. 고치려면 새 버전을 올립니다.
- `v1.0.0-rc.1`처럼 하이픈이 있는 태그는 시험판으로 공개하고 최신 버전으로 표시하지 않습니다.

Apple Silicon Mac에서 Windows 설치본(NSIS)을 만들려면 Rosetta가 필요합니다. Windows 환경에서 앱을 실제로 실행해 보는 검사까지 하므로 `desktop.yml`로 만드는 것을 권장합니다. 이 검사는 설치 전 폴더의 앱으로 하며, 설치 마법사는 검사하지 않습니다.

설치본에는 코드 서명이 없습니다. 처음 실행할 때 Windows SmartScreen과 macOS Gatekeeper가 경고를 표시합니다.
