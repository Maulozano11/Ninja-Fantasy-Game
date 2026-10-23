// Tests for the bulky body and the clothes from the owner's broad man (docs/reference/bulky-owner-reference.jpg):
// npm test.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { BULKY_BASE, BULKY_BASE_KIND, BULKY_BASE_REST, BULKY_BASE_SKIN } from './bulkyBaseArt';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { limbRefit, refit } from './fit';
import * as belt from './items/brawlerBeltArt';
import * as boots from './items/brawlerBootsArt';
import * as bracers from './items/brawlerBracersArt';
import * as jeans from './items/jeansArt';
import * as hair from './items/lockHairArt';
import * as shirt from './items/seamShirtArt';
import * as shirtMale from './items/seamShirtMaleArt';
import * as cuirass from './items/bronzeCuirassArt';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { defaultAppearance } from './legacy';
import type { PaintedPiece } from './painted';
import { GRID, PARTS, RES, Vec } from './raster';
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
      ['BASE_CHEST', BULKY_BASE.chest, r.neck, BULKY_BASE_REST.BASE_CHEST],
      ['BASE_PELVIS', BULKY_BASE.pelvis, r.pelvis, BULKY_BASE_REST.BASE_PELVIS],
      ['BASE_UPPER_ARM_N', BULKY_BASE.upperArmN, r.shoulderN, BULKY_BASE_REST.BASE_UPPER_ARM_N],
      ['BASE_FOREARM_N', BULKY_BASE.forearmN, r.elbowN, BULKY_BASE_REST.BASE_FOREARM_N],
      ['BASE_HAND_N', BULKY_BASE.handN, r.wristN, BULKY_BASE_REST.BASE_HAND_N],
      ['BASE_UPPER_ARM_F', BULKY_BASE.upperArmF, r.shoulderF, BULKY_BASE_REST.BASE_UPPER_ARM_F],
      ['BASE_FOREARM_F', BULKY_BASE.forearmF, r.elbowF, BULKY_BASE_REST.BASE_FOREARM_F],
      ['BASE_HAND_F', BULKY_BASE.handF, r.wristF, BULKY_BASE_REST.BASE_HAND_F],
      ['BASE_THIGH_N', BULKY_BASE.thighN, r.hipN, BULKY_BASE_REST.BASE_THIGH_N],
      ['BASE_SHIN_N', BULKY_BASE.shinN, r.kneeN, BULKY_BASE_REST.BASE_SHIN_N],
      ['BASE_FOOT_N', BULKY_BASE.footN, r.ankleN, BULKY_BASE_REST.BASE_FOOT_N],
      ['BASE_THIGH_F', BULKY_BASE.thighF, r.hipF, BULKY_BASE_REST.BASE_THIGH_F],
      ['BASE_SHIN_F', BULKY_BASE.shinF, r.kneeF, BULKY_BASE_REST.BASE_SHIN_F],
      ['BASE_FOOT_F', BULKY_BASE.footF, r.ankleF, BULKY_BASE_REST.BASE_FOOT_F],
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

/** His bare broad man: only the hair (the head is ours, his face), no clothes. */
const bare = (body: BodyType = 'bulky', skin = BULKY_BASE_SKIN, slots: Partial<SpriteAppearance['slots']> = {}): SpriteAppearance => ({
  ...his(body),
  skin,
  slots: { hair: { id: 'hair_long_lock', colors: ['#f0cc74'] }, ...slots },
});

/** The pieces of his bare body, the joint each is pinned to, back to front as bulkyBody.ts draws them. */
const BASE_ORDER: [keyof typeof BULKY_BASE, keyof Rig][] = [
  ['upperArmF', 'shoulderF'], ['forearmF', 'elbowF'], ['handF', 'wristF'],
  ['thighF', 'hipF'], ['shinF', 'kneeF'], ['footF', 'ankleF'], ['pelvis', 'pelvis'],
  ['thighN', 'hipN'], ['shinN', 'kneeN'], ['footN', 'ankleN'], ['chest', 'neck'],
  ['upperArmN', 'shoulderN'], ['forearmN', 'elbowN'], ['handN', 'wristN'],
];

