// How each jutsu works on the battle map, in meters: its shape, reach, roll (attack or saving
// throw), damage and what it leaves behind. Built from the jutsu data (ranges in old 1.5 m tiles)
// with a few jutsu that do something special (healing, flicker, clones, traps, walls, Kawarimi),
// plus each clan's own abilities (docs/CLANS_DESIGN.md), which come with the clan, not a slot.

import { JUTSUS_DATA } from '../data/shinobiData';
import type { ClanType, JutsuDefinition } from '../types/shinobi';
import type { Ability, Advantage } from '../rules/checks';
import type { EffectId } from '../types/mission';
import type { AreaShape, BattleState, DamageType, Pt } from './types';
import { heightReach } from './map';

export type VfxElement = 'fire' | 'water' | 'wind' | 'lightning' | 'earth' | 'genjutsu' | 'chakra' | 'poison';
export type VfxRole = 'bolt' | 'beast' | 'stream' | 'breath' | 'sphere' | 'slash' | 'multi' | 'blast' | 'wall' | 'aura' | 'hit';

/** `node`: one of the caster's own Weapon Nodes; `onNode`: a unit standing on one (Ryusei). */
export type JutsuShape = 'single' | 'circle' | 'selfCircle' | 'cone' | 'line' | 'wall' | 'self' | 'ally' | 'point' | 'node' | 'onNode';

/**
 * How the screen stages a jutsu around its effect: the proposal's piece P3 (an aura before, an impact
 * on each one reached, a slower flight, a faster run...) and P4, with the owner's answers of
 * 2026-10-21 (docs/GAMEPLAY_DESIGN.md, "Rank D and C jutsu"). Data for the screen only: the engine
 * never reads it.
 */
export interface JutsuSeq {
  /** Its projectiles fly one by one, each on its own path to the target (a high arc, a straight line, a low curve) and with its own impact, `stagger` ms apart. */
  volley?: { paths: ('high' | 'straight' | 'low')[]; stagger: number };
  /** The caster's element aura (aura and aura_back) rises while it casts, for `ms`. */
  castAura?: number;
  /** An impact on every unit the jutsu reaches, one after another, `stagger` ms apart. */
  hitEach?: { stagger: number };
  /** A cone's bolts are drawn joined, from the hand to each one reached: one branching fan. */
  connected?: boolean;
  /** The flight takes this many times as long (a dream's drift). */
  slowFlight?: number;
  /** The run in (a flash-in or a charge) goes this many times as fast. */
  fastRun?: number;
  /** A flash of the element's aura where the caster sets off. */
  launchFlash?: boolean;
  /** No projectile: the effect rises from the ground at the point (P4, like the Kirin's storm), after a warning splash of `warn` ms. */
  fromGround?: { warn: number };
  /** The screen shakes as it lands (strength). */
  shake?: number;
  /** The aura stays on the caster, at this opacity, for as long as its condition lasts (the Breeze Mantle's 'mantle'). */
  lingerAura?: number;
  /** The element's aura wraps whoever is healed, for `ms`, once the heal lands. */
  healAura?: number;
  /**
   * Staged its own way with the effect pieces of the owner's first round of answers (2026-10-21;
   * docs/GAMEPLAY_DESIGN.md, "Jutsu effects, round 1"): his fire dragon head spitting fireballs over
   * the cone ('dragonHead'), the half head spitting the stream to the line's end ('dragonStream'),
   * the water dragon's head on its stream on a varied path ('waterDragon'), three volleys of rock
   * bullets on varied paths along the line ('rockVolleys'), the chain and the seal circle
   * ('sealChain'), three crescents of chakra ('crescents'), the crows out of the vortex
   * ('crowDive'), the unarmed combo with wind crescents ('hurricane'); and the two new effects,
   * his wood dragon rising out of the ground at the target after a row of roots ('woodDragon'), and
   * lightning gathered in the bare hand, then a thrust with it ('handLightning').
   */
  stage?: StageKind;
  /**
   * The Devouring Tide: a wave runs out along the cone, a row of the element's water columns
   * (wall_depth; its wall seen from the side when the cone points into the depth) with `rows` rows
   * fading behind its crest and the element's breath as foam before it, in `ms`.
   */
  wave?: {
    rows: number;
    ms: number;
    /**
     * The Dragon Tsunami, Water's rank S (the owner's paint-over of the wave, approved 2026-10-22):
     * his curl, his water dragon and his kanji 水 ride the crest (vfx_tide_s).
     */
    dragon?: boolean;
  };
  /**
   * The Whirlwind Tower: a warning impact at the point, then the element's column (wall_depth)
   * rises there, turns with `minis` small whirlwinds (multi) circling it, and fades.
   */
  tower?: { warn: number; minis: number };
  /** A cone's breath laid along it (the Rubble Gust's dust), for `ms`. */
  breathMs?: number;
  /**
   * Blood (the owner, 2026-10-21): a hit bursts a spray of it out of the target toward the side the
   * cut travels, and a cut that leaves Bleeding splashes drops onto the screen. Never in a chakra colour.
   */
  blood?: boolean;
  /** What a charged hand holds while its charge lasts (`handCharge`): a sheet's animation, drawn at the near hand. */
  held?: { group: string; name: string; anim: string };
}

