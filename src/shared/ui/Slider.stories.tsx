import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Slider } from './Slider';

const meta: Meta<typeof Slider> = { title: 'shared/Slider', component: Slider };
export default meta;

export const Default: StoryObj<typeof Slider> = {
  args: { label: '재생 위치', value: 12, max: 30, valueText: '0:12 / 0:30', onCommit: () => {} },
};
