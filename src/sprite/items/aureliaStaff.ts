// Aurelia's staff (the Dawn Staff): the owner's pixels at our scale, from the template
// tools/refs/aurelia-staff-from-ref.py lifts out of his game-scale picture of her, with the orb's
// sparkles he drew round it twinkling while it is held.

import type { Depth, DrawCtx } from '../ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, RES, v, type Vec } from '../raster';
import { drawRig } from '../rig';
import { isFemaleBody } from '../types';
import { stampTemplate, type TemplatePalette } from '../rotsprite';
import { retintHex } from '../color';
import { drawPaintedWeapon } from './weapons';
import { AURELIA_STAFF_GOLD, AURELIA_STAFF_ORB, DAWN_FAR_FIST, DAWN_STAFF, DAWN_STAFF_REST } from './aureliaStaffArt';

/** His golds turned from his gold, the orb and its sparkles from his orb colour; the shaft, the collar and his line stay his. */
const tintOf =
  (gold: string, orb: string) =>
  (ch: string, hex: string): string =>
    DAWN_STAFF.gold.includes(ch) ? retintHex(hex, AURELIA_STAFF_GOLD, gold) : DAWN_STAFF.orb.includes(ch) || 'pqrsnmljk'.includes(ch) ? retintHex(hex, AURELIA_STAFF_ORB, orb) : hex;

/**
 * His sparkles as a template the size of the staff's, so they turn with it. Frame 0 shows every one
 * of his (at rest the staff is as he drew it); each later frame hides a different third of them, so
 * they twinkle.
 */
const SPARK_PHASES = 3;
const sparkCache = new Map<string, typeof DAWN_STAFF>();
function sparkTemplate(frame: number, staff: typeof DAWN_STAFF = DAWN_STAFF): typeof DAWN_STAFF {
  const phase = frame === 0 ? -1 : frame % SPARK_PHASES;
  const key = `${staff === DAWN_STAFF ? 'pearl' : 'night'} ${phase}`;
  let t = sparkCache.get(key);
  if (!t) {
    const rows = staff.rows.map((r) => r.replace(/./g, '.').split(''));
    staff.sparks.forEach(([x, y, ch], i) => {
      if (i % SPARK_PHASES !== phase) rows[y][x] = ch;
    });
    t = { ...staff, rows: rows.map((r) => r.join('')) };
    sparkCache.set(key, t);
  }
  return t;
}

/**
 * At rest she holds it as he drew it, hanging from her far fist down to the right (her near hand is
 * empty); every other pose holds it in the near fist like the naginata. His fist round it is drawn for her
 * (the female body's far fist at rest): on the male and bulky bodies the far fist hangs elsewhere and the
 * staff floated beside it, so there the near fist holds it at rest too.
 */
export const dawnStaffInFarHand = (g: DrawCtx): boolean => g.rig.pose === 'idle' && isFemaleBody(g.look.body);

/**
 * Our far fist's joint at rest, as at idle frame 0: as she breathes (the later idle frames raise the
 * chest and arms a pixel) the staff stays planted, so his fist round it never opens onto the panel
 * behind it; her cuff rides up over his fist's top line.
 */
const restFist = new Map<string, Vec>();
function restHandF(g: DrawCtx): Vec {
  let h = restFist.get(g.rig.body);
  if (!h) restFist.set(g.rig.body, (h = drawRig(g.rig.body, 'idle', 0).handF));
  return h;
}

/** Where the grip lies at rest: his place for it beside our far fist (DAWN_STAFF_REST). */
export function dawnStaffRest(g: DrawCtx): Vec {
  const h = restHandF(g);
  return v((Math.floor(h.x * RES) + DAWN_STAFF_REST[0] + 0.5) / RES, (Math.floor(h.y * RES) + DAWN_STAFF_REST[1] + 0.5) / RES);
}

/**
 * At rest her far fist is his, round the staff where he drew it (DAWN_FAR_FIST), in the body's skin: our far
 * fist (the female body's, which hangs a little lower and further out than his on her) and our wrist
 * below her cuff are taken away under it, so the fist, the shaft and her cuff are his picture. His fist is in front of her far panel.
 */
