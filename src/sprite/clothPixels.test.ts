// Dead pixels in hanging cloth (capes, skirts, kilts, hakama, gowns, coat tails): npm test.
//
// The owner saw white specks and see-through holes in the cloth of skirts and capes ("checa tambien
// las otras faldas y capas"). Each cape and skirt-like item is drawn on a bare body (so nothing else
// covers its pixels) and its own cloth is checked for:
//  - light: a near-white pixel (every channel above 225) in cloth whose colours are not that light;
//  - hole: a cell left open (one or two pixels) with the cloth across it and down it, or along one of
//    them and round three of its corners, where nothing is drawn (the background shows);
//  - gap: such a cell where what is behind the cloth shows, much lighter than the cloth around it;
//  - speck: a crumb of the cloth (3 pixels or fewer) cut off from the rest of the item.
// npm test draws a sample (every item in every fourth pose, on one body and one frame, taking turns so
// every pose is drawn); the whole sweep, every body each item fits and every frame of every pose, is
// CLOTH_FULL=1 (several minutes).
// CLOTH_ITEMS=a,b limits the items, CLOTH_REPORT=1 prints every finding (item, body, pose, frame,
// counts) and CLOTH_JSON=<file> writes them with their pixels.

import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { DEPTHS, type Depth, type ItemDef } from './ctx';
import { defaultAppearance } from './legacy';
import { F_NO_OUTLINE, GRID, partIndex, RES, type Layer, type MaterialTable, type PartId } from './raster';
import { frameCount, rigPoseFor, type Rig } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SlotId, type SpriteAppearance, type SpritePose } from './types';

/** Every cape, and every item that hangs cloth over the legs. */
const CLOTH_ITEMS = [
  'cape_shadow',
  'cape_crimson',
  'cape_founder',
  'cape_haori',
  'cape_knight',
  'cape_rogue',
  'cape_traveler',
  'cape_scarf',
  'cape_rose',
  // skirt_imperial (the Roman skirt) is being redone on its own branch, with its own hole test (roman.test.ts).
  'skirt_founder',
  'skirt_apron',
  'skirt_tassets',
  'skirt_kilt',
  'bottom_hakama',
  'top_royalcoat',
  'top_kimono',
  'armor_wanderer',
  'armor_oath',
  'armor_rose',
  'armor_lionheart',
  'armor_seraph',
  'armor_lioness',
];

const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
/** The bare body's layers (body.ts; the far hand when it works in front of the body), by depth index. */
const BODY = new Set((['farArm.body', 'farLeg.body', 'nearLeg.body', 'torso.body', 'torso.under', 'farHand.front', 'nearArm.body', 'head.body'] as Depth[]).map((d) => DEPTHS.indexOf(d)));
const POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
const N = GRID * GRID;

/** A bare body wearing only this item (and boots), so nothing else covers or fills its cloth. */
function look(def: ItemDef, body: BodyType): SpriteAppearance {
  const l = defaultAppearance();
  l.body = body;
  for (const s of ['top', 'bottom', 'skirt', 'armor', 'cape', 'waist', 'held'] as SlotId[]) delete l.slots[s];
  l.slots[def.slot as SlotId] = { id: def.id, colors: [] };
  return l;
}

interface Capture {
  layers: Map<Depth, Layer>;
  /** Per depth: the item's material + 1 at each pixel it drew there (0 elsewhere). */
  owned: Map<Depth, Int16Array>;
  mats: MaterialTable;
  rig: Rig;
}

/** Renders the frame and keeps the item's layers (the item's draw is wrapped to see what it draws). */
function capture(def: ItemDef, body: BodyType, pose: SpritePose, frame: number): { cap: Capture; rgba: Uint8ClampedArray } {
  const orig = def.draw;
  let cap: Capture | null = null;
  def.draw = (g, colors, parts) => {
    // A pitched cape is drawn a second time on an upright rig, into layers of its own (compose.ts drawPitchedCape).
    if (cap) return orig(g, colors, parts);
    const layers = new Map(DEPTHS.map((d) => [d, g.L(d)] as [Depth, Layer]));
    const before = new Map(DEPTHS.map((d) => [d, { mat: layers.get(d)!.mat.slice(), shade: layers.get(d)!.shade.slice() }]));
    orig(g, colors, parts);
    const owned = new Map<Depth, Int16Array>();
    for (const d of DEPTHS) {
      const L = layers.get(d)!;
      const b = before.get(d)!;
      // The item's material + 1 where it drew (a pixel it only shaded, a shadow on the body, is not its own).
      const o = new Int16Array(N);
      let any = false;
      for (let i = 0; i < N; i++) {
        if (L.mat[i] < 0 || L.mat[i] === b.mat[i]) continue;
        o[i] = L.mat[i] + 1;
        any = true;
      }
      if (any) owned.set(d, o);
    }
    cap = { layers, owned, mats: g.mats, rig: g.rig };
  };
  let rgba: Uint8ClampedArray;
  try {
    rgba = renderSprite(look(def, body), pose, frame).rgba;
  } finally {
    def.draw = orig;
  }
  const c = cap as Capture | null;
  assert.ok(c, `${def.id} was not drawn`);
  // The cape's cloth layers hold only the cape here (a pitched cape refills them after its draw).
  if (def.slot === 'cape') {
    for (const d of ['capeBack', 'capeFront'] as Depth[]) {
      const L = c.layers.get(d)!;
      const o = new Int16Array(N);
      for (let i = 0; i < N; i++) o[i] = L.mat[i] + 1;
      c.owned.set(d, o);
    }
  }
  return { cap: c, rgba: rgba! };
}

