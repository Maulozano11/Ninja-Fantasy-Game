// Tests for the bulky body and the clothes from the owner's broad man (docs/reference/bulky-owner-reference.jpg):
// npm test.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { BULKY_FOREARM_F, BULKY_FOREARM_N, BULKY_SHOULDER_F, BULKY_SHOULDER_N, BULKY_SKIN_REST, BULKY_UPPER_ARM_F, BULKY_UPPER_ARM_N } from './bulkyBodyArt';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { refit, uprightPiece } from './fit';
import * as belt from './items/brawlerBeltArt';
import * as boots from './items/brawlerBootsArt';
import * as bracers from './items/brawlerBracersArt';
import * as jeans from './items/jeansArt';
import * as hair from './items/lockHairArt';
import * as shirt from './items/seamShirtArt';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { defaultAppearance } from './legacy';
import type { PaintedPiece } from './painted';
import { GRID, RES, Vec } from './raster';
import { drawRig, frameCount, rigPoseFor, type Rig } from './rig';
import { STERN_HEAD } from './sternFaceArt';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

/** The owner's broad man as he drew him, on a body. */
function his(body: BodyType, extra: Partial<SpriteAppearance> = {}): SpriteAppearance {
  const l = defaultAppearance();
  return {
    ...l,
    body,
    skin: '#f2bd97',
    eyeShape: 'stern',
    faceShape: 'stern',
    eyeColor: '#5a4b32',
    headband: { ...l.headband, position: 'none' },
    // No chakra or cast effects: only the figure is looked at.
    chakra: { ...l.chakra, onCharge: false, onCast: false, onVictory: false },
    cast: { style: 'signs' },
    slots: {
      hair: { id: 'hair_long_lock', colors: ['#f0cc74'] },
      top: { id: 'top_seam_shirt', colors: [] },
      bottom: { id: 'bottom_jeans', colors: [] },
      waist: { id: 'waist_brawler_belt', colors: [] },
      hands: { id: 'hands_brawler_bracers', colors: [] },
      feet: { id: 'feet_brawler_boots', colors: [] },
    },
    ...extra,
  };
}

const IDLE = drawRig('bulky', 'idle', 0);
const cell = (p: Vec, piece: PaintedPiece): [number, number] => [Math.floor(p.x * RES) - piece.pivot[0], Math.floor(p.y * RES) - piece.pivot[1]];
/** Our face template's anchor at rest (body.ts faceAnchor): where the face and hair pieces are pinned. */
const ANCHOR = { x: (Math.floor((IDLE.head.x - 1.9 * IDLE.bp.headScale) * RES) + 0.5) / RES, y: (Math.floor((IDLE.head.y + 1.0 * IDLE.bp.headScale) * RES) + 0.5) / RES };

