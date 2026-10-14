// Fire set, third pass: the sprites copied from the owner's paint-over of the fire sheet
// (REF-fire-set-owner.jpg). Each key frame is his own drawing, cut at game scale by
// art2/vfx-a-extract.py into vfx-a-fire-refdata.ts; the other frames are derived from it
// (grown, revealed, flickered, cooled into smoke), so the peak frame is his picture.

import { Canvas, Color, WorldSprite, withAlpha } from './kit';
import { FIRE, embers } from './vfx-a-fire-kit';
import { cool, dim, displace, flicker, placed, refPiece, roughen, scaled } from './vfx-a-ref';
import { fireballOld } from './vfx-a-fire-sig';
import { REF_FRAMES } from './vfx-a-fire-refdata';
import {
  TAU, WallKind, clamp, dissolve, flySprite, frames, fract, lerp, pnoise, rr, stack, vfxSprite,
} from './vfx-a-lib';


// --- blast: his mushroom cloud ---------------------------------------------------------------

/** Warm brown-grey smoke (from his paint-over), dark to light. */
const SMOKE_WARM: Color[] = ['#24141a', '#3a2622', '#4a3532', '#5e4640', '#77594f', '#8f6e60', '#a88a78'].map((h) => hexC(h));
function hexC(h: string): Color {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
}

/**
 * His mushroom cloud, built from his own pixels (art2/vfx-a-extract.py cuts his panel into the
 * cap, the stem with its flaring root, the far and near halves of the ring of fire and the
 * scorched ground). Frame 4 is his picture exactly; the frames before grow into it (a flash,
 * the stem rising, the cap blooming, the ring spreading), the frames after cool it into smoke
 * and let the ring burn down.
 */
