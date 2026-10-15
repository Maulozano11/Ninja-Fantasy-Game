// Battle units from character sheets: HP, chakra, AC, speed in meters, weapon, jutsu and skills,
// plus the enemy templates (rogues, hunter-nin, a jonin leader, raiders) with their looks.

import type { ShinobiCharacter } from '../types/shinobi';
import type { Difficulty } from '../types/mission';
import type { SpriteAppearance } from '../sprite/types';
import { SHINOBI_CLASSES } from '../data/shinobiData';
import { getItem } from '../sprite/catalog';
import { abilityMod, proficiencyBonus, skillsOf } from '../rules/checks';
import { deriveStats, effectiveAC, effectiveMaxHp } from '../rules/derived';
import { effectMods } from '../rules/effects';
import type { AiOrder, Pt, Team, Unit, Weapon } from './types';
import { JUTSU } from './jutsu';

const W = (name: string, dice: string, type: Weapon['type'], reach = 1.5, finesse = true, held = false, twoHanded = false): Weapon =>
  twoHanded ? { name, dice, type, reach, finesse, held, twoHanded } : { name, dice, type, reach, finesse, held };

/** The feat that lets a ninja weave seals with one hand, a one-handed weapon in the other. */
export const ONE_HANDED_SEALS = 'one_handed_seals';

/** The weapon a character fights with: what the sprite holds, or the old weapon style. */
export function weaponOf(c: ShinobiCharacter): Weapon {
  const held = c.appearance?.slots.held?.id;
  switch (held) {
    case 'held_katana':
      return W('Katana', '1d8', 'Slashing', 1.5, true, true);
    case 'held_crystal':
      return W('Crystal blade', '1d10', 'Slashing', 1.5, false, true, true);
    case 'held_naginata':
      return W('Naginata', '1d10', 'Slashing', 3, false, true, true);
    case 'held_kunai':
      return W('Kunai', '1d6', 'Piercing', 1.5, true, true);
    case 'held_palm':
      return W('Gentle fist', '1d8', 'Force');
    case 'held_lightning':
      return W('Lightning palm', '1d8', 'Lightning');
    case 'held_spiral':
      return W('Spiral palm', '1d8', 'Force');
  }
  switch (c.weaponStyle) {
    case 'Katana Blade':
      return W('Katana', '1d8', 'Slashing', 1.5, true, true);
    case 'Kunai & Tag':
      return W('Kunai', '1d6', 'Piercing', 1.5, true, true);
    case 'Gentle Fist Palm':
      return W('Gentle fist', '1d8', 'Force');
    case 'Chidori Lightning':
      return W('Lightning palm', '1d8', 'Lightning');
    case 'Rasengan Sphere':
      return W('Spiral palm', '1d8', 'Force');
    default:
      return c.shinobiClass === 'Taijutsu Master' ? W('Fists', '1d8', 'Bludgeoning', 1.5, false) : W('Fists', '1d4', 'Bludgeoning', 1.5, false);
  }
}

/** Fighting with the weapon stowed: bare hands (a Taijutsu Master's fists are weapons). */
export const fistsOf = (c?: ShinobiCharacter): Weapon =>
  c?.shinobiClass === 'Taijutsu Master' ? W('Fists', '1d8', 'Bludgeoning', 1.5, false) : W('Fists', '1d4', 'Bludgeoning', 1.5, false);

/** What a unit strikes with right now: its weapon if in hand (or not a held one), else its fists. */
export const wielded = (u: Unit): Weapon => (u.armed || !u.weapon.held ? u.weapon : fistsOf(u.character));

/** Hand seals need free hands: no weapon in hand, or One-Handed Seals with a one-handed weapon. */
export const handsFree = (u: Unit): boolean =>
  !u.armed || !u.weapon.held || (!u.weapon.twoHanded && !!u.character?.selectedFeats?.includes(ONE_HANDED_SEALS));

/** Thrown kunai and shuriken: everyone carries them. */
export const KUNAI: Weapon = W('Kunai', '1d4', 'Piercing', 9, true);
export const KUNAI_LONG = 18;

export interface UnitOptions {
  id?: string;
  team: Team;
  pos: Pt;
  controller?: 'player' | 'ai';
  aiOrder?: AiOrder;
  /** Enemy strength (Story: 0.75). */
  power?: number;
  /** Party members keep their mission HP and chakra; enemies start fresh. */
  fresh?: boolean;
}

