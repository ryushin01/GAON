import { useEffect, useState } from 'react';

/**
 * 첫 화면에서 가장 중요한 이미지(홈의 가운데 디스크)가 도착했다는 신호입니다.
 * 그 이미지를 혼자 먼저 받도록, 다른 이미지는 이 신호를 기다립니다.
 * 홈이 아닌 화면으로 들어와 그 이미지가 없으면 시간 제한이 지나면 엽니다.
 */
let open: (() => void) | null = null;
let opened = false;
const arrived = new Promise<void>((resolve) => {
  open = () => {
    opened = true;
    resolve();
  };
});

/** 가장 중요한 이미지를 다 받았을 때 부릅니다. */
export function markFirstImage() {
  open?.();
}

/**
 * 그 이미지가 도착했거나 시간 제한이 지나면 true가 됩니다.
 * 화면이 사라지면 기다리던 타이머를 지워, 쓰지 않는 타이머가 남지 않게 합니다.
 */
export function useFirstImage(timeoutMs: number) {
  const [ready, setReady] = useState(opened);
  useEffect(() => {
    if (ready) return;
    let alive = true;
    const finish = () => {
      if (alive) setReady(true);
    };
    const timer = setTimeout(finish, timeoutMs);
    void arrived.then(finish);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ready, timeoutMs]);
  return ready;
}
