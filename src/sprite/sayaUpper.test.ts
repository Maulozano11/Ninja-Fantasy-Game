// Tests for Saya's ninja top, arm guards and fingerless gloves (items/sayaUpper.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { retintHex } from './color';
import { FEMALE_SKIN } from './femaleBodyArt';
import { frameCount, rigPoseFor } from './rig';
import { SAYA_GLOVE_N, SAYA_HAND_F, SAYA_FORE_F, SAYA_FORE_N, SAYA_PLATE, SAYA_SHOULDER_N, SAYA_TOP, SAYA_TOP_LOW, SAYA_UPPER_F, SAYA_UPPER_N } from './items/sayaUpperArt';
import { SAYA_SWORD_GUARD } from './items/sayaSwordArt';
import { segAngle } from './painted';
import { GRID, MaterialTable, partIndex, RES } from './raster';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES } from './types';
import type { BodyType, SlotId, SpriteAppearance, SpritePose } from './types';

const look = (body: BodyType, slots: Partial<Record<SlotId, { id: string; colors: string[] }>>): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots,
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});
const SAYA = { armor: { id: 'armor_crimson_shade', colors: [] }, hands: { id: 'hands_shade_fingerless', colors: [] }, held: { id: 'held_katana', colors: [] } };

/** The colour of a frame's pixel. */
const hexAt = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('');
};

/** How many pixels of a frame are exactly this colour. */
function count(rgba: Uint8ClampedArray, hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] && rgba[i] === r && rgba[i + 1] === g && rgba[i + 2] === b) n++;
  return n;
}

