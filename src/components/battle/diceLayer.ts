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

  // The quick dice, over whoever rolls.
  for (const d of pb.dice) {
    const t = (now - d.t0) * pb.speed;
    if (t < 0) continue;
    // A die that went on into the big window is shown there, not twice.
    if (d.windowed && t >= CLICK_MS + WINDOW.open) continue;
    const life = dieLife(natOf(d.roll));
    const a = t > life ? Math.max(0, 1 - (t - life) / LINGER.fade) : 1;
    if (a <= 0) continue;
    const p = project(sc.map, pb.posOf(d.unit, now));
    const at = toScreen(p.X, p.Y - headOf(sc.state, d.unit));
    const x = Math.round(at.x), y = Math.round(at.y - R * s);
    const tint = sc.style === 'gem' ? tintOf(sc.state, d.unit) : undefined;
    ctx.globalAlpha = a;
    const two = d.roll.adv && d.roll.rolls.length > 1;
    if (two) {
      // Both dice, side by side: the one kept lands bright, the other dims once both are down.
      const kept = d.roll.rolls[0] === d.roll.d20 ? 0 : 1;
      d.roll.rolls.forEach((n, i) => {
        const dx = (i === 0 ? -1 : 1) * (R + 3) * s;
        drawDie(ctx, { style: sc.style, tint, size: 'small', result: n, t, x: x + dx, y, s, nat: i === kept ? natOf(d.roll) : undefined, dim: i !== kept && t >= CLICK_MS + 120 });
      });
      if (t >= CLICK_MS) drawAdvTag(ctx, d.roll.adv!, sc.lang, x, y - (R + 4) * s, s);
    } else drawDie(ctx, { style: sc.style, tint, size: 'small', result: d.roll.d20, t, x, y, s, nat: natOf(d.roll) });
    // The readout beside it once it has landed.
    if (t >= CLICK_MS) {
      ctx.globalAlpha = a * Math.min(1, (t - CLICK_MS) / 90);
      const info = readoutOf(d, sc.lang);
      const w = readoutWidth(info);
      const side = (two ? 2 * R + 6 : R + 5) * s;
      // To the right, unless that runs off the screen or into another die thrown with it (the two
      // sides of a shove stand side by side): then each readout goes on its own outer side.
      const other = pb.dice.find((o) => o !== d && o.t0 === d.t0);
      const ox = other ? project(sc.map, pb.posOf(other.unit, now)).X : undefined;
      const toLeft = ox !== undefined ? (ox - sc.cam.x) * sc.cam.k > x : x + side + (w * s) / 2 + w * s > sc.W;
      const rx = toLeft ? x - side - (w * s) / 2 : x + side + (w * s) / 2;
      drawReadout(ctx, info, rx, y - 9 * s, s);
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
