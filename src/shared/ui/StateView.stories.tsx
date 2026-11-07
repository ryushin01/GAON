import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { StateView } from './StateView';

const meta: Meta<typeof StateView> = { title: 'shared/StateView', component: StateView };
export default meta;

type Story = StoryObj<typeof StateView>;
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { title: '좋아요한 곡이 없습니다', description: '곡 목록에서 마음에 드는 곡을 찾아보세요.' } };
export const Error: Story = { args: { title: '카탈로그를 불러오지 못했습니다', description: '인터넷 연결을 확인해 주세요.', actionLabel: '다시 시도', onAction: fn() } };
