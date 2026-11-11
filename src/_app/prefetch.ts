import { prefetchCatalog } from '@/entities/music';

// 화면 코드를 받는 동안 카탈로그를 먼저 받기 시작해, 홈의 첫 디스크가 빨리 나오게 합니다.
prefetchCatalog();
