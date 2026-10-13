// The Hydra, boss of the first mission: a body in the water and seven heads, each a separate target
// with its own HP and attacks (bite, venom spit, roar). A head at 0 HP is cut off and grows back
// after two of its turns unless the stump is burned, electrified or blown up (combat.ts, turns.ts).

import type { Difficulty } from '../types/mission';
import type { Pt, Unit } from './types';

export const HYDRA_HEADS = 7;
export const HYDRA_ID = 'hydra';

/** Where each head rises, from the body's position (meters across and in depth). */
export const HEAD_OFFSETS: Pt[] = [
  { x: -2.6, z: 0.3 },
  { x: -1.8, z: 0.8 },
  { x: -0.9, z: 1.1 },
  { x: 0, z: 1.25 },
  { x: 0.9, z: 1.1 },
  { x: 1.8, z: 0.8 },
  { x: 2.6, z: 0.3 },
];

const STATS = { str: 20, dex: 12, con: 20, int: 3, wis: 12, cha: 8 };

function beast(id: string, name: string, pos: Pt, power: number, o: Partial<Unit>): Unit {
  return {
    id,
    name,
    team: 'enemy',
    kind: 'hydra_body',
    level: 9,
    stats: STATS,
    prof: 4,
    pos,
    facing: -1,
    hp: 1,
    maxHp: 1,
    tempHp: 0,
    chakra: 0,
    maxChakra: 0,
    ac: 15,
    speed: 0,
    saveDC: 15,
    jutsuAttack: 8,
    castMod: 1,
    weapon: { name: 'Bite', dice: '2d8', type: 'Piercing', reach: 4.5, finesse: false },
    jutsus: [],
    effects: [],
    cond: {},
    deathSaves: { ok: 0, bad: 0 },
    turn: { move: 0, action: false, bonus: false, reaction: true, moved: 0 },
    controller: 'ai',
    aiOrder: 'aggressive',
    power,
    stats2: { critsTaken: 0, critsLanded: 0, pills: 0, fell: false, fellToCrit: false, tension: 0, jutsuCast: 0 },
    skills: ['perception'],
    ...o,
  };
}

/** The hydra's body and its seven heads. Story difficulty: 25 % less HP and damage. */
export function hydraUnits(pos: Pt, difficulty: Difficulty): Unit[] {
  const power = difficulty === 'story' ? 0.75 : 1;
  const hp = (n: number) => Math.round(n * power);
  const body = beast(HYDRA_ID, 'Hydra', pos, power, { hp: hp(140), maxHp: hp(140), bulk: 2.4, ac: 15 });
  const heads = HEAD_OFFSETS.map((o, i) =>
    beast(`${HYDRA_ID}_head_${i}`, `Hydra head ${i + 1}`, { x: pos.x + o.x, z: pos.z + o.z }, power, {
      kind: 'hydra_head',
      hp: hp(24),
      maxHp: hp(24),
      ac: 14,
      chakra: 6,
      maxChakra: 6,
      facing: o.x < 0 ? -1 : 1,
      jutsus: ['hydra_spit', 'hydra_roar'],
      head: { body: HYDRA_ID, index: i, regrowIn: 0, severed: false, sealed: false },
    }),
  );
  return [body, ...heads];
}