export function unitFrom(c: ShinobiCharacter, o: UnitOptions): Unit {
  const power = o.power ?? 1;
  const maxHp = Math.max(1, Math.round(effectiveMaxHp(c) * (o.team === 'enemy' ? power : 1)));
  const mods = effectMods(c.effects);
  const cls = SHINOBI_CLASSES[c.shinobiClass];
  const hp = o.fresh ? maxHp : Math.max(0, Math.min(maxHp, c.currentHp));
  return {
    id: o.id ?? c.id,
    name: c.name,
    team: o.team,
    kind: 'ninja',
    character: c,
    look: c.appearance,
    level: c.level,
    stats: c.stats,
    prof: proficiencyBonus(c.level),
    pos: o.pos,
    facing: o.team === 'party' ? 1 : -1,
    hp,
    maxHp,
    tempHp: mods.tempHpAtBattleStart,
    chakra: o.fresh ? c.maxChakra : Math.max(0, Math.min(c.maxChakra, c.currentChakra)),
    maxChakra: c.maxChakra,
    ac: effectiveAC(c),
    speed: Math.max(3, c.speed * 1.5 + mods.speedM),
    saveDC: c.jutsuSaveDC,
    jutsuAttack: c.jutsuAttackBonus,
    castMod: abilityMod(c.stats[cls?.castingStat ?? 'int']),
    weapon: weaponOf(c),
    armed: weaponOf(c).held,
    jutsus: Object.values(c.selectedJutsus).filter((id) => JUTSU[id]),
    effects: [...(c.effects ?? [])],
    cond: {},
    down: hp <= 0 ? 'downed' : undefined,
    deathSaves: { ok: 0, bad: 0 },
    turn: { move: 0, action: false, bonus: false, reaction: true, moved: 0 },
    controller: o.controller ?? (o.team === 'party' ? 'player' : 'ai'),
    aiOrder: o.aiOrder ?? 'aggressive',
    power,
    stats2: { critsTaken: 0, critsLanded: 0, pills: 0, fell: false, fellToCrit: false, tension: 0, jutsuCast: 0 },
    skills: skillsOf(c),
  };
}

// --- enemy templates -----------------------------------------------------------------------

export type EnemyKind = 'rogue' | 'hunter' | 'jonin' | 'raider';

const it = (id: string, ...colors: string[]) => ({ id, colors });

function look(o: Partial<SpriteAppearance>): SpriteAppearance {
  return {
    version: 1,
    body: 'male',
    skin: '#e9bf9a',
    eyeShape: 'sharp',
    eyeColor: '#7a1f2a',
    slots: {},
    accessories: [],
    headband: { position: 'forehead', slashed: true, tails: true, emblem: 'crescent', cloth: '#2a2d3a', plate: '#9aa3ad' },
    chakra: { color: 'red', onCharge: true, onCast: true, onVictory: false },
    pixelEdits: [],
    ...o,
  };
}

interface Template {
  name: string;
  title: string;
  level: number;
  clan: ShinobiCharacter['clan'];
  shinobiClass: ShinobiCharacter['shinobiClass'];
  stats: ShinobiCharacter['stats'];
  jutsus: string[];
  looks: SpriteAppearance[];
}

