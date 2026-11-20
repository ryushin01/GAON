/**
 * 내 FLAC의 id 앞머리입니다. 내 FLAC과 오프라인 저장한 스트리밍 곡은 같은 자리에 id를 이름으로 저장하므로,
 * 이 앞머리로 시작하는 id의 스트리밍 곡은 저장하지 않아 내 FLAC 파일을 덮어쓰거나 지우지 않게 합니다.
 */
export const LOCAL_ID_PREFIX = 'local-';
