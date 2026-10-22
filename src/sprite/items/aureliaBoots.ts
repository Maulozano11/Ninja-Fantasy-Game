// The owner's Aurelia (docs/reference/aurelia-escala-juego-owner-reference.jpg, drawn by him at our
// scale): her thigh-high white boots with gold lace tops and gold heeled shoes. His pixels one for one
// (items/aureliaBootsArt.ts, by tools/refs/aurelia-legs-from-ref.py), one painted piece per segment
// of the leg: the lace top and the boot over the knee turn with the thigh, the boot down the shin with
// the shin, and the shoe stays flat on the ground like our feet. In our female's idle pose every pixel
// is where the script lays it.

import { retintHex } from '../color';
import { type Depth, DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { PaintedPiece, segAngle, stampBent } from '../painted';
import { add, F_NO_EDGE, F_NO_OUTLINE, F_NO_TEXTURE, GRID, type Layer, norm, type PartId, partIndex, PARTS, RES, sub, v, Vec } from '../raster';
import { rotateTemplate, stampTemplate, type TemplatePalette } from '../rotsprite';
import {
  DAWN_BOOT_CLOTH,
  DAWN_BOOT_CLOTH_CHARS,
  DAWN_BOOT_CUT,
  DAWN_BOOT_CUT_F,
  DAWN_BOOT_GOLD,
  DAWN_BOOT_GOLD_CHARS,
  DAWN_FOOT_F,
  DAWN_FOOT_JOIN_F,
  DAWN_FOOT_JOIN_N,
  DAWN_FOOT_N,
  DAWN_SHIN_F,
  DAWN_SHIN_N,
  DAWN_THIGH_F,
  DAWN_THIGH_N,
} from './aureliaBootsArt';
import { closeOpen } from './aureliaVestment';

/**
 * Takes our leg (skin and trousers) off below the boot's lace top: the thigh below the line across it
 * `cut` fine pixels above the knee, the shin and the foot whole. The leg is not outlined along the cut,
 * where the lace top's own line runs.
 */
function legOffBelow(g: DrawCtx, s: Side, hip: Vec, knee: Vec, cut: number): void {
  const down = norm(sub(knee, hip));
  const thigh = partIndex(`thigh${s}`);
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      const p = L.part[i];
      if (L.mat[i] < 0 || (p !== thigh && p !== shin && p !== foot)) continue;
      if (p === thigh) {
        const dx = ((i % GRID) + 0.5) / RES - knee.x;
        const dy = (Math.floor(i / GRID) + 0.5) / RES - knee.y;
        if ((dx * down.x + dy * down.y) * RES <= -cut) continue;
      }
      L.mat[i] = -1;
      L.flags[i] |= F_NO_EDGE;
    }
  }
}

/** Stamps a piece as stampPiece does: at its angle every pixel is his. */
function stampBoot(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/**
 * Takes our torso's skin away where a boot lies: the torso is drawn over the legs, and between the
 * thighs its lowest skin would cover his lace top and his bare thigh in the slit. Not outlined there.
 */
function torsoOffBoot(g: DrawCtx, boot: Uint8Array): void {
  const L = g.L('torso.body');
  if (!L.used) return;
  for (let i = 0; i < GRID * GRID; i++) {
    if (!boot[i] || L.mat[i] !== g.skin) continue;
    L.mat[i] = -1;
    L.flags[i] |= F_NO_EDGE;
  }
}

/**
 * How far the shoe moves off the ankle when the shin turns `deg` from its angle at rest: the shoe follows
 * where the shin's piece ends (`join`, fine pixels from the ankle at rest), which turns with the shin,
 * across only: its sole stays as far under the ankle as at rest, as our flat foot's does, so the boot
 * stands on the ground where our foot does (the shin's piece reaches on under the shoe). At rest it does
 * not move.
 */
function shoeShift(join: [number, number], deg: number): Vec {
  const r = (Math.round(deg) * Math.PI) / 180;
  const [x, y] = join;
  return v((x * Math.cos(r) - y * Math.sin(r) - x) / RES, 0);
}

/** Marks in `out` the fine pixels a painted piece covers when stampPiece stamps it. */
function cover(out: Uint8Array, piece: PaintedPiece, at: Vec, deg: number): void {
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  for (const p of rotateTemplate(piece, deg - piece.angle)) {
    const x = ax + p.dx;
    const y = ay + p.dy;
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) out[y * GRID + x] = 1;
  }
}

