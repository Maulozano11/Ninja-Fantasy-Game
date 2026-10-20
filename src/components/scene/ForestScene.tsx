import React, { useEffect, useRef } from 'react';
import scene from '../../assets/scenes/creator_forest/scene.json';
import baseUrl from '../../assets/scenes/creator_forest/base.png';
import fireUrl from '../../assets/scenes/creator_forest/fire.png';
import backUrl from '../../assets/scenes/creator_forest/back.png';
import { subscribeTick } from '../../sprite/ticker';

// The owner's burning forest (tools/scenes/creator_forest.py) behind the title screen and the
// character creator: his still forest, his flames licking in a loop, smoke drifting behind the
// trunks and embers rising, drawn in his own pixels on one small canvas scaled up to cover.

const [W, H] = scene.size as [number, number];
const FRAMES = scene.fire.frames;
const SOURCES = scene.emberSources as [number, number][];
const EMBER = scene.embers as [number, number, number][];
const SMOKE_LIGHT = scene.smoke.light as [number, number, number];
const SMOKE = scene.smoke.rgb as [number, number, number];
/** Ticks are the shared 12 fps sprite clock. */
const DT = 1 / 12;
const WIND = 2.2; // px a second, to the right
const MAX_EMBERS = 70;
const MAX_PUFFS = 30;

interface Ember {
  x: number;
  y: number;
  vy: number;
  phase: number;
  swing: number;
  age: number;
  life: number;
  big: boolean;
  blink: number;
}
interface Puff {
  x: number;
  y: number;
  r: number;
  grow: number;
  vy: number;
  age: number;
  life: number;
  alpha: number;
  sprite: number;
}

const img = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = src;
  });

/**
 * His smoke as pixel billows (no soft edge): a cluster of round lumps, lit on top with his light
 * smoke and shaded underneath and along the edge with his haze. Two shapes per size.
 */
function puffSprites(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (const r of [4, 6, 8, 10, 12, 14]) {
    for (const v of [0, 1]) {
      const lumps: [number, number, number][] = [
        [0, 0, r],
        [(v ? 0.62 : -0.62) * r, 0.25 * r, 0.68 * r],
        [(v ? -0.6 : 0.6) * r, 0.3 * r, 0.55 * r],
        [(v ? -0.15 : 0.15) * r, -0.55 * r, 0.6 * r],
      ];
      const half = Math.ceil(r * 1.4);
      const c = document.createElement('canvas');
      c.width = c.height = half * 2 + 1;
      const g = c.getContext('2d')!;
      const inside = (x: number, y: number) => lumps.some(([lx, ly, lr]) => Math.hypot(x - lx, y - ly) <= lr);
      for (let y = -half; y <= half; y++) {
        for (let x = -half; x <= half; x++) {
          if (!inside(x, y)) continue;
          const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y + 1) || !inside(x, y - 1);
          // Lit from above: a lump's lower part is haze.
          const low = lumps.every(([lx, ly, lr]) => Math.hypot(x - lx, y - ly) > lr || y - ly > lr * 0.3);
          const [cr, cg, cb] = edge || low ? SMOKE : SMOKE_LIGHT;
          g.fillStyle = `rgb(${cr},${cg},${cb})`;
          g.fillRect(x + half, y + half, 1, 1);
        }
      }
      out.push(c);
    }
  }
  return out;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function newEmber(): Ember {
  const [sx, sy] = SOURCES[Math.floor(Math.random() * SOURCES.length)];
  const big = Math.random() < 0.12;
  return {
    x: sx + rand(-2, 2),
    y: sy + rand(-3, 6),
    vy: big ? rand(16, 26) : rand(7, 16),
    phase: rand(0, Math.PI * 2),
    swing: rand(0.6, 2.2),
    age: 0,
    life: rand(2.2, 5.5),
    big,
    blink: Math.random() < 0.3 ? rand(3, 7) : 0,
  };
}

function newPuff(sprites: number): Puff {
  const [sx, sy] = SOURCES[Math.floor(Math.random() * SOURCES.length)];
  return {
    x: sx + rand(-4, 4),
    y: sy - rand(2, 10),
    r: 0,
    grow: rand(0.5, 1.4),
    vy: rand(2.5, 5),
    age: 0,
    life: rand(9, 16),
    alpha: rand(0.22, 0.4),
    sprite: Math.floor(rand(0, Math.min(6, sprites))), // a small start (the size grows with r), either shape
  };
}

