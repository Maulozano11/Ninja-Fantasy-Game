// The owner's Roman head on our male bodies at his own height, on his neck. He painted the head 3 px
// higher than ours on a longer neck, and on 2026-10-23, seeing his face sit on our short neck, asked
// for his: "porque no tenemos la forma de cabeza y cuello de romano en el juego ? cambialo
// inmediatamente me gusta mas el de mi dibujo". So with his face ('roman') on a male body the head is
// raised under it (every head piece, hair, eye, mask and headband goes with it) and the neck shown
// between his chin and the collar is his (romanNeckArt.ts).

import { faceAnchor } from './body';
import { isLine, retintSkinLifted } from './color';
import { type Depth, DEPTHS, type DrawCtx } from './ctx';
import { takesMaleSkin } from './maleSkin';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, type Layer, RES, v } from './raster';
import type { Rig } from './rig';
import { NAVY_HEAD_UP } from './navyHeadArt';
import { ROMAN_HEAD_UP, ROMAN_SKIN } from './romanHeadArt';
import { ROMAN_NECK } from './romanNeckArt';
import type { SpriteAppearance } from './types';

/** Whether this look stands his Roman head on his neck: his face on a male body (male, bulky). */
export const onRomanNeck = (look: SpriteAppearance): boolean => look.faceShape === 'roman' && takesMaleSkin(look.body);

/**
 * How far his face raises the head on a male body (fine pixels): his Roman head stands where he painted it on
 * his neck, and his navy officer's head as high, where his pictures have it above the collar (his neck there
 * is hidden by the collar). Every other face keeps our head height.
 */
export function headUp(look: SpriteAppearance): number {
  if (!takesMaleSkin(look.body)) return 0;
  return look.faceShape === 'roman' ? ROMAN_HEAD_UP : look.faceShape === 'navy' ? NAVY_HEAD_UP : 0;
}

/** The rig with the head raised to where he painted it, for his Roman or navy face on a male body; any other look's rig as it is. */
export function romanRig(rig: Rig, look: SpriteAppearance): Rig {
  const up = headUp(look);
  if (!up) return rig;
  return { ...rig, head: v(rig.head.x, rig.head.y - up / RES) };
}

/**
 * His neck under his face: his skin between the chin and the collar, riding the head as the face does, in
 * the character's skin (his black line kept). Drawn over our neck above the neck joint, where the
 * cuirass clears the torso below it (armor.ts clearUnderCuirass): his neck never runs down over the chest,
 * and at rest every pixel is where he drew it. Below the neck joint it only fills what the finished figure
 * leaves open between the chin and the collar (a pose that turns the chest under the raised head, the
 * cuirass then not reaching the chin): there his neck goes on in his pixels, never over anything drawn.
 */
export function drawRomanNeck(g: DrawCtx): void {
  if (!onRomanNeck(g.look)) return;
  const r = g.rig;
  const { nx, ny } = faceAnchor(g);
  const ax = nx - ROMAN_NECK.pivot[0];
  const ay = ny - ROMAN_NECK.pivot[1];
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  const L = g.L('torso.body');
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(ROMAN_NECK.colors)) pens[ch] = g.m(retintSkinLifted(hex, ROMAN_SKIN, g.look.skin), 'flat');
  const below: [number, number, string][] = [];
  ROMAN_NECK.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      const x = ax + i;
      const y = ay + j;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      const lx = (x + 0.5) / RES - r.pelvis.x;
      const ly = (y + 0.5) / RES - r.pelvis.y;
      if (lx * r.up.x + ly * r.up.y <= neck) below.push([x, y, row[i]]);
      else L.set(x, y, pens[row[i]], 3, 'torso', F_NO_TEXTURE | F_NO_OUTLINE);
    }
  });
  g.after((layers) => fillNeckGaps(g, layers, below, pens, ax, ay));
}

