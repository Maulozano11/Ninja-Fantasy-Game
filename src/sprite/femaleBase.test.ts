// Tests for the female bodies built from the owner's bare female body (femaleBaseArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite, spriteLayers } from './compose';
import type { Depth } from './ctx';
import { type BasePiece, FEMALE_BASE, FEMALE_BASE_JOINTS, FEMALE_BASE_SKIN } from './femaleBaseArt';
import { GRID, type Layer, partIndex, type PartId, RES } from './raster';
import { drawRig, frameCount } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const BODIES: BodyType[] = ['female', 'slender'];
const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];

const bare = (body: BodyType, skin = '#f6c7a6', slots: SpriteAppearance['slots'] = {}): SpriteAppearance =>
  ({
    version: 1, body, skin, eyeShape: 'standard', eyeColor: '#2f9e6a', slots, accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [],
  }) as unknown as SpriteAppearance;

/** Every frame of every pose. */
function* frames(): Generator<[SpritePose, number]> {
  for (const pose of POSES) for (let f = 0; f < frameCount(pose); f++) yield [pose, f];
}

/** The 8-connected regions of a set of pixel indices. */
function regions(px: Set<number>): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  for (const s of px) {
    if (seen.has(s)) continue;
    const reg: number[] = [];
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const i = stack.pop()!;
      reg.push(i);
      const x = i % GRID;
      const y = (i / GRID) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const j = (y + dy) * GRID + x + dx;
          if ((dx || dy) && px.has(j) && !seen.has(j)) {
            seen.add(j);
            stack.push(j);
          }
        }
    }
    out.push(reg);
  }
  return out;
}

/**
 * The most pixels a part can have when it is drawn once: his piece, the round cap of it the next piece
 * carries over the joint, and a little more for turning (RotSprite). A limb drawn twice is twice that.
 */
function drawnOnce(part: PartId): number {
  const count = (p: BasePiece, only?: string) => p.rows.join('').split('').filter((c) => c !== '.' && (only === undefined || only.includes(c))).length;
  const P = FEMALE_BASE as Record<string, BasePiece>;
  const below: Record<string, string> = { upperArmN: 'forearmN', upperArmF: 'forearmF', forearmN: 'handN', forearmF: 'handF', thighN: 'shinN', thighF: 'shinF', shinN: 'footN', shinF: 'footF' };
  const own = count(P[part]) - count(P[part], P[part].cap);
  const cap = below[part] ? count(P[below[part]], P[below[part]].cap) : 0;
  // a far hand pointing or open is his heroines' hand on his wrist, about the size of his near fist
  if (part === 'handF') return Math.max(Math.ceil((own + cap) * 1.25), drawnOnce('handN'));
  return Math.ceil((own + cap) * 1.25);
}

/** The drawn pixels of some layers (optionally of some parts only). */
function pixels(layers: Map<Depth, Layer>, depths: Depth[], parts?: PartId[]): Set<number> {
  const want = parts && new Set(parts.map(partIndex));
  const out = new Set<number>();
  for (const d of depths) {
    const L = layers.get(d);
    if (!L) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && (!want || want.has(L.part[i]))) out.add(i);
  }
  return out;
}

