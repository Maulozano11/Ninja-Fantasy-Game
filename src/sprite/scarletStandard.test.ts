// Tests for the owner's Scarlet raised to the standard of his game-scale characters (Ren, Roman, Aiden):
// the reference painted again at our scale (tools/refs/scarlet_standard.py), and every Scarlet part cut
// from it. At rest the parts land on the reference's pixels; in every pose the figure stays whole. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite, type SpriteFrame } from './compose';
import type { Depth } from './ctx';
import { COAT_BODY, COAT_SLEEVE_UPPER_N } from './items/scarletCoatArt';
import { SCARLET_HAIR_FRONT } from './items/scarletHairArt';
import { NOBLE_HEAD } from './nobleHeadArt';
import { dojutsuToEye } from './legacy';
import { GRID, RES } from './raster';
import { frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpritePose } from './types';

const valen = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_scarlet')!.character;
const N = GRID * GRID;
const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;
const bit = (m: Uint8Array | undefined, i: number) => !!m && !!(m[i >> 3] & (1 << (i & 7)));

/** Our face anchor on the male at idle frame 0 (body.ts faceAnchor): his hair and head hang from it. */
const ANCHOR = [123, 139];

/** How many cells of a painted piece placed with its pivot at (ax, ay) show its own colour in a frame. */
function onPiece(f: SpriteFrame, piece: { rows: string[]; colors: Record<string, string>; pivot: [number, number] }, ax: number, ay: number, skip = (_x: number, _y: number) => false) {
  let same = 0;
  let all = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      const x = ax - piece.pivot[0] + i;
      const y = ay - piece.pivot[1] + j;
      if (skip(x, y)) continue;
      all++;
      if (opaque(f.rgba, y * GRID + x) && hex(f.rgba, y * GRID + x) === piece.colors[row[i]]) same++;
    }
  });
  return { same, all };
}

/** The pieces of a frame apart from the figure (8-connected), but effects. */
function loose(f: SpriteFrame): number[] {
  const seen = new Uint8Array(N);
  const pieces: { n: number; fx: boolean }[] = [];
  for (let i = 0; i < N; i++) {
    if (!opaque(f.rgba, i) || seen[i]) continue;
    const p = { n: 0, fx: false };
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      p.n++;
      if (bit(f.fx, j)) p.fx = true;
      const x = j % GRID;
      for (let dy = -GRID; dy <= GRID; dy += GRID)
        for (let dx = -1; dx <= 1; dx++) {
          const k = j + dy + dx;
          if (k < 0 || k >= N || x + dx < 0 || x + dx >= GRID || seen[k] || !opaque(f.rgba, k)) continue;
          seen[k] = 1;
          stack.push(k);
        }
    }
    pieces.push(p);
  }
  const main = pieces.reduce((m, p) => (p.n > m.n ? p : m), pieces[0]);
  return pieces.filter((p) => p !== main && !p.fx).map((p) => p.n);
}

describe('the Scarlet standard', () => {
  it('lands his coat, sleeves, hair and head on the painted reference at rest, every pixel', () => {
    const only = (depth: Depth) => renderSprite(valen.appearance!, 'idle', 0, 'none', { depths: new Set([depth]) });
    const coat = only('torso.armor');
    const neck = coat.rig.neck;
    // the coat's body (its skirts are stamped over its lowest rows)
    const body = onPiece(coat, COAT_BODY, Math.floor(neck.x * RES), Math.floor(neck.y * RES), (_x, y) => y >= 172);
    assert.ok(body.all > 300 && body.same === body.all, `coat body: ${body.same} of ${body.all}`);
    const sleeve = only('nearArm.armor');
    const sh = sleeve.rig.shoulderN;
    const up = onPiece(sleeve, COAT_SLEEVE_UPPER_N, Math.floor(sh.x * RES), Math.floor(sh.y * RES), (_x, y) => y >= 163);
    assert.ok(up.all > 40 && up.same === up.all, `near upper sleeve: ${up.same} of ${up.all}`);
    const hair = onPiece(only('hairFront'), SCARLET_HAIR_FRONT, ANCHOR[0], ANCHOR[1]);
    assert.ok(hair.all > 200 && hair.same === hair.all, `hair: ${hair.same} of ${hair.all}`);
    // his head (the eye shape draws the eyes on it, rows 139 to 142)
    const head = onPiece(only('head.body'), NOBLE_HEAD, ANCHOR[0], ANCHOR[1], (_x, y) => y >= 139 && y <= 142);
    assert.ok(head.all > 150 && head.same === head.all, `head: ${head.same} of ${head.all}`);
  });

  it('stays in one piece in every pose and frame on every body: no limb or piece of the coat apart', () => {
    const bad: string[] = [];
    for (const body of ['male', 'bulky', 'female'] as BodyType[]) {
      const look = { ...structuredClone(valen.appearance!), body };
      for (const pose of POSES) {
        const n = frameCount(rigPoseFor(pose, look.cast?.style, look.slots.held?.id));
        for (let f = 0; f < n; f++) {
          const specks = loose(renderSprite(look, pose, f, dojutsuToEye(valen.dojutsu)));
          if (specks.length) bad.push(`${body} ${pose} ${f}: ${specks.join(', ')} px apart`);
        }
      }
    }
    assert.deepEqual(bad, []);
  });
});