function stepEmbers(list: Ember[], dt: number) {
  for (const e of list) {
    e.age += dt;
    e.y -= e.vy * dt;
    e.x += (WIND + Math.sin(e.phase + e.age * e.swing * 2) * e.swing * 3) * dt;
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].age >= list[i].life || list[i].y < -2) list.splice(i, 1);
  while (list.length < MAX_EMBERS && Math.random() < 0.7) list.push(newEmber());
}

function stepPuffs(list: Puff[], dt: number, sprites: number) {
  for (const p of list) {
    p.age += dt;
    p.y -= p.vy * dt;
    p.x += WIND * 1.4 * dt;
    p.r += p.grow * dt;
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].age >= list[i].life) list.splice(i, 1);
  if (list.length < MAX_PUFFS && Math.random() < 0.18) list.push(newPuff(sprites));
}

export function ForestScene({ className, position = '50% 60%' }: { className?: string; position?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const smoke = document.createElement('canvas');
    smoke.width = W;
    smoke.height = H;
    const sg = smoke.getContext('2d')!;
    sg.imageSmoothingEnabled = false;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let stop: (() => void) | undefined;
    let dead = false;
    Promise.all([img(baseUrl), img(fireUrl), img(backUrl)]).then(([base, fire, back]) => {
      if (dead) return;
      const sprites = puffSprites();
      const embers: Ember[] = [];
      const puffs: Puff[] = [];
      // Start mid-fire: the smoke and embers already up.
      for (let i = 0; i < 12 * 14; i++) {
        stepEmbers(embers, DT);
        stepPuffs(puffs, DT, sprites.length);
      }
      const draw = (tick: number) => {
        if (document.hidden) return;
        g.drawImage(base, 0, 0);
        const f = still ? 0 : tick % FRAMES;
        g.drawImage(fire, 0, f * H, W, H, 0, 0, W, H);
        if (!still) {
          stepEmbers(embers, DT);
          stepPuffs(puffs, DT, sprites.length);
        }
        // Smoke, behind the trunks: drawn apart, kept only where the mask lets it, then laid on.
        sg.globalCompositeOperation = 'source-over';
        sg.clearRect(0, 0, W, H);
        for (const p of puffs) {
          const t = p.age / p.life;
          const fade = t < 0.2 ? t / 0.2 : t > 0.6 ? (1 - t) / 0.4 : 1;
          const size = Math.min(sprites.length / 2 - 1, (p.sprite >> 1) + Math.floor(p.r / 4));
          const s = sprites[size * 2 + (p.sprite & 1)];
          sg.globalAlpha = p.alpha * fade;
          sg.drawImage(s, Math.round(p.x - s.width / 2), Math.round(p.y - s.height / 2));
        }
        sg.globalAlpha = 1;
        sg.globalCompositeOperation = 'destination-in';
        sg.drawImage(back, 0, 0);
        g.drawImage(smoke, 0, 0);
        // Embers in front of everything: white-hot when young, dark orange as they cool.
        for (const e of embers) {
          const t = e.age / e.life;
          if (e.blink && Math.floor(e.age * e.blink) % 3 === 0) continue;
          const c = EMBER[Math.max(0, Math.min(EMBER.length - 1, Math.round((1 - t) * (EMBER.length - 1))))];
          g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
          g.globalAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
          const x = Math.round(e.x);
          const y = Math.round(e.y);
          g.fillRect(x, y, e.big ? 2 : 1, e.big ? 2 : 1);
        }
        g.globalAlpha = 1;
        // The firelight breathing: a faint warm lift that rises and falls.
        const glow = 0.035 + 0.03 * Math.sin(tick * 0.37) * Math.sin(tick * 0.11 + 1);
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(90,30,0,${glow.toFixed(3)})`;
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
      };
      if (still) draw(0);
      else stop = subscribeTick(draw);
    });
    return () => {
      dead = true;
      stop?.();
    };
  }, []);
  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className={className}
      aria-hidden
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: position, imageRendering: 'pixelated', display: 'block' }}
    />
  );
}

/** The scene's size in its own pixels and where its clearing's ground is, for placing a figure. */
export const FOREST = { width: W, height: H, ground: scene.ground, clearing: scene.clearing };

/**
 * Where the clearing's ground falls on screen when the scene covers a vw x vh box with its focus at
 * `fy` of the way down (the canvas's object-position): a figure standing in the forest puts its feet
 * here, in the middle of the box.
 */
export function forestGround(vw: number, vh: number, fy = 0.62): number {
  const s = Math.max(vw / W, vh / H);
  return (vh - H * s) * fy + scene.ground * s;
}
