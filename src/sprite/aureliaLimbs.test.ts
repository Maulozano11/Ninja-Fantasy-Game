// Aurelia on the owner's bare female body: two legs and two boots, each arm one piece with its hand, in
// every pose and frame (the owner, 2026-10-21: "estas poniendo 3 piernas o 3 botas", "sigue teniendo las
// manos separadas en arrojada", "en arrojada preparar falta el hombro"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { spriteLayers } from './compose';
import type { Depth } from './ctx';
import { GRID, type Layer, partIndex, type PartId, RES } from './raster';
import { DAWN_FOOT_F, DAWN_FOOT_N, DAWN_SHIN_F, DAWN_SHIN_N, DAWN_THIGH_F, DAWN_THIGH_N } from './items/aureliaBootsArt';
import { frameCount } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpritePose } from './types';

const look = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character.appearance!;

function* frames(): Generator<[SpritePose, number]> {
  for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[]) for (let f = 0; f < frameCount(pose); f++) yield [pose, f];
}

/** The 8-connected regions of a set of pixel indices (their sizes). */
function regions(px: Set<number>): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const s of px) {
    if (seen.has(s)) continue;
    let n = 0;
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const i = stack.pop()!;
      n++;
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
    out.push(n);
  }
  return out;
}

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

describe("Aurelia on the owner's bare female body", () => {
  it('has two legs and two boots, each leg one piece with its boot, in every pose and frame', () => {
    for (const [pose, fr] of frames()) {
      const { layers } = spriteLayers(look, pose, fr);
      const at = `${pose} ${fr}`;
      for (const s of ['near', 'far'] as const) {
        const legs = [`${s}Leg.body`, `${s}Leg.cloth`, `${s}Leg.feet`, `${s}Leg.armor`] as Depth[];
        const S = s === 'near' ? 'N' : 'F';
        // the far sleeve hangs on the far leg's armour layer: only the leg's own parts count
        const leg = pixels(layers, legs, [`thigh${S}`, `shin${S}`, `foot${S}`] as PartId[]);
        const big = regions(leg).filter((n) => n >= 6);
        assert.equal(big.length, 1, `${at}: the ${s} leg in one piece (${regions(leg).join(', ')})`);
        const shoe = regions(pixels(layers, legs, [`foot${S}`] as PartId[])).filter((n) => n >= 6);
        assert.ok(shoe.length <= 1, `${at}: one ${s} shoe (${shoe.join(', ')})`);
      }
    }
  });

  it('carries no bare thigh on her boots: the thighs in her skirt\'s slits are the body\'s own', () => {
    // A thigh painted on the boot rode the far shin and stood beside our thigh when she sat (the third
    // leg). Her boots are cloth, gold and his line only.
    for (const p of [DAWN_THIGH_N, DAWN_SHIN_N, DAWN_FOOT_N, DAWN_THIGH_F, DAWN_SHIN_F, DAWN_FOOT_F]) {
      for (const hex of Object.values(p.colors)) {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        // his skin: rosy (red well over blue, green between), not his golds (green near red) or creams
        const skin = r > 180 && r - b > 40 && r - g > 30 && g - b < 50;
        assert.ok(!skin, `${hex} is skin`);
      }
    }
  });

  it('keeps each hand on its arm and the near shoulder round, in every pose and frame', () => {
    for (const [pose, fr] of frames()) {
      const { layers, rig } = spriteLayers(look, pose, fr);
      const at = `${pose} ${fr}`;
      for (const s of ['N', 'F'] as const) {
        const own = [`upperArm${s}`, `forearm${s}`, `hand${s}`] as PartId[];
        const depths = (s === 'N' ? ['nearArm.body', 'nearArm.cloth', 'nearArm.armor', 'nearArm.over'] : ['farArm.body', 'farArm.cloth', 'farArm.armor', 'farHand.front', 'farLeg.armor']) as Depth[];
        const arm = pixels(layers, depths, own);
        const hand = pixels(layers, depths, [`hand${s}`] as PartId[]);
        if (!hand.size) continue;
        const big = regions(arm).filter((n) => n >= 6);
        assert.equal(big.length, 1, `${at}: the ${s === 'N' ? 'near' : 'far'} arm and hand in one piece (${regions(arm).join(', ')})`);
      }
      // the near shoulder's round (the upper arm round its joint, his or her sleeve's)
      const sx = Math.floor(rig.shoulderN.x * RES);
      const sy = Math.floor(rig.shoulderN.y * RES);
      const up = pixels(layers, ['nearArm.body', 'nearArm.armor'], ['upperArmN']);
      let round = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (up.has((sy + dy) * GRID + sx + dx)) round++;
      assert.ok(round >= 20, `${at}: the near shoulder's round (${round} of 25)`);
    }
  });
});