/** The 8-connected regions of a set of pixel indices. */
function regions(px: Set<number>): number {
  const seen = new Set<number>();
  let n = 0;
  for (const s of px) {
    if (seen.has(s)) continue;
    n++;
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const i = stack.pop()!;
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
  }
  return n;
}

describe("the owner's bare broad man (the bulky body)", () => {
  it('is his picture at rest, every pixel of his body below the head, in his skin', () => {
    const r: Rig = IDLE;
    const want = new Map<number, string>();
    for (const [k, j] of BASE_ORDER) {
      const p = BULKY_BASE[k];
      const [ox, oy] = cell(r[j] as Vec, p);
      p.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && want.set((oy + y) * GRID + ox + x, p.colors[ch])));
    }
    const f = renderSprite(bare(), 'idle', 0);
    const hex = (i: number) => '#' + [0, 1, 2].map((c) => f.rgba[i * 4 + c].toString(16).padStart(2, '0')).join('');
    let n = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (!f.rgba[i * 4 + 3] || PARTS[f.part[i]] === 'head') continue;
      // His long lock lies over his chest: it is the hair's.
      if (f.hair && f.hair[i >> 3] & (1 << (i & 7))) continue;
      assert.ok(want.has(i), `pixel ${i % GRID}, ${(i / GRID) | 0} is not his`);
      assert.equal(hex(i), want.get(i), `pixel ${i % GRID}, ${(i / GRID) | 0}`);
      n++;
    }
    assert.ok(n > 2000, `${n} pixels compared`);
  });

  it('keeps every limb whole in every pose and frame: two legs with their feet, two arms with their hands', () => {
    const px = (f: ReturnType<typeof renderSprite>, parts: string[]) => {
      const idx = new Set(parts.map((p) => PARTS.indexOf(p as never)));
      const out = new Set<number>();
      for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3] && idx.has(f.part[i])) out.add(i);
      return out;
    };
    const touch = (a: Set<number>, b: Set<number>) => [...a].some((i) => [-1, 1, -GRID, GRID, -GRID - 1, -GRID + 1, GRID - 1, GRID + 1].some((d) => b.has(i + d)));
    for (const [k, f] of frames(bare())) {
      // Every part there, each joint closed (the parts either side of it touch) and below the knee the shin
      // and foot one piece; the far leg and arm only there, the near leg and the torso can hide any of them.
      for (const s of ['N', 'F']) {
        const [thigh, shin, foot] = [`thigh${s}`, `shin${s}`, `foot${s}`].map((p) => px(f, [p]));
        assert.ok(shin.size + foot.size > 0, `${k}: the ${s} leg`);
        if (s === 'F') continue;
        assert.ok(thigh.size && shin.size && foot.size, `${k}: the near leg's parts`);
        // (a knee raised in front can lie under his briefs: the shin then meets them)
        assert.ok((touch(thigh, shin) || touch(px(f, ['torso']), shin)) && touch(shin, foot), `${k}: the ${s} knee and ankle closed`);
        assert.equal(regions(px(f, ['shinN', 'footN'])), 1, `${k}: the near shin and foot in one piece`);
      }
      for (const s of ['N']) {
        const [up, fore, hand] = [`upperArm${s}`, `forearm${s}`, `hand${s}`].map((p) => px(f, [p]));
        assert.ok(up.size && fore.size && hand.size, `${k}: the near arm's parts`);
        assert.ok(touch(up, fore) && touch(fore, hand), `${k}: the near elbow and wrist closed`);
        assert.equal(regions(px(f, ['upperArmN', 'forearmN', 'handN'])), 1, `${k}: the near arm and hand in one piece`);
      }
      // each foot once: no more of it than his piece (with its cap over his ankle) and the few pixels a
      // closed seam beside it takes (compose.ts closeSeams); a second foot would be twice as many
      for (const s of ['N', 'F'] as const) {
        const foot = BULKY_BASE[`foot${s}`];
        const most = foot.rows.join('').replace(/\./g, '').length;
        let got = 0;
        for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3] && PARTS[f.part[i]] === `foot${s}`) got++;
        assert.ok(got <= most + 6, `${k}: the ${s} foot drawn once (${got} of ${most})`);
      }
    }
  });

  it("his boxer briefs take the briefs item's colour, and his jeans cover them", () => {
    const grey = renderSprite(bare(), 'idle', 0);
    const blue = renderSprite(bare('bulky', BULKY_BASE_SKIN, { bottom: { id: 'bottom_boxer_briefs', colors: ['#2b4c8c'] } }), 'idle', 0);
    const own = renderSprite(bare('bulky', BULKY_BASE_SKIN, { bottom: { id: 'bottom_boxer_briefs', colors: [] } }), 'idle', 0);
    assert.deepEqual(own.rgba, grey.rgba, 'in its own colour the item is his briefs');
    let changed = 0;
    for (let i = 0; i < GRID * GRID; i++) if (grey.rgba[i * 4] !== blue.rgba[i * 4] || grey.rgba[i * 4 + 2] !== blue.rgba[i * 4 + 2]) changed++;
    assert.ok(changed > 150, `${changed} pixels of the briefs recoloured`);
    // under the jeans no pixel of his briefs' colours shows
    const briefs = new Set(Object.entries(BULKY_BASE_KIND).filter(([, k]) => k === 'cloth').map(([h]) => h));
    const dressed = renderSprite(his('bulky'), 'idle', 0);
    const shown = [...Array(GRID * GRID).keys()].filter((i) => dressed.rgba[i * 4 + 3] && PARTS[dressed.part[i]] === 'torso' && briefs.has('#' + [0, 1, 2].map((c) => dressed.rgba[i * 4 + c].toString(16).padStart(2, '0')).join('')));
    assert.deepEqual(shown, []);
  });
});

