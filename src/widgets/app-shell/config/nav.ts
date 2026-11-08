type Item = {
  name: string;
  href: '/' | '/chart' | '/search' | '/library';
  label: string;
};

export const NAV_ITEMS: Item[] = [
  { name: 'index', href: '/', label: '홈' },
  { name: 'chart', href: '/chart', label: 'TOP 100' },
  { name: 'search', href: '/search', label: '검색' },
  { name: 'library', href: '/library', label: '보관함' },
];

export function isActive(pathname: string, href: Item['href']) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
