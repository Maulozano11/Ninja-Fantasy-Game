import React, { useEffect, useRef } from 'react';
import { THROW_MS, CLICK_MS, NAT1_MS, NAT20_MS } from './diceData';
import { drawDie, preloadDice } from './diceDraw';
import { useDiceStyle } from './diceStyle';

// The quick d20 of a mission check (a road event, a camp activity) beside its line in the log: it
// is thrown once when the line appears and lands on the number the rules rolled, in the player's
// dice style. A natural 20 flashes gold and a natural 1 cracks, as in battle.

export function DieIcon({ result, size = 30, tint }: { result: number; size?: number; tint?: string }) {
  const style = useDiceStyle();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    preloadDice(style);
    const nat = result === 20 ? 20 : result === 1 ? 1 : undefined;
    const end = Math.max(THROW_MS + 400, nat ? CLICK_MS + (nat === 20 ? NAT20_MS : NAT1_MS) : 0);
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const c = ref.current;
      const g = c?.getContext('2d');
      const t = performance.now() - t0;
      if (t < end + 300) raf = requestAnimationFrame(loop);
      if (!c || !g) return;
      const dpr = window.devicePixelRatio || 1;
      const W = Math.round(size * 2.2 * dpr), H = Math.round(size * 1.6 * dpr);
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      // The small die's art is 44 px; the throw starts up and to one side, so the canvas is wide.
      const s = Math.max(1, Math.round((size * dpr) / 30));
      drawDie(g, { style, tint, size: 'small', result, t, x: Math.round(W * 0.62), y: Math.round(H * 0.62), s, nat });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [style, result, size, tint]);
  return <canvas ref={ref} aria-label={`d20: ${result}`} style={{ width: size * 2.2, height: size * 1.6, imageRendering: 'pixelated', verticalAlign: 'middle' }} />;
}
