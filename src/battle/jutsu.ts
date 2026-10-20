// How each jutsu works on the battle map, in meters: its shape, reach, roll (attack or saving
// throw), damage and what it leaves behind. Built from the jutsu data (ranges in old 1.5 m tiles)
// with a few jutsu that do something special (healing, flicker, clones, traps, walls, Kawarimi),
// plus each clan's own abilities (docs/CLANS_DESIGN.md), which come with the clan, not a slot.

import { JUTSUS_DATA } from '../data/shinobiData';
import type { ClanType, JutsuDefinition } from '../types/shinobi';
import type { Ability, Advantage } from '../rules/checks';
import type { EffectId } from '../types/mission';
import type { AreaShape, DamageType, Pt } from './types';

export type VfxElement = 'fire' | 'water' | 'wind' | 'lightning' | 'earth' | 'genjutsu' | 'chakra' | 'poison';
export type VfxRole = 'bolt' | 'beast' | 'stream' | 'breath' | 'sphere' | 'slash' | 'multi' | 'blast' | 'wall' | 'aura' | 'hit';

/** `node`: one of the caster's own Weapon Nodes; `onNode`: a unit standing on one (Ryusei). */
export type JutsuShape = 'single' | 'circle' | 'selfCircle' | 'cone' | 'line' | 'wall' | 'self' | 'ally' | 'point' | 'node' | 'onNode';

export interface JutsuSpec {
  id: string;
  name: string;
  /** The Spanish name, when it isn't the same. */
  nameEs?: string;
  /** The enhanced cast's own name, when it has one (Fireball → Great Fireball), and in Spanish. */
  nameEnh?: string;
  nameEnhEs?: string;
  rank: string;
  element: VfxElement;
  cost: number;
  enhCost: number;
  cast: 'action' | 'bonus' | 'reaction';
  /** How far the target point can be (m). */
  range: number;
  shape: JutsuShape;
  radius?: number;
  length?: number;
  width?: number;
  angle?: number;
  dice?: string;
  dmgType?: DamageType;
  save?: Ability;
  /** On a successful save: half damage, or nothing. */
  saveHalf: boolean;
  special?: 'heal' | 'flicker' | 'clone' | 'trap' | 'kawarimi' | 'earthWall' | 'waterWall' | 'seal' | 'confuse' | 'evasion' | 'metalBlock' | 'metalWall' | 'warp' | 'swap' | 'command' | 'submission';
  /** The projectile or effect the screen plays. */
  vfx: VfxRole;
  /** A signature effect of its own (vfx_<element>/<sig>, and <sig>_great or <sig>_enh enhanced). */
  sig?: string;
  /** Taijutsu and kenjutsu strikes are delivered in person (the caster dashes in). */
  melee: boolean;
  /** Loud: casting it in the stealth phase starts the battle. */
  loud: boolean;
  /** Left on a failed save (or a hit). */
  effect?: EffectId;
  /** What it does to the ground around it. */
  env?: 'ignite' | 'electrify' | 'clearFoliage';
  /** A failed save adds Tension (the hydra's roar). */
  tension?: boolean;
  /**
   * A bloodline technique rather than a jutsu: no hand seals, no Centered chakra discount, not
   * enhanced. It still costs chakra, so sealed chakra blocks it.
   */
  ability?: boolean;
  /** The clan whose members have it from level 1. */
  clan?: ClanType;
  /** The target's save is rolled with this (Pursuing Flame: disadvantage). */
  saveAdv?: Advantage;
}

const TILE = 1.5;

const ELEMENT: Record<string, VfxElement> = {
  Fire: 'fire',
  Water: 'water',
  Wind: 'wind',
  Lightning: 'lightning',
  Earth: 'earth',
  Genjutsu: 'genjutsu',
  Taijutsu: 'chakra',
  Kenjutsu: 'wind',
};