describe("the owner's bare female body", () => {
  it('stands at rest on every joint of his', () => {
    for (const body of BODIES) {
      const r = drawRig(body, 'idle', 0);
      for (const [k, [x, y]] of Object.entries(FEMALE_BASE_JOINTS)) {
        const j = r[k as keyof typeof r] as { x: number; y: number };
        assert.ok(Math.abs(j.x * RES - x) < 1e-6 && Math.abs(j.y * RES - y) < 1e-6, `${body} ${k}: ${j.x * RES}, ${j.y * RES} (his ${x}, ${y})`);
      }
    }
  });

  it('is his picture at rest, every pixel of his body below the head', () => {
    // His pieces laid at his joints, unturned, back to front as body.ts draws them.
    const order: (keyof typeof FEMALE_BASE)[] = ['upperArmF', 'forearmF', 'handF', 'thighF', 'shinF', 'footF', 'thighN', 'shinN', 'footN', 'pelvis', 'chest', 'upperArmN', 'forearmN', 'handN'];
    const joint: Record<string, keyof typeof FEMALE_BASE_JOINTS> = {
      upperArmF: 'shoulderF', forearmF: 'elbowF', handF: 'wristF', thighF: 'hipF', shinF: 'kneeF', footF: 'ankleF',
      thighN: 'hipN', shinN: 'kneeN', footN: 'ankleN', pelvis: 'pelvis', chest: 'neck', upperArmN: 'shoulderN', forearmN: 'elbowN', handN: 'wristN',
    };
    const want = new Map<number, string>();
    for (const k of order) {
      const p = FEMALE_BASE[k];
      const [jx, jy] = FEMALE_BASE_JOINTS[joint[k]];
      const ox = Math.floor(jx) - p.pivot[0];
      const oy = Math.floor(jy) - p.pivot[1];
      p.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && want.set((oy + y) * GRID + ox + x, p.colors[ch])));
    }
    for (const body of BODIES) {
      // in his own skin his colours are his
      const f = renderSprite(bare(body, FEMALE_BASE_SKIN), 'idle', 0);
      let n = 0;
      for (const [i, hex] of want) {
        if (((i / GRID) | 0) < 150) continue; // the head is ours
        const got = '#' + [0, 1, 2].map((c) => f.rgba[i * 4 + c].toString(16).padStart(2, '0')).join('');
        assert.equal(got, hex, `${body}: pixel ${i % GRID}, ${(i / GRID) | 0}`);
        n++;
      }
      assert.ok(n > 1400, `${n} pixels compared`);
      // and nothing of the body outside his pieces
      for (let i = 150 * GRID; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3]) assert.ok(want.has(i), `${body}: pixel ${i % GRID}, ${(i / GRID) | 0} is not his`);
    }
  });

  it('draws each leg as one piece with its foot, two legs and two feet, never a limb twice', () => {
    for (const body of BODIES) {
      for (const feet of [undefined, 'feet_leather', 'feet_crimson_sabatons']) {
        const look = bare(body, undefined, feet ? { feet: { id: feet, colors: [] } } : {});
        for (const [pose, fr] of frames()) {
          const { layers } = spriteLayers(look, pose, fr);
          const at = `${body} ${feet ?? 'barefoot'} ${pose} ${fr}`;
          for (const s of ['near', 'far'] as const) {
            const S = s === 'near' ? 'N' : 'F';
            const legs = [`${s}Leg.body`, `${s}Leg.cloth`, `${s}Leg.feet`, `${s}Leg.armor`] as Depth[];
            assert.equal(regions(pixels(layers, legs)).length, 1, `${at}: the ${s} leg in one piece`);
            for (const part of [`thigh${S}`, `shin${S}`, `foot${S}`] as PartId[]) {
              if (feet && part !== `thigh${S}`) continue; // the boot draws the shin and foot
              const n = pixels(layers, legs, [part]).size;
              assert.ok(n <= drawnOnce(part), `${at}: the ${s} ${part} drawn once (${n} pixels, his piece ${drawnOnce(part)})`);
            }
          }
          // two feet in all: no foot or boot of one leg on the other's layers
          const allFeet = pixels(layers, [...layers.keys()], ['footN', 'footF']);
          assert.equal(regions(allFeet).length <= 2 && regions(allFeet).length >= 1, true, `${at}: ${regions(allFeet).length} feet`);
        }
      }
    }
  });

  it('draws each arm as one piece with its hand, the near shoulder always round', () => {
    for (const body of BODIES) {
      for (const [pose, fr] of frames()) {
        const { layers, rig } = spriteLayers(bare(body), pose, fr);
        const at = `${body} ${pose} ${fr}`;
        assert.equal(regions(pixels(layers, ['nearArm.body'])).length, 1, `${at}: the near arm and hand in one piece`);
        assert.equal(regions(pixels(layers, ['farArm.body', 'farHand.front'])).length, 1, `${at}: the far arm and hand in one piece`);
        for (const part of ['upperArmN', 'forearmN', 'handN', 'upperArmF', 'forearmF', 'handF'] as PartId[]) {
          const n = pixels(layers, ['nearArm.body', 'farArm.body', 'farHand.front'], [part]).size;
          assert.ok(n <= drawnOnce(part), `${at}: ${part} drawn once (${n} pixels, his piece ${drawnOnce(part)})`);
        }
        // the shoulder's round: the upper arm covers the shoulder joint all round
        const sx = Math.floor(rig.shoulderN.x * RES);
        const sy = Math.floor(rig.shoulderN.y * RES);
        const up = pixels(layers, ['nearArm.body'], ['upperArmN']);
        let round = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (up.has((sy + dy) * GRID + sx + dx)) round++;
        assert.ok(round >= 22, `${at}: the near shoulder's round (${round} of 25)`);
      }
    }
  });

  it('closes every edge of the body off rest with his line', () => {
    // At rest every pixel is his; moved, a pixel of a piece left on the figure's edge is his line.
    for (const body of BODIES) {
      for (const [pose, fr] of frames()) {
        if (pose === 'idle' || pose === 'cast' || pose === 'downed') continue; // cast effects sit over the hands; downed is laid down
        const f = renderSprite(bare(body), pose, fr);
        const op = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && f.rgba[(y * GRID + x) * 4 + 3] > 0;
        const limbs = new Set(['upperArmN', 'forearmN', 'handN', 'upperArmF', 'forearmF', 'handF', 'thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF', 'pelvis'].map((p) => partIndex(p as PartId)));
        const open: string[] = [];
        for (let y = 1; y < GRID - 1; y++) {
          for (let x = 1; x < GRID - 1; x++) {
            const i = y * GRID + x;
            if (!op(x, y) || !limbs.has(f.part[i]) || Math.max(f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2]) < 70) continue;
            if (!op(x + 1, y) || !op(x - 1, y) || !op(x, y + 1) || !op(x, y - 1)) open.push(`${x},${y}`);
          }
        }
        // a fist round a thrown kunai's grip opens where the grip leaves it
        assert.ok(open.length <= 3, `${body} ${pose} ${fr}: open edge at ${open.join(' ')}`);
      }
    }
  });
});
