// One shared 12 fps clock for every sprite on screen.

type Sub = (tick: number) => void;
const subs = new Set<Sub>();
let timer: ReturnType<typeof setInterval> | null = null;
let tick = 0;

export const TICK_FPS = 12;

export function subscribeTick(fn: Sub): () => void {
  subs.add(fn);
  fn(tick);
  if (!timer) {
    timer = setInterval(() => {
      tick++;
      subs.forEach((s) => s(tick));
    }, 1000 / TICK_FPS);
  }
  return () => {
    subs.delete(fn);
    if (!subs.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