type Kind = 'light' | 'hole' | 'gap' | 'speck';

/** Torso-local height (design units above the pelvis) of the waistband skirts hang from. */
const WAIST = 3.5;
/** How much lighter (luma, 0..255) a pixel showing through the cloth may be than the cloth around it. */
const GAP_LIGHTER = 70;
const luma = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4] * 0.3 + rgba[i * 4 + 1] * 0.59 + rgba[i * 4 + 2] * 0.11;
interface Finding {
  kind: Kind;
  x: number;
  y: number;
}

/** Checks one frame of one item; coordinates are in the upright drawing (before a downed body is laid). */
function scan(def: ItemDef, body: BodyType, pose: SpritePose, frame: number): Finding[] {
  const { cap, rgba } = capture(def, body, pose, frame);
  const { layers, owned, mats, rig } = cap;
  const depthIdx = new Map(DEPTHS.map((d, k) => [d, k]));
  const top = new Int16Array(N).fill(-1);
  const itemTop = new Int16Array(N).fill(-1);
  const itemMats = new Set<number>();
  for (const d of DEPTHS) {
    const L = layers.get(d)!;
    const o = owned.get(d);
    const k = depthIdx.get(d)!;
    for (let i = 0; i < N; i++) {
      if (L.mat[i] < 0) continue;
      top[i] = k;
      // still the item's pixel once everything is drawn (a later item may have drawn over it on the same layer)
      if (o && o[i] === L.mat[i] + 1) {
        itemTop[i] = k;
        itemMats.add(L.mat[i]);
      }
    }
  }
  // The cloth that hangs: a cape's every pixel; for a skirt, coat, robe or gown, what it draws below the
  // waistband (torso-local, so a body bent forward keeps its chest out) that is not on an arm, a shin or a
  // foot (its sleeves, bodice, armpits and greaves are not hanging cloth).
  const notCloth = new Set((['upperArmN', 'forearmN', 'handN', 'upperArmF', 'forearmF', 'handF', 'shinN', 'shinF', 'footN', 'footF', 'head'] as PartId[]).map(partIndex));
  const belowWaist = (i: number) => {
    const dx = ((i % GRID) + 0.5) / RES - rig.pelvis.x;
    const dy = (((i / GRID) | 0) + 0.5) / RES - rig.pelvis.y;
    return dx * rig.up.x + dy * rig.up.y < WAIST;
  };
  const cloth = new Uint8Array(N);
  /** The cloth pixels that are the owner's painted pixels (stamped without an outline of ours). */
  const painted = new Uint8Array(N);
  for (const d of DEPTHS) {
    const L = layers.get(d)!;
    const o = owned.get(d);
    if (!o) continue;
    for (let i = 0; i < N; i++) {
      if (L.mat[i] < 0 || o[i] !== L.mat[i] + 1) continue;
      cloth[i] = def.slot === 'cape' || (belowWaist(i) && !notCloth.has(L.part[i])) ? 1 : 0;
      painted[i] = L.flags[i] & F_NO_OUTLINE ? 1 : 0;
    }
  }
  const own = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && cloth[y * GRID + x] === 1;
  // The final frame's pixel for an upright one (a downed body is laid on its side, see compose.ts layFrame).
  const lay = rig.lay;
  const at = (i: number) => {
    if (!lay) return i;
    const X = ((i / GRID) | 0) + lay.dx;
    const Y = (i % GRID) + lay.dy;
    return X < 0 || Y < 0 || X >= GRID || Y >= GRID ? -1 : Y * GRID + X;
  };
  // The item's own colours: is any of them near white? Then near-white pixels are its cloth.
  const lum = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return Math.min((n >> 16) & 255, (n >> 8) & 255, n & 255);
  };
  const whiteCloth = [...itemMats].some((m) => lum(mats.ramps[m][3]) > 200);

  const out: Finding[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      if (itemTop[i] >= 0) {
        // light: a near-white pixel of the cloth where the item is the top-most thing drawn
        if (!cloth[i] || itemTop[i] !== top[i] || whiteCloth) continue;
        const j = at(i);
        if (j < 0 || !rgba[j * 4 + 3]) continue;
        if (rgba[j * 4] > 225 && rgba[j * 4 + 1] > 225 && rgba[j * 4 + 2] > 225) out.push({ kind: 'light', x, y });
        continue;
      }
      // hole: an open cell with the cloth across it and down it (or three diagonals around it), where
      // what shows is behind the cloth (or nothing)
      const across = own(x - 1, y) && (own(x + 1, y) || own(x + 2, y));
      const down = own(x, y - 1) && (own(x, y + 1) || own(x, y + 2));
      const diag = [own(x - 1, y - 1), own(x + 1, y - 1), own(x - 1, y + 1), own(x + 1, y + 1)].filter(Boolean).length;
      if (!((across && down) || ((across || down) && diag >= 3))) continue;
      // a collar tucked under the chin leaves the head showing on purpose
      if (layers.get('head.body')!.mat[i] >= 0) continue;
      let front = -1;
      for (const j of [i - 1, i + 1, i - GRID, i + GRID]) if (j >= 0 && j < N && cloth[j]) front = front < 0 ? itemTop[j] : Math.min(front, itemTop[j]);
      if (top[i] >= front) continue;
      const j = at(i);
      if (j < 0) continue;
      if (top[i] < 0 || !rgba[j * 4 + 3]) {
        out.push({ kind: 'hole', x, y });
        continue;
      }
      // gap: what shows through is much lighter than the cloth around it (skin or a light shirt in dark cloth).
      // Whitelisted: the bare body between the owner's painted pixels only. At rest his cloth shows our body
      // in its gaps where his picture shows his figure (seal.ts leaves them as he drew them).
      if (BODY.has(top[i]) && [i - 1, i + 1, i - GRID, i + GRID].every((q) => !cloth[q] || painted[q])) continue;
      let sum = 0;
      let n = 0;
      for (const q of [i - 1, i + 1, i - GRID, i + GRID]) {
        if (!cloth[q] || itemTop[q] !== top[q]) continue;
        const r = at(q);
        if (r < 0) continue;
        sum += luma(rgba, r);
        n++;
      }
      if (n && luma(rgba, j) - sum / n > GAP_LIGHTER) out.push({ kind: 'gap', x, y });
    }
  }
  // speck: a crumb of the cloth cut off from the rest of the item (8-connected, 3 pixels or fewer)
  const mine = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && itemTop[y * GRID + x] >= 0;
  const seen = new Uint8Array(N);
  for (let s = 0; s < N; s++) {
    if (seen[s] || !cloth[s]) continue;
    const comp = [s];
    seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const x = comp[k] % GRID;
      const y = (comp[k] / GRID) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!mine(x + dx, y + dy)) continue;
          const j = (y + dy) * GRID + x + dx;
          if (!seen[j]) {
            seen[j] = 1;
            comp.push(j);
          }
        }
    }
    if (comp.length <= 3) for (const p of comp) out.push({ kind: 'speck', x: p % GRID, y: (p / GRID) | 0 });
  }
  return out;
}

