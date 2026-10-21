import React, { useEffect, useRef } from 'react';
import { CLICK_MS, THROW_MS } from './diceData';
import { drawDie, preloadDice } from './diceDraw';
import { DICE_STYLES } from './diceStyle';
import type { DiceStyle } from './diceStyle';

// A die of one style thrown again and again on a little stone floor, for the main menu's dice
// choice: a natural 20 (its gold flash), an ordinary roll, a natural 1 (its crack) and another.
// The gem dice change chakra colour each throw, to show they take the roller's.

const RESULTS = [20, 13, 1, 17];
const TINTS = ['blue', 'red', 'green', 'violet'];
/** One throw and the pause after it (ms). */
const CYCLE = THROW_MS + 1500;

export function DicePreview({ style, width = 168, height = 150, playing = true }: { style: DiceStyle; width?: number; height?: number; playing?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    preloadDice(style);
    let raf = 0;
    // The three previews throw out of step, so they are not one die three times.
    const t0 = performance.now() - DICE_STYLES.indexOf(style) * 1100;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const c = ref.current;
      const g = c?.getContext('2d');
      if (!c || !g) return;
      const dpr = window.devicePixelRatio || 1;
      const W = Math.round(width * dpr), H = Math.round(height * dpr);
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      // A dark floor for the die to land on.
      const floor = g.createRadialGradient(W / 2, H * 0.78, 4, W / 2, H * 0.78, W * 0.55);
      floor.addColorStop(0, 'rgba(70, 56, 36, 0.55)');
      floor.addColorStop(1, 'rgba(14, 10, 7, 0)');
      g.fillStyle = floor;
      g.fillRect(0, 0, W, H);
      const el = playing ? performance.now() - t0 : CLICK_MS + 900;
      const n = playing ? Math.floor(el / CYCLE) : 0;
      const result = RESULTS[n % RESULTS.length];
      const s = Math.max(1, Math.floor((Math.min(W, H) / 150) * 1.0));
      drawDie(g, {
        style,
        tint: TINTS[n % TINTS.length],
        size: 'big',
        result,
        t: playing ? el % CYCLE : CLICK_MS + 900,
        x: Math.round(W / 2),
        y: Math.round(H * 0.56),
        s,
        nat: result === 20 ? 20 : result === 1 ? 1 : undefined,
        ground: true,
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [style, width, height, playing]);
  return <canvas ref={ref} style={{ width, height, imageRendering: 'pixelated' }} />;
}