export function blast(): WorldSprite {
  const W = 220, H = 170, cx = 110, gy = 128, seed = 3100;
  const cap = refPiece('b_cap'), stem = refPiece('b_stem');
  const capBottom = cap.y + cap.c.h, capCx = cap.x + cap.c.w / 2;
  const stemTop = stem.y, stemBottom = stem.y + stem.c.h;
  const fr = frames(8, (_, i) => {
    const t = i / 8, ph = t * TAU;
    // Per frame: ring and ground spread, stem height revealed, cap size, cooling, ring burning down.
    const ringK = [0.2, 0.45, 0.72, 1, 1, 1, 1, 1][i];
    const groundK = [0.3, 0.55, 0.8, 1, 1, 1, 1, 1][i];
    const groundDim = [1, 1, 1, 1, 1, 0.85, 0.62, 0.42][i];
    const stemK = [0, 0.45, 0.8, 1, 1, 0.92, 0.6, 0][i];
    const capK = [0.24, 0.5, 0.8, 1, 1.03, 1.06, 1.09, 1.12][i];
    const capRise = [0, 0, 0, 0, -2, -5, -8, -11][i];
    const coolK = [0, 0, 0, 0, 0, 0.4, 0.8, 1][i];
    const ringH = [1, 1, 1, 1, 1, 0.8, 0.55, 0.3][i];
    const ringDim = [1, 1, 1, 1, 1, 0.9, 0.72, 0.5][i];
    const layers: (Canvas | null)[] = [];
    // The scorched glowing ground, spreading with the ring.
    layers.push(dim(scaled(placed('b_ground', W, H), groundK, groundK, cx, gy), groundDim, [26, 14, 18, 255]));
    // The far half of the ring.
    const ringAt = (name: string) => {
      let c = scaled(placed(name, W, H), ringK, ringK * ringH, cx, gy);
      if (i >= 3) c = flicker(c, ph, 1.2, gy, seed + name.length);
      return ringDim < 1 ? dim(c, ringDim) : c;
    };
    layers.push(ringAt('b_ring_back'));
    // The stem: revealed from the ground up while it rises, eroded from the top as it dies.
    if (stemK > 0) {
      const top = stemBottom - (stemBottom - stemTop) * stemK;
      const sc = placed('b_stem', W, H);
      const cut = new Canvas(W, H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const p = sc.get(x, y);
          if (p[3] && y >= top + 3 * pnoise(x, 0, 4, 0, 0, seed + 1)) cut.set(x, y, p);
        }
      layers.push(i >= 3 ? flicker(cut, ph, 0.8, stemBottom, seed + 2) : cut);
    }
    // The cap: grown from a small dome at the ground (the flash) up to his cap on top of the stem.
    {
      const sx = capK, sy = capK;
      // Where the cap's bottom centre sits: on the ground for the flash, on the rising stem, then his.
      const baseY = i === 0 ? gy - 2 : i < 3 ? stemBottom - (stemBottom - capBottom) * [0, 0.55, 0.85][i] : capBottom + capRise;
      let c = scaled(placed('b_cap', W, H), sx, sy, capCx, capBottom);
      const moved = new Canvas(W, H);
      moved.draw(c, 0, Math.round(baseY - capBottom));
      c = moved;
      if (coolK > 0) {
        const top = baseY - cap.c.h * sy, hgt = cap.c.h * sy;
        c = cool(c, (x, y) => coolK * 1.6 - ((y - top) / hgt) * 0.9 + (pnoise(x, y, 12, 0, 0, seed + 8) - 0.5) * 0.5, SMOKE_WARM, seed + 3);
      }
      if (i === 7) c = dissolve(c, 0.62, (x, y) => clamp(pnoise(x, y, 14, 0, 0, seed + 4) * 0.7 + ((y - (baseY - cap.c.h * sy)) / (cap.c.h * sy)) * 0.3, 0, 1), [], SMOKE_WARM[0]).c;
      layers.push(c);
    }
    // The near half of the ring, in front of the stem.
    layers.push(ringAt('b_ring_front'));
    const body = stack(W, H, ...layers);
    // Sparks thrown up round the cap and off the ring.
    const em: { x: number; y: number; s: number }[] = [];
    if (i >= 1 && i <= 6)
      for (let k = 0; k < 12; k++) {
        const a = rr(seed + 5, k, Math.PI * 1.1, Math.PI * 1.9), d = rr(seed + 6, k, 40, 80) * (0.5 + i * 0.1);
        em.push({ x: capCx + Math.cos(a) * d, y: capBottom - 20 + Math.sin(a) * d * 0.6 + i * 2, s: k % 4 === 0 && i < 5 ? 2 : 1 });
      }
    for (let k = 0; k < 8; k++) {
      const p = fract(k / 8 + t * 2), a = rr(seed + 7, k, 0, TAU);
      em.push({ x: cx + Math.cos(a) * 78 * ringK, y: gy + Math.sin(a) * 15 * ringK - 4 - p * 16, s: 1 });
    }
    return stack(W, H, body, embers(W, H, em.filter((e) => e.x > 3 && e.x < W - 4 && e.y > 3 && e.y < H - 4), body));
  });
  return vfxSprite('blast', 'Fire blast (mushroom-cloud explosion, 3 m)', [cx, gy], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- aura: the character engulfed in flame (his panel) -------------------------------------

/**
 * Two layers cut from his aura panel, frame-synchronized, same size and anchor (the feet):
 * - `aura_back` goes BEHIND the character: all his fire round and above the figure.
 * - `aura` goes OVER the character: his flames round the legs and a warm glow that lights the
 *   figure; drawn alone it still reads as an aura.
 * The loop flickers his flames upward (higher pixels sway more) and breathes them a little.
 */
export function aura(): WorldSprite[] {
  const F = REF_FRAMES.aura, W = F.w, H = F.h, ax = F.ax, ay = F.ay, seed = 3300;
  const backFr: Canvas[] = [], frontFr: Canvas[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 6, ph = t * TAU;
    const breathe = (c: Canvas, k: number) => scaled(c, 1 + 0.02 * Math.sin(ph + k), 1 + 0.05 * Math.sin(ph + k), ax, ay);
    const backC = breathe(flicker(placed('a_back', W, H), ph, 2.4, ay, seed), 0);
    const glowC = new Canvas(W, H);
    for (let y = ay - 100; y < ay; y++)
      for (let x = ax - 26; x <= ax + 26; x++) {
        const d = Math.hypot((x - ax) / 26, (y - (ay - 46)) / 52);
        if (d < 1) glowC.set(x, y, withAlpha(FIRE[4], Math.round(52 * (1 - d * d))));
      }
    // (the flames round the legs move exactly with the back layer they were cut from)
    const frontC = stack(W, H, glowC, breathe(flicker(placed('a_low', W, H), ph, 2.4, ay, seed), 0));
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 12; k++) {
      const p = fract(k / 12 + t);
      const side = k % 2 ? 1 : -1;
      em.push({ x: ax + side * rr(seed + 5, k, 16, 46) + Math.sin(p * 6 + k) * 2, y: ay - 10 - p * 120, s: p < 0.3 ? 2 : 1 });
    }
    backFr.push(backC);
    frontFr.push(stack(W, H, frontC, embers(W, H, em.filter((e) => e.y > 3 && e.x > 2 && e.x < W - 3), stack(W, H, backC, frontC))));
  }
  return [
    vfxSprite('aura', 'Fire aura, front layer (draw OVER the character)', [ax, ay], { idle: { frames: frontFr, fps: 12, loop: true } }),
    vfxSprite('aura_back', 'Fire aura, back layer (draw BEHIND the character)', [ax, ay], { idle: { frames: backFr, fps: 12, loop: true } }),
  ];
}

// --- walls: horizontal, 3/4 and end-on (his panels) -----------------------------------------

/**
 * A wall from his panel: `idle` flickers his flames; `rise` reveals his picture from the
 * ground up and from the middle out (height above the ground line), with a burning edge, ending
 * on his picture. Edges where his panel cut the flames are roughened.
 */
function refWall(kind: WallKind, piece: string, label: string, ground: (x: number, y: number) => number, along: (x: number, y: number) => number, rough: (x: number, y: number) => boolean, seed: number): WorldSprite {
  const F = REF_FRAMES[kind], W = F.w, H = F.h;
  const base = roughen(placed(piece, W, H), rough, refPiece(piece).pal[0]);
  const idle = frames(4, (t) => flicker(base, t * TAU, 1.6, F.ay, seed));
  const vis = [0.16, 0.32, 0.5, 0.68, 0.86, 1.01];
  const rise = frames(6, (_, i) => {
    const c = flicker(base, (i / 6) * TAU, 1.6, F.ay, seed);
    if (vis[i] > 1) return c;
    return dissolve(c, vis[i], (x, y) => clamp(ground(x, y) * 0.6 + along(x, y) * 0.3 + pnoise(x, y, 8, 0, 0, seed + 1) * 0.1, 0, 1), [FIRE[2], FIRE[3], FIRE[5]], FIRE[0]).c;
  });
  return vfxSprite(kind, label, [F.ax, F.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 12, loop: true } });
}
export function walls(): WorldSprite[] {
  const fw = REF_FRAMES.wall, fd = REF_FRAMES.wall_diag;
  // His 3/4 wall's ground line runs from (22, 176) to (270, 50) in its frame.
  const diagG = (x: number) => lerp(176, 50, clamp((x - 22) / 248, 0, 1));
  return [
    refWall('wall', 'w_wall', 'Fire wall (4.5 m x 1.8 m)', (_x, y) => clamp((fw.ay - y) / (fw.ay - 8), 0, 1), (x) => Math.abs(x - fw.ax) / (fw.w / 2),
      (x, y) => y > fw.h - 9 - 6 * pnoise(x, 0, 5, 0, 0, 3501), 3500),
    refWall('wall_diag', 'w_diag', 'Fire wall, 3/4 (4.5 m x 1.8 m, turned 45 degrees)', (x, y) => clamp((diagG(x) - y) / 150, 0, 1), (x) => Math.abs(x - fd.ax) / (fd.w / 2),
      (x, y) => y < 10 + 16 * pnoise(x, 0, 6, 0, 0, 3601) || x > fd.w - 11 - 16 * pnoise(0, y, 6, 0, 0, 3602) || (y > diagG(x) + 2 && x > 190 - 12 * pnoise(0, y, 5, 0, 0, 3603)), 3600),
    refWall('wall_depth', 'w_depth', 'Fire wall, end-on (4.5 m x 1.8 m, running into the screen)', (_x, y) => clamp((240 - y) / 200, 0, 1), () => 0,
      (x, y) => x < 10 + 6 * pnoise(0, y, 6, 0, 0, 3701) || x > REF_FRAMES.wall_depth.w - 12 - 14 * pnoise(0, y, 6, 0, 0, 3702) || y > REF_FRAMES.wall_depth.h - 12 - 10 * pnoise(x, 0, 6, 0, 0, 3703) || (y > 108 && x > 60 - 8 * pnoise(0, y, 5, 0, 0, 3704)), 3700),
  ];
}

