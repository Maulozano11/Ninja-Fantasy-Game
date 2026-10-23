// The battle's dice, drawn over the map each frame (src/components/dice/diceDraw.ts does the art):
// the quick d20 over whoever rolls (both dice with advantage, the one not kept dimmed), its readout
// beside it, the big window of a critical or an important natural in the free band over the fight,
// and a critical's impact on its target. Everything follows the playback (playback.ts), which
// already holds the roll the engine made.

import type { BattleState } from '../../battle/types';
import type { MapDef } from '../../battle/map';
import type { Lang } from '../../i18n';
import { CLICK_MS, DICE, LINGER, WINDOW, dieLife } from '../dice/diceData';
import { drawAdvTag, drawDie, drawImpact, drawReadout, drawWindow, readoutWidth } from '../dice/diceDraw';
import type { ReadoutInfo } from '../dice/diceDraw';
import type { DiceStyle } from '../dice/diceStyle';
import type { DieShow, Playback } from './playback';
import { natOf } from './playback';
import { project } from './renderer';
import { lookOf } from './unitArt';

export interface DiceScene {
  pb: Playback;
  state: BattleState;
  map: MapDef;
  /** The camera as the renderer uses it: device pixels = (map pixel - x) * k. */
  cam: { x: number; y: number; k: number };
  now: number;
  W: number;
  H: number;
  /** Device pixels per art pixel (the HUD's scale doubled, whole). */
  s: number;
  lang: Lang;
  style: DiceStyle;
}

/** The roller's chakra colour, for the "Gema" dice (the hydra has none: its venom green). */
function tintOf(state: BattleState, id: string): string {
  const u = state.units[id];
  const look = u ? lookOf(u) : undefined;
  if (look) return look.chakra.tint ?? look.chakra.color;
  return u && (u.kind === 'hydra_head' || u.kind === 'hydra_body') ? 'green' : 'blue';
}

