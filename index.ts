// 스타일 설정을 먼저 하고, 라우터를 준비하는 동안 카탈로그를 받도록 라우터보다 앞서 요청합니다.
import './src/shared/config/unistyles';
import './src/_app/prefetch';
import 'expo-router/entry';