export function drawDawnFarFist(g: DrawCtx): void {
  // our far fist and the wrist below her cuff (her sleeve covers the rest of the forearm)
  const body = g.L('farArm.body');
  const ours = new Set([partIndex('handF'), partIndex('forearmF')]);
  for (let i = 0; i < GRID * GRID; i++) if (body.mat[i] >= 0 && ours.has(body.part[i])) body.mat[i] = -1;
  const h = restHandF(g);
  const at = v((Math.floor(h.x * RES) + DAWN_FAR_FIST.at[0] + 0.5) / RES, (Math.floor(h.y * RES) + DAWN_FAR_FIST.at[1] + 0.5) / RES);
  const pal: TemplatePalette = { o: [g.skin, 0], D: [g.skin, 1], s: [g.skin, 2], b: [g.skin, 3] };
  stampTemplate(g.L('farHand.front'), { pivot: [0, 0], rows: DAWN_FAR_FIST.rows }, at, 0, pal, 'handF', { flags: F_NO_OUTLINE | F_NO_TEXTURE });
}

/**
 * The violet orb of his sorceress's staff (docs/reference/aurelia-outfits-owner-reference.jpg, the middle figure:
 * the same staff, its orb a dark navy sphere with a cyan glint at its top right, a violet rim lighter below, its
 * sparkles teal), in his colours on her orb's own pixels: her rim his violets (darker above, lighter on the
 * right and below), inside it his navy, his white glint and its cyan where her orb's top right is, his lilac
 * along its bottom row.
 */
export const NIGHT_ORB = { rimTop: '#60568a', rimSide: '#8680d4', rimLow: '#784e92', inside: '#2b4869', shade: '#36445e', glint: '#fcfeff', cyan: '#64d3d5', low: '#a1c7f2', spark: '#44b8bb' };
let nightStaff: typeof DAWN_STAFF | null = null;
function nightOrbStaff(): typeof DAWN_STAFF {
  if (nightStaff) return nightStaff;
  const rows = DAWN_STAFF.rows.map((r) => r.split(''));
  const inOrb = (ch: string) => DAWN_STAFF.orb.includes(ch);
  const cells: [number, number][] = [];
  rows.forEach((r, y) => r.forEach((ch, x) => inOrb(ch) && cells.push([x, y])));
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const midY = (y0 + y1) / 2;
  const glint = cells.filter(([, y]) => y === y0).reduce((a, b) => (b[0] > a[0] ? b : a));
  const L: Record<string, string> = { p: NIGHT_ORB.rimTop, q: NIGHT_ORB.rimSide, r: NIGHT_ORB.rimLow, s: NIGHT_ORB.inside, n: NIGHT_ORB.shade, m: NIGHT_ORB.glint, l: NIGHT_ORB.cyan, j: NIGHT_ORB.low, k: NIGHT_ORB.spark };
  for (let y = y0 - 1; y <= y1 + 1; y++)
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const ch = rows[y]?.[x];
      if (ch === 'z') rows[y][x] = x > x1 ? 'q' : y < midY ? 'p' : 'r';
      else if (ch && inOrb(ch)) {
        const d = Math.abs(x - glint[0]) + Math.abs(y - glint[1]);
        rows[y][x] = d === 0 ? 'm' : d === 1 ? 'l' : y === y1 ? 'j' : x === x0 ? 'n' : 's';
      }
    }
  nightStaff = {
    ...DAWN_STAFF,
    rows: rows.map((r) => r.join('')),
    colors: { ...DAWN_STAFF.colors, ...L },
    orb: 'pqrsnmljk',
    sparks: DAWN_STAFF.sparks.map(([x, y]) => [x, y, 'k'] as [number, number, string]),
  };
  return nightStaff;
}

/** Her staff's orbs (the creator's Orb part): his pearl, or his sorceress's violet orb. */
export const DAWN_STAFF_PARTS = [
  {
    key: 'orb',
    label: 'Orb',
    options: [
      { id: 'pearl', label: 'Pearl', desc: 'The glowing pearl he drew for her, shedding golden sparkles.' },
      { id: 'night', label: 'Night', desc: 'His sorceress\'s orb: a dark navy sphere with a cyan glint in a violet rim, shedding teal sparkles.' },
    ],
  },
];

/** Draws her staff with its grip at `at` (rig units), pointing along `deg`; `sparks` adds the orb's sparkles; `orbPart` its orb. */
export function drawDawnStaff(g: DrawCtx, depth: Depth, at: Vec, deg: number, gold: string, orb: string, sparks: boolean, orbPart = 'pearl'): void {
  const tint = tintOf(gold, orb);
  const staff = orbPart === 'night' ? nightOrbStaff() : DAWN_STAFF;
  drawPaintedWeapon(g, depth, staff, at, deg, tint);
  // The sparkles are an effect over the figure (depth 'top', as Lyra's sword's), apart from it as he
  // painted them, so the pass that takes stray specks away (holes.ts) leaves them.
  if (sparks) drawPaintedWeapon(g, 'top', sparkTemplate(g.rig.frame, staff), at, deg, tint);
}
