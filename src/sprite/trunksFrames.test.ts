// The owner's own frames of his Trunks (ownerFrames.ts): his two read frames ("Leyendo", the book open;
// "Libro cerrado", the book shut at the chest), docs/reference/trunks-read-owner-reference.jpg, lifted by
// tools/refs/trunks-read-from-ref.py; and his sit frame (no book, the far palm up, the near hand on the
// thigh), docs/reference/trunks-sit-owner-reference.jpg, by tools/refs/trunks-sit-from-ref.py. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { TRUNKS_READ, TRUNKS_READ_FILLED, TRUNKS_READ_SEAT } from './items/trunksReadArt';
import { TRUNKS_SIT, TRUNKS_SIT_FILLED, TRUNKS_SIT_SEAT } from './items/trunksSitArt';
import { PAINTED_SKIN } from './items/trunksKit';
import { defaultAppearance } from './legacy';
import { type OwnerPiece, readKey, seatTopFor, TRUNKS_READ_OF_KEY, wearsTrunksFigure } from './ownerFrames';
import { GRID } from './raster';
import { frameCount } from './rig';
import { onSeat, renderSeat, SEATS } from './seats';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SlotId, type SpriteAppearance, type SpritePose } from './types';

const N = GRID * GRID;
const TRUNKS: Partial<Record<SlotId, string>> = {
  hair: 'hair_drifter',
  cape: 'cape_traveler',
  top: 'top_highcollar',
  waist: 'waist_belt',
  bottom: 'bottom_cargo',
  feet: 'feet_leather',
  hands: 'hands_traveler_gloves',
  held: 'held_crystal',
};

/** His Trunks as he painted him reading: our male in his Trunks 2 options at their colours, Solen's skin, no headband. */
function trunks(over: Partial<SpriteAppearance> = {}): SpriteAppearance {
  const l = defaultAppearance();
  l.slots = {};
  for (const [slot, id] of Object.entries(TRUNKS)) l.slots[slot as SlotId] = { id: id!, colors: getItem(id!)!.colors.map((c) => c.default) };
  l.skin = PAINTED_SKIN;
  l.headband = { ...l.headband, position: 'none' };
  return { ...l, ...over };
}

const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** His frame as our fine pixels: every piece laid at the joint pixel it was cut for. */
function his(pieces: OwnerPiece[]): Map<number, string> {
  const out = new Map<number, string>();
  for (const p of pieces) {
    p.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.') continue;
        out.set((p.at[1] - p.pivot[1] + j) * GRID + p.at[0] - p.pivot[0] + i, p.colors[row[i]]);
      }
    });
  }
  return out;
}

/**
 * Where a figure ends on a straight cut: a crop box (or a neighbour's mask) that cut it leaves a straight
 * run of its colours with nothing past them, where his figure always ends in his black line. Runs of 3
 * or more such pixels along one side, as "x,y side".
 */
export function straightCuts(want: Map<number, string>): string[] {
  const out: string[] = [];
  const open = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    return Math.max(r, g, b) + Math.min(r, g, b) > 102;
  };
  const sides: [string, number, number][] = [
    ['left', -1, GRID],
    ['right', 1, GRID],
    ['top', -GRID, 1],
    ['bottom', GRID, 1],
  ];
  for (const [side, past, along] of sides) {
    const cut = (i: number) => want.has(i) && !want.has(i + past) && open(want.get(i)!);
    for (const i of want.keys()) {
      if (!cut(i) || cut(i - along)) continue;
      let n = 1;
      while (cut(i + n * along)) n++;
      if (n >= 3) out.push(`${i % GRID},${(i / GRID) | 0} ${side} x${n}`);
    }
  }
  return out;
}

/** The empty pixels of a frame the figure walls in (not reached from the frame's edge), as pixel indices. */
function pockets(rgba: Uint8ClampedArray): Set<number> {
  const air = new Uint8Array(N);
  const stack: number[] = [];
  const reach = (j: number) => {
    if (rgba[j * 4 + 3] || air[j]) return;
    air[j] = 1;
    stack.push(j);
  };
  for (let k = 0; k < GRID; k++) [k, N - GRID + k, k * GRID, k * GRID + GRID - 1].forEach(reach);
  while (stack.length) {
    const j = stack.pop()!;
    const x = j % GRID;
    if (x > 0) reach(j - 1);
    if (x < GRID - 1) reach(j + 1);
    if (j >= GRID) reach(j - GRID);
    if (j < N - GRID) reach(j + GRID);
  }
  const out = new Set<number>();
  for (let i = 0; i < N; i++) if (!rgba[i * 4 + 3] && !air[i]) out.add(i);
  return out;
}

/** The most pixels a dead pocket has (a wider one is a gap he drew, or where his rock was). */
const DEAD = 6;