// --- projectiles and the hit, from his panels -------------------------------------------------

/**
 * A trailing flicker for something flying right: pixels behind (left of) the head at `hx` sway
 * more the further back they are, with a phase that loops.
 */
function trail(c: Canvas, ph: number, hx: number, span: number, amp: number, seed: number): Canvas {
  return displace(c, (x, y) => {
    const u = clamp((hx - x) / span, 0, 1);
    const n1 = pnoise(x * 0.4 + Math.cos(ph) * 6, y * 0.4 + Math.sin(ph) * 6, 7, 0, 0, seed) - 0.5;
    const n2 = pnoise(x * 0.4 + Math.sin(ph) * 6, y * 0.4 - Math.cos(ph) * 6, 7, 0, 0, seed + 1) - 0.5;
    return [Math.round(n1 * 2 * amp * u), Math.round(n2 * 2 * amp * u * 0.7)];
  });
}
/** A fly loop of `n` frames from a piece: its trail flickers and it pulses a little. */
function flyFrom(piece: string, frame: string, n: number, amp: number, pulse: number, seed: number): { frames: Canvas[]; anchor: [number, number] } {
  const F = REF_FRAMES[frame];
  const base = placed(piece, F.w, F.h);
  const fr = frames(n, (t) => {
    const ph = t * TAU;
    const c = trail(base, ph, F.ax + 6, F.ax, amp, seed);
    return pulse ? scaled(c, 1 + pulse * Math.sin(ph), 1 + pulse * Math.sin(ph), F.ax, F.ay) : c;
  });
  return { frames: fr, anchor: [F.ax, F.ay] };
}
export function bolt(): WorldSprite {
  const f = flyFrom('p_bolt', 'bolt', 4, 2, 0.03, 3900);
  return flySprite('bolt', 'Fire bolt (spiralling fireball)', f.frames, 12, f.anchor);
}
export function sphere(): WorldSprite {
  const F = REF_FRAMES.sphere;
  const base = placed('p_sphere', F.w, F.h);
  // The orb pulses and its rings shimmer all round (not a trail).
  const fr = frames(4, (t) => {
    const ph = t * TAU;
    const c = displace(base, (x, y) => {
      const n = pnoise(x * 0.5 + Math.cos(ph) * 5, y * 0.5 + Math.sin(ph) * 5, 6, 0, 0, 4000) - 0.5;
      return [Math.round(n * 2), Math.round(-n * 2)];
    });
    return scaled(c, 1 + 0.03 * Math.sin(ph), 1 + 0.03 * Math.sin(ph), F.ax, F.ay);
  });
  return flySprite('sphere', 'Fire sphere (burning orb with orbiting rings)', fr, 12, [F.ax, F.ay]);
}
export function slash(): WorldSprite {
  const f = flyFrom('p_slash', 'slash', 4, 1.5, 0, 4100);
  return flySprite('slash', 'Fire slash (thick crescent of flame)', f.frames, 12, f.anchor);
}
export function multi(): WorldSprite {
  const f = flyFrom('p_multi', 'multi', 4, 1.6, 0, 4200);
  return flySprite('multi', 'Fire multi (three comet flames in a volley)', f.frames, 12, f.anchor);
}
export function breath(): WorldSprite {
  const F = REF_FRAMES.breath;
  const base = placed('p_breath', F.w, F.h);
  // The cone churns more toward its far end (it flows away from the mouth on the left).
  const fr = frames(4, (t) => {
    const ph = t * TAU;
    return displace(base, (x, y) => {
      const u = clamp((x - 8) / (F.w - 14), 0, 1);
      const n1 = pnoise(x * 0.35 - t * 30, y * 0.4, 6, 30, 0, 3700) - 0.5, n2 = pnoise(x * 0.35 - t * 30, y * 0.4, 6, 30, 0, 3701) - 0.5;
      return [Math.round(n1 * 4 * u), Math.round((n2 * 3 + Math.sin(ph + x * 0.1) * 0.6) * u)];
    });
  });
  return flySprite('breath', 'Fire breath (flame cone wrapped in smoke, origin left middle)', fr, 12, [F.ax, F.ay]);
}
export function stream(): WorldSprite[] {
  const seg = placed('p_stream', 80, 64);
  // His jet, made into a seamless 64 px tile: its first 16 columns hand over (raggedly) from the
  // stretch just after the tile's end, so column 63 runs on into column 0.
  const tile = new Canvas(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const take = x < 16 && pnoise(x, y, 4, 0, 0, 3800) * 0.6 + 0.2 > x / 16;
      tile.set(x, y, seg.get(take ? x + 64 : x, y));
    }
  const shift = (c: Canvas, s: number) => {
    const out = new Canvas(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) out.set(x, y, c.get((((x - s) % 64) + 64) % 64, y));
    return out;
  };
  const tiles = frames(4, (_, i) => shift(tile, i * 16));
  const H = REF_FRAMES.stream_head;
  const head = placed('p_stream_head', H.w, H.h);
  const heads = frames(4, (t, i) => {
    const ph = t * TAU;
    const c = displace(head, (x, y) => {
      const u = clamp((x - 30) / 40, 0, 1);
      const n = pnoise(x * 0.5 + Math.cos(ph) * 5, y * 0.5 + Math.sin(ph) * 5, 5, 0, 0, 3801) - 0.5;
      return [Math.round(n * 3 * u), Math.round(n * 3 * u)];
    });
    // Its left part is the stream itself, scrolling with the tiles.
    const sc = shift(tile, i * 16);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 30; x++) if (x < 22 || pnoise(x, y, 3, 0, 0, 3802) > (x - 22) / 8) c.set(x, y, sc.get(x, y));
    return c;
  });
  return [flySprite('stream', 'Fire stream (fire jet, tileable 64 px)', tiles), flySprite('stream_head', 'Fire stream head', heads, 12, [H.ax, H.ay])];
}
export function hit(): WorldSprite {
  const F = REF_FRAMES.hit;
  const base = placed('p_hit', F.w, F.h);
  const sc = [0.32, 0.68, 1, 1.07, 1.12, 1.16];
  const vis = [1, 1, 1, 0.8, 0.5, 0.2];
  const fr = frames(6, (_, i) => {
    let c = scaled(base, sc[i], sc[i], F.ax, F.ay);
    if (i >= 3) c = dim(c, [0.85, 0.65, 0.45][i - 3]);
    if (vis[i] < 1) c = dissolve(c, vis[i], (x, y) => clamp(pnoise(x, y, 6, 0, 0, 4300 + i) * 0.6 + (1 - Math.hypot(x - F.ax, y - F.ay) / 40) * 0.4, 0, 1), [FIRE[2], FIRE[3]], FIRE[0]).c;
    return c;
  });
  return vfxSprite('hit', 'Fire hit (starburst of flame spikes)', [F.ax, F.ay], { hit: { frames: fr, fps: 12, loop: false } });
}