/** What the readout says for a roll. */
export function readoutOf(d: DieShow, lang: Lang): ReadoutInfo {
  const r = d.roll;
  const es = lang === 'es';
  const vs = d.kind === 'attack' ? { label: (es ? 'CA' : 'AC') as 'CA' | 'AC', n: r.dc } : r.dc > 0 ? { label: (es ? 'CD' : 'DC') as 'CD' | 'DC', n: r.dc } : undefined;
  return { d20: r.d20, mod: r.mod, total: r.total, vs, ok: r.success };
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** How much two boxes overlap (area). */
const overlap = (a: Box, b: Box): number => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** Map pixels above the feet where a die floats over a unit (over the head and its bars). */
const headOf = (state: BattleState, id: string): number => {
  const u = state.units[id];
  return u?.kind === 'hydra_head' ? 250 : u?.kind === 'hydra_body' ? 230 : 128;
};

export function drawDiceLayer(ctx: CanvasRenderingContext2D, sc: DiceScene): void {
  const { pb, now, s } = sc;
  if (!pb.dice.length && !pb.diceWindow && !pb.impacts.length) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const toScreen = (X: number, Y: number) => ({ x: (X - sc.cam.x) * sc.cam.k, y: (Y - sc.cam.y) * sc.cam.k });
  const R = DICE.sizes.small.R;

  // The quick dice, over whoever rolls. Laid out first, so dice thrown together (a blast's saves)
  // and their readouts neither pile on each other nor cover the heads, bars and marks around.
  const step = (2 * R + 6) * s;
  const zones: (Box & { unit: string })[] = [];
  for (const u of Object.values(sc.state.units)) {
    const v = pb.views.get(u.id);
    if (!v || v.fade || u.down === 'dead' || u.down === 'fled' || u.kind === 'hydra_head' || u.kind === 'hydra_body') continue;
    const p = project(sc.map, pb.posOf(u.id, now));
    const top = toScreen(p.X, p.Y - 110), low = toScreen(p.X, p.Y - 62);
    const half = Math.max(26 * sc.cam.k, 22 * s);
    // The head, its bar and the mark over the bar (renderer.ts draws them there).
    zones.push({ unit: u.id, x0: top.x - half, x1: top.x + half, y0: top.y - 13 * s, y1: low.y });
  }
  const shown = pb.dice
    .map((d) => ({ d, t: (now - d.t0) * pb.speed, feet: project(sc.map, pb.posOf(d.unit, now)) }))
    .filter(({ d, t }) => t >= 0 && !(d.windowed && t >= CLICK_MS + WINDOW.open) && t <= dieLife(natOf(d.roll)) + LINGER.fade)
    // The first thrown keep their places; among dice thrown together, the nearest unit first.
    .sort((a, b) => a.d.t0 - b.d.t0 || b.feet.Y - a.feet.Y || a.feet.X - b.feet.X);
  const diceBoxes: Box[] = [];
  const laid = shown.map(({ d, t, feet }) => {
    const at = toScreen(feet.X, feet.Y - headOf(sc.state, d.unit));
    const bx = Math.round(at.x), by = Math.round(at.y - R * s);
    const two = !!d.roll.adv && d.roll.rolls.length > 1;
    const hw = (two ? 2 * R + 6 : R + 2) * s, top = (two ? R + 12 : R + 2) * s, bottom = (R + 2) * s;
    const others = zones.filter((z) => z.unit !== d.unit);
    let best = { x: bx, y: by, score: Infinity };
    for (let lift = 0; lift <= 4; lift++)
      for (const side of [0, 1, -1]) {
        const x = bx + side * step, y = by - lift * step;
        const b: Box = { x0: x - hw, x1: x + hw, y0: y - top, y1: y + bottom };
        const area = (b.x1 - b.x0) * (b.y1 - b.y0);
        const score = (1000 * diceBoxes.reduce((acc, o) => acc + overlap(b, o), 0) + 4 * others.reduce((acc, o) => acc + overlap(b, o), 0)) / area + lift + Math.abs(side) * 1.3;
        if (score < best.score) best = { x, y, score };
      }
    diceBoxes.push({ x0: best.x - hw, x1: best.x + hw, y0: best.y - top, y1: best.y + bottom });
    return { d, t, two, x: best.x, y: best.y, bx, by, hw };
  });
  const readBoxes: Box[] = [];
  for (const { d, t, two, x, y, bx, by, hw } of laid) {
    const life = dieLife(natOf(d.roll));
    const a = t > life ? Math.max(0, 1 - (t - life) / LINGER.fade) : 1;
    if (a <= 0) continue;
    const tint = sc.style === 'gem' ? tintOf(sc.state, d.unit) : undefined;
    ctx.globalAlpha = a;
    if (x !== bx || y !== by) {
      // Moved off its unit to keep clear of the others: a thin bronze stem points back down to it.
      ctx.fillStyle = 'rgba(214, 186, 122, 0.9)';
      const y0 = y + (R + 1) * s, y1 = by + R * s;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - x, y1 - y0) / s));
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x + ((bx - x) * i) / n - s / 2), Math.round(y0 + ((y1 - y0) * i) / n), s, s);
    }
    if (two) {
      // Both dice, side by side: the one kept lands bright, the other dims once both are down.
      const kept = d.roll.rolls[0] === d.roll.d20 ? 0 : 1;
      d.roll.rolls.forEach((n, i) => {
        const dx = (i === 0 ? -1 : 1) * (R + 3) * s;
        drawDie(ctx, { style: sc.style, tint, size: 'small', result: n, t, x: x + dx, y, s, nat: i === kept ? natOf(d.roll) : undefined, dim: i !== kept && t >= CLICK_MS + 120 });
      });
      if (t >= CLICK_MS) drawAdvTag(ctx, d.roll.adv!, sc.lang, x, y - (R + 4) * s, s);
    } else drawDie(ctx, { style: sc.style, tint, size: 'small', result: d.roll.d20, t, x, y, s, nat: natOf(d.roll) });
    // The readout beside it once it has landed: on the side where it covers nothing (no other die,
    // readout, head, bar or mark), the right if both are clear.
    if (t >= CLICK_MS) {
      ctx.globalAlpha = a * Math.min(1, (t - CLICK_MS) / 90);
      const info = readoutOf(d, sc.lang);
      const w = readoutWidth(info) * s, h = 18 * s;
      const side = hw + 3 * s;
      const top = y - 9 * s;
      const others = zones.filter((z) => z.unit !== d.unit);
      let best = { rx: x + side + w / 2, score: Infinity };
      for (const [pref, rx] of [
        [0, x + side + w / 2],
        [0.5, x - side - w / 2],
      ]) {
        const b: Box = { x0: rx - w / 2, x1: rx + w / 2, y0: top, y1: top + h };
        const off = b.x0 < 0 || b.x1 > sc.W ? 1e6 : 0;
        const score = off + (1000 * [...diceBoxes, ...readBoxes].reduce((acc, o) => acc + overlap(b, o), 0) + 4 * others.reduce((acc, o) => acc + overlap(b, o), 0)) / (w * h) + pref;
        if (score < best.score) best = { rx, score };
      }
      readBoxes.push({ x0: best.rx - w / 2, x1: best.rx + w / 2, y0: top, y1: top + h });
      drawReadout(ctx, info, best.rx, top, s);
    }
  }
  ctx.globalAlpha = 1;

  // A critical landing: bloom, burst, the maximum damage.
  for (const c of pb.impacts) {
    const t = (now - c.t0) * pb.speed;
    const p = project(sc.map, pb.posOf(c.unit, now));
    const at = toScreen(p.X, p.Y - 55);
    drawImpact(ctx, { x: at.x, y: at.y, t, amount: c.amount, lang: sc.lang, world: sc.cam.k, s });
  }

  // The big window, in the free band over the fight.
  const win = pb.diceWindow;
  if (win) {
    const t = (now - win.t0) * pb.speed;
    if (t >= 0) {
      drawWindow(ctx, {
        style: sc.style,
        tint: sc.style === 'gem' ? tintOf(sc.state, win.die.unit) : undefined,
        result: win.die.roll.d20,
        kind: win.kind,
        lang: sc.lang,
        readout: readoutOf(win.die, sc.lang),
        t,
        W: sc.W,
        H: sc.H,
        cx: Math.round(sc.W / 2),
        cy: Math.round(sc.H * 0.36),
        s,
      });
    }
  }
  ctx.restore();
}