describe('the other bodies are unchanged', () => {
  // Frames with the integration branch and body/male-skin-face (the Roman's skin on the male) merged in
  // (sha1 of the RGBA buffer); the female ones are the integration branch's own, byte for byte.
  const PINNED: [BodyType, string, SpritePose, number, string][] = [
    ['male', 'default', 'idle', 0, '62337f02cc29dbfd3eaa1c80fffd8e22c039c535'],
    ['male', 'preset_reference_aiden', 'attack', 1, '432511738c2d728185d2e8d8c4b7f3615407421f'],
    ['male', 'preset_founder', 'run', 3, '8a8e42a06e724ebe63414725cb1365d2693455a2'],
    ['male', 'default', 'sit', 0, '40f7e5a7e74aaf803f6a9dfb6b0be414a1bcadeb'],
    ['female', 'default', 'walk', 3, 'c71b371beba31db791f6cc1e8e82a6c80fdc964c'],
    ['female', 'preset_reference_aiden', 'throw', 2, '7b413fc24f3a1a81f0de8b6ef8c64a5467125a99'],
    ['female', 'default', 'cast', 0, 'b57a8d0369a49d5a0e8f17caa34d5e5447254eb6'],
    ['female', 'preset_founder', 'downed', 0, '123e04f18944ac9c22e35bf39439c5045c0c2979'],
  ];
  it('male and female frames are byte for byte what they were', () => {
    for (const [body, name, pose, frame, sha] of PINNED) {
      const base = name === 'default' ? defaultAppearance() : LEGENDARY_PRESETS.find((p) => p.character.id === name)!.character.appearance!;
      const f = renderSprite({ ...base, body }, pose, frame);
      assert.equal(createHash('sha1').update(f.rgba).digest('hex'), sha, `${body} ${name} ${pose} ${frame}`);
    }
  });
});

/** Luminance (0-255) of pixel i. */
const lum = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114;
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;
/** Light enough to show white against the background (his jeans' greys and whites, his silver seams, skin). */
const LIGHT = 150;

/** The opaque pixels' 8-connected groups (every size: a single loose pixel counts). */
function groups(rgba: Uint8ClampedArray): number {
  const seen = new Uint8Array(GRID * GRID);
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (seen[i] || !opaque(rgba, i)) continue;
    n++;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % GRID;
      const y = (j / GRID) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
          const k = yy * GRID + xx;
          if (!seen[k] && opaque(rgba, k)) {
            seen[k] = 1;
            stack.push(k);
          }
        }
    }
  }
  return n;
}

/**
 * What is not checked for loose light pixels: the head (our face and hair) and the hands (our hand
 * pictures, his fists), and his far forearm, whose white wrappings run white to their edge and part
 * between their turns as he drew them.
 */
