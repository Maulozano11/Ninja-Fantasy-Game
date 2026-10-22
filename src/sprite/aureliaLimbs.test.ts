// Aurelia on the owner's bare female body: two legs and two boots, each arm one piece with its hand, in
// every pose and frame (the owner, 2026-10-21: "estas poniendo 3 piernas o 3 botas", "sigue teniendo las
// manos separadas en arrojada", "en arrojada preparar falta el hombro"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite, spriteLayers } from './compose';
import type { Depth } from './ctx';
import { GRID, type Layer, partIndex, type PartId, RES } from './raster';
import { DAWN_FOOT_F, DAWN_FOOT_N, DAWN_SHIN_F, DAWN_SHIN_N, DAWN_SLIT_F, DAWN_SLIT_N, DAWN_THIGH_F, DAWN_THIGH_N } from './items/aureliaBootsArt';
import { drawRig, frameCount } from './rig';
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

  it('has exactly two boots, each one piece, and her legs at their idle size, in every pose and frame', () => {
    // the owner, 2026-10-22: "tienes muy buggeada las piernas de aurelia en la mayoria de las poses": the far
    // boot was the narrow column he shows beside her front panel, a stick beside our far thigh once it moved
    const size = (layers: Map<Depth, Layer>, s: 'N' | 'F') => {
      const side = s === 'N' ? 'near' : 'far';
      const own = [`thigh${s}`, `shin${s}`, `foot${s}`] as PartId[];
      return {
        leg: pixels(layers, [`${side}Leg.body`, `${side}Leg.cloth`, `${side}Leg.feet`] as Depth[], own).size,
        bootThigh: pixels(layers, [`${side}Leg.feet`] as Depth[], [`thigh${s}`] as PartId[]).size,
      };
    };
    const idle = spriteLayers(look, 'idle', 0).layers;
    const rest = { N: size(idle, 'N'), F: size(idle, 'F') };
    let boots = 0;
    for (const [pose, fr] of frames()) {
      const { layers } = spriteLayers(look, pose, fr);
      const at = `${pose} ${fr}`;
      for (const s of ['N', 'F'] as const) {
        const side = s === 'N' ? 'near' : 'far';
        const boot = regions(pixels(layers, [`${side}Leg.feet`] as Depth[])).filter((n) => n >= 6);
        assert.equal(boot.length, 1, `${at}: one ${side} boot (${boot.join(', ')})`);
        boots++;
        // his pieces are rigid: the leg's pixels (thigh, shin and shoe, under and over each other at a bent
        // knee) and the boot's lace top piece stay about as many as at rest, never stretched or squashed;
        // a deeply bent knee adds the lace top's own cells turned through the bend (stampBent)
        const n = size(layers, s);
        const r = rest[s];
        assert.ok(n.leg >= r.leg * 0.8 && n.leg <= r.leg * 1.25, `${at}: the ${side} leg ${n.leg} pixels, ${r.leg} at rest`);
        assert.ok(n.bootThigh >= r.bootThigh * 0.9 && n.bootThigh <= r.bootThigh * 1.5, `${at}: the ${side} lace top ${n.bootThigh} pixels, ${r.bootThigh} at rest`);
      }
    }
    assert.ok(boots > 100);
  });

  it('draws her legs only from painted pieces: never our default leg, in every pose and frame', () => {
    // his bare woman's pieces (body.ts drawBaseBody), his boots and his bare thighs in the slits are painted
    // or flat; a leg drawn by our own shapes (legSpan, footDraw) would be of another kind
    for (const [pose, fr] of frames()) {
      const { layers, mats } = spriteLayers(look, pose, fr);
      for (const s of ['N', 'F'] as const) {
        const side = s === 'N' ? 'near' : 'far';
        const own = new Set([`thigh${s}`, `shin${s}`, `foot${s}`].map((p) => partIndex(p as PartId)));
        for (const d of [`${side}Leg.body`, `${side}Leg.cloth`, `${side}Leg.feet`] as Depth[]) {
          const L = layers.get(d);
          if (!L) continue;
          for (let i = 0; i < GRID * GRID; i++) {
            if (L.mat[i] < 0 || !own.has(L.part[i])) continue;
            const kind = mats.kinds[L.mat[i]];
            assert.ok(kind === 'painted' || kind === 'flat', `${pose} ${fr}: a ${kind} pixel of the ${side} leg at ${i % GRID},${(i / GRID) | 0}`);
          }
        }
      }
    }
  });

  it('gives the far boot its width under the front panel: as wide as his far shin, the lace top wider', () => {
    // at rest the panel hides all of it but his narrow column; moving, it is a whole boot
    const widths = (p: typeof DAWN_THIGH_F) => p.rows.map((r) => r.replace(/^\.+|\.+$/g, '').length).filter((n) => n > 0);
    for (const n of widths(DAWN_THIGH_F)) assert.ok(n >= 6, `a far lace top row ${n} wide`);
    // the shin from the knee to his row 83, where his own far shin starts to narrow to the ankle
    for (const n of widths(DAWN_SHIN_F).slice(0, 10)) assert.ok(n >= 6, `a far shin row ${n} wide`);
    const near = Math.max(...widths(DAWN_THIGH_N));
    assert.ok(Math.max(...widths(DAWN_THIGH_F)) >= near - 2);
  });

  it('lays his bare thighs in the slits where he drew them, with his shade, at rest', () => {
    const f = renderSprite(look, 'idle', 0);
    const r = drawRig('female', 'idle', 0);
    let n = 0;
    for (const [p, knee] of [[DAWN_SLIT_N, r.kneeN], [DAWN_SLIT_F, r.kneeF]] as const) {
      const ax = Math.floor(knee.x * RES) - p.pivot[0];
      const ay = Math.floor(knee.y * RES) - p.pivot[1];
      p.rows.forEach((row, j) =>
        [...row].forEach((ch, i) => {
          if (ch === '.') return;
          const k = ((ay + j) * GRID + ax + i) * 4;
          const want = [1, 3, 5].map((o) => parseInt(p.colors[ch].slice(o, o + 2), 16));
          // her skin is his lit skin within the JPEG's noise: his shades as far below it
          for (let c = 0; c < 3; c++) assert.ok(Math.abs(f.rgba[k + c] - want[c]) <= 8, `${ax + i},${ay + j}`);
          n++;
        }),
      );
    }
    assert.ok(n >= 25);
  });

  it('leaves no hole in her legs: no empty pixel with all four neighbours on them, in every pose and frame', () => {
    const legs = new Set(['thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF'].map((p) => partIndex(p as PartId)));
    for (const [pose, fr] of frames()) {
      const f = renderSprite(look, pose, fr);
      for (let y = 1; y < GRID - 1; y++)
        for (let x = 1; x < GRID - 1; x++) {
          const i = y * GRID + x;
          if (f.rgba[i * 4 + 3]) continue;
          const ns = [i - 1, i + 1, i - GRID, i + GRID];
          if (ns.every((j) => f.rgba[j * 4 + 3]) && ns.filter((j) => legs.has(f.part[j])).length >= 3) assert.fail(`${pose} ${fr}: a hole in her leg at ${x},${y}`);
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