/** How near the knee (fine pixels) the thigh's cells turn with it when it bends (stampBent): about half the boot's width. */
const KNEE_R = 4;

/** His black line (never tinted). */
const isLine = (hex: string): boolean => hex === DAWN_THIGH_N.colors.k;

/** How far a knee bends past the way he drew it (degrees, wrapped to -180..180). */
function kneeBend(thighA: number, shinA: number, thigh: PaintedPiece, shin: PaintedPiece): number {
  const d = shinA - thighA - (shin.angle - thigh.angle);
  return ((((d + 180) % 360) + 360) % 360) - 180;
}

/** How far round the knee (fine pixels) closeKnee looks. */
const KNEE_REACH = 6;

/**
 * Closes the boot round a bending knee: the thigh's piece ends open at the knee (his boot runs on into
 * the shin there), so when the shin folds away a pixel of the boot by the knee that is not his line and
 * touches a pixel outside the boot takes his line. At rest the shin's piece meets the thigh's and his
 * own line already closes the boot, so nothing changes.
 */
function closeKnee(g: DrawCtx, s: Side, boot: Uint8Array, knee: Vec): void {
  const L = g.L(legDepth(s, 'feet'));
  const line = g.m(DAWN_THIGH_N.colors.k, 'flat');
  const kx = Math.floor(knee.x * RES);
  const ky = Math.floor(knee.y * RES);
  const close: number[] = [];
  for (let y = Math.max(1, ky - KNEE_REACH); y <= Math.min(GRID - 2, ky + KNEE_REACH); y++) {
    for (let x = Math.max(1, kx - KNEE_REACH); x <= Math.min(GRID - 2, kx + KNEE_REACH); x++) {
      const i = y * GRID + x;
      if (!boot[i] || L.mat[i] < 0 || L.mat[i] === line) continue;
      if (!boot[i - 1] || !boot[i + 1] || !boot[i - GRID] || !boot[i + GRID]) close.push(i);
    }
  }
  for (const i of close) L.mat[i] = line;
}

/**
 * Seals the boot's knee once the thigh's piece and the shin's are turned apart (the owner, 2026-10-22: "checa la
 * rodilla izquierda del personaje en muchas poses se corta con pixeles blancos muertos"): where the two
 * pieces meet, a pixel of his boot's light grey poked out past the line beside the knee, the line of one
 * piece's end ran on across the leg inside the other, and a pixel was left out of the line in a notch. Round
 * the knee (KNEE_REACH) a pixel standing out with only one neighbour goes, a notch with three drawn
 * neighbours takes his line, his line inside the boot (all four neighbours drawn) takes the colour of the
 * boot beside it, and the boot's edge is his line. At rest the pieces meet as he drew them, and the caller
 * leaves them be.
 */