const NOT_CHECKED = new Set(['none', 'head', 'handN', 'handF', 'forearmF', 'held'].map((p) => PARTS.indexOf(p as never)));

/**
 * The glitches the owner saw ("tienes pixeles blancos y cortados"), as positions 'x,y':
 * - edge: a light pixel of the clothes on the figure's edge (next to the background): a piece cut where
 *   his figure went on, or a turn that stepped past his line;
 * - lone: a light pixel with nothing round it but darker pixels or the background (a seam or a band a
 *   turn has broken into dots, our skin showing through his line);
 * - hole: a pixel of background inside light clothes (all four neighbours opaque, two of them light),
 *   as between two pieces that no longer meet.
 */
function glitches(f: { rgba: Uint8ClampedArray; part: Uint8Array }): { edge: string[]; lone: string[]; hole: string[] } {
  const { rgba, part } = f;
  const at = (i: number) => `${i % GRID},${(i / GRID) | 0}`;
  const out = { edge: [] as string[], lone: [] as string[], hole: [] as string[] };
  const N4 = [-1, 1, -GRID, GRID];
  const N8 = [...N4, -GRID - 1, -GRID + 1, GRID - 1, GRID + 1];
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      if (!opaque(rgba, i) && !opaque(rgba, i - 1) && !opaque(rgba, i + 1)) continue;
      const n4 = N4.map((d) => i + d);
      const n8 = N8.map((d) => i + d);
      if (!opaque(rgba, i)) {
        if (n4.every((j) => opaque(rgba, j)) && n4.filter((j) => lum(rgba, j) > 110).length >= 2 && !n8.some((j) => NOT_CHECKED.has(part[j]))) out.hole.push(at(i));
        continue;
      }
      if (lum(rgba, i) <= LIGHT || NOT_CHECKED.has(part[i])) continue;
      if (n4.some((j) => !opaque(rgba, j))) out.edge.push(at(i));
      if (n8.every((j) => !opaque(rgba, j) || (lum(rgba, j) < 60 && !NOT_CHECKED.has(part[j])))) out.lone.push(at(i));
    }
  }
  return out;
}

/** Every pose's every frame on a body, his clothes as he drew them (pouch and knife on). */
const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
function* frames(look: SpriteAppearance, poses: readonly SpritePose[] = POSES, firstOnly = false): Generator<[string, ReturnType<typeof renderSprite>]> {
  for (const pose of poses) {
    const n = firstOnly ? 1 : frameCount(rigPoseFor(pose, look.cast?.style, look.slots.held?.id));
    for (let f = 0; f < n; f++) yield [`${look.body} ${pose} ${f}`, renderSprite(look, pose, f)];
  }
}

/** The jeans in the colours the owner was shown (his grey, denim blue, black, sand, red) and the boots out. */
const VARIANTS: [string, Partial<SpriteAppearance['slots']>][] = [
  ['blue', { bottom: { id: 'bottom_jeans', colors: ['#3f6fb0'] } }],
  ['black', { bottom: { id: 'bottom_jeans', colors: ['#3a3a44'] } }],
  ['sand', { bottom: { id: 'bottom_jeans', colors: ['#d8c89a'] } }],
  ['red', { bottom: { id: 'bottom_jeans', colors: ['#c0453a'] } }],
  ['boots out', { bottom: { id: 'bottom_jeans', colors: [], parts: { boots: 'out' } } }],
];

