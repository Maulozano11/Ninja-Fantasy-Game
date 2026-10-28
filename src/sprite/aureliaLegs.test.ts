// Aurelia's legs are whole once she moves: no pixel bitten out of their outline and none missing between
// their pieces, with and without her skirt (the owner, 2026-10-22: "veo unos errores de mordidas en las
// piernas en sin falda en correr 3 y 4 y en correr 6 sin falda faltan pixeles en las piernas corrige eso"),
// while her rest and her walk stay as approved ("en caminar esta bien esta hoja esta aprovada"): npm test.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { ALL_PRESETS } from '../data/shinobiData';
import { hexToRgb } from './color';
import { renderSprite, spriteLayers } from './compose';
import { DEPTHS, legDepth, type Side } from './ctx';
import { kneePit } from './items/aureliaBoots';
import { GRID, partIndex } from './raster';
import { frameCount } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const aurelia = ALL_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character.appearance!;
const noSkirt: SpriteAppearance = { ...aurelia, slots: Object.fromEntries(Object.entries(aurelia.slots).filter(([k]) => k !== 'skirt')) };
const LOOKS: [SpriteAppearance, string][] = [
  [noSkirt, 'without her skirt'],
  [aurelia, 'with her skirt'],
];

/** Every frame of every pose but those kept as drawn: her rest (his pixels) and her walk (approved). */
function* moving(): Generator<[SpritePose, number]> {
  for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[]) {
    if (pose === 'idle' || pose === 'walk') continue;
    for (let f = 0; f < frameCount(pose); f++) yield [pose, f];
  }
}

/**
 * The bites in her legs in one frame, as her figure shows them (every layer, the upright drawing even when
 * she lies down). A leg is the pixels its body, cloth and boot layers show; the background is where nothing
 * is drawn.
 * - a hole: a background pixel shut in on all four sides, three of them her legs;
 * - a bite: a background pixel cut into a leg, its three drawn neighbours her legs, two of them one leg;
 * - a notch: a dent a pixel deep and up to three wide in a leg's edge, the leg on both ends and all along
 *   behind it;
 * - an open pixel: a pixel of a leg on her outline that is not dark (her outline broken).
 * The leg's own shape is left out: the inside of a sharply bent knee (kneePit: the gap between thigh and shin
 * there is the knee's) and his shoe's arch between heel and sole (empty under the shoe alone).
 */
function bites(look: SpriteAppearance, pose: SpritePose, fr: number): string[] {
  const { layers, mats, rig } = spriteLayers(look, pose, fr);
  const N = GRID * GRID;
  const top = new Int16Array(N).fill(-1);
  const part = new Uint8Array(N);
  const dark = new Uint8Array(N);
  DEPTHS.forEach((depth, d) => {
    const L = layers.get(depth);
    if (!L || !L.used) return;
    L.applyOutline();
    for (let i = 0; i < N; i++) {
      if (L.mat[i] < 0) continue;
      top[i] = d;
      part[i] = L.part[i];
      const [r, g, b] = hexToRgb(mats.ramps[L.mat[i]][L.shade[i]]);
      dark[i] = r * 0.3 + g * 0.59 + b * 0.11 < 60 ? 1 : 0;
    }
  });
  const sideAt = new Map<number, Side>();
  for (const s of ['F', 'N'] as Side[]) for (const k of ['body', 'cloth', 'feet'] as const) sideAt.set(DEPTHS.indexOf(legDepth(s, k)), s);
  const legOf = (i: number) => sideAt.get(top[i]);
  const drawn = (i: number) => top[i] >= 0;
  const pits = {
    F: kneePit({ hip: rig.hipF, knee: rig.kneeF, ankle: rig.ankleF }),
    N: kneePit({ hip: rig.hipN, knee: rig.kneeN, ankle: rig.ankleN }),
  };
  const inPit = (s: Side, i: number) => pits[s]((i % GRID) + 0.5, ((i / GRID) | 0) + 0.5);
  const shoe = { F: partIndex('footF'), N: partIndex('footN') };
  const out: string[] = [];
  const at = (i: number) => `${i % GRID},${(i / GRID) | 0}`;
  for (let y = 4; y < GRID - 4; y++)
    for (let x = 4; x < GRID - 4; x++) {
      const i = y * GRID + x;
      const ns = [i - 1, i + 1, i - GRID, i + GRID];
      if (drawn(i)) {
        if (legOf(i) && !dark[i] && ns.some((j) => !drawn(j))) out.push(`an open pixel (no line) at ${at(i)}`);
        continue;
      }
      const legs = ns.filter((j) => legOf(j));
      const shut = ns.every(drawn);
      if (shut && legs.length >= 3) out.push(`a hole at ${at(i)}`);
      if (shut || legs.length !== 3 || ns.filter(drawn).length !== 3) continue;
      const s = (['F', 'N'] as Side[]).find((sd) => legs.filter((j) => legOf(j) === sd).length >= 2)!;
      if (inPit(s, i) || legs.every((j) => part[j] === shoe[legOf(j)!])) continue;
      out.push(`a bite at ${at(i)}`);
    }
  // notches, along rows then along columns
  for (const [du, dw] of [
    [1, GRID],
    [GRID, 1],
  ])
    for (let y = 6; y < GRID - 6; y++)
      for (let x = 6; x < GRID - 6; x++) {
        const i = y * GRID + x;
        if (drawn(i) || !legOf(i - du)) continue;
        const s = legOf(i - du)!;
        let n = 1;
        while (n <= 3 && !drawn(i + n * du)) n++;
        if (n > 3 || legOf(i + n * du) !== s) continue;
        const gap = Array.from({ length: n }, (_, k) => i + k * du);
        if (gap.some((j) => inPit(s, j)) || (part[i - du] === shoe[s] && part[i + n * du] === shoe[s])) continue;
        for (const o of [dw, -dw]) if (Array.from({ length: n + 2 }, (_, k) => i + (k - 1) * du - o).every((j) => legOf(j) === s)) out.push(`a notch ${n} wide at ${at(i)}`);
      }
  return out;
}