export type StageKind = 'dragonHead' | 'dragonStream' | 'waterDragon' | 'rockVolleys' | 'sealChain' | 'crescents' | 'crowDive' | 'hurricane' | 'woodDragon' | 'handLightning';

export interface JutsuSpec {
  id: string;
  name: string;
  /** The Spanish name, when it isn't the same. */
  nameEs?: string;
  /** The enhanced cast's own name, when it has one (Fireball → Great Fireball), and in Spanish. */
  nameEnh?: string;
  nameEnhEs?: string;
  rank: string;
  /** The jutsu's nature as its data says it (Fire, Taijutsu…); the hydra's attacks and the clan abilities have none. */
  nature?: string;
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
  special?: 'heal' | 'flicker' | 'clone' | 'kawarimi' | 'earthWall' | 'waterWall' | 'seal' | 'confuse' | 'evasion' | 'metalBlock' | 'metalWall' | 'warp' | 'swap' | 'command' | 'submission' | 'mantle' | 'galeZone';
  /** The projectile or effect the screen plays. */
  vfx: VfxRole;
  /** A signature effect of its own (vfx_<element>/<sig>, and <sig>_great or <sig>_enh enhanced). */
  sig?: string;
  /**
   * A fire, water, wind, lightning or earth jutsu (by its nature, and its effects are that
   * element's): the screen plays its effects, its beast and its wall in the caster's chakra colour
   * (the owner, 2026-10-21). A sword art that borrows the wind's slash is not one. A heal drawn in
   * its element plays in green instead, whoever casts it (the owner: "la curacion siempre se vera verde").
   */
  elemental?: boolean;
  /**
   * The effect set it is drawn from when not its element's: 'neutral', the white wind cut of a
   * sword art with no element (the owner, 2026-10-21: the Bleeding Cut).
   */
  vfxSet?: 'neutral';
  /** The pose the caster strikes it in, when not the usual one (cast, or attack for melee): the charge pose's stomp, a shoulder tackle. */
  pose?: 'charge' | 'tackle';
  /** How the screen stages it (data for the screen only). */
  seq?: JutsuSeq;
  /** Taijutsu and kenjutsu strikes are delivered in person (the caster dashes in). */
  melee: boolean;
  /**
   * A melee strike that charges in a straight line to its target (up to its range) instead of
   * flashing in: nothing may stand in the way (a wall, a tree), and it provokes no opportunity
   * attacks (the Rush).
   */
  charge?: boolean;
  /**
   * What the caster's hands do with a held weapon: a sword art draws it, a tackle, the Leaf
   * Hurricane's combo and the Chidori's bare-hand thrust stow it (free, once a turn, like stowing it
   * for hand seals).
   */
  weapon?: 'draw' | 'stow';
  /**
   * Loud: casting it in the stealth phase starts the battle. A silent one that wounds a foe counts
   * as an attack there instead (the proposal's piece P6): the target that lives shouts, one that
   * falls unseen leaves a body.
   */
  loud: boolean;
  /** Left on a failed save (or a hit). */
  effect?: EffectId;
  /** A failed save knocks the target down (a ninja; big creatures don't fall). */
  prone?: boolean;
  /**
   * A failed save moves the target `m` meters: away from the caster (a wave), or toward the
   * circle's middle (a tornado). A ninja; big creatures don't move.
   */
  push?: { m: number; toward?: boolean };
  /** Water that puts out the flames on everyone it reaches (every water jutsu that strikes). */
  douse?: boolean;
  /** How long the ground it soaks stays wet, in rounds (a water jutsu; WET_ROUNDS when unset). */
  wetRounds?: number;
  /**
   * Activated, not thrown (the owner, 2026-10-21: the Chidori, and the Rasengan when it is built): the
   * cast charges the near hand with it for up to `rounds` of the caster's turns (shape 'self'), and
   * its blow, one melee jutsu attack, goes off by itself the moment the caster moves within reach of
   * a foe (battle/charged.ts). Its range is that reach.
   */
  handCharge?: { rounds: number };
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
const ELEMENTAL_NATURES = ['Fire', 'Water', 'Wind', 'Lightning', 'Earth'];

/** Per-jutsu touches the data can't say (the screen's effect, special behavior). */
const OVERRIDE: Record<string, Partial<JutsuSpec>> = {
  shadow_clone: { shape: 'self', special: 'clone', vfx: 'aura', loud: false },
  body_flicker: { shape: 'point', special: 'flicker', vfx: 'aura', loud: false },
  // Water by nature, and drawn in it: the water aura wraps the friend as it heals (the owner: the
  // Healing Dew's aura goes on the Palm too), in green like every heal, never the chakra colour (the
  // owner: "la curacion siempre se vera verde").
  mystical_palm: { shape: 'ally', special: 'heal', vfx: 'aura', range: 1.6, loud: false, seq: { healAura: 800 } },
  substitution_kawarimi: { shape: 'self', special: 'kawarimi', cast: 'reaction', vfx: 'hit', loud: false },
  fireball_goukakyu: { vfx: 'sphere', effect: 'burning', sig: 'fireball' },
  // The owner's first round of effect answers (2026-10-21; docs/GAMEPLAY_DESIGN.md, "Jutsu effects,
  // round 1"): data for the screen only.
  dragon_fire_stream: { vfx: 'stream', effect: 'burning', seq: { stage: 'dragonStream' } },
  // No beast (the owner: the elemental beasts will be summons): his dragon head in water on his stream.
  water_dragon_suiryuudan: { vfx: 'stream', seq: { stage: 'waterDragon' } },
  water_shield_suijinheki: { shape: 'wall', special: 'waterWall', vfx: 'wall', length: 4.5 },
  earth_wall_doryuheki: { shape: 'wall', special: 'earthWall', vfx: 'wall', length: 4.5 },
  earth_spear_doryuudan: { shape: 'line', width: 1.2, vfx: 'multi', seq: { stage: 'rockVolleys' } },
  wind_blade_daitoppa: { vfx: 'slash' },
  // Activated (the owner, 2026-10-21: "chidori sera una habilidad que actives"): a bonus action charges
  // the bare hand for up to 3 rounds, and its blow (a melee jutsu attack roll, 5d8) goes off by itself
  // within reach of the first foe the ninja comes to. The weapon is put away; the thrust is still his
  // lightning in the hand (the owner's answer 11).
  chidori_lightning_blade: { shape: 'self', vfx: 'hit', melee: true, weapon: 'stow', handCharge: { rounds: 3 }, seq: { stage: 'handLightning', held: { group: 'vfx_charged', name: 'chidori_hand', anim: 'charged' } } },
  lightning_hound_raidon: { vfx: 'beast' },
  // Not a weapon attack (the owner): the weapon is put away for an unarmed combo.
  leaf_hurricane_senpuu: { shape: 'selfCircle', vfx: 'slash', melee: true, weapon: 'stow', seq: { stage: 'hurricane' } },
  crescent_moon_dance: { vfx: 'slash', melee: true, seq: { stage: 'crescents' } },
  temple_of_nirvana: { special: 'confuse', vfx: 'blast', saveHalf: false, effect: 'confused', seq: { stage: 'crowDive' } },
  dragon_fire_bomb: { vfx: 'breath', effect: 'burning', seq: { stage: 'dragonHead' } },
  // His wood dragon out of his icon strikes out of the ground (the owner's answer 4): no beast flies.
  wood_dragon_jutsu: { element: 'earth', vfx: 'hit', seq: { stage: 'woodDragon' } },
  adamantine_sealing_chains: { element: 'chakra', special: 'seal', vfx: 'stream', effect: 'chakra_sealed', seq: { stage: 'sealChain' } },
  taki_sixtyfour_palms: { vfx: 'multi', melee: true },
  kirin_thunder: { vfx: 'blast', sig: 'kirin' },
  rasenshuriken_wind: { vfx: 'sphere' },
  great_fire_annihilation: { vfx: 'breath', length: 12, effect: 'burning', sig: 'annihilation' },
  wood_golem_titan: { element: 'earth', vfx: 'blast' },
  night_guy_dragon: { element: 'chakra', vfx: 'beast', melee: true },
  // The rank D and C jutsu (the owner's answers of 2026-10-21; docs/GAMEPLAY_DESIGN.md, "Rank D and C
  // jutsu"). The projectiles fly apart, on three paths, to reach the target from different angles.
  fire_three_embers: { vfx: 'multi', seq: { volley: { paths: ['high', 'straight', 'low'], stagger: 110 } } },
  wind_whirl: { vfx: 'bolt' },
  wind_breeze_mantle: { shape: 'self', special: 'mantle', vfx: 'aura', loud: false, seq: { lingerAura: 0.4 } },
  lightning_jolt: { vfx: 'multi', effect: 'jolted', seq: { volley: { paths: ['high', 'straight', 'low'], stagger: 110 } } },
  lightning_spark_fan: { vfx: 'breath', seq: { connected: true, hitEach: { stagger: 80 } } },
  earth_pebble_shot: { vfx: 'multi', seq: { volley: { paths: ['high', 'straight', 'low'], stagger: 110 }, castAura: 560 } },
  // A stomp, no seals: the weapon stays in hand.
  earth_spike_crown: { vfx: 'hit', melee: true, pose: 'charge', seq: { castAura: 400, hitEach: { stagger: 80 } } },
  // The water orb and aura, in green like every heal (the owner).
  water_healing_dew: { shape: 'ally', special: 'heal', vfx: 'bolt', loud: false, seq: { healAura: 800 } },
  water_geyser: { vfx: 'blast', seq: { fromGround: { warn: 300 }, shake: 2 } },
  // Silent (the owner): a silent jutsu that wounds counts as an attack in the stealth phase (P6).
  genjutsu_mirage: { vfx: 'sphere', effect: 'confused', loud: false, seq: { slowFlight: 1.5 } },
  // A sword art with no element: its own cut, the wind's crescent in white (the owner), and the
  // blood it draws thrown the way the cut goes.
  kenjutsu_bleeding_cut: { vfx: 'slash', vfxSet: 'neutral', melee: true, effect: 'bleeding', loud: false, seq: { blood: true } },
  // A shoulder tackle with the weapon put away (the owner): a straight run in, then the blow.
  taijutsu_rush: { vfx: 'hit', melee: true, charge: true, weapon: 'stow', pose: 'tackle', seq: { launchFlash: true, fastRun: 2 } },
  // The gaps in the elements (the owner's answers of 2026-10-21; docs/GAMEPLAY_DESIGN.md, "Jutsu for
  // the gaps"). Water's rank A (the owner's second round: "ola devoradora es rango a"): a 9 m cone
  // that sweeps the ones who fail 3 m away, knocks them down and puts their fire out.
  water_devouring_tide: { vfx: 'breath', push: { m: 3 }, prone: true, douse: true, seq: { castAura: 560, wave: { rows: 3, ms: 1900 }, hitEach: { stagger: 90 }, shake: 6 } },
  // Water's rank S, the Dragon Tsunami (the owner's paint-over of our wave, 2026-10-22; "rango S ola
  // si me gusta la animacion ... la rango s es dragon tsunami"): the Tsunami plus his curl, his water
  // dragon and his kanji, run a little slower so the dragon can rise and roar (2200 ms and the 900 ms
  // break). Its numbers approved by the owner for now (2026-10-22): «aprovado los numeros de la ola
  // por ahora»: the enhanced Tsunami's reach (11.25 m, 80 degrees), and the ground it soaks stays
  // wet a round longer than the Tsunami's (ground.ts WET_ROUNDS, 3, and one more; not imported,
  // ground.ts imports this module).
  water_tide_s: { vfx: 'breath', length: 11.25, angle: 80, push: { m: 3 }, prone: true, douse: true, wetRounds: 4, seq: { castAura: 560, wave: { rows: 3, ms: 2200, dragon: true }, hitEach: { stagger: 90 }, shake: 7 } },
  // Wind's rank A: a tornado that drags the ones who fail 1.5 m toward its middle and knocks them down.
  wind_whirlwind_tower: { vfx: 'blast', push: { m: 1.5, toward: true }, prone: true, seq: { tower: { warn: 300, minis: 6 }, shake: 3 } },
  // The Gale Curtain, made an area by the owner: a gale on the ground that fans the fire jutsu
  // crossing it (fannedBy below). It hurts nobody and is silent.
  wind_gale_curtain: { special: 'galeZone', vfx: 'wall', loud: false },
  // A straight bolt along the line, a spark on each one it runs through.
  lightning_thunder_beam: { vfx: 'stream', width: 1.2, seq: { hitEach: { stagger: 80 } } },
  // Dust and stones along the cone: whoever fails ends up on the ground.
  earth_rubble_gust: { vfx: 'breath', prone: true, seq: { castAura: 560, breathMs: 1400, hitEach: { stagger: 80 } } },
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
    nature: j.nature,
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
    // Sword arts draw the blade by themselves (the proposal's piece P8).
    ...(j.nature === 'Kenjutsu' ? { weapon: 'draw' as const } : {}),
    loud: true,
    env: j.environmentalEffect === 'Ignites Wood' ? 'ignite' : j.environmentalEffect === 'Electrifies Water' ? 'electrify' : j.environmentalEffect === 'Clears Foliage' ? 'clearFoliage' : undefined,
  };
  const spec = { ...base, ...OVERRIDE[j.id] };
  // Elemental by nature, and still drawn as that element (the Adamantine Chains are Water but chakra;
  // an override can say no, for the ones drawn as something else).
  if (spec.elemental === undefined && ELEMENTAL_NATURES.includes(j.nature) && spec.element === ELEMENT[j.nature]) spec.elemental = true;
  // Water puts out the flames of whoever it reaches (the owner, 2026-10-21: "el agua apaga el fuego"):
  // every water jutsu that strikes, not only the Tide.
  if (spec.elemental && spec.element === 'water' && spec.dmgType) spec.douse = true;
  return spec;
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
    elemental: true,
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
    // The owner's name (2026-10-21), after the clan (Ryusei, a shooting star); once Warp Strike / Golpe Warp. The id stays.
    id: 'ryusei_warp',
    name: 'Shooting-Star Thrust',
    nameEs: 'Estocada Fugaz',
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
    nameEs: 'Comando',
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

/** A touch (the Mystical Palm) reaches as far as a hand: no further from above, as a blow. */
export const TOUCH = 1.6;

/**
 * A jutsu reaches further from high ground, as a kunai does: 1.5 m a level above its target or the
 * point it is aimed at (the owner, 2026-10-23: "kunai shuriken y jutsus y todo lo que podria
 * afectarse con mas alcance", and on the second round: "conos solo conos los demas si les da mas
 * alcance"). Everything aimed somewhere has it: at a target (the fire bullets, the dragons, a
 * genjutsu, Command and Submission, a heal at range), at a point (a fireball, a geyser, Kirin, a
 * flicker, a wall or a Kōton structure raised there), along a line (it runs longer), at a Node (the
 * Shooting-Star Thrust, the Spatial Swap). Only a cone keeps its size, and nothing changes for what
 * is no further than a hand: a blow, a melee jutsu, a charged hand, a touch, nor what works around
 * the caster (a clone, Kawarimi, the Leaf Hurricane).
 */
export const reachesFromAbove = (spec: JutsuSpec): boolean =>
  !spec.melee && !spec.handCharge && spec.shape !== 'cone' && spec.shape !== 'self' && spec.shape !== 'selfCircle' && spec.range > TOUCH;

/** How far a jutsu cast from `from` reaches toward `to` (m): its range, and 1.5 m more a level above it when it reaches further from above (heightReach). */
export const jutsuRange = (s: BattleState, spec: JutsuSpec, from: Pt, to: Pt): number => spec.range + (reachesFromAbove(spec) ? heightReach(s, from, to) : 0);

/**
 * The area a jutsu covers on the battle map when cast from `from` at `at`: areaOf, with a line run
 * 1.5 m longer a level the point it is aimed at lies below the caster (a cone keeps its size).
 */
export function areaIn(s: BattleState, spec: JutsuSpec, from: Pt, at: Pt): AreaShape | null {
  const area = areaOf(spec, from, at);
  if (area?.kind !== 'line' || !reachesFromAbove(spec)) return area;
  const more = heightReach(s, from, at);
  return more ? { ...area, length: area.length + more } : area;
}

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

// --- the Gale Curtain: fire through the wind ---------------------------------------------------

/** How near (m) a point is to the segment from a to b, and where along it (0..1) the nearest point is. */
export function nearSegment(a: Pt, b: Pt, p: Pt): { d: number; t: number; at: Pt } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const L2 = dx * dx + dz * dz;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L2)) : 0;
  const at = { x: a.x + dx * t, z: a.z + dz * t };
  return { d: Math.hypot(p.x - at.x, p.z - at.z), t, at };
}

