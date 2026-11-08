import type { ReactNode } from 'react';
import { create } from 'zustand';

type NavSlot = {
  node: ReactNode;
  setNode: (node: ReactNode) => void;
  /** 홈의 인트로가 도는 동안에는 메뉴 대신 로고와 진행 문구만 보여 줍니다. */
  booting: boolean;
  setBooting: (booting: boolean) => void;
};

/** 화면이 상단 메뉴 끝에 자기 조작 버튼을 넣는 자리입니다. */
export const useNavSlot = create<NavSlot>((set) => ({
  node: null,
  setNode: (node) => set({ node }),
  booting: true,
  setBooting: (booting) => set({ booting }),
}));
