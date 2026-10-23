// The sprite standard: the known errors (docs/SPRITE_STYLE_GUIDE.md, "Known errors — check every new
// character") looked for on every character, on every body, in every pose. npm test.
//
// The owner (2026-10-23, on Solen on the bulky body): "recuerda todos los errores de todos los personajes y
// verifica que este y los futuros no los tengan". Every legend preset, companion and enemy look, the
// default look, the owner's Roman set, his broad man (dressed and bare), each on the male, female and
// bulky bodies (where its clothes fit), every pose, one frame of each (picked by the look and the pose, so
// different looks cover different frames). Each frame is checked for the errors of glitches.ts: a piece
// loose from the figure, a pocket of background walled in between parts of the body, a crack of
// background between two parts that meet, a light pixel on the figure's edge.
//
// A new look must have none. Errors already on the looks of other branches, reported and not yet fixed
// there, are listed in REPORTED; ACCEPTED lists what the owner has accepted as drawn. To list what this
// test finds (to fill REPORTED after a fix elsewhere): STANDARD_LIST=1 npx tsx --test src/sprite/standard.test.ts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { enemyCharacter, type EnemyKind } from '../battle/units';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { COMPANIONS } from '../data/missions';
import { renderSprite } from './compose';
import { findGlitches, type Glitch } from './glitches';
import { defaultAppearance, dojutsuToEye, getAppearance } from './legacy';
import { frameCount, rigPoseFor } from './rig';
import { fitsBody, getItem } from './catalog';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type EyeSpecial, type SpriteAppearance, type SpritePose } from './types';

const BODIES: BodyType[] = ['male', 'female', 'bulky'];
const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];

/** The owner's Roman set (roman-owner-reference.jpg). */
function roman(body: BodyType): SpriteAppearance {
  const l = defaultAppearance();
  l.slots.armor = { id: 'armor_bronze', colors: [] };
  l.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes: 'on' } };
  l.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
  l.slots.feet = { id: 'feet_gladiator_sandals', colors: [], parts: { paint: 'roman' } };
  delete l.slots.top;
  delete l.slots.bottom;
  delete l.slots.cape;
  delete l.slots.held;
  return { ...l, body };
}

/** The owner's broad man (bulky-owner-reference.jpg) as he drew him, or bare (bulky-base-owner-reference.jpg). */
function broad(body: BodyType, bare = false): SpriteAppearance {
  const l = defaultAppearance();
  const hair = { id: 'hair_long_lock', colors: ['#f0cc74'] };
  return {
    ...l,
    body,
    skin: '#f2bd97',
    eyeShape: 'stern',
    faceShape: 'stern',
    eyeColor: '#5a4b32',
    headband: { ...l.headband, position: 'none' },
    slots: bare
      ? { hair }
      : {
          hair,
          top: { id: 'top_seam_shirt', colors: [] },
          bottom: { id: 'bottom_jeans', colors: [] },
          waist: { id: 'waist_brawler_belt', colors: [] },
          hands: { id: 'hands_brawler_bracers', colors: [] },
          feet: { id: 'feet_brawler_boots', colors: [] },
        },
  };
}

interface Look {
  id: string;
  look: SpriteAppearance;
  eye: EyeSpecial;
  /** The body the owner drew this look on: there its idle is his picture (only loose pieces looked for). */
  drawnOn: BodyType;
}

const LOOKS: Look[] = [];
{
  const seen = new Set<string>();
  const add = (id: string, look: SpriteAppearance, eye: EyeSpecial, drawnOn: BodyType) => {
    // a look whose clothes do not fit a body is not worn on it (the broad man's clothes on the female)
    if (Object.values(look.slots).some((c) => c && getItem(c.id) && !fitsBody(getItem(c.id)!, look.body))) return;
    const key = JSON.stringify(look) + eye;
    if (seen.has(key)) return;
    seen.add(key);
    LOOKS.push({ id: `${id}@${look.body}`, look, eye, drawnOn });
  };
  const own = (id: string, look: SpriteAppearance, eye: EyeSpecial) => {
    for (const body of [look.body, ...BODIES]) add(id, { ...look, body }, eye, look.body);
  };
  for (const p of LEGENDARY_PRESETS) own(p.character.id, p.character.appearance!, dojutsuToEye(p.character.dojutsu));
  for (const c of COMPANIONS) if (c.appearance) add(c.id, getAppearance(c), dojutsuToEye(c.dojutsu), getAppearance(c).body);
  for (const kind of ['rogue', 'hunter', 'jonin', 'raider'] as EnemyKind[])
    for (const n of [0, 1]) {
      const c = enemyCharacter(kind, n);
      if (c.appearance) add(`${kind}${n}`, getAppearance(c), dojutsuToEye(c.dojutsu), getAppearance(c).body);
    }
  for (const body of BODIES) add('default', { ...defaultAppearance(), body }, 'none', 'male');
  for (const body of BODIES) add('roman', roman(body), 'none', 'male');
  for (const body of ['male', 'bulky'] as BodyType[]) add('broad', broad(body), 'none', 'bulky');
  for (const body of ['male', 'bulky'] as BodyType[]) add('broad-bare', broad(body, true), 'none', 'bulky');
}