/**
 * What the finished figure leaves open about the raised neck, closed with his neck. Below the neck joint,
 * in each column of his neck, a run of open cells closed above (the chin, his neck) and below (the
 * collar): there his neck goes on in his pixels (a pose that turns the chest under the raised head, the
 * cuirass not reaching the chin). Then any hole the figure closes all round within the neck's reach
 * (behind the neck under the hair, beside it under the chin, where our lower head used to be): his
 * nearest neck skin. Under a head hung out past the body nothing closes the gap, and it stays open.
 */
function fillNeckGaps(g: DrawCtx, layers: ReadonlyMap<Depth, Layer>, below: [number, number, string][], pens: Record<string, number>, ax: number, ay: number): void {
  const L = g.L('torso.body');
  const front = [...layers].filter(([d, l]) => l.used && DEPTHS.indexOf(d) >= TORSO).map(([, l]) => l);
  const all = [...layers.values()].filter((l) => l.used);
  const covered = (x: number, y: number) => front.some((l) => l.has(x, y));
  const set = (x: number, y: number, ch: string) => L.set(x, y, pens[ch], 3, 'head', F_NO_TEXTURE | F_NO_OUTLINE);
  const cols = new Map<number, Map<number, string>>();
  for (const [x, y, ch] of below) {
    if (!cols.has(x)) cols.set(x, new Map());
    cols.get(x)!.set(y, ch);
  }
  for (const [x, cells] of cols) {
    const ys = [...cells.keys()].sort((p, q) => p - q);
    let run: number[] = [];
    for (const y of [...ys, Infinity]) {
      if (y !== Infinity && !covered(x, y) && (run.length === 0 || y === run[run.length - 1] + 1)) {
        run.push(y);
        continue;
      }
      if (run.length && covered(x, run[0] - 1) && y === run[run.length - 1] + 1 && covered(x, y)) for (const q of run) set(x, q, cells.get(q)!);
      run = y !== Infinity && !covered(x, y) ? [y] : [];
    }
  }

  // Holes about the neck: open cells the figure closes all round, each hole wholly within the neck's
  // reach (a gap that runs on past it, between an arm and the body, is left as it is).
  const W = Math.max(...ROMAN_NECK.rows.map((row) => row.length));
  const x0 = ax - NECK_REACH.back;
  const x1 = ax + W + NECK_REACH.front;
  const y0 = ay - NECK_REACH.up;
  const y1 = ay + ROMAN_NECK.rows.length;
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && !all.some((l) => l.has(x, y));
  const seen = new Set<number>();
  const skin: [number, number, string][] = [];
  ROMAN_NECK.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.' && !isLine(ROMAN_NECK.colors[row[i]])) skin.push([ax + i, ay + j, row[i]]);
  });
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      if (seen.has(y * GRID + x) || !open(x, y)) continue;
      const hole: number[] = [];
      let inside = true;
      const stack = [y * GRID + x];
      seen.add(y * GRID + x);
      while (stack.length) {
        const p = stack.pop()!;
        hole.push(p);
        const px = p % GRID;
        const py = (p / GRID) | 0;
        if (px <= x0 || px >= x1 - 1 || py <= y0 || py >= y1 - 1) inside = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const q = (py + dy) * GRID + px + dx;
          if (!seen.has(q) && open(px + dx, py + dy)) {
            seen.add(q);
            stack.push(q);
          }
        }
      }
      if (!inside) continue;
      for (const p of hole) {
        const px = p % GRID;
        const py = (p / GRID) | 0;
        let best = skin[0];
        for (const c of skin) if (Math.hypot(c[0] - px, c[1] - py) < Math.hypot(best[0] - px, best[1] - py)) best = c;
        set(px, py, best[2]);
      }
    }
}

/**
 * How far about his neck (fine px) a hole in the figure is his neck's to close: back to the nape under the
 * hair (on the bulky body's broader shoulders too), forward under the chin, and up to the eyes (a gap
 * beside the head higher up, under a raised arm, is the pose's).
 */
const NECK_REACH = { back: 13, front: 9, up: 11 };

const TORSO = DEPTHS.indexOf('torso.body');
