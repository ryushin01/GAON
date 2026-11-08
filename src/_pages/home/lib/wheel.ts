/** 한 줄 단위로 알려 주는 휠(Firefox의 일반 마우스 등)을 픽셀로 바꿀 때 쓰는 값입니다. */
const LINE_HEIGHT = 40;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
/** 이보다 적게 움직였으면 넘기려던 것이 아니라고 봅니다. */
const MIN_TRAVEL = 0.02;

type WheelDelta = { deltaX: number; deltaY: number; deltaMode: number };

/** 휠 입력을 큰 쪽 축의 픽셀 거리로 바꿉니다. */
export function wheelPixels({ deltaX, deltaY, deltaMode }: WheelDelta, pageHeight: number) {
  const delta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
  if (deltaMode === DOM_DELTA_LINE) return delta * LINE_HEIGHT;
  if (deltaMode === DOM_DELTA_PAGE) return delta * pageHeight;
  return delta;
}

/** 휠을 멈췄을 때 놓일 순위입니다. 한 칸만 굴려도 움직인 방향으로 한 곡 넘어갑니다. */
export function snapIndex(start: number, current: number, last: number) {
  const moved = current - start;
  if (Math.abs(moved) < MIN_TRAVEL) return start;
  const steps = Math.max(1, Math.round(Math.abs(moved)));
  return Math.max(0, Math.min(last, start + Math.sign(moved) * steps));
}