function sealKnee(g: DrawCtx, s: Side, knee: Vec): void {
  const L = g.L(legDepth(s, 'feet'));
  const line = g.m(DAWN_THIGH_N.colors.k, 'flat');
  const kx = Math.floor(knee.x * RES);
  const ky = Math.floor(knee.y * RES);
  const x0 = Math.max(1, kx - KNEE_REACH);
  const x1 = Math.min(GRID - 2, kx + KNEE_REACH);
  const y0 = Math.max(1, ky - KNEE_REACH);
  const y1 = Math.min(GRID - 2, ky + KNEE_REACH);
  const on = (i: number) => L.mat[i] >= 0;
  const around = (i: number) => [i - 1, i + 1, i - GRID, i + GRID];
  const each = (f: (i: number) => void) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(y * GRID + x);
  };
  // a pixel standing out on its own (again until none is left: a spur or a hook several pixels long)
  for (let pass = 0; pass < 8; pass++) {
    const off: number[] = [];
    each((i) => on(i) && around(i).filter(on).length <= 1 && off.push(i));
    if (!off.length) break;
    for (const i of off) L.mat[i] = -1;
  }
  // a notch or a step in the boot's edge (the two pieces' ends side by side): the boot closed over it
  // (every pixel whose 3 x 3 square lies inside the boot grown by a pixel), filled with the boot beside it
  const grown = new Uint8Array(GRID * GRID);
  for (let y = y0 - 1; y <= y1 + 1; y++)
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const i = y * GRID + x;
      grown[i] = on(i) || [-GRID - 1, -GRID, -GRID + 1, -1, 1, GRID - 1, GRID, GRID + 1].some((d) => on(i + d)) ? 1 : 0;
    }
  const notch: [number, number][] = [];
  each((i) => {
    if (on(i) || ![-GRID - 1, -GRID, -GRID + 1, -1, 0, 1, GRID - 1, GRID, GRID + 1].every((d) => grown[i + d])) return;
    const ns = around(i).filter(on);
    if (ns.length) notch.push([i, ns.find((j) => L.mat[j] !== line) ?? ns[0]]);
  });
  for (const [i, j] of notch) L.set(i % GRID, (i / GRID) | 0, L.mat[j], L.shade[j], PARTS[L.part[j]], F_NO_TEXTURE | F_NO_OUTLINE);
  // his line left inside the boot, and the boot's edge (again until nothing changes: an edge made line
  // can leave the line beside it inside)
  for (let pass = 0; pass < 4; pass++) {
    const inside: [number, number][] = [];
    const edge: number[] = [];
    each((i) => {
      if (!on(i)) return;
      const ns = around(i);
      if (ns.every(on)) {
        if (L.mat[i] !== line) return;
        const fill = ns.filter((j) => L.mat[j] !== line);
        if (fill.length >= 2) inside.push([i, fill[0]]);
      } else if (L.mat[i] !== line) edge.push(i);
    });
    if (!inside.length && !edge.length) break;
    for (const [i, j] of inside) {
      L.mat[i] = L.mat[j];
      L.shade[i] = L.shade[j];
    }
    for (const i of edge) L.mat[i] = line;
  }
}

/**
 * The end of a piece at the knee, turned and stamped with its pivot at `at`: the middle of the boot there
 * (fine pixels; the widest of `rows`, his pixels across the leg near the knee, set `ly` rows from the pivot
 * along the piece) and its radius (half that row's width, out to the outer pixels' edges).
 */
function kneeEnd(piece: PaintedPiece, rows: number[], ly: number, at: Vec, deg: number): { c: Vec; r: number } {
  const spans = rows
    .filter((y) => y >= 0 && y < piece.rows.length)
    .map((y) => [...piece.rows[y]].map((ch, x) => (ch === '.' ? -1 : x)).filter((x) => x >= 0))
    .filter((cells) => cells.length)
    .map((cells) => [cells[0], cells[cells.length - 1]]);
  const [a, b] = spans.reduce((w, sp) => (sp[1] - sp[0] > w[1] - w[0] ? sp : w));
  const lx = (a + b) / 2 - piece.pivot[0];
  const r = (Math.round(deg - piece.angle) * Math.PI) / 180;
  const px = Math.floor(at.x * RES) + 0.5;
  const py = Math.floor(at.y * RES) + 0.5;
  return { c: v(px + lx * Math.cos(r) - ly * Math.sin(r), py + lx * Math.sin(r) + ly * Math.cos(r)), r: (b - a + 1) / 2 };
}

/** The boot's width at the knee (fine pixels): the widest of his rows of the thigh's piece just above it. */
const kneeWidth = (thigh: PaintedPiece): number => 2 * kneeEnd(thigh, [thigh.pivot[1] - 3, thigh.pivot[1] - 2, thigh.pivot[1] - 1], 0, v(0, 0), thigh.angle).r;

/** How far a knee bends (degrees past his drawing) before roundKnee counts it folded: the shin under the thigh. */
const FOLD = 90;

