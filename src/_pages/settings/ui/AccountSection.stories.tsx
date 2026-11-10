import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { useSessionStore } from '@/entities/session';

import { AccountSection } from './AccountSection';

/** 로그인 설정이 없는 Storybook에서는 계정 구역이 그려지지 않아, 상태별 모습은 단위 테스트로 확인합니다. */
const meta: Meta<typeof AccountSection> = {
  title: 'pages/settings/AccountSection',
  component: AccountSection,
  decorators: [
    (Story) => {
      useSessionStore.setState({ session: null, ready: true });
      return Story();
    },
  ],
};
export default meta;

export const SignedOut: StoryObj<typeof AccountSection> = {};