/** The pixels of the pockets (side by side) of at most `most` pixels. */
function small(px: Set<number>, most: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const s of px) {
    if (seen.has(s)) continue;
    const comp = [s];
    seen.add(s);
    for (let k = 0; k < comp.length; k++)
      for (const j of [comp[k] - 1, comp[k] + 1, comp[k] - GRID, comp[k] + GRID])
        if (px.has(j) && !seen.has(j)) {
          seen.add(j);
          comp.push(j);
        }
    if (comp.length <= most) out.push(...comp);
  }
  return out;
}

describe("the owner's Trunks reading", () => {
  it('is his figure only in his options, on our male, with our face and no headband', () => {
    assert.ok(wearsTrunksFigure(trunks()));
    assert.ok(wearsTrunksFigure(trunks({ slots: { ...trunks().slots, held: undefined } })));
    assert.ok(!wearsTrunksFigure(trunks({ body: 'bulky' })));
    assert.ok(!wearsTrunksFigure(trunks({ eyeShape: 'valiant' })));
    assert.ok(!wearsTrunksFigure(trunks({ headband: { position: 'forehead', tails: false, cloth: '#1e3a8a' } })));
    assert.ok(!wearsTrunksFigure(trunks({ slots: { ...trunks().slots, hair: { id: 'hair_surge', colors: [] } } })));
    assert.ok(!wearsTrunksFigure(trunks({ slots: { ...trunks().slots, armor: { id: 'armor_bronze', colors: [] } } })));
  });

  it('renders his read frames pixel for pixel, every pixel his and nothing else, in every frame of the pose', () => {
    for (let f = 0; f < frameCount('read'); f++) {
      const want = his(TRUNKS_READ[TRUNKS_READ_OF_KEY[readKey(f)]]);
      const got = renderSprite(trunks(), 'read', f).rgba;
      const bad: string[] = [];
      for (let i = 0; i < N; i++) {
        const w = want.get(i);
        const on = got[i * 4 + 3] > 0;
        if (w ? !on || hex(got, i) !== w : on) bad.push(`${i % GRID},${(i / GRID) | 0}`);
      }
      assert.deepEqual(bad.slice(0, 12), [], `read frame ${f}: ${bad.length} pixels differ from his`);
      assert.ok(want.size > 2500, `read frame ${f}: ${want.size} pixels`);
    }
  });

  it('recolours with the options and the skin, and at their colours stays his', () => {
    const l = trunks();
    l.slots.cape = { id: 'cape_traveler', colors: ['#3b5b7d'] };
    l.skin = '#8d5524';
    const a = renderSprite(trunks(), 'read', 2).rgba;
    const b = renderSprite(l, 'read', 2).rgba;
    let changed = 0;
    for (let i = 0; i < N; i++) if (hex(a, i) !== hex(b, i)) changed++;
    assert.ok(changed > 500, `${changed} pixels recoloured`);
    // his black line stays his
    for (let i = 0; i < N; i++) if (a[i * 4 + 3] && Math.max(a[i * 4], a[i * 4 + 1], a[i * 4 + 2]) < 20) assert.equal(hex(b, i), hex(a, i));
  });

  it('has no white dead pixel at the waist, between the trousers and the belt, in either frame', () => {
    for (const [key, k] of [[1, 0], [0, 1]] as [number, number][]) {
      const f = [0, 2, 8].find((fr) => readKey(fr) === key)!;
      const got = renderSprite(trunks(), 'read', f).rgba;
      const holes = pockets(got);
      // every pixel he left white there is filled with his cloth
      for (const [x, y] of TRUNKS_READ_FILLED[k]) assert.ok(got[(y * GRID + x) * 4 + 3], `frame ${k}: ${x},${y} still empty`);
      // and no pocket of white is left round the waist (the belt's rows down to the thighs)
      const ys = TRUNKS_READ_FILLED[k].map(([, y]) => y);
      const xs = TRUNKS_READ_FILLED[k].map(([x]) => x);
      for (const i of holes) {
        const x = i % GRID;
        const y = (i / GRID) | 0;
        assert.ok(!(y >= Math.min(...ys) - 3 && y <= Math.max(...ys) + 3 && x >= Math.min(...xs) - 6 && x <= Math.max(...xs) + 6), `frame ${k}: a hole at ${x},${y}`);
      }
      assert.ok(TRUNKS_READ_FILLED[k].length > 0);
    }
  });

  it('is cut by no box: nothing of his figure ends on a straight edge his line does not close', () => {
    for (const pieces of TRUNKS_READ) assert.deepEqual(straightCuts(his(pieces)), []);
  });

  it('sits on the seat prop laid with its top where he drew his rock', () => {
    assert.equal(seatTopFor(trunks(), 'read'), TRUNKS_READ_SEAT);
    assert.equal(seatTopFor(trunks({ body: 'bulky' }), 'read'), undefined);
    const seat = renderSeat('seat_rock', TRUNKS_READ_SEAT);
    let top = GRID;
    for (let i = 0; i < N; i++) if (seat[i * 4 + 3]) top = Math.min(top, (i / GRID) | 0);
    assert.equal(top, TRUNKS_READ_SEAT);
    // laid lower than its own top, the rock sinks: nothing of it below the ground it stood on
    const own = renderSeat('seat_rock');
    let bottom = 0;
    let bottomLow = 0;
    for (let i = 0; i < N; i++) {
      if (own[i * 4 + 3]) bottom = Math.max(bottom, (i / GRID) | 0);
      if (seat[i * 4 + 3]) bottomLow = Math.max(bottomLow, (i / GRID) | 0);
    }
    assert.equal(bottomLow, bottom);
    assert.ok(SEATS.seat_rock.top < TRUNKS_READ_SEAT);
    // on the seat every pixel of his figure shows over the rock
    const f = renderSprite(trunks(), 'read', 2).rgba;
    const both = onSeat(f, 'seat_rock', TRUNKS_READ_SEAT);
    for (let i = 0; i < N; i++) if (f[i * 4 + 3]) assert.equal(hex(both, i), hex(f, i));
  });

  it('opens no hole in him: no pocket of empty pixels walled in by his figure, in any frame', () => {
    for (const [pose, n] of [['read', frameCount('read')], ['sit', frameCount('sit')]] as [SpritePose, number][]) {
      for (let f = 0; f < n; f++) {
        // (a wide pocket is where his rock showed between his legs: the seat prop is drawn there)
        const holes = small(pockets(renderSprite(trunks(), pose, f).rgba), DEAD).map((i) => `${i % GRID},${(i / GRID) | 0}`);
        assert.deepEqual(holes, [], `${pose} ${f}`);
      }
    }
  });

  it('leaves every other pose, and every other look, drawn as before', () => {
    // His frames are only the read pose's: the idle frame is our Trunks, not his reading.
    const idle = renderSprite(trunks(), 'idle', 0).rgba;
    const want = his(TRUNKS_READ[0]);
    let same = 0;
    for (const [i, h] of want) if (idle[i * 4 + 3] && hex(idle, i) === h) same++;
    assert.ok(same < want.size * 0.5);
    for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[]) {
      if (pose === 'read' || pose === 'sit') continue;
      const l = trunks();
      const f = renderSprite(l, pose, 0).rgba;
      assert.ok(f.some((v, i) => i % 4 === 3 && v > 0), pose);
    }
  });
});