/** Per-jutsu touches the data can't say (the screen's effect, special behavior). */
const OVERRIDE: Record<string, Partial<JutsuSpec>> = {
  shadow_clone: { shape: 'self', special: 'clone', vfx: 'aura', loud: false },
  body_flicker: { shape: 'point', special: 'flicker', vfx: 'aura', loud: false },
  trap_setter_tag: { shape: 'point', special: 'trap', vfx: 'hit', loud: false, radius: 1.5 },
  mystical_palm: { shape: 'ally', special: 'heal', vfx: 'aura', range: 1.6, loud: false },
  substitution_kawarimi: { shape: 'self', special: 'kawarimi', cast: 'reaction', vfx: 'hit', loud: false },
  fireball_goukakyu: { vfx: 'sphere', effect: 'burning', sig: 'fireball' },
  dragon_fire_stream: { vfx: 'stream', effect: 'burning' },
  water_dragon_suiryuudan: { vfx: 'beast' },
  water_shield_suijinheki: { shape: 'wall', special: 'waterWall', vfx: 'wall', length: 4.5 },
  earth_wall_doryuheki: { shape: 'wall', special: 'earthWall', vfx: 'wall', length: 4.5 },
  earth_spear_doryuudan: { shape: 'line', width: 1.2, vfx: 'stream' },
  wind_blade_daitoppa: { vfx: 'slash' },
  chidori_lightning_blade: { vfx: 'hit', melee: true },
  lightning_hound_raidon: { vfx: 'beast' },
  leaf_hurricane_senpuu: { shape: 'selfCircle', vfx: 'aura', melee: true },
  crescent_moon_dance: { vfx: 'slash', melee: true },
  temple_of_nirvana: { special: 'confuse', vfx: 'blast', saveHalf: false, effect: 'confused' },
  dragon_fire_bomb: { vfx: 'breath', effect: 'burning' },
  wood_dragon_jutsu: { element: 'earth', vfx: 'beast' },
  adamantine_sealing_chains: { element: 'chakra', special: 'seal', vfx: 'stream', effect: 'chakra_sealed' },
  taki_sixtyfour_palms: { vfx: 'multi', melee: true },
  kirin_thunder: { vfx: 'blast', sig: 'kirin' },
  rasenshuriken_wind: { vfx: 'sphere' },
  great_fire_annihilation: { vfx: 'breath', length: 12, effect: 'burning', sig: 'annihilation' },
  wood_golem_titan: { element: 'earth', vfx: 'blast' },
  yasaka_magatama: { element: 'chakra', vfx: 'multi', width: 1.5 },
  night_guy_dragon: { element: 'chakra', vfx: 'beast', melee: true },
};

function specOf(j: JutsuDefinition): JutsuSpec {
  const range = Math.max(1.5, j.range * TILE);
  const aoe = j.areaOfEffect;
  let shape: JutsuShape = 'single';
  if (aoe === 'Sphere') shape = j.range <= 1 ? 'selfCircle' : 'circle';
  else if (aoe === 'Cone') shape = 'cone';
  else if (aoe === 'Line') shape = 'line';
  else if (aoe === 'Wall') shape = 'wall';
  const base: JutsuSpec = {
    id: j.id,
    name: j.name,
    ...(j.nameEs ? { nameEs: j.nameEs } : {}),
    ...(j.nameEnh ? { nameEnh: j.nameEnh, nameEnhEs: j.nameEnhEs ?? j.nameEnh } : {}),
    rank: j.rank,
    element: ELEMENT[j.nature] ?? 'chakra',
    cost: j.chakraCost,
    enhCost: j.enhancementChakraCost,
    cast: j.castTime === 'Bonus Action' ? 'bonus' : j.castTime === 'Reaction' ? 'reaction' : 'action',
    range,
    shape,
    radius: (j.aoeRadius ?? 1) * TILE,
    length: shape === 'cone' ? Math.min(range, 9) : range,
    width: 1.5,
    angle: 60,
    dice: j.damageDice,
    dmgType: j.damageType === 'Healing' ? undefined : (j.damageType as DamageType | undefined),
    save: j.savingThrow ? (j.savingThrow.toLowerCase() as Ability) : undefined,
    saveHalf: j.saveEffect !== 'Negates' && j.saveEffect !== 'Break Illusion',
    vfx: shape === 'circle' ? 'sphere' : shape === 'cone' ? 'breath' : shape === 'line' ? 'stream' : 'bolt',
    melee: false,
    loud: true,
    env: j.environmentalEffect === 'Ignites Wood' ? 'ignite' : j.environmentalEffect === 'Electrifies Water' ? 'electrify' : j.environmentalEffect === 'Clears Foliage' ? 'clearFoliage' : undefined,
  };
  return { ...base, ...OVERRIDE[j.id] };
}