/** An area reaches into a circle on the ground (sampled over the circle: its middle, two rings). */
export function areaTouchesCircle(area: AreaShape, center: Pt, radius: number): boolean {
  if (area.kind === 'circle') return Math.hypot(area.center.x - center.x, area.center.z - center.z) <= area.radius + radius;
  const pts: Pt[] = [center];
  for (const [k, n] of [[0.5, 8], [1, 16]] as const)
    for (let i = 0; i < n; i++) pts.push({ x: center.x + Math.cos((i * 2 * Math.PI) / n) * radius * k, z: center.z + Math.sin((i * 2 * Math.PI) / n) * radius * k });
  return pts.some((p) => inArea(area, p, 0));
}

/**
 * The gale a fire jutsu goes through on its way, if any (the Gale Curtain, the owner's answer of
 * 2026-10-21: "que potencie las técnicas de fuego que pasen por ahí"), and where the fire meets the
 * wind. Whoever casts the fire, a friend or a foe of the gale's maker, the wind doesn't choose. The
 * fire's path is its flight from the caster to its target or point (a single target, a ball that
 * bursts in a circle), and its area (a cone, a line, a circle). The first gale it meets counts; two
 * gales fan it once.
 */
export function fannedBy(spec: JutsuSpec, from: Pt, at: Pt, zones: readonly { id: string; center: Pt; radius: number }[]): { zone: string; at: Pt } | null {
  if (spec.dmgType !== 'Fire' || spec.special || !zones.length) return null;
  const area = areaOf(spec, from, at);
  // Its flight: from the caster to where it lands. A cone or a line runs from the caster to its own
  // end, wherever the point was aimed (a cone aimed past its length stops at its length).
  const end = area && area.kind !== 'circle' ? areaEnd(area) : area?.kind === 'circle' ? area.center : at;
  let best: { zone: string; at: Pt; t: number } | null = null;
  for (const z of zones) {
    const n = nearSegment(from, end, z.center);
    if (n.d <= z.radius) {
      if (!best || n.t < best.t) best = { zone: z.id, at: n.at, t: n.t };
      continue;
    }
    if (area && areaTouchesCircle(area, z.center, z.radius) && !best) best = { zone: z.id, at: { ...z.center }, t: 1 };
  }
  return best && { zone: best.zone, at: best.at };
}

/** The far end of a cone's or a line's middle (the screen draws a beam to it, not to the point aimed at). */
export function areaEnd(area: Extract<AreaShape, { kind: 'cone' | 'line' }>): Pt {
  const a = (area.dir * Math.PI) / 180;
  return { x: area.origin.x + Math.cos(a) * area.length, z: area.origin.z + Math.sin(a) * area.length };
}

/** How many damage dice a gale adds to a fire jutsu: one, two for a rank S. */
export const fanDice = (spec: Pick<JutsuSpec, 'rank'>): number => (spec.rank === 'S' ? 2 : 1);

/** A fanned fire burns harder: one more damage die (two for rank S), the area as it was aimed. */
export function fanned(spec: JutsuSpec): JutsuSpec {
  const more = fanDice(spec);
  return { ...spec, dice: spec.dice?.replace(/^(\d+)d/, (_, n) => `${Number(n) + more}d`) };
}