/**
 * A corner of the boot's outline round the knee (within KNEE_REACH of it), where two flat edges of the thigh
 * or the shin, each two pixels long or more, meet: square (`cut` 0: the pixel where they meet is drawn), or
 * cut by a single pixel (`cut` 1: that pixel is empty, the two edges' ends beside it drawn). `a` and `b` are
 * the two ways out of it; `e1` is how far the edge facing `a` runs from it (along -b), `e2` the edge facing
 * `b` (along -a), both counted from the corner's pixel whether drawn or not; `f1` and `f2` are as long as
 * that edge's face, when it ends turning out again (cut there by a pixel or not), else 0.
 */
type KneeCorner = { x: number; y: number; cut: 0 | 1; a: [number, number]; b: [number, number]; e1: number; e2: number; f1: number; f2: number };

/** The corners of the boot's outline round the knee (`on`: drawn on the boot's layer, `leg`: and the thigh's or the shin's). */
function kneeCorners(on: (x: number, y: number) => boolean, leg: (x: number, y: number) => boolean, kx: number, ky: number): KneeCorner[] {
  const out: KneeCorner[] = [];
  for (let y = ky - KNEE_REACH; y <= ky + KNEE_REACH; y++)
    for (let x = kx - KNEE_REACH; x <= kx + KNEE_REACH; x++) {
      if (Math.hypot(x - kx, y - ky) > KNEE_REACH) continue;
      for (const a of [[0, -1], [0, 1]] as [number, number][])
        for (const b of [[1, 0], [-1, 0]] as [number, number][]) {
          if (on(x + a[0], y + a[1]) || on(x + b[0], y + b[1]) || on(x + a[0] + b[0], y + a[1] + b[1])) continue;
          const cut = on(x, y) ? 0 : 1;
          if (cut ? !leg(x - b[0], y - b[1]) || !leg(x - a[0], y - a[1]) || !on(x - a[0] - b[0], y - a[1] - b[1]) : !leg(x, y)) continue;
          // how far an edge facing `o` runs along `d` from the corner, and the face it makes if it turns out at
          // its far end (one longer when that end is cut by a pixel too: the pixel in from it is drawn)
          const edge = (o: [number, number], d: [number, number]): [number, number] => {
            let n = cut;
            while (n < 14 && on(x + n * d[0], y + n * d[1]) && !on(x + n * d[0] + o[0], y + n * d[1] + o[1])) n++;
            const [ex, ey] = [x + n * d[0], y + n * d[1]];
            if (on(ex, ey)) return [n, 0];
            return [n, on(ex - o[0], ey - o[1]) ? n + 1 : n];
          };
          const [e1, f1] = edge(a, [-b[0], -b[1]]);
          const [e2, f2] = edge(b, [-a[0], -a[1]]);
          if (e1 - cut < 2 || e2 - cut < 2) continue;
          out.push({ x, y, cut, a, b, e1, e2, f1, f2 });
        }
    }
  return out;
}

/**
 * Rounds the boot's knee wherever it is left square (the owner, 2026-10-22: "si redondea las rodillas de
 * aurelia donde quede muy cuadrada"). However far the knee bends, the end of the thigh's piece (square, his
 * boot running on into the shin there) or the step between the thigh's piece and the shin's can leave the
 * knee a block's corner, two flat edges meeting square. Each such corner is cut on the slant, steps of a
 * pixel, as deep as a third of the boot's width (`w`: two pixels on her far boot, three on her near one). So
 * a boot ending square past a folded knee ends in a round cap as wide as the boot (its face, cut at both
 * ends, keeps two pixels in the middle; an end his sweep already cut by a pixel is cut as deep), and a corner
 * on a gentler knee loses its point. A cut never takes a whole edge that turns in after it. The pixels a cut
 * lays bare take his line. Again until no square corner is left. A corner already cut by a pixel is cut
 * deeper only at the end of a face: elsewhere it already reads round.
 */
