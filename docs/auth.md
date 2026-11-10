# 로그인과 보관함 동기화

카카오, Google, GitHub 소셜 로그인으로 좋아요, 최근 재생, 플레이리스트를 기기 사이에 맞춥니다. 가져온 내 FLAC 파일은 서버에 올리지 않습니다. 로그인하지 않아도 모든 기능을 쓸 수 있습니다.

`EXPO_PUBLIC_SUPABASE_URL`과 `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 없는 빌드에서는 로그인 화면이 나오지 않습니다.

## 구조

| 구성 | 위치 | 하는 일 |
|---|---|---|
| Supabase 클라이언트 | `src/shared/api/supabase.ts` | 키가 있을 때만 만들고, PKCE 방식으로 로그인합니다. |
| 로그인 상태 | `src/entities/session` | 저장된 로그인을 읽고 바뀔 때마다 따라갑니다. |
| 로그인 화면 | `src/_pages/settings` | 소셜 로그인, 로그아웃, 계정 삭제 |
| 보관함 동기화 | `src/features/sync-library` | 처음엔 합치고, 그 뒤엔 바뀔 때마다 올립니다. |
| 데이터베이스 | `supabase/migrations` | 사람마다 보관함 한 줄, 행 단위 보안, 계정 삭제 함수 |

로그인 방식은 플랫폼마다 다릅니다.

| 플랫폼 | 방식 |
|---|---|
| 웹 | 로그인 뒤 그 페이지로 돌아와 주소의 코드를 바로 처리합니다. |
| PC 앱 | 시스템 브라우저에서 로그인하고 `gaon://auth-callback`으로 돌아옵니다. Google은 앱 안의 로그인 창을 막습니다. |
| iOS·Android | `expo-web-browser`로 로그인 창을 열고 `gaon://auth-callback`으로 돌아옵니다. |

동기화는 기기와 서버의 마지막 저장 시각을 비교합니다. 이 기기에서 처음 로그인한 계정이거나 양쪽이 모두 바뀌었으면 합치고, 한쪽만 바뀌었으면 그쪽 값을 씁니다. 판단 규칙은 `features/sync-library/model/merge.ts`의 `decideSync`에 있습니다.

## 설정하기

### 1. Supabase 프로젝트

1. [Supabase](https://supabase.com)에서 프로젝트를 만듭니다. 지역은 서울(`ap-northeast-2`)을 권합니다. 개인정보 처리방침의 위치 항목에 같은 지역을 적습니다.
2. SQL Editor에서 `supabase/migrations/20261110000000_libraries.sql`을 실행합니다.
3. Project Settings > API에서 **Project URL**과 **Publishable key**를 복사합니다. 서버 전용 키(secret, service_role)는 쓰지 않습니다.

### 2. 돌아올 주소 허용

Authentication > URL Configuration의 Redirect URLs에 다음을 넣습니다.

```
https://ryushin01.github.io/GAON/**
http://localhost:8081/**
gaon://auth-callback
```

### 3. 로그인 서비스 등록

세 서비스 모두 콜백 주소는 `https://<프로젝트>.supabase.co/auth/v1/callback`입니다. 받은 키를 Supabase의 Authentication > Sign In / Providers에 넣고 켭니다.

| 서비스 | 등록하는 곳 | 알아 둘 점 |
|---|---|---|
| 카카오 | [Kakao Developers](https://developers.kakao.com) > 내 애플리케이션 | 카카오 로그인을 켜고 Redirect URI에 콜백 주소를 넣습니다. REST API 키를 Client ID로, 보안의 Client Secret을 Secret으로 씁니다. 이메일 동의 항목은 비즈 앱 인증이 필요해, 받지 않는다면 Supabase의 카카오 설정에서 이메일 없이 가입 허용을 켭니다. |
| Google | [Google Cloud Console](https://console.cloud.google.com) > API 및 서비스 > 사용자 인증 정보 | OAuth 동의 화면을 만든 뒤 웹 애플리케이션 클라이언트를 만들고, 승인된 리디렉션 URI에 콜백 주소를 넣습니다. |
| GitHub | GitHub > Settings > Developer settings > OAuth Apps | Authorization callback URL에 콜백 주소를 넣습니다. |

### 4. 빌드에 키 넣기

로컬은 `.env`에, 배포는 GitHub 저장소 변수(Settings > Secrets and variables > Actions > Variables)에 넣습니다. Publishable key는 화면 코드에 들어가도 되는 공개용 키라 변수로 둡니다.

| 저장소 변수 | 값 |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key |

웹 배포와 PC 설치본 빌드가 이 변수를 읽습니다. 넣은 뒤 다음 배포부터 로그인이 보입니다.

## 개인정보

`public/privacy.html`이 개인정보 처리방침 초안입니다. 공개 전에 저장 지역을 채우고 내용을 직접 확인합니다. 설정 화면의 링크는 `https://ryushin01.github.io/GAON/privacy.html`을 엽니다.