describe("the owner's broad man at rest", () => {
  it('every piece lands where the script measured it on the bulky rig (his joints are our joints)', () => {
    const r: Rig = IDLE;
    const checks: [string, PaintedPiece, Vec, [number, number]][] = [
      ['BULKY_UPPER_ARM_N', BULKY_UPPER_ARM_N, r.shoulderN, BULKY_SKIN_REST.BULKY_UPPER_ARM_N],
      ['BULKY_SHOULDER_N', BULKY_SHOULDER_N, r.shoulderN, BULKY_SKIN_REST.BULKY_SHOULDER_N],
      ['BULKY_FOREARM_N', BULKY_FOREARM_N, r.elbowN, BULKY_SKIN_REST.BULKY_FOREARM_N],
      ['BULKY_UPPER_ARM_F', BULKY_UPPER_ARM_F, r.shoulderF, BULKY_SKIN_REST.BULKY_UPPER_ARM_F],
      ['BULKY_SHOULDER_F', BULKY_SHOULDER_F, r.shoulderF, BULKY_SKIN_REST.BULKY_SHOULDER_F],
      ['BULKY_FOREARM_F', BULKY_FOREARM_F, r.elbowF, BULKY_SKIN_REST.BULKY_FOREARM_F],
      ['SHIRT_TORSO', shirt.SHIRT_TORSO, r.neck, shirt.SHIRT_REST.SHIRT_TORSO],
      ['SHIRT_SLEEVE_N', shirt.SHIRT_SLEEVE_N, r.shoulderN, shirt.SHIRT_REST.SHIRT_SLEEVE_N],
      ['SHIRT_CAP_N', shirt.SHIRT_CAP_N, r.shoulderN, shirt.SHIRT_REST.SHIRT_CAP_N],
      ['SHIRT_SLEEVE_F', shirt.SHIRT_SLEEVE_F, r.shoulderF, shirt.SHIRT_REST.SHIRT_SLEEVE_F],
      ['SHIRT_CAP_F', shirt.SHIRT_CAP_F, r.shoulderF, shirt.SHIRT_REST.SHIRT_CAP_F],
      ['STEEL_BRACER_N', bracers.STEEL_BRACER_N, r.elbowN, bracers.BRACER_REST.STEEL_BRACER_N],
      ['STEEL_FIST_N', bracers.STEEL_FIST_N, r.wristN, bracers.BRACER_REST.STEEL_FIST_N],
      ['WRAP_BRACER_F', bracers.WRAP_BRACER_F, r.elbowF, bracers.BRACER_REST.WRAP_BRACER_F],
      ['WRAP_FIST_F', bracers.WRAP_FIST_F, r.wristF, bracers.BRACER_REST.WRAP_FIST_F],
      ['BELT_STRAPS', belt.BELT_STRAPS, r.pelvis, belt.BELT_REST.BELT_STRAPS],
      ['BELT_POUCH', belt.BELT_POUCH, r.pelvis, belt.BELT_REST.BELT_POUCH],
      ['BELT_KNIFE', belt.BELT_KNIFE, r.pelvis, belt.BELT_REST.BELT_KNIFE],
      ['JEANS_HIPS', jeans.JEANS_HIPS, r.pelvis, jeans.JEANS_REST.JEANS_HIPS],
      ['JEANS_THIGH_N', jeans.JEANS_THIGH_N, r.hipN, jeans.JEANS_REST.JEANS_THIGH_N],
      ['JEANS_SHIN_N', jeans.JEANS_SHIN_N, r.kneeN, jeans.JEANS_REST.JEANS_SHIN_N],
      ['JEANS_THIGH_F', jeans.JEANS_THIGH_F, r.hipF, jeans.JEANS_REST.JEANS_THIGH_F],
      ['JEANS_SHIN_F', jeans.JEANS_SHIN_F, r.kneeF, jeans.JEANS_REST.JEANS_SHIN_F],
      ['BOOT_N', boots.BOOT_N, r.ankleN, boots.BOOT_REST.BOOT_N],
      ['BOOT_F', boots.BOOT_F, r.ankleF, boots.BOOT_REST.BOOT_F],
      ['LOCK_HAIR_FRONT', hair.LOCK_HAIR_FRONT, ANCHOR, hair.LOCK_HAIR_REST.LOCK_HAIR_FRONT],
      ['LOCK_HAIR_LOCK', hair.LOCK_HAIR_LOCK, ANCHOR, hair.LOCK_HAIR_REST.LOCK_HAIR_LOCK],
    ];
    for (const [name, piece, at, rest] of checks) assert.deepEqual(cell(at, piece), rest, name);
    // His face hangs from the face anchor too (its pivot is his lash line's start).
    assert.deepEqual(cell(ANCHOR, STERN_HEAD), [126 - STERN_HEAD.pivot[0], 141 - STERN_HEAD.pivot[1]]);
  });

  it('in his colours his pieces show at rest as he drew them', () => {
    const f = renderSprite(his('bulky'), 'idle', 0);
    const hex = (i: number) => '#' + [0, 1, 2].map((k) => f.rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
    // Each shows in his colours where nothing of his lies over it (the boot's top goes on under the hem, the
    // shirt under the lock).
    for (const [piece, rest] of [
      [jeans.JEANS_SHIN_N, jeans.JEANS_REST.JEANS_SHIN_N],
      [boots.BOOT_N, boots.BOOT_REST.BOOT_N],
      [shirt.SHIRT_TORSO, shirt.SHIRT_REST.SHIRT_TORSO],
    ] as [PaintedPiece, [number, number]][]) {
      let hit = 0;
      let n = 0;
      piece.rows.forEach((row, j) =>
        [...row].forEach((ch, i) => {
          if (ch === '.') return;
          n++;
          if (hex((rest[1] + j) * GRID + rest[0] + i) === piece.colors[ch]) hit++;
        }),
      );
      assert.ok(hit / n > 0.7, `${hit}/${n}`);
    }
  });
});

describe('the other bodies are unchanged', () => {
  // Frames of the integration branch before the bulky rebuild (sha1 of the RGBA buffer).
  const PINNED: [BodyType, string, SpritePose, number, string][] = [
    ['male', 'default', 'idle', 0, '0e7daef9090c1425c069d3b872066c02b20a62a8'],
    ['male', 'preset_reference_aiden', 'attack', 1, 'fc7f8e09115839246c81b0b465dbfc1aa5c6a320'],
    ['male', 'preset_founder', 'run', 3, '887c77a246274ac6179b3565d54b7b8965b38182'],
    ['male', 'default', 'sit', 0, '544add88a0867679e1fa9dcb8265b33c1de32f21'],
    ['female', 'default', 'walk', 3, '75b83c19c8372cafe1064579d1cb364881fadf55'],
    ['female', 'preset_reference_aiden', 'throw', 2, '33d41606d71890ee99479738f73e2e2623235f03'],
    ['slender', 'default', 'cast', 0, '9b90c2c39509bd0d09b28c5f21c988093468ad02'],
    ['slender', 'preset_founder', 'downed', 0, 'c2f8c0a4a994462bf82ac88b90137b341f819c86'],
  ];
  it('male, female and slender frames are byte for byte what they were', () => {
    for (const [body, name, pose, frame, sha] of PINNED) {
      const base = name === 'default' ? defaultAppearance() : LEGENDARY_PRESETS.find((p) => p.character.id === name)!.character.appearance!;
      const f = renderSprite({ ...base, body }, pose, frame);
      assert.equal(createHash('sha1').update(f.rgba).digest('hex'), sha, `${body} ${name} ${pose} ${frame}`);
    }
  });
});

/** The opaque pixels' 8-connected groups of at least `min` pixels. */
function groups(rgba: Uint8ClampedArray, min = 3): number {
  const seen = new Uint8Array(GRID * GRID);
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (seen[i] || !rgba[i * 4 + 3]) continue;
    let size = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      size++;
      const x = j % GRID;
      const y = (j / GRID) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
          const k = yy * GRID + xx;
          if (!seen[k] && rgba[k * 4 + 3]) {
            seen[k] = 1;
            stack.push(k);
          }
        }
    }
    if (size >= min) n++;
  }
  return n;
}