const TEMPLATES: Record<EnemyKind, Template> = {
  rogue: {
    name: 'Rogue',
    title: 'Rogue ninja',
    level: 3,
    clan: 'Mirai',
    shinobiClass: 'Bukijutsu Master',
    stats: { str: 12, dex: 15, con: 13, int: 10, wis: 11, cha: 9 },
    jutsus: ['fireball_goukakyu', 'body_flicker'],
    looks: [
      look({
        slots: {
          hair: it('hair_tousled', '#2b2420'),
          face: it('face_clothmask', '#2a2d3a'),
          top: it('top_longsleeve', '#3b3f4a', '#2a2d36'),
          bottom: it('bottom_shinobi', '#2a2d36', '#3b3f4a'),
          feet: it('feet_wraps', '#5a4a3a'),
          held: it('held_katana', '#c9ced6', '#3a2a22', '#7a6a3a'),
        },
      }),
      look({
        skin: '#d9a982',
        slots: {
          hair: it('hair_crop', '#5a3a22'),
          face: it('face_clothmask', '#4a2a2a'),
          top: it('top_sleeveless', '#5a3a2a', '#3a2a22'),
          bottom: it('bottom_cargo', '#3a3326', '#2a251c'),
          feet: it('feet_shinobi', '#2a251c', '#3a3326'),
          waist: it('waist_rope', '#8a6a3a', '#5a4a2a'),
          held: it('held_kunai', '#c9ced6', '#3a2a22'),
        },
      }),
    ],
  },
  hunter: {
    name: 'Hunter-nin',
    title: 'Masked hunter-nin',
    level: 4,
    clan: 'Akkai',
    shinobiClass: 'Ninjutsu Specialist',
    stats: { str: 11, dex: 15, con: 13, int: 15, wis: 12, cha: 10 },
    jutsus: ['water_dragon_suiryuudan', 'earth_wall_doryuheki', 'substitution_kawarimi'],
    looks: [
      look({
        eyeColor: '#1f2a4a',
        slots: {
          hair: it('hair_lowtail', '#1a1a22'),
          face: it('face_foxmask', '#f2eee6', '#cf2a2a', '#1b1420'),
          top: it('top_highcollar', '#262833', '#1a1b22'),
          bottom: it('bottom_shinobi', '#1a1b22', '#262833'),
          armor: it('armor_shadowops', '#8c94a1', '#262833'),
          feet: it('feet_shinobi', '#1a1b22', '#262833'),
          held: it('held_naginata', '#c9ced6', '#3a2a22', '#8a2a2a'),
        },
      }),
      look({
        body: 'female',
        eyeColor: '#1f2a4a',
        slots: {
          hair: it('hair_pony', '#3a2a44'),
          face: it('face_catmask', '#f2eee6', '#1f9e9a', '#1b1420'),
          top: it('top_highcollar', '#262833', '#1a1b22'),
          bottom: it('bottom_leggings', '#1a1b22', '#262833'),
          armor: it('armor_shadowops', '#8c94a1', '#262833'),
          feet: it('feet_shinobi', '#1a1b22', '#262833'),
          held: it('held_kunai', '#c9ced6', '#3a2a22'),
        },
      }),
    ],
  },
  jonin: {
    name: 'Kagero',
    title: 'Rogue jonin',
    level: 6,
    clan: 'Mirai',
    shinobiClass: 'Ninjutsu Specialist',
    stats: { str: 12, dex: 15, con: 14, int: 17, wis: 13, cha: 12 },
    jutsus: ['chidori_lightning_blade', 'lightning_hound_raidon', 'substitution_kawarimi', 'body_flicker'],
    looks: [
      look({
        eyeColor: '#b8202a',
        slots: {
          hair: it('hair_storm', '#c9ced6'),
          top: it('top_highcollar', '#20232c', '#14161c'),
          bottom: it('bottom_shinobi', '#14161c', '#20232c'),
          armor: it('armor_flak', '#3d4a3a', '#33402f'),
          feet: it('feet_shinobi', '#14161c', '#20232c'),
          cape: it('cape_rogue', '#1a1b22', '#7a1f2a', '#c9a46c'),
          held: it('held_lightning', '#8fd3ff', '#ffffff'),
        },
        chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false },
      }),
    ],
  },
  raider: {
    name: 'Raider',
    title: 'Night raider',
    level: 3,
    clan: 'Uddo',
    shinobiClass: 'Taijutsu Master',
    stats: { str: 15, dex: 14, con: 14, int: 9, wis: 11, cha: 8 },
    jutsus: ['leaf_hurricane_senpuu'],
    looks: [
      look({
        skin: '#c99872',
        slots: {
          hair: it('hair_bristle', '#1a1a1a'),
          face: it('face_clothmask', '#1a1b22'),
          top: it('top_tee', '#22262e'),
          bottom: it('bottom_hakama', '#1a1d24', '#22262e'),
          hands: it('hands_wraps', '#8a7a62'),
          feet: it('feet_wraps', '#5a4a3a'),
        },
      }),
    ],
  },
};

/** A character sheet for an enemy (fresh HP and chakra, derived from its build). */
export function enemyCharacter(kind: EnemyKind, n: number): ShinobiCharacter {
  const t = TEMPLATES[kind];
  const lk = t.looks[n % t.looks.length];
  const armor = ((lk.slots.armor && getItem(lk.slots.armor.id)?.statsArmor) || 'Ronin Wanderer Cloak') as ShinobiCharacter['armorStyle'];
  const d = deriveStats({ level: t.level, stats: t.stats, clan: t.clan, shinobiClass: t.shinobiClass, armor, feats: [] });
  const slots = ['slot1Utility', 'slot2Elemental', 'slot3Elemental', 'slot4Clan', 'slot5Ultimate'] as const;
  const selected = Object.fromEntries(slots.map((s, i) => [s, t.jutsus[i] ?? ''])) as unknown as ShinobiCharacter['selectedJutsus'];
  return {
    id: `${kind}_${n}`,
    name: t.looks.length > 1 || n > 0 ? `${t.name} ${n + 1}` : t.name,
    title: t.title,
    level: t.level,
    clan: t.clan,
    shinobiClass: t.shinobiClass,
    stats: t.stats,
    palette: {
      skinTone: lk.skin,
      hairColor: '#222',
      eyeColor: lk.eyeColor,
      armorPrimary: '#555',
      armorSecondary: '#333',
      clothColor: '#333',
      headbandCloth: '#222',
      headbandPlate: '#999',
      chakraAuraColor: '#ef4444',
    },
    hairstyle: 'Itachi Low Ribbon',
    armorStyle: armor,
    headbandPosition: 'Forehead',
    dojutsu: 'None',
    selectedFeats: [],
    selectedJutsus: selected,
    ...d,
    currentHp: d.maxHp,
    currentChakra: d.maxChakra,
    appearance: lk,
  } as ShinobiCharacter;
}

export function enemyUnit(kind: EnemyKind, n: number, pos: Pt, difficulty: Difficulty): Unit {
  return unitFrom(enemyCharacter(kind, n), { team: 'enemy', pos, power: difficulty === 'story' ? 0.75 : 1, fresh: true });
}
