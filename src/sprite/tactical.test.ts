// Tests for the owner's tactical set (Tactical Vest, Long Field Coat, Open-Toe Shin Boots, Short Field Glove): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import * as kit from './items/tacticalBootsGloveArt';
import * as coat from './items/tacticalCoatArt';
import * as vest from './items/tacticalVestArt';
import { TACTICAL_VEST_DEFAULT } from './items/tactical';
import { defaultAppearance } from './legacy';
import type { PaintedPiece } from './painted';
import { GRID, RES } from './raster';
import { GROUND } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

/** Our figure in his set; `his` keeps his own vest green (the default is another colour). */
const look = (body: BodyType, o: { his?: boolean; cape?: boolean; skin?: string } = {}): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  if (o.skin) l.skin = o.skin;
  l.slots.armor = { id: 'armor_tactical_vest', colors: o.his ? [vest.TACTICAL_VEST_GREEN, vest.TACTICAL_VEST_TRIM] : [] };
  if (o.cape !== false) l.slots.cape = { id: 'cape_tactical_coat', colors: [] };
  else delete l.slots.cape;
  l.slots.feet = { id: 'feet_tactical_boots', colors: [] };
  l.slots.hands = { id: 'hands_tactical_glove', colors: [] };
  l.slots.top = { id: 'top_tee', colors: ['#1c1b22'] };
  l.slots.bottom = { id: 'bottom_shinobi', colors: ['#1c1b22', '#1c1b22'] };
  delete l.slots.held;
  return l;
};

const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/** How many of a piece's cells (not his skin) the idle frame shows in his colour, where the script says it lands. */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number], kinds: Record<string, string>, only?: string): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      const k = kinds[piece.colors[row[i]]];
      if (k === 'skin' || (only && k !== only)) continue;
      n++;
      const p = (rest[1] + j) * GRID + rest[0] + i;
      if (opaque(rgba, p) && hex(rgba, p) === piece.colors[row[i]]) hit++;
    }
  });
  return hit / n;
}

describe('the tactical set', () => {
  it('lands every piece on his pixels at rest, where the script placed it', () => {
    const f = renderSprite(look('male', { his: true }), 'idle', 0);
    // What each piece shows of his pixels in our idle (the rest is under our arms, legs and the coat).
    const least: [string, PaintedPiece, [number, number], Record<string, string>, number][] = [
      ['back', coat.TACTICAL_COAT_BACK, coat.TACTICAL_COAT_REST.TACTICAL_COAT_BACK, coat.TACTICAL_COAT_KIND, 0.3],
      ['front', coat.TACTICAL_COAT_FRONT, coat.TACTICAL_COAT_REST.TACTICAL_COAT_FRONT, coat.TACTICAL_COAT_KIND, 0.6],
      ['collar', coat.TACTICAL_COAT_COLLAR, coat.TACTICAL_COAT_REST.TACTICAL_COAT_COLLAR, coat.TACTICAL_COAT_KIND, 0.6],
      ['far lapel', coat.TACTICAL_COAT_LAPEL_F, coat.TACTICAL_COAT_REST.TACTICAL_COAT_LAPEL_F, coat.TACTICAL_COAT_KIND, 0.9],
      ['near sleeve', coat.TACTICAL_COAT_SLEEVE_N, coat.TACTICAL_COAT_REST.TACTICAL_COAT_SLEEVE_N, coat.TACTICAL_COAT_KIND, 0.95],
    ];
    for (const [name, piece, rest, kinds, min] of least) {
      const got = atRest(f.rgba, piece, rest, kinds);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(0)}% of his pixels where he drew them (want ${min * 100}%)`);
    }
    // without the coat (its lapels, collar and front panel cover the vest's sides and the near boot's shaft)
    const v = renderSprite(look('male', { his: true, cape: false }), 'idle', 0);
    const alone: [string, PaintedPiece, [number, number], Record<string, string>, number][] = [
      ['vest', vest.TACTICAL_VEST, vest.TACTICAL_VEST_REST.TACTICAL_VEST, vest.TACTICAL_VEST_KIND, 0.95],
      ['near shin', kit.TACTICAL_BOOT_SHIN_N, kit.TACTICAL_KIT_REST.TACTICAL_BOOT_SHIN_N, kit.TACTICAL_KIT_KIND, 0.85],
      ['near boot', kit.TACTICAL_BOOT_FOOT_N, kit.TACTICAL_KIT_REST.TACTICAL_BOOT_FOOT_N, kit.TACTICAL_KIT_KIND, 0.95],
      ['glove', kit.TACTICAL_GLOVE_F, kit.TACTICAL_KIT_REST.TACTICAL_GLOVE_F, kit.TACTICAL_KIT_KIND, 0.95],
    ];
    for (const [name, piece, rest, kinds, min] of alone) {
      const got = atRest(v.rgba, piece, rest, kinds);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(0)}% of his pixels where he drew them (want ${min * 100}%)`);
    }
  });

  it('wears the vest in another colour than his green by default, his shading and black line kept', () => {
    assert.notEqual(TACTICAL_VEST_DEFAULT.toLowerCase(), vest.TACTICAL_VEST_GREEN.toLowerCase());
    const f = renderSprite(look('male', { cape: false }), 'idle', 0);
    const rest = vest.TACTICAL_VEST_REST.TACTICAL_VEST;
    assert.ok(atRest(f.rgba, vest.TACTICAL_VEST, rest, vest.TACTICAL_VEST_KIND, 'line') > 0.95, 'his black line stays');
    assert.ok(atRest(f.rgba, vest.TACTICAL_VEST, rest, vest.TACTICAL_VEST_KIND, 'green') < 0.05, 'his green is recoloured');
  });

  it('gives his bare toes the character skin', () => {
    const a = renderSprite(look('male', { skin: '#8d5524' }), 'idle', 0);
    const b = renderSprite(look('male', { skin: '#f1c27d' }), 'idle', 0);
    const p = kit.TACTICAL_BOOT_FOOT_N;
    const [x0, y0] = kit.TACTICAL_KIT_REST.TACTICAL_BOOT_FOOT_N;
    let toes = 0;
    p.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.' || kit.TACTICAL_KIT_KIND[p.colors[row[i]]] !== 'skin') continue;
        const q = (y0 + j) * GRID + x0 + i;
        if (hex(a.rgba, q) !== hex(b.rgba, q)) toes++;
      }
    });
    assert.ok(toes > 4, `${toes} toe pixels follow the skin`);
  });

  it('is cut for the male figures only', () => {
    for (const id of ['armor_tactical_vest', 'cape_tactical_coat', 'feet_tactical_boots', 'hands_tactical_glove']) {
      assert.deepEqual(getItem(id)?.bodies, ['male', 'bulky'], id);
    }
  });

  it('draws in every pose on both male figures, the hems never under the ground', () => {
    const lowest = (rgba: Uint8ClampedArray) => {
      let low = 0;
      for (let i = 0; i < GRID * GRID; i++) if (opaque(rgba, i)) low = Math.max(low, (i / GRID) | 0);
      return low;
    };
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const pose of POSES) {
        const bare = look(body, { cape: false });
        const low = lowest(renderSprite(look(body), pose, 1).rgba);
        assert.ok(low <= Math.max(GROUND * RES + 1, lowest(renderSprite(bare, pose, 1).rgba) + 1), `${body} ${pose}: lowest pixel ${low}`);
      }
    }
  });
});
