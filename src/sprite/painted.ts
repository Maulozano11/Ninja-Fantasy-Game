// Pieces painted by the owner (his pixels and colours, lifted out of his pictures by tools/refs/*.py)
// that ride the rig: each is drawn as he drew it when its limb points the way it did in his picture,
// and turned with RotSprite as the limb turns in other poses.

import type { Depth, DrawCtx } from './ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, PartId, RES, v, Vec } from './raster';
import { PixelTemplate, rotateLined, rotateTemplate, stampTemplate, TemplatePalette } from './rotsprite';

export interface PaintedPiece extends PixelTemplate {
  /** One character per colour of his; '.' is empty. */
  colors: Record<string, string>;
  /** The angle (screen degrees, 0 = right, + = clockwise) of the limb it rides, in his picture. */
  angle: number;
}

/** The screen angle in degrees of the segment from `a` to `b` (0 = right, + = clockwise). */
export const segAngle = (a: Vec, b: Vec): number => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/**
 * Stamps a painted piece with its pivot on `at`, its limb now pointing along `deg`: at his angle
 * every pixel is his. `color` recolours a character's colour (for the item's colour slots). With
 * `line` (which of his colours are his black line), turned it keeps his line whole (rotateLined).
 */
export function stampPiece(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color?: (ch: string, hex: string) => string, line?: (hex: string) => boolean): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color ? color(ch, hex) : hex, 'flat'), 3];
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE, line: line && ((ch) => line(piece.colors[ch])) });
}

const LIMB_ONLY = new WeakMap<PaintedPiece, PaintedPiece>();

/**
 * A piece of his limb without what was lifted with it from behind the limb (the skirt's red, a strap, the
 * cape, a speck of his line): only the largest patch inside his black line and the line round it. At rest
 * the whole piece lands on what it was cut from; a limb that moves away takes only itself along.
 */
export function limbOnly(piece: PaintedPiece, line: (hex: string) => boolean): PaintedPiece {
  const hit = LIMB_ONLY.get(piece);
  if (hit) return hit;
  const H = piece.rows.length;
  const W = Math.max(...piece.rows.map((r) => r.length));
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && y < H && x < W ? piece.rows[y][x] ?? '.' : '.');
  const inner = (x: number, y: number) => at(x, y) !== '.' && !line(piece.colors[at(x, y)]);
  // The patches inside his line (4-neighbours), the largest kept.
  const patch = new Map<number, number>();
  let best = -1;
  let bestN = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inner(x, y) || patch.has(y * W + x)) continue;
      const id = y * W + x;
      const stack = [[x, y]];
      let n = 0;
      while (stack.length) {
        const [p, q] = stack.pop()!;
        if (!inner(p, q) || patch.has(q * W + p)) continue;
        patch.set(q * W + p, id);
        n++;
        stack.push([p + 1, q], [p - 1, q], [p, q + 1], [p, q - 1]);
      }
      if (n > bestN) [best, bestN] = [id, n];
    }
  const kept = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && patch.get(y * W + x) === best;
  const rows = piece.rows.map((row, y) =>
    [...row.padEnd(W, '.')]
      .map((ch, x) => {
        if (ch === '.') return '.';
        if (!line(piece.colors[ch])) return kept(x, y) ? ch : '.';
        // his line where it bounds the patch
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (kept(x + dx, y + dy)) return ch;
        return '.';
      })
      .join(''),
  );
  const out = { ...piece, rows };
  LIMB_ONLY.set(piece, out);
  return out;
}

/**
 * His limb continued where he drew none of it, up to its joint (hidden at rest under the cuirass or the
 * skirt, shown as the limb reaches out): his first row across the limb with at least `inner` cells inside
 * his line, all of them `plain` (no stud or trim), repeated along the limb (his angle; `period` rows from
 * there, for a pattern such as laces) up to the row `to`
 * (counted from the piece's first row; negative is above it), over every row above it too, and closed at
 * the top by his line.
 */