describe("Aurelia's legs", () => {
  it('show no bite, hole, notch or break in their outline once she moves, in every pose and frame, with and without her skirt', () => {
    let frames = 0;
    for (const [look, how] of LOOKS)
      for (const [pose, fr] of moving()) {
        frames++;
        const found = bites(look, pose, fr);
        assert.deepEqual(found, [], `${pose} ${fr + 1} (${how}): ${found.join('; ')}`);
      }
    assert.ok(frames > 120, `only ${frames} frames`);
  });

  // The owner approved her walk as it stood on 2026-10-22 (ae89802), every frame with and without her skirt,
  // and her rest is his picture: both stay pixel for pixel.
  it('keep her rest and her approved walk pixel for pixel', () => {
    const hash = (look: SpriteAppearance, pose: SpritePose, fr: number) => createHash('sha256').update(renderSprite(look, pose, fr).rgba).digest('hex').slice(0, 16);
    const got: Record<string, string> = {};
    for (const [look, how] of LOOKS)
      for (const pose of ['idle', 'walk'] as SpritePose[])
        for (let f = 0; f < frameCount(pose); f++) got[`${pose} ${f + 1} ${how === 'with her skirt' ? 'skirt' : 'bare'}`] = hash(look, pose, f);
    assert.deepEqual(got, APPROVED);
  });
});

/**
 * Her rest and walk frames as approved at ae89802 (sha256 of the frame's pixels, its first 16 hex digits), with
 * two of his later decisions in them: the 1-pixel holes closed for every character (holes.ts, "si arregla el
 * hueco de 1 pixel a todos": walk only, idle stays as drawn) and her head, neck and hair as he drew them
 * ("copia la forma de cara cuello y peinado pixel a pixel", 2026-10-23: aureliaHead.ts; her legs unchanged).
 */
const APPROVED: Record<string, string> = {
  'idle 1 bare': '78d596d157037e42',
  'idle 2 bare': '3cd737a6ea799137',
  'idle 3 bare': '86d7426bd49de764',
  'idle 4 bare': '66f1b48fb238a07c',
  'walk 1 bare': '32132a085e59984e',
  'walk 2 bare': 'ac33a5877705d339',
  'walk 3 bare': 'e279dd96f2d03d4f',
  'walk 4 bare': '29eadb7d6fe3ecc4',
  'walk 5 bare': '376ccd8bf0834e2a',
  'walk 6 bare': 'd105c64cfc2cf6c8',
  'walk 7 bare': '2e63f300f75b5b94',
  'walk 8 bare': '6c44b1782d00c006',
  'idle 1 skirt': '1d72ca9509229e91',
  'idle 2 skirt': '1ff8d5c5696f97c8',
  'idle 3 skirt': '578b949ac4d90672',
  'idle 4 skirt': '10fcf5525f168b01',
  'walk 1 skirt': 'f28c1fca5f5ff57a',
  'walk 2 skirt': 'd84d40535ee7adeb',
  'walk 3 skirt': '221bbd106b28fe75',
  'walk 4 skirt': '6c30223743a335f5',
  'walk 5 skirt': '78767ac618ea479c',
  'walk 6 skirt': '1084e0286a202dc6',
  'walk 7 skirt': '986a0ce8db21c218',
  'walk 8 skirt': 'da770b84151962ae',
};