describe("the owner's Trunks sitting", () => {
  it('renders his sit frame pixel for pixel in every frame of the pose, his two hands exactly', () => {
    const want = his(TRUNKS_SIT);
    for (let f = 0; f < frameCount('sit'); f++) {
      const got = renderSprite(trunks(), 'sit', f).rgba;
      const bad: string[] = [];
      for (let i = 0; i < N; i++) {
        const w = want.get(i);
        const on = got[i * 4 + 3] > 0;
        if (w ? !on || hex(got, i) !== w : on) bad.push(`${i % GRID},${(i / GRID) | 0}`);
      }
      assert.deepEqual(bad.slice(0, 12), [], `sit frame ${f}: ${bad.length} pixels differ from his`);
    }
    // both hands are his pieces, whole: the gloved hand on the thigh and the open far hand
    const hands = TRUNKS_SIT.filter((p) => p.owner === 'hands');
    assert.deepEqual(hands.map((p) => p.part).sort(), ['handF', 'handN']);
    for (const p of hands) assert.ok(p.rows.join('').replace(/\./g, '').length > 60, p.part);
  });

  it('has no white dead pixel at the waist: what he left white beside the gloved hand is filled', () => {
    const got = renderSprite(trunks(), 'sit', 0).rgba;
    for (const [x, y] of TRUNKS_SIT_FILLED) assert.ok(got[(y * GRID + x) * 4 + 3], `${x},${y} still empty`);
    assert.ok(TRUNKS_SIT_FILLED.length > 0);
    // the filled cloth is cut on a slant, never a square block: no 2x2 of it is all fill but the edge's line
    const set = new Set(TRUNKS_SIT_FILLED.map(([x, y]) => `${x},${y}`));
    let blocks = 0;
    for (const [x, y] of TRUNKS_SIT_FILLED) if (set.has(`${x + 1},${y}`) && set.has(`${x},${y + 1}`) && set.has(`${x + 1},${y + 1}`) && set.has(`${x + 2},${y}`) && set.has(`${x},${y + 2}`)) blocks++;
    assert.equal(blocks, 0);
  });

  it('is cut by no box', () => {
    assert.deepEqual(straightCuts(his(TRUNKS_SIT)), []);
  });

  it('sits on a seat laid with its top where he drew his rock', () => {
    assert.equal(seatTopFor(trunks(), 'sit'), TRUNKS_SIT_SEAT);
    const seat = renderSeat('seat_rock', TRUNKS_SIT_SEAT);
    let top = GRID;
    for (let i = 0; i < N; i++) if (seat[i * 4 + 3]) top = Math.min(top, (i / GRID) | 0);
    assert.equal(top, TRUNKS_SIT_SEAT);
  });
});