describe('every pose', () => {
  const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
  it('his clothes render on the bulky and the male body in every pose and frame, in one piece', () => {
    for (const body of ['bulky', 'male'] as BodyType[]) {
      // Without the knife and the pouch, which hang loose on purpose.
      const look = his(body);
      look.slots.waist = { id: 'waist_brawler_belt', colors: [], parts: { pouch: 'off', knife: 'off' } };
      for (const pose of POSES) {
        const n = frameCount(rigPoseFor(pose, look.cast?.style, look.slots.held?.id));
        for (let f = 0; f < n; f++) {
          const fr = renderSprite(look, pose, f);
          assert.ok(groups(fr.rgba) <= 2, `${body} ${pose} ${f}: ${groups(fr.rgba)} separate pieces`);
        }
      }
    }
  });
});

describe('boots inside or outside the trousers', () => {
  it("the jeans tuck the boots in by default (his picture); 'out' draws the boots over the legs", () => {
    for (const feet of ['feet_brawler_boots', 'feet_shinobi']) {
      const tucked = his('bulky', {});
      tucked.slots.feet = { id: feet, colors: [] };
      const out = { ...tucked, slots: { ...tucked.slots, bottom: { id: 'bottom_jeans', colors: [], parts: { boots: 'out' } } } };
      const a = renderSprite(tucked, 'idle', 0).rgba;
      const b = renderSprite(out, 'idle', 0).rgba;
      assert.notDeepEqual(a, b, feet);
    }
    const jeansDef = getItem('bottom_jeans')!;
    assert.equal(jeansDef.parts![0].options[0].id, 'tucked');
  });
});

describe('fitting his pieces to another body', () => {
  it('only leaves out or repeats whole columns and rows of his: every colour stays one of his', () => {
    for (const [name, p] of Object.entries({ SHIRT_TORSO: shirt.SHIRT_TORSO, JEANS_SHIN_N: jeans.JEANS_SHIN_N, STEEL_BRACER_N: bracers.STEEL_BRACER_N })) {
      const f = refit(uprightPiece(p), { left: 0.7, right: 0.8, down: 1.3 }, `test ${name}`);
      const used = new Set(f.rows.join('').replace(/\./g, ''));
      for (const ch of used) assert.ok(ch in p.colors);
    }
  });
});