export function continuedTo(piece: PaintedPiece, to: number, inner: number, line: (hex: string) => boolean, plain: (hex: string) => boolean, period = 1): PaintedPiece {
  const cells = (row: string) => [...row].filter((ch) => ch !== '.');
  const r = piece.rows.findIndex((row) => cells(row).filter((ch) => !line(piece.colors[ch])).length >= inner && cells(row).every((ch) => line(piece.colors[ch]) || plain(piece.colors[ch])));
  if (r < 0) return piece;
  const top = Math.min(0, Math.floor(to));
  const a = (piece.angle * Math.PI) / 180;
  const shift = (y: number) => (y < r ? Math.round(((y - r) * Math.cos(a)) / Math.sin(a)) : 0);
  const pad = Math.max(0, ...Array.from({ length: r - top }, (_, k) => -shift(top + k)));
  const counts = new Map<string, number>();
  for (const row of piece.rows) for (const ch of row) if (ch !== '.' && line(piece.colors[ch])) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const edge = [...counts].sort((p, q) => q[1] - p[1])[0]?.[0] ?? '.';
  const rows: string[] = [];
  for (let y = top; y < piece.rows.length; y++) {
    const src = y < r ? piece.rows[r + ((((y - r) % period) + period) % period)] : piece.rows[y];
    rows.push('.'.repeat(Math.max(0, pad + shift(y))) + src);
  }
  rows[0] = [...rows[0]].map((ch) => (ch === '.' ? '.' : edge)).join('');
  return { ...piece, rows, pivot: [piece.pivot[0] + pad, piece.pivot[1] - top] };
}

/**
 * A joint a painted piece bends at (see stampBent): its cells within `r` fine pixels of `about` turn about
 * it by up to `bend` degrees. With `carry` (the far end of the limb: an elbow, a knee) his cells past the
 * joint ride the next segment, turned by the whole bend.
 */
export interface PieceJoint {
  about: Vec;
  r: number;
  bend: number;
  carry?: boolean;
}

/** Degrees between the copies that fill a bent joint (small enough to leave no holes). */
const BEND_STEP = 5;

/**
 * Stamps a painted piece as stampPiece does, and fills each joint it bends at with its own pixels: the
 * cells next to the joint stamped again, turned about it by every angle up to the joint's bend (how far
 * the limb bends past the way he drew it), so the outside of a bent elbow or knee or a raised shoulder is
 * his limb turned there, never a hole or another limb. A copy's inside covers his black line where the
 * limb bends (no line crosses the joint); where it would lie bare (outside the piece and outside
 * `covered`, the pieces drawn over it), it takes his line. With no bend it is stampPiece given `line`. `line`
 * says which of his colours are his black line.
 */