describe('every pose, every frame', () => {
  // Rendered once: both bodies, every frame as he dressed him; each variant on the first frame of the
  // poses that bend the legs and swing the arms most.
  const all: [string, ReturnType<typeof renderSprite>, ReturnType<typeof glitches>][] = [];
  for (const body of ['bulky', 'male'] as BodyType[]) {
    for (const [k, f] of frames(his(body))) all.push([k, f, glitches(f)]);
    for (const [name, slots] of VARIANTS)
      for (const [k, f] of frames({ ...his(body), slots: { ...his(body).slots, ...slots } }, ['idle', 'walk', 'run', 'attack', 'throw', 'crouch'], true)) all.push([`${k} (${name})`, f, glitches(f)]);
  }
  // and his bare broad man, every frame
  for (const [k, f] of frames(bare('bulky', '#f2bd97'))) all.push([`${k} (bare)`, f, glitches(f)]);

  it('is one figure: no piece loose from the body, the pouch and the knife hanging on at their straps', () => {
    for (const [k, f] of all) assert.equal(groups(f.rgba), 1, k);
  });

  it('shows no light pixel of his clothes on the figure edge where a piece was cut or turned', () => {
    for (const [k, , g] of all) assert.deepEqual(g.edge, [], k);
  });

  it('leaves no light pixel alone among dark ones (no white dots)', () => {
    for (const [k, , g] of all) assert.deepEqual(g.lone, [], k);
  });

  it('opens no hole of background inside his light clothes', () => {
    for (const [k, , g] of all) assert.deepEqual(g.hole, [], k);
  });

  it('the bulky body dressed at rest is pinned: his clothes as he drew them on his bare body', () => {
    // Every pixel of his clothes is where and as he drew it; the bare upper arms between the sleeves and
    // the bracers are his bare body's (bulky-base-owner-reference.jpg).
    const f = renderSprite(his('bulky'), 'idle', 0);
    assert.equal(createHash('sha1').update(f.rgba).digest('hex'), 'efd752489ece1ee928ada887a7732c2d957e6728');
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
      for (const f of [refit(p, { left: 0.7, right: 0.8, down: 1.3 }, `test ${name}`), limbRefit(p, 0.8, 1.3, `test ${name}`)]) {
        const used = new Set(f.rows.join('').replace(/\./g, ''));
        for (const ch of used) assert.ok(ch in p.colors);
      }
    }
  });

  it('a limb piece keeps its angle and its rows: each row is one of his, moved across whole', () => {
    // His steel bracer, drawn slanting (59 degrees): narrowed, each row of the fit is a row of his with
    // columns left out, never a row resampled.
    const p = bracers.STEEL_BRACER_N;
    const f = limbRefit(p, 0.8, 1, 'test rows');
    assert.equal(f.angle, p.angle);
    assert.equal(f.rows.length, p.rows.length);
    for (let j = 0; j < f.rows.length; j++) {
      const mine = f.rows[j].replace(/\./g, '');
      const his = p.rows[j].replace(/\./g, '');
      // A subsequence of his row: his pixels in his order.
      let k = 0;
      for (const ch of his) if (ch === mine[k]) k++;
      assert.equal(k, mine.length, `row ${j}`);
    }
  });

  it('on the normal male his clothes cover the body: no bare torso or hip shows past them', () => {
    // At rest the shirt covers the male's torso below the collar and the jeans his hips and legs: no pixel
    // there is still the bare body's (our skin or briefs showing past his clothes).
    const f = renderSprite(his('male'), 'idle', 0);
    const bare = renderSprite({ ...his('male'), slots: { hair: his('male').slots.hair } }, 'idle', 0);
    const collar = Math.floor(f.rig.neck.y * RES) + 2;
    let skin = 0;
    for (let i = collar * GRID; i < GRID * GRID; i++) {
      if (!opaque(f.rgba, i) || !opaque(bare.rgba, i)) continue;
      // Same colour as the bare body at a torso, hip or leg pixel: the body shows through.
      const p = PARTS[f.part[i]];
      if (!['torso', 'pelvis', 'thighN', 'thighF', 'shinN', 'shinF'].includes(p)) continue;
      if ([0, 1, 2].every((c) => f.rgba[i * 4 + c] === bare.rgba[i * 4 + c])) skin++;
    }
    assert.equal(skin, 0);
  });
});