/** The frame of a pose a look is checked in: the same every run, different between looks. */
function frameOf(l: Look, pose: SpritePose): number {
  const n = frameCount(rigPoseFor(pose, l.look.cast?.style, l.look.stowed ? undefined : l.look.slots.held?.id));
  return createHash('sha1').update(`${l.id}|${pose}`).digest()[0] % n;
}

/**
 * What the owner has accepted as drawn, by look and pose ('*' any pose): the glitch kinds it may show.
 * (The detector already leaves out what he draws so: a gap inside one piece, beside the held weapon, a
 * lock of hair beside the face, a window between the legs, the light edge of a blade, our face and hands.)
 */
const ACCEPTED: Record<string, Partial<Record<Glitch['kind'], SpritePose[] | '*'>>> = {};

/**
 * Errors this test found on looks of other branches, reported and left to be fixed there (2026-10-23,
 * body/brawler-roman): look@body -> kind -> the poses it shows in. The male looks are the integration
 * branch's (the read pose body/male-skin-face's, the bare male body's too), the female ones the female
 * body's (body/female-v2). Remove an entry when its branch fixes it.
 */
const REPORTED: Record<string, Partial<Record<Glitch['kind'], SpritePose[]>>> = {
  'broad-bare@male': { pocket: ['idle', 'walk'] },
  'companion_kenji@male': { pocket: ['attack'] },
  'default@male': { pocket: ['run'] },
  'preset_ember@male': { pocket: ['tackle', 'combo'], crack: ['read'] },
  'preset_founder@male': { edge: ['hurt'], pocket: ['victory', 'charge', 'run'] },
  'preset_reference_aiden@male': { edge: ['attack', 'throw', 'combo', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed'], pocket: ['charge', 'train'] },
  'preset_storm@male': { pocket: ['hurt', 'victory', 'lean'], crack: ['read'] },
  'preset_sunburst@male': { pocket: ['walk'] },
  'rogue1@male': { pocket: ['throw', 'lean'], crack: ['victory'] },
  'roman@male': { pocket: ['walk'], edge: ['run', 'sit'] },
  'companion_hana@female': { pocket: ['charge', 'lean', 'train'] },
  'default@female': { pocket: ['idle'] },
  'hunter1@female': { pocket: ['attack', 'tackle', 'lean'] },
  'preset_ember@female': { pocket: ['charge'], crack: ['crouch', 'read'] },
  'preset_founder@female': { pocket: ['charge'] },
  'preset_night@female': { pocket: ['idle', 'victory', 'walk', 'downed'] },
  'preset_reference_aiden@female': { edge: ['attack', 'throw', 'combo', 'hurt', 'victory', 'run', 'crouch', 'downed'], pocket: ['pierce', 'train'] },
  'preset_storm@female': { pocket: ['victory', 'charge', 'downed', 'train'] },
  'preset_sunburst@female': { pocket: ['idle'] },
  'preset_warlord@female': { pocket: ['idle', 'hurt', 'charge', 'crouch', 'lean'], crack: ['read'] },
  'roman@female': { pocket: ['idle', 'walk'], edge: ['sit', 'read'] },
};

const allowed = (l: Look, pose: SpritePose, kind: Glitch['kind']) => {
  const a = ACCEPTED[l.id]?.[kind];
  return a === '*' || !!a?.includes(pose) || !!REPORTED[l.id]?.[kind]?.includes(pose);
};

describe('the sprite standard: the known errors on every character, body and pose', () => {
  const found: Record<string, Partial<Record<Glitch['kind'], Set<SpritePose>>>> = {};
  const failures: string[] = [];
  for (const l of LOOKS) {
    for (const pose of POSES) {
      const f = frameOf(l, pose);
      const fr = renderSprite(l.look, pose, f, l.eye);
      for (const g of findGlitches(fr, pose === 'idle' && l.look.body === l.drawnOn)) {
        ((found[l.id] ??= {})[g.kind] ??= new Set()).add(pose);
        if (!allowed(l, pose, g.kind)) failures.push(`${l.id} ${pose} ${f}: ${g.kind} of ${g.n} px at ${g.x},${g.y} (${g.parts.join('/')})`);
      }
    }
  }
  if (process.env.STANDARD_LIST) {
    const out = Object.fromEntries(Object.entries(found).map(([id, k]) => [id, Object.fromEntries(Object.entries(k).map(([kind, s]) => [kind, [...s!]]))]));
    console.log(JSON.stringify(out));
  }

  it('looks at every pose of every look on every body', () => {
    assert.ok(LOOKS.length >= 30, `${LOOKS.length} looks`);
    for (const body of BODIES) assert.ok(LOOKS.some((l) => l.look.body === body), body);
  });

  it('no piece loose, no white pocket or crack between parts, no light pixel on the edge (but what is reported or accepted)', () => {
    assert.deepEqual(failures, []);
  });

  it('the bulky body and the broad man have none at all (this branch fixed them)', () => {
    const ours = Object.entries(found).filter(([id]) => id.endsWith('@bulky') || id.startsWith('broad@'));
    assert.deepEqual(ours.filter(([id, k]) => Object.keys(k).some((kind) => !ACCEPTED[id]?.[kind as Glitch['kind']])).map(([id, k]) => `${id}: ${Object.keys(k).join(', ')}`), []);
  });
});