function roundCorners(g: DrawCtx, s: Side, knee: Vec, w: number): void {
  const L = g.L(legDepth(s, 'feet'));
  const line = g.m(DAWN_THIGH_N.colors.k, 'flat');
  const parts = new Set([partIndex(`thigh${s}`), partIndex(`shin${s}`)]);
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && L.mat[y * GRID + x] >= 0;
  const leg = (x: number, y: number) => on(x, y) && parts.has(L.part[y * GRID + x]);
  const kx = Math.floor(knee.x * RES);
  const ky = Math.floor(knee.y * RES);
  const deep = Math.max(1, Math.floor(w / 3));
  for (let pass = 0; pass < 6; pass++) {
    const off = new Set<number>();
    for (const c of kneeCorners(on, leg, kx, ky)) {
      // An edge turning in after the corner keeps a pixel. A face, cut at both ends, keeps two in the middle
      // (its top or left end, `first`, cut a pixel deeper when they cannot share alike); a face of four (a
      // knee standing out two pixels wide past its corners) goes whole, the boot's next pixels its face.
      const room = (e: number, f: number, first: boolean) => (!f ? e - 1 : f === 4 ? 2 : f < 4 ? 1 : first ? Math.ceil((f - 2) / 2) : Math.floor((f - 2) / 2));
      const n = Math.min(deep, room(c.e1, c.f1, c.b[0] < 0), room(c.e2, c.f2, c.a[1] < 0));
      if (n <= c.cut || (c.cut && !c.f1 && !c.f2)) continue;
      // the corner's triangle: i pixels in from the edge facing b, j in from the edge facing a
      for (let i = 0; i < n; i++)
        for (let j = 0; i + j < n; j++) {
          const x = c.x - i * c.b[0] - j * c.a[0];
          const y = c.y - i * c.b[1] - j * c.a[1];
          if (leg(x, y)) off.add(y * GRID + x);
        }
    }
    if (!off.size) break;
    // and a pixel the cuts leave standing out on its own (a face of four cut at one end only) goes with them
    for (let more = off; more.size; ) {
      for (const i of more) {
        L.mat[i] = -1;
        L.flags[i] |= F_NO_EDGE;
      }
      for (const i of more) for (const j of [i - 1, i + 1, i - GRID, i + GRID]) if (L.mat[j] >= 0) L.mat[j] = line;
      const next = new Set<number>();
      for (const i of more)
        for (const j of [i - 1, i + 1, i - GRID, i + GRID]) {
          const [x, y] = [j % GRID, (j / GRID) | 0];
          if (leg(x, y) && Math.hypot(x - kx, y - ky) <= KNEE_REACH && [j - 1, j + 1, j - GRID, j + GRID].filter((n) => L.mat[n] >= 0).length <= 1) next.add(j);
        }
      more = next;
    }
  }
}

/**
 * Rounds a bent knee (the owner, 2026-10-22: "corrige la rodilla en correr 2 se ve rara"). The thigh's
 * piece ends square at the knee, his boot running on into the shin there, and it turns about the knee,
 * which he drew by the boot's front, not its middle: bent, its back corners swept round past the knee
 * (stampBent). Folded far (the far knee in run frame 2 bends 140 degrees) they stood out past the knee as a
 * square block, a step at its top and a pixel hanging from its bottom like a hook. A knee is the two tubes
 * of the boot ending in round caps: past the end of both the thigh and the shin, only the cap of one of
 * them (a disc on the middle of its end, as wide as the boot there) is boot, and what lies beyond goes.
 * sealKnee then draws his line round what is left. Only a folded knee (FOLD) is capped so; any square
 * corner left on a knee however far it bends, this one too, roundCorners cuts after sealKnee. At rest the
 * caller leaves the knee be.
 */