/**
 * The Great Fireballs: `fly` is his ball with its big smoke trail and debris, cut from his panel;
 * `burst` is the approved burst, unchanged. Both share one anchor (the ball's centre / the
 * burst's ground centre), so the frame is the union of the two around it.
 */
export function fireballs(): WorldSprite[] {
  return ([false, true] as const).map((great) => {
    const old = fireballOld(great);
    const F = REF_FRAMES[great ? 'fireball_great_fly' : 'fireball_fly'];
    const fly = flyFrom(great ? 'p_fireball_great' : 'p_fireball', great ? 'fireball_great_fly' : 'fireball_fly', 6, great ? 3 : 2.4, 0.015, great ? 4500 : 4400);
    const ob = old.anims.burst.frames[0];
    const left = Math.max(F.ax, old.anchor[0]), top = Math.max(F.ay, old.anchor[1]);
    const W = left + Math.max(F.w - F.ax, ob.w - old.anchor[0]), H = top + Math.max(F.h - F.ay, ob.h - old.anchor[1]);
    const put = (c: Canvas, ax: number, ay: number) => {
      const out = new Canvas(W, H);
      out.draw(c, left - ax, top - ay);
      return out;
    };
    return vfxSprite(old.name, old.label, [left, top], {
      fly: { frames: fly.frames.map((c) => put(c, F.ax, F.ay)), fps: 12, loop: true },
      burst: { frames: old.anims.burst.frames.map((c) => put(c, old.anchor[0], old.anchor[1])), fps: 12, loop: false },
    });
  });
}


