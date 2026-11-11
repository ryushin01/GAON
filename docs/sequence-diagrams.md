# 시퀀스 다이어그램

GAON의 주요 흐름입니다. 코드 위치는 저장소 루트 기준입니다.

## 1. 비트 퍼펙트 재생 (PC 앱)

설정에서 **비트 퍼펙트 (독점)** 를 켜면 Chromium 대신 `native/gaon-audio` 재생기가 소리를 냅니다.

```mermaid
sequenceDiagram
    actor 사용자
    participant 화면 as 플레이어<br/>(features/player)
    participant 프리로드 as window.gaonAudio<br/>(electron/preload.cjs)
    participant 메인 as Electron 메인<br/>(electron/native-audio.cjs)
    participant 캐시 as 앱 캐시 폴더
    participant 재생기 as gaon-audio (C)
    participant 장치 as 출력 장치<br/>(Core Audio / WASAPI)

    사용자->>화면: 곡 재생
    화면->>프리로드: prepareUrl(FLAC 주소)
    프리로드->>메인: ipc audio:prepareUrl
    메인->>메인: 허용한 미디어 주소인지 확인
    alt 캐시에 없음
        메인->>캐시: 내려받아 SHA-256 이름으로 저장
    end
    메인-->>화면: 파일 이름
    화면->>메인: ipc audio:load(이름)
    Note over 화면,메인: 곡을 빨리 넘기면 마지막 곡만 load
    메인->>재생기: 처음이면 실행(spawn), stdin "load 경로"
    재생기->>장치: macOS hog 모드 + 샘플레이트 전환<br/>Windows 독점 모드를 곡 형식으로 열기
    alt 장치가 형식을 받지 않거나 다른 앱이 사용 중
        재생기->>장치: 공유 모드로 재생
        재생기-->>메인: stdout {bitPerfect: false, 이유}
    else
        재생기-->>메인: stdout {bitPerfect: true, 샘플레이트, 비트}
    end
    메인-->>화면: 상태 전달
    화면-->>사용자: 출력 배지에 실제 출력 상태 표시
    사용자->>화면: 일시정지 / 위치 이동
    화면->>메인: audio:command / audio:seek
    메인->>재생기: stdin 명령
```

## 2. 로그인과 보관함 동기화

빌드에 Supabase 키가 있으면 실제 소셜 로그인, 없으면 데모 로그인이나 소유자 로그인(GitHub 토큰, 비공개 Gist)으로 동작합니다.

```mermaid
sequenceDiagram
    actor 사용자
    participant 설정 as 설정 화면<br/>(_pages/settings)
    participant 로그인 as 로그인 창<br/>(웹: 같은 페이지, PC: 시스템 브라우저, 앱: expo-web-browser)
    participant 수파 as Supabase Auth (PKCE)
    participant 동기화 as sync-library
    participant 서버 as 보관함 저장소<br/>(Supabase 또는 비공개 Gist)

    사용자->>설정: 카카오 / Google / GitHub 로그인
    alt 키가 있는 빌드
        설정->>로그인: 로그인 창 열기
        로그인->>수파: 인증
        수파-->>로그인: gaon://auth-callback?code=…
        로그인->>수파: 코드 교환
        수파-->>설정: 세션
    else 키가 없는 빌드
        설정-->>사용자: 데모 로그인 (보관함은 이 기기에만)
    end
    설정->>동기화: 로그인됨
    동기화->>서버: 서버의 마지막 저장 시각
    동기화->>동기화: decideSync(기기 기록, 사용자, 서버 시각)
    alt 서버에 없음
        동기화->>서버: push
    else 다른 계정이었거나 양쪽 모두 바뀜
        동기화->>서버: 합친 보관함 저장 (merge)
    else 서버만 바뀜
        서버-->>동기화: pull
    else 기기만 바뀜
        동기화->>서버: push
    end
    Note over 동기화,서버: 가져온 내 FLAC 파일은 올리지 않음
```

## 3. 첫 화면과 스트리밍

```mermaid
sequenceDiagram
    actor 사용자
    participant 앱 as 앱 시작<br/>(_app/prefetch.ts)
    participant 미디어 as 미디어 서버<br/>(catalog.json, FLAC, 앨범 아트)
    participant 홈 as 홈 디스크 무대
    participant 재생 as 재생기<br/>(웹·모바일: expo-audio)

    앱->>미디어: prefetchCatalog (화면 코드를 받는 동안 먼저 요청)
    미디어-->>앱: 카탈로그 (TanStack Query 캐시)
    앱->>홈: 렌더링
    홈->>미디어: 보이는 디스크의 앨범 아트만 요청
    사용자->>홈: 곡 선택
    홈->>재생: FLAC 주소
    재생->>미디어: 스트리밍
    재생-->>사용자: 재생 (출력은 운영체제 믹서를 거침)
```