function roundKnee(g: DrawCtx, s: Side, hip: Vec, knee: Vec, ankle: Vec, thigh: PaintedPiece, shin: PaintedPiece, thighA: number, shinA: number): void {
  if (Math.abs(kneeBend(thighA, shinA, thigh, shin)) < FOLD) return;
  const L = g.L(legDepth(s, 'feet'));
  const parts = new Set([partIndex(`thigh${s}`), partIndex(`shin${s}`)]);
  const ty = thigh.pivot[1];
  const t = kneeEnd(thigh, [ty - 3, ty - 2, ty - 1], 0, knee, thighA);
  // the shin's piece reaches the knee this many rows above its pivot (the ankle)
  const sy = Math.round(shin.pivot[1] - Math.hypot(knee.x - ankle.x, knee.y - ankle.y) * RES);
  const sh = kneeEnd(shin, [sy, sy + 1, sy + 2], sy - shin.pivot[1], ankle, shinA);
  const ut = norm(sub(knee, hip));
  const us = norm(sub(knee, ankle));
  const past = (x: number, y: number) =>
    (x + 0.5 - t.c.x) * ut.x + (y + 0.5 - t.c.y) * ut.y > 0 && (x + 0.5 - sh.c.x) * us.x + (y + 0.5 - sh.c.y) * us.y > 0;
  const inCap = (x: number, y: number) => Math.hypot(x + 0.5 - t.c.x, y + 0.5 - t.c.y) <= t.r || Math.hypot(x + 0.5 - sh.c.x, y + 0.5 - sh.c.y) <= sh.r;
  const reach = Math.ceil(Math.max(t.r, sh.r)) + KNEE_REACH;
  const kx = Math.floor(knee.x * RES);
  const ky = Math.floor(knee.y * RES);
  const x0 = Math.max(1, kx - reach);
  const x1 = Math.min(GRID - 2, kx + reach);
  const y0 = Math.max(1, ky - reach);
  const y1 = Math.min(GRID - 2, ky + reach);
  const on = (i: number) => L.mat[i] >= 0;
  const clear = (i: number) => {
    L.mat[i] = -1;
    L.flags[i] |= F_NO_EDGE;
  };
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * GRID + x;
      if (on(i) && parts.has(L.part[i]) && past(x, y) && !inCap(x, y)) clear(i);
    }
  // and the thigh's back corner stands a pixel out past the shin's front folded under it: a bump one pixel
  // high and one or two wide on the boot's edge, the edge on both sides of it a pixel in. It goes, the edge
  // running on past it. The caps' round ends are left be.
  for (const [along, outward] of [[1, GRID], [1, -GRID], [GRID, 1], [GRID, -1]]) {
    const off: number[] = [];
    for (let y = y0 + 2; y <= y1 - 2; y++)
      for (let x = x0 + 2; x <= x1 - 2; x++) {
        const i = y * GRID + x;
        if (!on(i) || on(i + outward) || on(i - along)) continue;
        const run = on(i + along) ? 2 : 1;
        const end = i + run * along;
        if (on(end) || on(end - along + outward)) continue;
        let base = true;
        for (let k = -1; k <= run && base; k++) base = on(i + k * along - outward);
        const bump = Array.from({ length: run }, (_, k) => i + k * along);
        if (base && bump.every((j) => parts.has(L.part[j]) && !past(j % GRID, (j / GRID) | 0))) off.push(...bump);
      }
    off.forEach(clear);
  }
  // A notch a pixel deep and up to three wide between two stubs of the boot (the thigh's piece and the
  // shin's ending side by side under the knee) is filled: the edge runs on under it. And where the thigh's
  // back meets the shin's front, the edge drops two pixels at once between two longer flats (a stair step):
  // the pixel in its inner corner is filled, two steps of one.
  const line = g.m(DAWN_THIGH_N.colors.k, 'flat');
  for (const swap of [false, true]) {
    const idx = (u: number, w: number) => (swap ? u * GRID + w : w * GRID + u);
    const on2 = (u: number, w: number) => on(idx(u, w));
    const [u0, u1, w0, w1] = swap ? [y0, y1, x0, x1] : [x0, x1, y0, y1];
    const riser = (u: number, w: number) => on2(u - 1, w) !== on2(u, w);
    const flat = (u: number, w: number) => on2(u, w - 1) !== on2(u, w);
    const run = (u: number, w: number, du: number) => {
      let n = 0;
      while (u + n * du >= u0 && u + n * du <= u1 && flat(u + n * du, w)) n++;
      return n;
    };
    const fill: number[] = [];
    for (let u = u0 + 1; u < u1; u++)
      for (let w = w0 + 1; w < w1; w++)
        for (const out of [1, -1]) {
          if (on2(u, w) || !on2(u - 1, w)) continue;
          let n = 1;
          while (n <= 3 && u + n <= u1 && !on2(u + n, w)) n++;
          if (n > 3 || u + n > u1 || !on2(u + n, w) || !parts.has(L.part[idx(u - 1, w)]) || !parts.has(L.part[idx(u + n, w)])) continue;
          let closed = true;
          for (let k = -1; k <= n; k++) closed &&= on2(u + k, w - out);
          if (closed) for (let k = 0; k < n; k++) fill.push(idx(u + k, w));
        }
    for (let u = u0 + 1; u <= u1; u++)
      for (let w = w0 + 1; w < w1 - 1; w++) {
        if (!riser(u, w) || riser(u, w - 1) || !riser(u, w + 1) || riser(u, w + 2)) continue;
        const [tl, tr, bl, br] = [run(u - 1, w, -1), run(u, w, 1), run(u - 1, w + 2, -1), run(u, w + 2, 1)];
        if (!((tl > 2 && br > 2 && !tr && !bl) || (tr > 2 && bl > 2 && !tl && !br))) continue;
        const off = on2(u - 1, w) ? u : u - 1;
        if (on2(off, w - 1)) fill.push(idx(off, w));
        else if (on2(off, w + 2)) fill.push(idx(off, w + 1));
      }
    for (const i of fill) {
      const ns = [i - 1, i + 1, i - GRID, i + GRID].filter((j) => on(j) && parts.has(L.part[j]));
      const j = ns.find((n) => L.mat[n] !== line) ?? ns[0];
      if (j !== undefined) L.set(i % GRID, (i / GRID) | 0, L.mat[j], L.shade[j], PARTS[L.part[j]], F_NO_TEXTURE | F_NO_OUTLINE);
    }
  }
}