/** The hydra heads' own attacks (not in the jutsu list a ninja learns from). */
const HYDRA_SPECS: JutsuSpec[] = [
  {
    id: 'hydra_spit',
    name: 'Venom spit',
    nameEs: 'Escupitajo de veneno',
    rank: 'B',
    element: 'poison',
    cost: 2,
    enhCost: 0,
    cast: 'action',
    range: 9,
    shape: 'circle',
    radius: 1,
    dice: '2d6',
    dmgType: 'Poison',
    save: 'dex',
    saveHalf: true,
    vfx: 'bolt',
    melee: false,
    loud: true,
    effect: 'poisoned',
  },
  {
    id: 'hydra_roar',
    name: 'Roar',
    nameEs: 'Rugido',
    rank: 'B',
    element: 'wind',
    cost: 3,
    enhCost: 0,
    cast: 'action',
    range: 9,
    shape: 'cone',
    angle: 90,
    length: 9,
    save: 'wis',
    saveHalf: false,
    vfx: 'blast',
    melee: false,
    loud: true,
    tension: true,
  },
];

/** Each clan's base abilities (phase 1 of docs/CLANS_DESIGN.md), in the order their buttons show. */
const CLAN_SPECS: JutsuSpec[] = [
  // Mirai. The Eye of Tomorrow is passive (intent.ts); Evasion is a reaction the engine offers.
  {
    id: 'mirai_evasion',
    name: 'Premonitory Evasion',
    nameEs: 'Evasión Premonitoria',
    clan: 'Mirai',
    ability: true,
    rank: '',
    element: 'fire',
    cost: 2,
    enhCost: 0,
    cast: 'reaction',
    range: 1.5,
    shape: 'self',
    saveHalf: false,
    special: 'evasion',
    vfx: 'aura',
    melee: false,
    loud: false,
  },
  {
    // A real Katon jutsu: hand seals, and Centered chakra's discount applies.
    id: 'katon_pursuing_flame',
    name: 'Fire Technique: Pursuing Flame',
    nameEs: 'Técnica de Fuego: Llama persecutoria',
    clan: 'Mirai',
    rank: 'C',
    element: 'fire',
    cost: 3,
    enhCost: 0,
    cast: 'action',
    range: 12,
    shape: 'single',
    dice: '2d6',
    dmgType: 'Fire',
    save: 'dex',
    saveHalf: true,
    saveAdv: 'disadvantage',
    vfx: 'bolt',
    melee: false,
    loud: true,
  },
  // Kōton: Modular Architecture. Two structures stand at most (structures.ts).
  {
    id: 'koton_block',
    name: 'Modular Architecture: Block',
    nameEs: 'Arquitectura Modular: Bloque',
    clan: 'Koton',
    ability: true,
    rank: '',
    element: 'earth',
    cost: 2,
    enhCost: 0,
    cast: 'bonus',
    range: 6,
    shape: 'point',
    length: 1.5,
    saveHalf: false,
    special: 'metalBlock',
    vfx: 'wall',
    melee: false,
    loud: true,
  },
  {
    id: 'koton_wall',
    name: 'Modular Architecture: Wall',
    nameEs: 'Arquitectura Modular: Muro',
    clan: 'Koton',
    ability: true,
    rank: '',
    element: 'earth',
    cost: 4,
    enhCost: 0,
    cast: 'action',
    range: 6,
    shape: 'wall',
    length: 4.5,
    saveHalf: false,
    special: 'metalWall',
    vfx: 'wall',
    melee: false,
    loud: true,
  },
  // Ryusei. Weapon Nodes are passive (clans.ts): kunai and missed blows leave them.
  {
    id: 'ryusei_warp',
    name: 'Warp Strike',
    nameEs: 'Warp Strike',
    clan: 'Ryusei',
    ability: true,
    rank: '',
    element: 'chakra',
    cost: 2,
    enhCost: 0,
    cast: 'bonus',
    range: 18,
    shape: 'node',
    saveHalf: false,
    special: 'warp',
    vfx: 'aura',
    melee: false,
    loud: false,
  },
  {
    id: 'ryusei_swap',
    name: 'Spatial Swap',
    nameEs: 'Intercambio Espacial',
    clan: 'Ryusei',
    ability: true,
    rank: '',
    element: 'chakra',
    cost: 3,
    enhCost: 0,
    cast: 'action',
    range: 18,
    shape: 'onNode',
    save: 'str',
    saveHalf: false,
    special: 'swap',
    vfx: 'aura',
    melee: false,
    loud: true,
  },
  // Northstar. The Aura of Sovereignty is passive (combat.ts, clans.ts); both of these are fought out
  // with a WIS save and take only some foes (clans.ts).
  {
    id: 'northstar_command',
    name: 'Command',
    nameEs: 'Command',
    clan: 'Northstar',
    ability: true,
    rank: '',
    element: 'genjutsu',
    cost: 4,
    enhCost: 0,
    cast: 'action',
    range: 9,
    shape: 'single',
    save: 'wis',
    saveHalf: false,
    special: 'command',
    vfx: 'aura',
    melee: false,
    loud: true,
  },
  {
    id: 'northstar_submission',
    name: 'Natural Submission',
    nameEs: 'Sumisión Natural',
    clan: 'Northstar',
    ability: true,
    rank: '',
    element: 'genjutsu',
    cost: 5,
    enhCost: 0,
    cast: 'action',
    range: 9,
    shape: 'single',
    save: 'wis',
    saveHalf: false,
    special: 'submission',
    vfx: 'aura',
    melee: false,
    loud: true,
  },
];

