// Saya on the owner's bare female body: two legs and two boots, each arm one piece with its hand, the
// near shoulder there, no part drawn twice and no edge left open, in every pose and frame of the female
// body (the owner, 2026-10-21, of the heroines on his body: "estas poniendo 3 piernas o 3
// botas", "sigue teniendo las manos separadas en arrojada", "en arrojada preparar falta el hombro"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite, spriteLayers } from './compose';
import type { Depth } from './ctx';
import { SHADE_FOOT_F, SHADE_FOOT_N, SHADE_SHIN_F, SHADE_SHIN_N, SHADE_THIGH_F, SHADE_THIGH_N } from './items/sayaLegsArt';
import { GRID, type Layer, partIndex, type PartId, RES } from './raster';
import { frameCount } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpritePose } from './types';

const saya = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_saya')!.character.appearance!;
const BODIES: BodyType[] = ['female'];

function* frames(): Generator<[BodyType, SpritePose, number]> {
  for (const body of BODIES) for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[]) for (let f = 0; f < frameCount(pose); f++) yield [body, pose, f];
}

const lookOn = (body: BodyType) => ({ ...saya, body });

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

const big = (px: Set<number>, min = 6) => regions(px).filter((n) => n >= min);

/** Collects every frame's failures, so one run lists them all. */
function failures() {
  const bad: string[] = [];
  return {
    check: (ok: boolean, msg: string) => void (ok || bad.push(msg)),
    done: () => assert.deepEqual(bad.slice(0, 40), [], `${bad.length} failures`),
  };
}