/**
 * Fills a pixel left empty with all four of its neighbours drawn on these depths (a turned leg: his bare
 * woman's thigh, the lace top, the shin; and her skirt's panels over it): two of his pieces turned about
 * different joints can leave a single pixel between them, a hole in the leg. It takes the colour most of
 * those neighbours have (the first one's on a tie), on that neighbour's layer. Callers fill only away
 * from rest: at rest nothing is turned.
 */
export function fillHoles(g: DrawCtx, depths: Depth[]): void {
  const Ls = depths.map((d) => g.L(d)).filter((L) => L.used);
  const top = (i: number): Layer | undefined => {
    for (let k = Ls.length - 1; k >= 0; k--) if (Ls[k].mat[i] >= 0) return Ls[k];
    return undefined;
  };
  const fill: [number, Layer, number][] = [];
  for (let y = 1; y < GRID - 1; y++)
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      if (top(i)) continue;
      const ns = [i - 1, i + 1, i - GRID, i + GRID];
      const ts = ns.map(top);
      if (ts.some((t) => !t)) continue;
      const count = new Map<number, number>();
      ns.forEach((j, k) => count.set(ts[k]!.mat[j], (count.get(ts[k]!.mat[j]) ?? 0) + 1));
      const best = ns.reduce((b, j, k) => ((count.get(ts[k]!.mat[j]) ?? 0) > (count.get(ts[b]!.mat[ns[b]]) ?? 0) ? k : b), 0);
      fill.push([i, ts[best]!, ns[best]]);
    }
  for (const [i, L, j] of fill) L.set(i % GRID, (i / GRID) | 0, L.mat[j], L.shade[j], PARTS[L.part[j]], F_NO_TEXTURE | F_NO_OUTLINE);
}

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });

