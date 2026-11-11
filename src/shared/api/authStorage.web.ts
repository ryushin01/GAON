import AsyncStorage from '@react-native-async-storage/async-storage';

/** 웹과 PC 앱에는 암호화 저장소가 없어 브라우저 저장소에 그대로 둡니다. */
export const authStorage = AsyncStorage;