export function stampBent(
  g: DrawCtx,
  depth: Depth,
  piece: PaintedPiece,
  at: Vec,
  deg: number,
  part: PartId,
  joints: PieceJoint[],
  line: (hex: string) => boolean,
  color?: (ch: string, hex: string) => string,
  covered?: (x: number, y: number) => boolean,
): void {
  const px = new Map<number, { ch: string; added: boolean }>();
  const isLine = (ch: string) => line(piece.colors[ch]);
  const put = (t: PixelTemplate, a: Vec, d: number, first: boolean) => {
    const ax = Math.floor(a.x * RES);
    const ay = Math.floor(a.y * RES);
    // His line kept whole as the piece turns (rotateLined): what it puts back goes only where nothing is.
    const own = rotateTemplate(t, d - piece.angle).length;
    rotateLined(t, d - piece.angle, isLine).forEach((p, k) => {
      const x = ax + p.dx;
      const y = ay + p.dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
      const i = y * GRID + x;
      const was = px.get(i);
      if (k >= own ? !was : first || !was || (isLine(was.ch) && !isLine(p.ch))) px.set(i, { ch: p.ch, added: !first });
    });
  };
  /** The piece turned by `d` about `about`: where its pivot lands. */
  const turned = (about: Vec, d: number): Vec => {
    const c = Math.cos((d * Math.PI) / 180);
    const s = Math.sin((d * Math.PI) / 180);
    const ox = at.x - about.x;
    const oy = at.y - about.y;
    return v(about.x + ox * c - oy * s, about.y + ox * s + oy * c);
  };
  const rad = ((deg - piece.angle) * Math.PI) / 180;
  const along = (piece.angle * Math.PI) / 180;
  const bent = joints.filter((j) => Math.abs(j.bend) >= 1);
  // Each bent joint among the piece's own cells (as he drew it): its cells next to it, and past it.
  const sides = bent.map((j) => {
    const dx = (j.about.x - at.x) * RES;
    const dy = (j.about.y - at.y) * RES;
    const jx = piece.pivot[0] + dx * Math.cos(rad) + dy * Math.sin(rad);
    const jy = piece.pivot[1] - dx * Math.sin(rad) + dy * Math.cos(rad);
    const past = (x: number, y: number) => !!j.carry && (x - jx) * Math.cos(along) + (y - jy) * Math.sin(along) > 0;
    const keep = (f: (x: number, y: number) => boolean): PixelTemplate => ({
      pivot: piece.pivot,
      rows: piece.rows.map((row, y) => [...row].map((ch, x) => (ch !== '.' && f(x, y) ? ch : '.')).join('')),
    });
    return { j, past, near: keep((x, y) => !past(x, y) && Math.hypot(x - jx, y - jy) <= j.r), beyond: keep(past) };
  });
  const carried = sides.filter((s) => s.j.carry);
  put(carried.length ? { pivot: piece.pivot, rows: piece.rows.map((row, y) => [...row].map((ch, x) => (carried.some((s) => s.past(x, y)) ? '.' : ch)).join('')) } : piece, at, deg, true);
  for (const s of carried) put(s.beyond, turned(s.j.about, s.j.bend), deg + s.j.bend, true);
  for (const { j, near } of sides) {
    const n = Math.ceil(Math.abs(j.bend) / BEND_STEP);
    for (let k = 1; k <= n; k++) {
      const d = (j.bend * k) / n;
      put(near, turned(j.about, d), deg + d, false);
    }
  }
  // His line where a copy's inside lies bare: the line colour he uses most in this piece.
  const counts = new Map<string, number>();
  for (const row of piece.rows) for (const ch of row) if (ch !== '.' && isLine(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const edge = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const bare = (x: number, y: number) => x < 0 || y < 0 || x >= GRID || y >= GRID || (!px.has(y * GRID + x) && !covered?.(x, y));
  const fixed: number[] = [];
  for (const [i, p] of px) {
    if (!p.added || isLine(p.ch) || !edge) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (bare(x - 1, y) || bare(x + 1, y) || bare(x, y - 1) || bare(x, y + 1)) fixed.push(i);
  }
  for (const i of fixed) px.get(i)!.ch = edge!;
  const L = g.L(depth);
  const mats = new Map<string, number>();
  for (const [ch, hex] of Object.entries(piece.colors)) mats.set(ch, g.m(color ? color(ch, hex) : hex, 'flat'));
  for (const [i, p] of px) L.set(i % GRID, (i / GRID) | 0, mats.get(p.ch)!, 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
}

/** Two pieces he drew as one picture (a shin and its boot or sandal), laid in one grid as he drew them. */
interface JoinedPieces {
  piece: PixelTemplate;
  /** The grid's characters that are the upper piece's (the rest are the lower's). */
  upper: Set<string>;
  /** Each grid character: its piece's own character and colour. */
  of: Map<string, [string, string]>;
}

const JOINED = new Map<string, JoinedPieces>();

/** How many rows above the lower piece's first row, and below it, are the joint (closeJoint). */
const JOINT_UP = 4;
const JOINT_DOWN = 2;
/** The widest step (cells) at the joint that is closed: a wider one is a toe or a heel standing out from the ankle, as he drew it. */
const JOINT_STEP = 3;

/**
 * `upper` and `lower` in one grid, each where he drew it (their pivots on one point), the lower over the
 * upper where they overlap, as they are stamped; each piece's characters renamed apart so either can be told
 * from the other.
 * With `line` (which of his colours are his line), the joint is closed as one piece (closeJoint).
 */
function joinedPieces(upper: PaintedPiece, lower: PaintedPiece, line?: (hex: string) => boolean): JoinedPieces {
  const key = `${upper.rows.join('|')}@${upper.pivot}#${lower.rows.join('|')}@${lower.pivot}#${!!line}`;
  const hit = JOINED.get(key);
  if (hit) return hit;
  const [ox, oy] = [upper.pivot[0] - lower.pivot[0], upper.pivot[1] - lower.pivot[1]];
  const w = (p: PaintedPiece) => Math.max(...p.rows.map((r) => r.length));
  // (room on either side for closeJoint to move the outline out)
  const pad = line ? JOINT_STEP : 0;
  const x0 = Math.min(0, ox) - pad;
  const y0 = Math.min(0, oy);
  const W = Math.max(w(upper), ox + w(lower)) + pad - x0;
  const H = Math.max(upper.rows.length, oy + lower.rows.length) - y0;
  const grid = Array.from({ length: H }, () => new Array<string>(W).fill('.'));
  const of = new Map<string, [string, string]>();
  const upperChars = new Set<string>();
  const lay = (p: PaintedPiece, dx: number, dy: number, base: number, isUpper: boolean) => {
    const name = new Map<string, string>();
    Object.keys(p.colors).forEach((ch, k) => {
      const c = String.fromCharCode(base + k);
      name.set(ch, c);
      of.set(c, [ch, p.colors[ch]]);
      if (isUpper) upperChars.add(c);
    });
    p.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && name.has(ch) && (grid[y + dy - y0][x + dx - x0] = name.get(ch)!)));
  };
  lay(upper, 0, 0, 0x100, true);
  lay(lower, ox, oy, 0x300, false);
  if (line) closeJoint(grid, oy - y0, (c) => line(of.get(c)![1]));
  const j: JoinedPieces = { piece: { rows: grid.map((r) => r.join('')), pivot: [upper.pivot[0] - x0, upper.pivot[1] - y0] }, upper: upperChars, of };
  JOINED.set(key, j);
  return j;
}

/**
 * The joint of a shin and its boot or sandal (`grid`, the lower piece starting on row `at`, the limb running
 * down the rows) closed as one piece, as his Trunks boots are drawn: turned with the shin in a kick, the
 * foot came out cut from the leg (the owner, 2026-10-23: "aiden y romano le falta ahora conectar la punta
 * del pie con la pierna como trunks su pie y su pierna estan conectadas no hay un corte de pixeles"). In the
 * joint's rows (JOINT_UP above the lower piece's first row, JOINT_DOWN below; his line across the leg there
 * is opened once the figure is drawn, items/ankle.ts openJoint):
 *  - a hole between his pixels takes the pixel beside it;
 *  - where the outline steps in at the joint (the foot standing out from the shin, or the shin drawn in
 *    above the foot), it comes in a cell a row, his pixels continued out to it, his line moved out with it;
 *    a step wider than JOINT_STEP (a toe, a heel) is as he drew it.
 */
function closeJoint(grid: string[][], at: number, isLine: (c: string) => boolean): void {
  const H = grid.length;
  const top = Math.max(0, at - JOINT_UP);
  const end = Math.min(H - 1, at + JOINT_DOWN);
  const span = (y: number): [number, number] => {
    const xs = grid[y].flatMap((c, x) => (c === '.' ? [] : [x]));
    return xs.length ? [xs[0], xs[xs.length - 1]] : [-1, -1];
  };
  for (let y = top; y <= end; y++) {
    const [l, r] = span(y);
    for (let x = l + 1; x < r; x++) if (grid[y][x] === '.') grid[y][x] = grid[y][x - 1];
  }
  const L = grid.map((_, y) => span(y)[0]);
  const R = grid.map((_, y) => span(y)[1]);
  const rows = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k).filter((y) => y >= 0 && y < H && L[y] >= 0);
  // Each side as a distance out from the middle (larger = further out): the left edge negated.
  for (const side of [-1, 1]) {
    const out = (y: number) => (side < 0 ? -L[y] : R[y]);
    const want = grid.map((_, y) => (L[y] < 0 ? -Infinity : out(y)));
    for (const y of rows(top, end)) {
      // drawn in between the rows above and below it (a waist at the joint)
      const above = rows(y - JOINT_UP, y - 1).map(out);
      const below = rows(y + 1, y + JOINT_UP).map(out);
      if (!above.length || !below.length) continue;
      const wall = Math.min(Math.max(...above), Math.max(...below));
      if (wall > want[y] && wall - want[y] <= JOINT_STEP) want[y] = wall;
    }
    // a step in, a cell a row: up the shin from the foot, and down the foot from the shin
    for (let y = at - 1; y >= top; y--) if (want[y] > -Infinity && want[y + 1] - 1 > want[y] && want[y + 1] - 1 - out(y) <= JOINT_STEP) want[y] = want[y + 1] - 1;
    for (let y = at; y <= end; y++) if (want[y] > -Infinity && y > 0 && want[y - 1] - 1 > want[y] && want[y - 1] - 1 - out(y) <= JOINT_STEP) want[y] = want[y - 1] - 1;
    for (const y of rows(top, end)) {
      const n = want[y] - out(y);
      if (n <= 0) continue;
      const edge = side < 0 ? L[y] : R[y];
      const e = grid[y][edge];
      let inner = e;
      for (let x = edge; x >= L[y] && x <= R[y]; x -= side)
        if (!isLine(grid[y][x])) {
          inner = grid[y][x];
          break;
        }
      for (let k = 0; k <= n; k++) grid[y][edge + side * k] = isLine(e) && k === n ? e : isLine(e) ? inner : e;
    }
  }
}