describe("Saya's top, arm guards and gloves", () => {
  it('are an armour for women and gloves for every body', () => {
    const armor = getItem('armor_crimson_shade')!;
    const gloves = getItem('hands_shade_fingerless')!;
    assert.equal(armor.slot, 'armor');
    assert.equal(gloves.slot, 'hands');
    assert.deepEqual(armor.bodies, ['female', 'slender']);
    assert.ok(!fitsBody(armor, 'male') && !fitsBody(armor, 'bulky'));
    for (const b of ['female', 'slender', 'male', 'bulky'] as BodyType[]) assert.ok(fitsBody(gloves, b));
  });

  it('keeps every piece a whole picture: even rows, every character one of her colours', () => {
    for (const p of [SAYA_TOP, SAYA_TOP_LOW, SAYA_UPPER_N, SAYA_FORE_N, SAYA_UPPER_F, SAYA_FORE_F, SAYA_GLOVE_N, SAYA_HAND_F]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(p.colors[ch] ?? '', /^#[0-9a-f]{6}$/);
    }
  });

  it('draws her cream plate at her colour by default, and recolours it with the Plate slot', () => {
    const base = renderSprite(look('female', SAYA), 'idle', 0).rgba;
    assert.ok(count(base, SAYA_PLATE) > 40, 'her cream shows on the chest');
    const recoloured = renderSprite(look('female', { ...SAYA, armor: { id: 'armor_crimson_shade', colors: ['', '', '#d0d6e0'] } }), 'idle', 0).rgba;
    assert.equal(count(recoloured, SAYA_PLATE), 0);
  });

  it('covers the long torso in every pose: the top on the neck reaches down over the top on the hips', () => {
    // Both pieces turn with the torso (pelvis to neck), each about its own joint, so in the pieces' own
    // rows the pelvis lies straight below the neck: the upper piece's last row must reach the lower
    // piece's first, or skin would show between her collar and her belts (crouching, throwing, down).
    const poses = [...new Set<SpritePose>([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])];
    for (const body of ['female', 'slender'] as BodyType[]) {
      const a = look(body, SAYA);
      for (const pose of poses) {
        const n = frameCount(rigPoseFor(pose, 'runes', 'held_katana'));
        for (let f = 0; f < n; f++) {
          const { rig } = renderSprite(a, pose, f);
          const t = ((segAngle(rig.pelvis, rig.neck) - SAYA_TOP.angle) * Math.PI) / 180;
          const dx = Math.floor(rig.pelvis.x * RES) - Math.floor(rig.neck.x * RES);
          const dy = Math.floor(rig.pelvis.y * RES) - Math.floor(rig.neck.y * RES);
          const down = -dx * Math.sin(t) + dy * Math.cos(t); // the pelvis below the neck, in the pieces' rows
          const bottom = SAYA_TOP.rows.length - 1 - SAYA_TOP.pivot[1];
          const top = down - SAYA_TOP_LOW.pivot[1];
          // they meet or overlap: the lower piece's first row at most half a row below the upper's last
          // (the raised arm of 'victory' stretches the torso so far that they share one row)
          assert.ok(bottom + 0.5 >= top, `${body} ${pose} ${f}: upper piece ends at ${bottom}, lower starts at ${top.toFixed(2)}`);
        }
      }
    }
  });

  it('closes her own fists at rest: her near glove round the sword, her far fist under its strap', () => {
    const f = renderSprite(look('female', { ...SAYA, held: { id: 'held_shade_saber', colors: [] } }), 'idle', 0).rgba;
    for (const x of [108, 109, 110]) assert.equal(hexAt(f, x, 178), '#a73234', `near glove's red band at ${x}`);
    assert.equal(hexAt(f, 109, 176), '#374061'); // the glove's navy over the grip's middle
    assert.equal(hexAt(f, 105, 172), SAYA_SWORD_GUARD); // the pommel above the fist
    assert.equal(hexAt(f, 145, 175), '#63483b'); // the far fist's strap where he drew it (three rows higher, as her top), over the skirt's flare
  });

  it('hangs her far arm where he drew it at rest: her bare far shoulder beside her plate, her guards further out', () => {
    // His far arm, three rows higher than he drew it (as her top is): his bare shoulder at x 138-139,
    // its line over it and the guard's top line under it, the red elbow band and the cuff further out.
    const f = renderSprite(look('female', SAYA), 'idle', 0).rgba;
    const shadow = retintHex('#d28771', '#f3bf9c', '#f6c7a6');
    for (const [x, y] of [[138, 154], [139, 154], [138, 155], [139, 155], [139, 153]]) assert.equal(hexAt(f, x, y), shadow, `bare far shoulder at ${x},${y}`);
    for (const x of [137, 138, 139, 140]) assert.equal(hexAt(f, x, 156), '#020102', `the guard's top line at ${x}`);
    for (const [x, y] of [[138, 159], [139, 159], [140, 159]]) assert.match(hexAt(f, x, y), /^#(6e212c|a73234)$/, `the red band at ${x},${y}`);
    assert.equal(hexAt(f, 145, 172), '#a73234'); // the forearm guard's red stripe, out where he drew it
  });

  it('keeps both arms on the body and the near hand in sight in every pose of both female bodies', () => {
    // Every patch of upper arm and forearm that shows touches the rest of the figure (the hand goes
    // with them; a jutsu's glow drawn round the hand is the hand's part too, so it is not counted).
    // The near forearm guard is pinned at the wrist, so it never runs down over the near hand: at
    // least 20 of its pixels show (a fist or an open hand is 24 or more).
    const handN = partIndex('handN');
    const arms: [string, Set<number>][] = [
      ['far', new Set([partIndex('upperArmF'), partIndex('forearmF')])],
      ['near', new Set([partIndex('upperArmN'), partIndex('forearmN')])],
    ];
    const poses = [...new Set<SpritePose>([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])];
    for (const body of ['female', 'slender'] as BodyType[]) {
      const a = look(body, SAYA);
      for (const pose of poses) {
        const n = frameCount(rigPoseFor(pose, 'runes', 'held_katana'));
        for (let fr = 0; fr < n; fr++) {
          const { rgba, part } = renderSprite(a, pose, fr);
          let hand = 0;
          for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3] && part[i] === handN) hand++;
          assert.ok(hand >= 20, `${body} ${pose} ${fr}: only ${hand} pixels of the near hand show`);
          for (const [side, arm] of arms) {
            const seen = new Uint8Array(GRID * GRID);
            for (let i = 0; i < GRID * GRID; i++) {
              if (seen[i] || !rgba[i * 4 + 3] || !arm.has(part[i])) continue;
              let touches = false;
              const stack = [i];
              seen[i] = 1;
              while (stack.length) {
                const j = stack.pop()!;
                const x = j % GRID;
                for (const k of [j - 1, j + 1, j - GRID, j + GRID]) {
                  if (k < 0 || k >= GRID * GRID || Math.abs((k % GRID) - x) > 1 || !rgba[k * 4 + 3]) continue;
                  if (!arm.has(part[k])) touches = true;
                  else if (!seen[k]) {
                    seen[k] = 1;
                    stack.push(k);
                  }
                }
              }
              assert.ok(touches, `${body} ${pose} ${fr}: ${side} arm at ${i % GRID},${(i / GRID) | 0} floats off the body`);
            }
          }
        }
      }
    }
  });

  it('keeps her bare near shoulder on the shoulder with the arm raised, and never shows the bandeau there', () => {
    // Flung up to throw, raised in victory, swung across to thrust: her shoulder's round turned all the
    // way with the arm came off the shoulder (a ball of skin in its own line on her back), and the
    // body's bandeau (body.ts, '#3b3a46') showed beside her top under it.
    const mats = new MaterialTable();
    const ramp = mats.ramps[mats.get('#3b3a46', 'cloth')];
    const skin = retintHex(SAYA_SHOULDER_N.colors.H, SAYA_SHOULDER_N.colors.H, '#f6c7a6');
    const raised: [SpritePose, number][] = [['throw', 2], ['throw', 3], ['throw', 4], ['victory', 0], ['victory', 1], ['attack', 1], ['pierce', 2], ['pierce', 3]];
    for (const body of ['female', 'slender'] as BodyType[]) {
      for (const [pose, fr] of raised) {
        const { rgba, rig } = renderSprite(look(body, SAYA), pose, fr);
        const sx = Math.floor(rig.shoulderN.x * RES);
        const sy = Math.floor(rig.shoulderN.y * RES);
        let bandeau = 0;
        let bare = 0;
        for (let y = sy - 14; y <= sy + 14; y++) {
          for (let x = sx - 14; x <= sx + 14; x++) {
            const c = hexAt(rgba, x, y);
            if (ramp.slice(1).includes(c)) bandeau++;
            if (c === skin && Math.hypot(x - sx, y - sy) <= 5) bare++;
          }
        }
        assert.equal(bandeau, 0, `${body} ${pose} ${fr}: bandeau beside her top`);
        assert.ok(bare >= 6, `${body} ${pose} ${fr}: her bare shoulder on the shoulder joint (${bare})`);
      }
    }
  });

  it("paints our body's own skin in her two tones", () => {
    const skin = '#f6c7a6';
    const ours = [FEMALE_SKIN.deep, FEMALE_SKIN.shadow].map((c) => retintHex(c, FEMALE_SKIN.base, skin));
    for (const pose of ['idle', 'attack', 'run', 'sit', 'throw', 'victory'] as SpritePose[]) {
      const f = renderSprite(look('female', SAYA), pose, 0).rgba;
      for (const c of ours) assert.equal(count(f, c), 0, `${pose}: our shadow ${c}`);
    }
  });

  it('renders every pose on the female and slender bodies, and the gloves alone on the male and bulky', () => {
    const poses: SpritePose[] = ['idle', 'attack', 'cast', 'handsigns', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'sit', 'read', 'lean', 'train'];
    for (const body of ['female', 'slender', 'male', 'bulky'] as BodyType[]) {
      const a = look(body, SAYA);
      for (const pose of poses) {
        // the first and the middle frame of each
        const n = frameCount(rigPoseFor(pose, 'runes', 'held_katana'));
        for (const f of new Set([0, n >> 1])) assert.ok(renderSprite(a, pose, f).rgba.some((v) => v > 0), `${body} ${pose} ${f}`);
      }
    }
  });
});