describe("his shirt on the normal male, in the Roman's style", () => {
  // The owner (2026-10-23): "copia el estilo que tiene romano y pasa los colores de pixel a ese y pasa los
  // brazos de romano a ese" (tools/refs/seam-shirt-male-from-ref.py).
  const pieces: [string, PaintedPiece, PaintedPiece][] = [
    ['SHIRT_MALE_CHEST', shirtMale.SHIRT_MALE_CHEST, cuirass.CUIRASS_CHEST],
    ['SHIRT_MALE_GUARD_N', shirtMale.SHIRT_MALE_GUARD_N, cuirass.CUIRASS_GUARD_N],
    ['SHIRT_MALE_GUARD_F', shirtMale.SHIRT_MALE_GUARD_F, cuirass.CUIRASS_GUARD_F],
  ];

  it("each piece is the Roman's piece cell for cell, hung where his hangs, his black line where he drew it", () => {
    for (const [name, mine, his] of pieces) {
      assert.deepEqual(shirtMale.SHIRT_MALE_REST[name], cuirass.CUIRASS_REST[name.replace('SHIRT_MALE', 'CUIRASS')], name);
      assert.deepEqual(mine.pivot, his.pivot, name);
      assert.equal(mine.angle, his.angle, name);
      assert.equal(mine.rows.length, his.rows.length, name);
      mine.rows.forEach((row, j) => {
        assert.equal(row.length, his.rows[j].length, `${name} row ${j}`);
        for (let i = 0; i < row.length; i++) {
          assert.equal(row[i] === '.', his.rows[j][i] === '.', `${name} ${i},${j}`);
          if (row[i] === '.') continue;
          const line = cuirass.CUIRASS_KIND[his.colors[his.rows[j][i]]] === 'line';
          assert.equal(shirtMale.SHIRT_MALE_KIND[mine.colors[row[i]]] === 'line', line, `${name} ${i},${j}: his line stays his line`);
          if (line) assert.equal(mine.colors[row[i]], his.colors[his.rows[j][i]], `${name} ${i},${j}`);
        }
      });
    }
  });

  it("every other colour is one of his shirt's (within 3, as the converters pack his colours)", () => {
    const his = [...new Set([shirt.SHIRT_TORSO, shirt.SHIRT_SLEEVE_N, shirt.SHIRT_SLEEVE_F, shirt.SHIRT_CAP_N, shirt.SHIRT_CAP_F].flatMap((p) => Object.values(p.colors)))].map(hexRgb);
    for (const [name, mine] of pieces)
      for (const hex of Object.values(mine.colors)) {
        if (shirtMale.SHIRT_MALE_KIND[hex] === 'line') continue;
        const c = hexRgb(hex);
        assert.ok(
          his.some((h) => h.every((v, k) => Math.abs(v - c[k]) <= 3)),
          `${name} ${hex}`,
        );
      }
  });

  it("below the guards the arms are the male's own bare arms, in the Roman's skin", () => {
    // At rest every pixel of the upper arms is the bare male's or the shirt's guard over it: no sleeve of
    // the broad man's refitted, no arm of ours cut away under it.
    const dressed = renderSprite(his('male'), 'idle', 0);
    const bare = renderSprite({ ...his('male'), slots: { ...his('male').slots, top: undefined } }, 'idle', 0);
    const guard = new Set([shirtMale.SHIRT_MALE_GUARD_N, shirtMale.SHIRT_MALE_GUARD_F].flatMap((p) => Object.values(p.colors)).map((h) => h.toLowerCase()));
    const hexAt = (i: number) => '#' + [0, 1, 2].map((c) => dressed.rgba[i * 4 + c].toString(16).padStart(2, '0')).join('');
    const isArm = (i: number) => ['upperArmN', 'upperArmF'].includes(PARTS[dressed.part[i]]);
    // Below the guards (and the row or two of his skin shading under their lower edge): the bare male's arm.
    let below = 0;
    for (let i = 0; i < GRID * GRID; i++) if (isArm(i) && guard.has(hexAt(i))) below = Math.max(below, ((i / GRID) | 0) + 3);
    let arm = 0;
    for (let i = below * GRID; i < GRID * GRID; i++) {
      if (!isArm(i)) continue;
      assert.ok(!guard.has(hexAt(i)), `guard pixel below the guards at ${i % GRID},${(i / GRID) | 0}`);
      assert.ok([0, 1, 2, 3].every((c) => dressed.rgba[i * 4 + c] === bare.rgba[i * 4 + c]), `upper arm pixel ${i % GRID},${(i / GRID) | 0}`);
      arm++;
    }
    assert.ok(arm > 12, `${arm} bare upper arm pixels`);
  });

  it('the bulky body keeps his own shirt (seamShirtArt.ts), unchanged', () => {
    const f = renderSprite(his('bulky'), 'idle', 0);
    assert.equal(createHash('sha1').update(f.rgba).digest('hex'), 'efd752489ece1ee928ada887a7732c2d957e6728');
  });
});

function hexRgb(h: string): number[] {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}