/**
 * Two pieces he drew as one (a shin and the boot or sandal under it), each turned on its own limb, `lower`
 * (at `lowerDeg`) over `upper` (at `upperDeg`), their pivots on `at`. Turned the same way (within a degree:
 * the foot turning all of the shin's turn, a kick), the foot came out cut from the leg at the ankle: so
 * they are stamped as his one picture turned once, its joint closed (closeJoint; `seam` says which of his
 * colours are his line). Otherwise (the foot unturned: at rest, standing, the camp lean; or bending at the
 * ankle) each is
 * stamped on its own as before (stampPiece). `line`, as for stampPiece, keeps his line whole as they turn.
 */
export function stampJoined(
  g: DrawCtx,
  depth: Depth,
  upper: PaintedPiece,
  lower: PaintedPiece,
  at: Vec,
  upperDeg: number,
  lowerDeg: number,
  parts: [PartId, PartId],
  seam: (hex: string) => boolean,
  color?: (ch: string, hex: string) => string,
  line?: (hex: string) => boolean,
): void {
  const ru = Math.round(upperDeg - upper.angle);
  const rl = Math.round(lowerDeg - lower.angle);
  // (the two angles compared round the circle: a shin's angle may come a whole turn apart from its foot's)
  if (rl % 360 === 0 || Math.abs((((ru - rl) % 360) + 540) % 360 - 180) > 1) {
    stampPiece(g, depth, upper, at, upperDeg, parts[0], color, line);
    stampPiece(g, depth, lower, at, lowerDeg, parts[1], color, line);
    return;
  }
  const L = g.L(depth);
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  const j = joinedPieces(upper, lower, seam);
  const isLine = line && ((ch: string) => line(j.of.get(ch)![1]));
  for (const p of isLine ? rotateLined(j.piece, ru, isLine) : rotateTemplate(j.piece, ru)) {
    const [ch, hex] = j.of.get(p.ch)!;
    L.set(ax + p.dx, ay + p.dy, g.m(color ? color(ch, hex) : hex, 'flat'), 3, parts[j.upper.has(p.ch) ? 0 : 1], F_NO_TEXTURE | F_NO_OUTLINE);
  }
}