/** The feet slot's entry (items/feet.ts FEET_ITEMS). */
export const FEET_DAWN_BOOTS: ItemDef = {
  id: 'feet_dawn_boots',
  slot: 'feet',
  name: 'Dawn Boots',
  desc: 'Thigh-high white boots with gold lace tops, a gold seam down the front and gold heeled shoes. Women only.',
  colors: [col('cloth', 'Cloth', DAWN_BOOT_CLOTH), col('gold', 'Gold', DAWN_BOOT_GOLD, 'metal')],
  bodies: ['female', 'slender'],
  draw: (g, [cloth, gold]) => {
    // His whites, creams and greys follow Cloth and his golds follow Gold, each shade as far from the
    // slot's colour as his was from his own; his black line and his brown soles and heel stay.
    const tint = (ch: string, hex: string) =>
      DAWN_BOOT_CLOTH_CHARS.includes(ch) ? retintHex(hex, DAWN_BOOT_CLOTH, cloth) : DAWN_BOOT_GOLD_CHARS.includes(ch) ? retintHex(hex, DAWN_BOOT_GOLD, gold) : hex;
    // On each leg (far first, behind): our leg goes below the lace top; the shin's piece turns with the
    // shin about the ankle, reaching under the shoe and under the thigh's piece; the shoe stays flat,
    // hanging where the shin's piece ends; the lace top and the boot over the knee turn with the thigh
    // about the knee, on top; and the boot is closed round a bending knee. The far boot is his narrow
    // column beside her front panel, laid where he drew it, on his bare woman's far leg (the same
    // column): its lace top rides the far thigh, the rest the far shin. Each boot is drawn once, on its
    // own leg: our leg below the lace top is the boot's.
    const sealed: [Side, Vec, () => void, number][] = [];
    for (const s of ['F', 'N'] as Side[]) {
      const { hip, knee, ankle } = legJoints(g.rig, s);
      const [thigh, shin, foot, join, cut] = s === 'N' ? [DAWN_THIGH_N, DAWN_SHIN_N, DAWN_FOOT_N, DAWN_FOOT_JOIN_N, DAWN_BOOT_CUT] : [DAWN_THIGH_F, DAWN_SHIN_F, DAWN_FOOT_F, DAWN_FOOT_JOIN_F, DAWN_BOOT_CUT_F];
      legOffBelow(g, s, hip, knee, cut);
      const d = legDepth(s, 'feet');
      const shinA = segAngle(knee, ankle);
      const thighA = segAngle(hip, knee);
      const at = ankle;
      const footAt = add(at, shoeShift(join, shinA - shin.angle));
      stampBoot(g, d, shin, at, shinA, `shin${s}`, tint);
      stampBoot(g, d, foot, footAt, foot.angle, `foot${s}`, tint);
      const boot = new Uint8Array(GRID * GRID);
      cover(boot, shin, at, shinA);
      cover(boot, foot, footAt, foot.angle);
      // the thigh's piece over the shin's, its cells by the knee filling a bent knee's outside (at rest,
      // and with the knee bent as he drew it, it is stampPiece exactly)
      const under = boot.slice();
      stampBent(g, d, thigh, knee, thighA, `thigh${s}`, [{ about: knee, r: KNEE_R, bend: kneeBend(thighA, shinA, thigh, shin) }], isLine, tint, (x, y) => !!under[y * GRID + x], { lined: false });
      // the boot covers the thigh's piece and the bent knee's fill (its pixels of the thigh on this layer)
      const L = g.L(d);
      const tp = partIndex(`thigh${s}`);
      for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === tp) boot[i] = 1;
      closeKnee(g, s, boot, knee);
      torsoOffBoot(g, boot);
      // turned, an edge of his boot left open is closed in his line (at rest his line closes it)
      const turned = Math.abs(shinA - shin.angle) >= 0.5 || Math.abs(thighA - thigh.angle) >= 0.5 || footAt.x !== at.x;
      if (turned) closeOpen(g, d, boot, DAWN_THIGH_N.colors.k);
      if (turned) sealed.push([s, knee, () => roundKnee(g, s, hip, knee, ankle, thigh, shin, thighA, shinA), kneeWidth(thigh)]);
    }
    if (g.rig.pose !== 'idle') for (const s of ['F', 'N'] as Side[]) fillHoles(g, [legDepth(s, 'body'), legDepth(s, 'cloth'), legDepth(s, 'feet')]);
    // and, last, each turned knee where the thigh's piece meets the shin's is rounded and sealed, and no
    // square corner is left on it
    for (const [s, knee, round, w] of sealed) {
      round();
      sealKnee(g, s, knee);
      roundCorners(g, s, knee, w);
    }
  },
};