interface Row {
  item: string;
  body: BodyType;
  pose: SpritePose;
  frame: number;
  light: number;
  hole: number;
  gap: number;
  speck: number;
  at: Finding[];
}

/**
 * The findings of these items: every body they fit, pose and frame (`full`), or a sample that takes turns:
 * every fourth pose of each item (each pose on six items or so), on one body and one frame.
 */
function scanAll(items: string[], full: boolean): Row[] {
  const rows: Row[] = [];
  items.forEach((id, k) => {
    const def = getItem(id);
    assert.ok(def, `no item ${id}`);
    const bodies = BODIES.filter((b) => fitsBody(def, b));
    POSES.forEach((pose, p) => {
      if (!full && (p + k) % 4) return;
      const n = frameCount(rigPoseFor(pose));
      for (const body of full ? bodies : [bodies[(((p / 4) | 0) + k) % bodies.length]]) {
        for (const f of full ? [...Array(n).keys()] : [(k * 3 + p) % n]) {
          const at = scan(def, body, pose, f);
          if (!at.length) continue;
          const c = (kind: Kind) => at.filter((a) => a.kind === kind).length;
          rows.push({ item: id, body, pose, frame: f, light: c('light'), hole: c('hole'), gap: c('gap'), speck: c('speck'), at });
        }
      }
    });
  });
  return rows;
}

describe('hanging cloth has no dead pixels', () => {
  it('no white specks, holes or loose crumbs in any cape or skirt, in any pose', () => {
    const rows = scanAll(process.env.CLOTH_ITEMS?.split(',') ?? CLOTH_ITEMS, !!process.env.CLOTH_FULL);
    if (process.env.CLOTH_JSON) writeFileSync(process.env.CLOTH_JSON, JSON.stringify(rows));
    if (rows.length && process.env.CLOTH_REPORT) {
      console.log('item\tbody\tpose\tframe\tlight\thole\tgap\tspeck\tfirst');
      for (const r of rows) console.log([r.item, r.body, r.pose, r.frame, r.light, r.hole, r.gap, r.speck, r.at.slice(0, 4).map((a) => `${a.kind[0]}${a.x},${a.y}`).join(' ')].join('\t'));
    }
    const per = new Map<string, number>();
    for (const r of rows) per.set(r.item, (per.get(r.item) ?? 0) + r.light + r.hole + r.gap + r.speck);
    assert.equal(rows.length, 0, `dead pixels: ${[...per].map(([k, n]) => `${k} ${n}`).join(', ')}`);
  });
});
