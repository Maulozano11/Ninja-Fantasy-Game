// Lyra on the owner's bare female body: two legs and two boots, each arm one piece with its hand, the near
// shoulder round, no hand or foot drawn twice and no limb left cut open, in every pose and frame on the
// female body (the owner, 2026-10-21: "estas poniendo 3 piernas o 3 botas", "sigue teniendo
// las manos separadas en arrojada", "en arrojada preparar falta el hombro"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALL_PRESETS } from '../data/shinobiData';
import { renderSprite, spriteLayers } from './compose';
import type { Depth } from './ctx';
import { paintedFrame } from './ownerFrames';
import { GRID, type Layer, partIndex, type PartId, RES } from './raster';
import { frameCount } from './rig';
import { type BodyType, CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const lyra = ALL_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character.appearance!;
const BODIES: BodyType[] = ['female'];
const look = (body: BodyType): SpriteAppearance => ({ ...lyra, body });

// The frames the owner painted himself (ownerFrames.ts: her read pose, her throw's frames 3 and 4) are his
// pixels, every one where he drew it (ownerFrames.test.ts): a leg partly hidden by the other, her far arm
// showing only its hand on the book, a light edge pixel of his, are his drawing, not our rig's, so these
// checks of how our rig draws her are left to the others.
function* frames(): Generator<[SpritePose, number]> {
  for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[]) for (let f = 0; f < frameCount(pose); f++) if (!paintedFrame(pose, f)) yield [pose, f];
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

/** The pieces bigger than a stray pixel or two. */
const big = (px: Set<number>) => regions(px).filter((n) => n >= 6);

describe("Lyra on the owner's bare female body", () => {
  it('has two legs and two boots, each leg one piece with its boot, in every pose and frame', () => {
    for (const body of BODIES) {
      for (const [pose, fr] of frames()) {
        const { layers } = spriteLayers(look(body), pose, fr);
        const at = `${body} ${pose} ${fr}`;
        for (const s of ['near', 'far'] as const) {
          const S = s === 'near' ? 'N' : 'F';
          const legs = [`${s}Leg.body`, `${s}Leg.cloth`, `${s}Leg.feet`, `${s}Leg.armor`] as Depth[];
          const leg = pixels(layers, legs, [`thigh${S}`, `shin${S}`, `foot${S}`] as PartId[]);
          assert.equal(big(leg).length, 1, `${at}: the ${s} leg in one piece (${regions(leg).join(', ')})`);
          const shoe = big(pixels(layers, legs, [`foot${S}`] as PartId[]));
          assert.equal(shoe.length, 1, `${at}: one ${s} boot (${shoe.join(', ')})`);
        }
        // no leg, boot or foot anywhere else (on the other leg's layers, or her clothes')
        const all = [...layers.keys()];
        assert.ok(big(pixels(layers, all, ['footN', 'footF'])).length <= 2, `${at}: two feet`);
      }
    }
  });

  it('keeps each hand on its arm, drawn once, and the near shoulder round, in every pose and frame', () => {
    for (const body of BODIES) {
      for (const [pose, fr] of frames()) {
        const { layers, rig } = spriteLayers(look(body), pose, fr);
        const at = `${body} ${pose} ${fr}`;
        // (the cast's glow over a hand, on the 'top' layer, is the jutsu's, not a hand)
        const all = [...layers.keys()].filter((d) => d !== 'top');
        for (const s of ['N', 'F'] as const) {
          const own = [`upperArm${s}`, `forearm${s}`, `hand${s}`] as PartId[];
          const depths = (s === 'N' ? ['nearArm.body', 'nearArm.cloth', 'nearArm.armor', 'nearArm.over'] : ['farArm.body', 'farArm.cloth', 'farArm.armor', 'farHand.front']) as Depth[];
          const hand = pixels(layers, all, [`hand${s}`] as PartId[]);
          if (!hand.size) continue;
          assert.equal(big(hand).length, 1, `${at}: one ${s === 'N' ? 'near' : 'far'} hand (${regions(hand).join(', ')})`);
          const arm = pixels(layers, depths, own);
          assert.equal(big(arm).length, 1, `${at}: the ${s === 'N' ? 'near' : 'far'} arm and hand in one piece (${regions(arm).join(', ')})`);
        }
        // the near shoulder's round: the upper arm round its joint, the body's or her sleeve's
        const sx = Math.floor(rig.shoulderN.x * RES);
        const sy = Math.floor(rig.shoulderN.y * RES);
        const up = pixels(layers, ['nearArm.body', 'nearArm.cloth', 'nearArm.armor'], ['upperArmN']);
        let round = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (up.has((sy + dy) * GRID + sx + dx)) round++;
        // (at rest his Lyra's bare shoulder is narrower than his bare woman's round: 18 of the 25)
        assert.ok(round >= 16, `${at}: the near shoulder's round (${round} of 25)`);
      }
    }
  });

  it('leaves no limb cut open: a pixel of an arm, leg or hand on the figure\'s edge is a line', () => {
    const limbs = new Set(['upperArmN', 'forearmN', 'handN', 'upperArmF', 'forearmF', 'handF', 'thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF'].map((p) => partIndex(p as PartId)));
    for (const body of BODIES) {
      for (const [pose, fr] of frames()) {
        if (pose === 'cast' || pose === 'downed') continue; // cast effects sit over the hands; downed is laid down
        const f = renderSprite(look(body), pose, fr);
        const op = (x: number, y: number) => f.rgba[(y * GRID + x) * 4 + 3] > 0;
        const open: string[] = [];
        for (let y = 1; y < GRID - 1; y++) {
          for (let x = 1; x < GRID - 1; x++) {
            const i = y * GRID + x;
            if (!op(x, y) || !limbs.has(f.part[i]) || Math.max(f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2]) < 70) continue;
            if (!op(x + 1, y) || !op(x - 1, y) || !op(x, y + 1) || !op(x, y - 1)) open.push(`${x},${y}`);
          }
        }
        assert.ok(open.length <= 3, `${body} ${pose} ${fr}: open edge at ${open.join(' ')}`);
      }
    }
  });
});
