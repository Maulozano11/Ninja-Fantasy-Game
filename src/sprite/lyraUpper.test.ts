// Tests for Lyra's blouse and corset (src/sprite/items/lyraUpper.ts, lyraUpperArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import * as ART from './items/lyraUpperArt';
import { segAngle, type PaintedPiece } from './painted';
import { GRID, partIndex, RES } from './raster';
import { drawRig } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const BLOUSE = 'top_offshoulder_blouse';
const CORSET = 'armor_gilded_corset';
const LINE = '#010101';

// her clothes are cut for his Lyra's arms (rig.ts LONG_ARMS)
const look = (body: BodyType, top: string[] = [], armor: string[] = []): SpriteAppearance => ({
  version: 1,
  body,
  arms: 'long',
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { top: { id: BLOUSE, colors: top }, armor: { id: CORSET, colors: armor } },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');
};

const PIECES: Record<string, PaintedPiece> = Object.fromEntries(
  Object.entries(ART).filter(([k, v]) => typeof v === 'object' && v !== null && 'rows' in v && !k.endsWith('_CUT')),
) as Record<string, PaintedPiece>;

describe("Lyra's blouse and corset", () => {
  it('are a top and an armour, women only', () => {
    const blouse = getItem(BLOUSE)!;
    const corset = getItem(CORSET)!;
    assert.equal(blouse.slot, 'top');
    assert.equal(corset.slot, 'armor');
    assert.equal(corset.statsArmor, getItem('armor_leather')!.statsArmor);
    for (const d of [blouse, corset]) {
      assert.ok(fitsBody(d, 'female'), d.id);
      assert.ok(!fitsBody(d, 'male') && !fitsBody(d, 'bulky'), d.id);
    }
    assert.deepEqual(blouse.colors.map((c) => c.default), [ART.LYRA_BLOUSE[0], ART.LYRA_LINING[0]]);
    assert.deepEqual(corset.colors.map((c) => c.default), [ART.LYRA_LEATHER[0], ART.LYRA_GOLD[0], ART.LYRA_STEEL[0]]);
  });

  it('has every piece as a whole picture in her colours only', () => {
    const hers = new Set([...ART.LYRA_LINE, ...ART.LYRA_BLOUSE, ...ART.LYRA_LINING, ...ART.LYRA_GOLD, ...ART.LYRA_LEATHER, ...ART.LYRA_STEEL, ...ART.LYRA_SKIN]);
    assert.equal(Object.keys(PIECES).length, 10);
    for (const [name, p] of Object.entries(PIECES)) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w), name);
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.ok(hers.has(p.colors[ch]), `${name} '${ch}' ${p.colors[ch]}`);
    }
  });

  it('lays every piece at its own angle in our female idle, so every pixel there is hers', () => {
    const r = drawRig('female', 'idle', 0, 'long');
    const seg = {
      torso: segAngle(r.pelvis, r.neck),
      upperN: segAngle(r.shoulderN, r.elbowN),
      foreN: segAngle(r.elbowN, r.wristN),
      upperF: segAngle(r.shoulderF, r.elbowF),
      foreF: segAngle(r.elbowF, r.wristF),
    };
    const want: Record<string, number> = {
      BLOUSE_TORSO: seg.torso,
      CORSET: seg.torso,
      BLOUSE_SLEEVE_N: seg.upperN,
      BLOUSE_FOREARM_N: seg.foreN,
      CORSET_BRACER_N: seg.foreN,
      BLOUSE_SLEEVE_F: seg.upperF,
      BLOUSE_SIDE_F: seg.upperF,
      CORSET_PAULDRON: seg.upperF,
      BLOUSE_FOREARM_F: seg.foreF,
      CORSET_BRACER_F: seg.foreF,
    };
    for (const [name, deg] of Object.entries(want)) assert.ok(Math.abs(PIECES[name].angle - deg) < 0.5, `${name} ${PIECES[name].angle} vs ${deg}`);
  });

  it('shows his pixels at idle where he drew them: the red V, a buckle, the pauldron, a stud on the bracer, the near puff, the far cuff', () => {
    const f = renderSprite(look('female'), 'idle', 0).rgba;
    assert.equal(hexAt(f, 129, 155), '#81152c');
    assert.equal(hexAt(f, 130, 163), '#8b8a90');
    assert.equal(hexAt(f, 133, 149), '#fbbc57');
    assert.equal(hexAt(f, 111, 169), '#db9b41');
    assert.equal(hexAt(f, 113, 162), '#f2e2c0');
    assert.equal(hexAt(f, 134, 161), LINE);
    // the far cuff under his pouch, over his far hand
    assert.equal(hexAt(f, 140, 175), '#cbad8d');
    for (const x of [139, 140, 141, 142]) assert.equal(hexAt(f, x, 176), LINE, `${x}`);
  });

  it('ends the cuffs at the wrist, on her long arms and on the body\'s own: no fist under a cuff', () => {
    // the forearm pieces pivot on the wrist: on the shorter arms the bracer goes up over the puff. A
    // fist round her sword shows whole; an open hand comes out of the cuff, which covers its wrist row.
    // (On the owner's bare body a hand carries a round cap of the wrist, above the wrist's row: the
    // cuff covers it, as his cuffs do.)
    const hands = [partIndex('handN'), partIndex('handF')];
    for (const body of ['female'] as BodyType[]) {
      for (const arms of ['long', undefined] as const) {
        for (const held of [true, false]) {
          const sword = held ? { held: { id: 'held_gilded_rapier', colors: [] } } : {};
          const lk = { ...look(body), arms };
          const { part: bare, rig } = renderSprite({ ...lk, slots: sword }, 'idle', 0);
          const f = renderSprite({ ...lk, slots: { ...lk.slots, ...sword } }, 'idle', 0).part;
          const wrist = { [hands[0]]: Math.floor(rig.wristN.y * RES), [hands[1]]: Math.floor(rig.wristF.y * RES) };
          const rows = new Set<number>();
          for (let i = 0; i < GRID * GRID; i++) if (hands.includes(bare[i]) && f[i] !== bare[i] && ((i / GRID) | 0) > wrist[bare[i]]) rows.add((i / GRID) | 0);
          assert.ok(rows.size <= (held ? 0 : 1), `${body} ${arms} ${held}: hand covered on rows ${[...rows]}`);
        }
      }
    }
  });

  it('moves her colours with the colour slots and keeps her line', () => {
    const f = renderSprite(look('female', ['#3a4f8f', '#d9a520'], ['#2b2b33', '#c0c6d0', '#e0b040']), 'idle', 0).rgba;
    assert.notEqual(hexAt(f, 129, 155), '#81152c');
    assert.notEqual(hexAt(f, 130, 163), '#8b8a90');
    assert.notEqual(hexAt(f, 133, 149), '#fbbc57');
    assert.notEqual(hexAt(f, 113, 162), '#f2e2c0');
    assert.equal(hexAt(f, 134, 161), LINE);
  });

  it('shows her bare near shoulder and the skin in the V in the character\'s skin, his pixels in his', () => {
    const his = { ...look('female'), skin: '#fbc9aa' };
    const f = renderSprite(his, 'idle', 0).rgba;
    assert.equal(hexAt(f, 117, 151), ART.LYRA_SKIN[0]);
    assert.equal(hexAt(f, 130, 152), ART.LYRA_SKIN[0]);
    // his bare shoulder's top line where he drew it
    for (const x of [117, 118, 119]) assert.equal(hexAt(f, x, 148), LINE, `${x}`);
    const dark = renderSprite({ ...his, skin: '#7a4a32' }, 'idle', 0).rgba;
    for (const [x, y] of [[117, 151], [130, 152]]) assert.ok(!ART.LYRA_SKIN.includes(hexAt(dark, x, y)), `${x},${y} ${hexAt(dark, x, y)}`);
  });

  it("takes our body's near shoulder off where it comes out above or behind his bare shoulder", () => {
    const cut = ART.BLOUSE_SLEEVE_N_CUT;
    assert.equal(cut.angle, ART.BLOUSE_SLEEVE_N.angle);
    const blouseOnly = { ...look('female'), slots: { top: { id: BLOUSE, colors: [] } } };
    const bare = renderSprite({ ...blouseOnly, slots: {} }, 'idle', 0).rgba;
    const f = renderSprite(blouseOnly, 'idle', 0).rgba;
    // the body's shoulder rows above his line: drawn bare, gone under his blouse
    for (const x of [115, 116, 117, 118]) {
      assert.equal(bare[(147 * GRID + x) * 4 + 3], 255, `bare ${x}`);
      assert.equal(f[(147 * GRID + x) * 4 + 3], 0, `${x}`);
    }
  });

  it('shows no skin of our forearm beside the near bracer at idle', () => {
    const skin = new Set<string>();
    const bare = renderSprite({ ...look('female'), slots: {} }, 'idle', 0).rgba;
    for (let y = 160; y <= 171; y++) for (let x = 106; x <= 118; x++) if (bare[(y * GRID + x) * 4 + 3]) skin.add(hexAt(bare, x, y));
    skin.delete(LINE);
    skin.delete('#060609');
    skin.delete('#070819'); // the owner's bare body's line
    const f = renderSprite(look('female'), 'idle', 0).rgba;
    for (let y = 163; y <= 171; y++) for (let x = 106; x <= 118; x++) assert.ok(!skin.has(hexAt(f, x, y)), `(${x}, ${y}) ${hexAt(f, x, y)}`);
  });

  it('draws on the female body in every pose', () => {
    const poses: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
    for (const body of ['female'] as BodyType[]) {
      const bare = { ...look(body), slots: {} };
      for (const pose of poses) {
        for (const frame of [0, 1]) {
          const a = renderSprite(look(body), pose, frame).rgba;
          const b = renderSprite(bare, pose, frame).rgba;
          let changed = 0;
          for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed++;
          assert.ok(changed > 300, `${body} ${pose} ${frame}: ${changed}`);
        }
      }
    }
  });
});