export const JUTSU: Record<string, JutsuSpec> = Object.fromEntries([...JUTSUS_DATA.map((j) => [j.id, specOf(j)]), ...HYDRA_SPECS.map((j) => [j.id, j]), ...CLAN_SPECS.map((j) => [j.id, j])]);

/** The abilities a clan's members have, in order. */
export const clanAbilities = (clan: ClanType): string[] => CLAN_SPECS.filter((j) => j.clan === clan).map((j) => j.id);

/** Enhanced version: one more damage die (two for rank S) and a 50 % bigger area. */
export function enhanced(spec: JutsuSpec): JutsuSpec {
  const more = spec.rank === 'S' ? 2 : 1;
  const dice = spec.dice?.replace(/^(\d+)d/, (_, n) => `${Number(n) + more}d`);
  // More damage and a bigger reach: circles grow by half, cones and lines reach a quarter further,
  // cones open a third wider and lines run half as wide again.
  return {
    ...spec,
    dice,
    radius: spec.radius ? spec.radius * 1.5 : spec.radius,
    length: spec.length ? spec.length * (spec.shape === 'wall' ? 1.5 : 1.25) : spec.length,
    angle: spec.angle && spec.shape === 'cone' ? spec.angle * (4 / 3) : spec.angle,
    width: spec.width && spec.shape === 'line' ? spec.width * 1.5 : spec.width,
  };
}

const deg = (r: number) => (r * 180) / Math.PI;

/** A cone or a line needs a direction: it is aimed at least this far (m) from its caster. */
export const MIN_AIM = 0.3;

/** The area a jutsu covers when aimed at `at` from `from`. Null for single-target jutsu. */
export function areaOf(spec: JutsuSpec, from: Pt, at: Pt): AreaShape | null {
  const dir = Math.atan2(at.z - from.z, at.x - from.x);
  switch (spec.shape) {
    case 'circle':
      return { kind: 'circle', center: at, radius: spec.radius ?? 1.5 };
    case 'selfCircle':
      return { kind: 'circle', center: from, radius: spec.radius ?? 1.5 };
    case 'cone':
      return { kind: 'cone', origin: from, dir: deg(dir), angle: spec.angle ?? 60, length: spec.length ?? 9 };
    case 'line':
      return { kind: 'line', origin: from, dir: deg(dir), length: spec.length ?? spec.range, width: spec.width ?? 1.5 };
    default:
      return null;
  }
}

/** A point is inside an area (units are about 0.5 m wide, so edges count a little). */
export function inArea(area: AreaShape, p: Pt, pad = 0.25): boolean {
  if (area.kind === 'circle') return Math.hypot(p.x - area.center.x, p.z - area.center.z) <= area.radius + pad;
  const dx = p.x - area.origin.x;
  const dz = p.z - area.origin.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.3) return false;
  const a = (area.dir * Math.PI) / 180;
  const along = dx * Math.cos(a) + dz * Math.sin(a);
  const across = -dx * Math.sin(a) + dz * Math.cos(a);
  if (area.kind === 'line') return along >= 0 && along <= area.length + pad && Math.abs(across) <= area.width / 2 + pad;
  if (d > area.length + pad) return false;
  let diff = Math.abs(deg(Math.atan2(dz, dx)) - area.dir) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff <= area.angle / 2 + deg(Math.atan2(pad, Math.max(d, 0.5)));
}
