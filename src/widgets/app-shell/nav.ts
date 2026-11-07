import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type Item = {
  name: string;
  href: '/' | '/chart' | '/search' | '/library';
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconActive: ComponentProps<typeof Ionicons>['name'];
};

export const NAV_ITEMS: Item[] = [
  { name: 'index', href: '/', label: '홈', icon: 'home-outline', iconActive: 'home' },
  { name: 'chart', href: '/chart', label: 'TOP 100', icon: 'podium-outline', iconActive: 'podium' },
  { name: 'search', href: '/search', label: '검색', icon: 'search-outline', iconActive: 'search' },
  { name: 'library', href: '/library', label: '보관함', icon: 'library-outline', iconActive: 'library' },
];

export function isActive(pathname: string, href: Item['href']) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