describe("Saya on the owner's bare female body", () => {
  it('has two legs and two boots, each leg one piece with its boot, in every pose and frame', () => {
    const T = failures();
    for (const [body, pose, fr] of frames()) {
      const { layers } = spriteLayers(lookOn(body), pose, fr);
      const at = `${body} ${pose} ${fr}`;
      for (const s of ['near', 'far'] as const) {
        const S = s === 'near' ? 'N' : 'F';
        const legs = [`${s}Leg.body`, `${s}Leg.cloth`, `${s}Leg.feet`, `${s}Leg.armor`] as Depth[];
        // her scabbard and the far sleeve hang on leg layers: only the leg's own parts count
        const leg = pixels(layers, legs, [`thigh${S}`, `shin${S}`, `foot${S}`] as PartId[]);
        T.check(big(leg).length === 1, `${at}: the ${s} leg in one piece (${regions(leg).join(', ')})`);
        const shoe = big(pixels(layers, legs, [`foot${S}`] as PartId[]));
        T.check(shoe.length === 1, `${at}: one ${s} shoe (${shoe.join(', ')})`);
      }
      const feet = big(pixels(layers, [...layers.keys()], ['footN', 'footF']));
      // two shoes in all: no shoe of one leg on the other's layers (two that touch, walking, read as one region)
      T.check(feet.length >= 1 && feet.length <= 2, `${at}: two shoes in all (${feet.join(', ')})`);
    }
    T.done();
  });

  it("carries no bare thigh on her leggings: the thighs above them are the body's own", () => {
    // A thigh painted on the legging rode the leg as it turned and stood off our thigh by the knee
    // (seated, drawing back to throw). Her leggings are cloth, red bands, her sole and her line only.
    for (const p of [SHADE_THIGH_N, SHADE_SHIN_N, SHADE_FOOT_N, SHADE_THIGH_F, SHADE_SHIN_F, SHADE_FOOT_F]) {
      for (const hex of Object.values(p.colors)) {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        const skin = r > 180 && r - b > 40 && r - g > 30 && g - b < 70;
        assert.ok(!skin, `${hex} is skin`);
      }
    }
  });

  it('keeps each hand on its arm and the near shoulder there, in every pose and frame', () => {
    const T = failures();
    for (const [body, pose, fr] of frames()) {
      const { layers, rig } = spriteLayers(lookOn(body), pose, fr);
      const at = `${body} ${pose} ${fr}`;
      for (const s of ['N', 'F'] as const) {
        const own = [`upperArm${s}`, `forearm${s}`, `hand${s}`] as PartId[];
        const depths = (s === 'N' ? ['nearArm.body', 'nearArm.cloth', 'nearArm.armor', 'nearArm.over'] : ['farArm.body', 'farArm.cloth', 'farArm.armor', 'farHand.front']) as Depth[];
        const arm = pixels(layers, depths, own);
        if (!pixels(layers, depths, [`hand${s}`] as PartId[]).size) continue;
        T.check(big(arm).length === 1, `${at}: the ${s === 'N' ? 'near' : 'far'} arm and hand in one piece (${regions(arm).join(', ')})`);
      }
      // the near shoulder: the upper arm (the body's, her bare shoulder or her guard) all round its joint
      const sx = Math.floor(rig.shoulderN.x * RES);
      const sy = Math.floor(rig.shoulderN.y * RES);
      const up = pixels(layers, ['nearArm.body', 'nearArm.armor'], ['upperArmN']);
      let round = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (up.has((sy + dy) * GRID + sx + dx)) round++;
      T.check(round >= 20, `${at}: the near shoulder's round (${round} of 25)`);
    }
    T.done();
  });

  it('draws no limb twice: each leg part is one piece, and no part has much more of it than at rest', () => {
    const T = failures();
    // A part drawn twice (her piece off the body's, or a second copy) is two pieces of it, or about
    // twice its pixels. (An arm's guards overlap where it folds, so an arm part may show in two.)
    const legs: PartId[] = ['thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF'];
    const parts: PartId[] = ['upperArmN', 'forearmN', 'handN', 'upperArmF', 'forearmF', 'handF', ...legs];
    for (const body of BODIES) {
      const rest = spriteLayers(lookOn(body), 'idle', 0).layers;
      const atRest = new Map(parts.map((p) => [p, pixels(rest, [...rest.keys()], [p]).size]));
      for (const [b, pose, fr] of frames()) {
        if (b !== body) continue;
        const { layers } = spriteLayers(lookOn(body), pose, fr);
        const all = [...layers.keys()].filter((d) => d !== 'top'); // 'top' holds a jutsu's sign over the hands
        for (const part of parts) {
          const px = pixels(layers, all, [part]);
          if (legs.includes(part)) {
            const r = big(px, 8);
            T.check(r.length <= 1, `${body} ${pose} ${fr}: ${part} drawn as ${r.length} pieces (${r.join(', ')})`);
          }
          // a hand round a weapon or book is a little bigger than his fist at rest
          const most = Math.max(atRest.get(part)! * 1.5, atRest.get(part)! + 30);
          T.check(px.size <= most, `${body} ${pose} ${fr}: ${part} has ${px.size} pixels (${atRest.get(part)} at rest)`);
        }
      }
    }
    T.done();
  });

  it('leaves no limb cut open: every edge of an arm or leg on the figure\'s outline is a line', () => {
    const T = failures();
    // At rest every pixel is his; moved, a pixel of a limb left on the figure's edge in a light colour
    // is a piece cut open (a body piece moved off the next, or a turn that lost his line).
    const limbs = new Set(['upperArmN', 'forearmN', 'handN', 'upperArmF', 'forearmF', 'handF', 'thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF'].map((p) => partIndex(p as PartId)));
    for (const [body, pose, fr] of frames()) {
      if (pose === 'cast') continue; // cast effects sit over the hands
      const f = renderSprite(lookOn(body), pose, fr);
      const op = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && f.rgba[(y * GRID + x) * 4 + 3] > 0;
      // the empty round the figure (not a gap the arms or the legs close in)
      const outside = new Uint8Array(GRID * GRID);
      const stack: number[] = [0];
      outside[0] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        const x = i % GRID;
        const y = (i / GRID) | 0;
        for (const [X, Y] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (X < 0 || Y < 0 || X >= GRID || Y >= GRID || op(X, Y) || outside[Y * GRID + X]) continue;
          outside[Y * GRID + X] = 1;
          stack.push(Y * GRID + X);
        }
      }
      const out = (x: number, y: number) => !!outside[y * GRID + x];
      const open: string[] = [];
      for (let y = 1; y < GRID - 1; y++) {
        for (let x = 1; x < GRID - 1; x++) {
          const i = y * GRID + x;
          if (!op(x, y) || !limbs.has(f.part[i]) || Math.max(f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2]) < 110) continue;
          if (out(x + 1, y) || out(x - 1, y) || out(x, y + 1) || out(x, y - 1)) open.push(`${x},${y}`);
        }
      }
      // a few single pixels: the end of one of her red bands or a lit knuckle a turn leaves on the edge
      // (a piece cut open is a run of them)
      T.check(open.length <= 8, `${body} ${pose} ${fr}: open edge at ${open.join(' ')}`);
    }
    T.done();
  });
});
