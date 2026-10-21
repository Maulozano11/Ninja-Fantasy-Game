// Tests for the princess's gown skirt (skirt_rose_gown), from the owner's princess picture at our game scale: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { placeGown } from './items/princessSkirt';
import { PRINCESS_SKIRT, PRINCESS_SKIRT_CLOTH, PRINCESS_SKIRT_GOLD, PRINCESS_SKIRT_LILAC, PRINCESS_SKIRT_PETTICOAT } from './items/princessSkirtArt';
import { GRID } from './raster';
import { drawRig, frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const ALL_POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];

const look = (body: BodyType, colors?: string[]): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { skirt: { id: 'skirt_rose_gown', colors: colors ?? getItem('skirt_rose_gown')!.colors.map((c) => c.default) } },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');

/** The piece as drawn: frame pixel index -> character. */
function drawn(): Map<number, string> {
  const out = new Map<number, string>();
  PRINCESS_SKIRT.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.set((PRINCESS_SKIRT.y + j) * GRID + PRINCESS_SKIRT.x + i, row[i]);
  });
  return out;
}

/** Empty pixels the gown closes round (not reached from outside its box). */
function holes(px: Map<number, string>): number {
  let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
  for (const i of px.keys()) {
    x0 = Math.min(x0, i % GRID);
    x1 = Math.max(x1, i % GRID);
    y0 = Math.min(y0, Math.floor(i / GRID));
    y1 = Math.max(y1, Math.floor(i / GRID));
  }
  const seen = new Set<number>();
  const stack: [number, number][] = [];
  for (let x = x0 - 1; x <= x1 + 1; x++) stack.push([x, y0 - 1], [x, y1 + 1]);
  for (let y = y0 - 1; y <= y1 + 1; y++) stack.push([x0 - 1, y], [x1 + 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) continue;
    const i = y * GRID + x;
    if (seen.has(i) || px.has(i)) continue;
    seen.add(i);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!px.has(y * GRID + x) && !seen.has(y * GRID + x)) n++;
  return n;
}

/** How many 4-connected pieces the gown is in. */
function pieces(px: Map<number, string>): number {
  const seen = new Set<number>();
  let n = 0;
  for (const s of px.keys()) {
    if (seen.has(s)) continue;
    n++;
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const i = stack.pop()!;
      for (const j of [i - 1, i + 1, i - GRID, i + GRID]) if (px.has(j) && !seen.has(j)) (seen.add(j), stack.push(j));
    }
  }
  return n;
}

describe('the princess gown skirt (skirt_rose_gown)', () => {
  it('is a women-only skirt with his colours as its defaults', () => {
    const item = getItem('skirt_rose_gown')!;
    assert.equal(item.slot, 'skirt');
    assert.deepEqual(item.bodies, ['female', 'slender']);
    assert.deepEqual(
      item.colors.map((c) => [c.key, c.default]),
      [
        ['cloth', '#f5a2a9'],
        ['lilac', '#a884b4'],
        ['gold', '#fad586'],
        ['petticoat', '#7d588c'],
      ],
    );
  });

  it('every character of the piece is his line or belongs to one colour slot', () => {
    const slots = [PRINCESS_SKIRT_CLOTH, PRINCESS_SKIRT_LILAC, PRINCESS_SKIRT_GOLD, PRINCESS_SKIRT_PETTICOAT];
    for (const ch of Object.keys(PRINCESS_SKIRT.colors)) assert.equal(slots.filter((s) => s.includes(ch)).length, ch === 'k' ? 0 : 1, ch);
    for (const row of PRINCESS_SKIRT.rows) for (const ch of row) assert.ok(ch === '.' || ch in PRINCESS_SKIRT.colors, ch);
  });

  it('at rest on our female every pixel is his, where he drew it', () => {
    assert.deepEqual([...placeGown(drawRig('female', rigPoseFor('idle'), 0), PRINCESS_SKIRT)].sort(), [...drawn()].sort());
  });

  it('in the game at rest it shows his colours (except where the near arm lies over it)', () => {
    const f = renderSprite(look('female'), 'idle', 0);
    let same = 0;
    const px = drawn();
    for (const [i, ch] of px) if (hex(f.rgba, i) === PRINCESS_SKIRT.colors[ch]) same++;
    assert.ok(same / px.size > 0.95, `${same} of ${px.size}`);
  });

  it('recolours by slot, and stays his at the defaults', () => {
    const gold = [...drawn()].find(([, ch]) => PRINCESS_SKIRT_GOLD.includes(ch))!;
    const cloth = [...drawn()].find(([, ch]) => PRINCESS_SKIRT_CLOTH.includes(ch) && ch !== 'k')!;
    const f = renderSprite(look('female', ['#4a7bd0', '#a884b4', '#fad586', '#7d588c']), 'idle', 0);
    assert.equal(hex(f.rgba, gold[0]), PRINCESS_SKIRT.colors[gold[1]]);
    assert.notEqual(hex(f.rgba, cloth[0]), PRINCESS_SKIRT.colors[cloth[1]]);
  });

  it('has no holes and stays one piece with his line round it in every pose', () => {
    for (const body of ['female', 'slender'] as BodyType[])
      for (const pose of ALL_POSES)
        for (let fr = 0; fr < frameCount(rigPoseFor(pose)); fr++) {
          const px = placeGown(drawRig(body, rigPoseFor(pose), fr), PRINCESS_SKIRT);
          const at = `${body} ${pose} ${fr}`;
          // crouched or sitting it gathers on the ground (shorter), never gone
          assert.ok(px.size > 900, `${at}: ${px.size}`);
          assert.equal(holes(px), 0, at);
          assert.equal(pieces(px), 1, at);
          for (const [i, ch] of px) if ([i - 1, i + 1, i - GRID, i + GRID].some((j) => !px.has(j))) assert.equal(ch, 'k', at);
        }
  });
});
