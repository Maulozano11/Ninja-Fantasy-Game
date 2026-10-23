// Turns the engine's events into what the screen shows over time: units walking their paths,
// striking and casting, damage numbers, effects, banners and sounds. The engine has already
// decided everything; this only paces it so it can be watched.

import type { AreaShape, BattleEvent, BattleState, Down, GaleZone, Pt, Unit, Wall, WeaponNode } from '../../battle/types';
import type { RollInfo } from '../../battle/types';
import { CLICK_MS, IMPACT, WINDOW, dieLife } from '../dice/diceData';
import type { WindowKind } from '../dice/diceData';
import type { SpritePose } from '../../sprite/types';
import { JUTSU, areaEnd, nearSegment } from '../../battle/jutsu';
import type { JutsuSpec, StageKind, VfxElement, VfxRole } from '../../battle/jutsu';
import { ACTIVATE_MS } from '../../sprite/imbue';
import { COMBO_KICKS, COMBO_TURNED, POSE_FPS, TACKLE_IMPACT_FRAME } from '../../sprite/rig';
import { BLOW_MS, CONDUCT_MS, DOUSE_MS, FAN_MS, FAN_ROLL, GROUND_FADE, TOWER_MS, TOWER_RISE, WAVE_CREST, WAVE_HOLD, blastMs, impactMs, keyCenter, signatureMs, skySignature } from './vfxSprites';
import { jutsuTint, unitTint } from './vfxTintPlan';
import { DRIP_MS, SCREEN_MS, SPRAY_DELAY, SPRAY_LANDED, SPRAY_MS, bleedingStarts, isBleedTick } from './bloodPlan';
import { cellOf, dist } from '../../battle/map';
import { crackKey } from '../../battle/nav';
import { closestPoint } from '../../battle/structures';
import { midpoint } from '../../battle/combat';
import type { Bend } from './paths';
import { bendsOf, seedOf } from './paths';
import { CRESCENT, crescentStart, effectLands, vortexAt } from './stagePlan';
import { edgeFoe } from '../../battle/clans';

export interface UnitView {
  pos: Pt;
  facing: 1 | -1;
  pose: SpritePose;
  /** When the current pose started (ms), for its frames. */
  poseT0: number;
  /** Pose to return to after a one-shot pose ends. */
  poseUntil?: number;
  walk?: { path: Pt[]; t0: number; speed: number; pose: SpritePose; lengths: number[]; total: number };
  /** Gait distance (px) for planted feet. */
  stride: number;
  /** Lunge offset toward a target (px) and when it ends. */
  lunge?: { dx: number; dy: number; t0: number; dur: number };
  hp: number;
  tempHp: number;
  chakra: number;
  down?: Down;
  armed: boolean;
  hidden: boolean;
  crouched: boolean;
  /** Fading out (fled), 0..1. */
  fade?: { t0: number; dur: number };
  hurtUntil: number;
  severed?: boolean;
  /** A creature's own animation (the hydra's bite, spit, roar, hurt, sever, regrow, death). */
  creature?: { anim: string; t0: number };
  /**
   * A Ryusei's phase (Shooting-Star Thrust, Spatial Swap): the ninja turns to blue light where it stands,
   * dashes as light to `to` and turns solid there (PHASE_IN, PHASE_DASH, PHASE_OUT; renderer.ts
   * draws it).
   */
  phase?: { from: Pt; to: Pt; t0: number };
  /** The one frame a one-shot pose holds while it is set (the Chidori's hand drawn back as it gathers). */
  holdFrame?: number;
  /** What crackles in the near hand, drawn at the hand in every pose (the Chidori's lightning). */
  held?: Held;
  /**
   * A Ryusei's Shooting-Star Thrust (the owner, 2026-10-21): the ninja throws its weapon at the Node and
   * turns to blue light in the release pose as it leaves the hand; the weapon flies there with a
   * trail of sparkles, the light body follows it and turns solid where it lands, already in the
   * thrust ('pierce') and catching the weapon, and thrusts at the foe beside it (`foe`) or ahead.
   * `face` is the way it throws and dashes, `land` the way it faces on landing, `fly` how long the
   * weapon flies (ms at speed 1; warpTimes gives the rest; renderer.ts draws it).
   */
  warp?: { from: Pt; to: Pt; t0: number; face: 1 | -1; land: 1 | -1; foe?: string; fly: number };
  /** The cast pose is an enhanced jutsu's: its chakra burst plays empowered. */
  castEnhanced?: boolean;
  /** The element on its weapon (Weapon Element Enhancement): renderer.ts draws it on the weapon in hand. */
  imbue?: 'Fire' | 'Lightning' | 'Wind' | 'Water' | 'Earth';
  /** When the element went onto the weapon: its activation plays from `t0` to `end` (renderer.ts). */
  imbueAct?: { t0: number; end: number };
}

/**
 * A piece of a sheet held in the near hand (renderer.ts draws it where the rig puts the hand): its
 * rows one after another from `t0`, each for `ms` (the last loops until `end`).
 */
export interface Held {
  group: string;
  name: string;
  element: VfxElement;
  tint?: string;
  t0: number;
  end: number;
  rows: { anim: string; ms: number }[];
  /** Drawn the way the ninja faces (mirrored facing left): his lightning round the near forearm is not round. */
  faced?: boolean;
  /** A charged hand's (the activated Chidori): it stays until the charge ends. */
  charged?: boolean;
}

/** How solid the element's aura is round a ninja with a charged hand (the activated Chidori). */
export const CHARGE_AURA = 0.5;
/** How long a mended crack takes to fade (ms at speed 1). */
export const CRACK_FADE = 400;

/**
 * What a charged hand holds (the jutsu's `seq.held`: the activated Chidori's lightning, his two
 * paint-overs flickering), in its chakra colour, until the charge ends.
 */
function chargedHeld(u: Unit | undefined, now: number, jutsu = u?.charged?.jutsu): Held | undefined {
  const spec = jutsu ? JUTSU[jutsu] : undefined;
  const h = spec?.seq?.held;
  if (!spec || !h) return undefined;
  return { group: h.group, name: h.name, element: spec.element, tint: u ? jutsuTint(spec, u) : undefined, t0: now, end: Infinity, rows: [{ anim: h.anim, ms: 1 }], faced: true, charged: true };
}

export interface Floater {
  text: string;
  color: string;
  at: Pt;
  /** Extra pixels up (over a head). */
  rise: number;
  t0: number;
  dur: number;
  big?: boolean;
}

export type FxKind = 'projectile' | 'kunai' | 'area' | 'cone' | 'line' | 'burst' | 'explosion' | 'electric' | 'smoke' | 'heal' | 'aura' | 'noise' | 'slash' | 'wall' | 'seal' | 'fire' | 'sprite' | 'wave' | 'tower' | 'swirl' | 'conduct';

export interface Fx {
  kind: FxKind;
  element: VfxElement;
  from: Pt;
  to: Pt;
  area?: AreaShape | null;
  t0: number;
  dur: number;
  radius?: number;
  enhanced?: boolean;
  sig?: string;
  /** The effect sheet to use (bolt, beast, sphere, slash…). */
  role?: VfxRole;
  /** Height above the ground (px) at the start and end (casting hands, a head). */
  lift?: [number, number];
  /** The unit an aura surrounds, so it centres on the body rather than the feet. */
  unit?: string;
  /** It goes where its unit goes (Evasion's eyes as the Mirai darts aside), not where it started. */
  follow?: boolean;
  /**
   * One projectile of a volley (the rank D jutsu, the owner's answer of 2026-10-21): which of the
   * element's projectiles it is (vfx_dc/<element>_multi_<piece>) and the path it flies to reach the
   * target from its own angle.
   */
  piece?: number;
  path?: VolleyPath;
  /** How solid it is drawn (a lingering aura is faint). */
  alpha?: number;
  /** The effect set when not its element's: 'neutral', the white cut of a sword art with no element. */
  set?: 'neutral';
  /**
   * Blood (vfx_blood, never in a chakra colour): the Bleeding Cut's spray thrown out of the target
   * toward where the cut goes (from → to), or the drip of a ninja that bleeds.
   */
  blood?: 'spray' | 'drip';
  /** A cone drawn as one joined fan from the hand (the Spark Fan), reaching these points. */
  joined?: Pt[];
  /**
   * The caster's chakra colour (a chakra colour id or '#rrggbb'), for an elemental jutsu's effects:
   * they play in it, sheets and drawn ones alike (the owner, 2026-10-21). Taken when the jutsu is
   * cast, so the effect keeps it. A heal's is always the heals' green (HEAL_TINT). Unset: his colours.
   */
  tint?: string;
  /**
   * Drawn among what stands, at this depth (m), so what stands nearer is drawn over it: a wall and
   * a dragon behind the caster, a seal circle under the target's feet (piece P6 of the owner's first
   * round). Unset: over everything.
   */
  depth?: number;
  /** A piece of a sheet held and moved at a point ('sprite', piece P1): see SpriteRun. */
  run?: SpriteRun;
  /**
   * A beam ('line', piece P4) that reaches its end in `grow` ms, stays, and fades over its last
   * `fade` ms, from the height `lift[0]` at its start to `lift[1]` at its end; `noHead`: the stream
   * without its head (a chain).
   */
  beam?: { grow: number; fade: number; noHead?: boolean };
  /**
   * A projectile on a varied path (paths.ts): through these points (m, and px above the ground),
   * each leg bowed by its bend, paced by the legs' length on the ground.
   */
  route?: { at: Pt; lift: number }[];
  bends?: Bend[];
  /**
   * The water dragon: its head (vfx_dragon/water_head, turned along its path) flies for `arrive` ms
   * with its body of water (the stream without its head) laid behind it all the way from the hand;
   * the body fades whole in the rest of the effect's time. The head shows from `appear` ms on (it
   * forms on the jet's tip once that is clear of the caster's body, so it is never drawn over it).
   */
  trail?: { arrive: number; appear?: number };
  /**
   * A fire fanned by a gale (the Gale Curtain): from this point of its play (0..1) it burns
   * brighter, and a Fireball grows into the Great Fireball.
   */
  fan?: number;
  /** A cone's breaths spread across its width, not only along it (the Rubble Gust). */
  spread?: boolean;
  /** A wave's rows of columns (the Devouring Tide); a tower's small whirlwinds (the Whirlwind Tower). */
  rows?: number;
  /** The Dragon Tsunami's wave (Water's rank S): his curl, dragon and kanji ride its crest (vfx_tide_s). */
  tideS?: boolean;
  minis?: number;
  /** Lightning running across a wet patch: its cells ("c,r"), from `from` outward. */
  cells?: string[];
}

/**
 * A piece of one of his sheets played at a point: its rows one after another, each for `ms` (its
 * frames at the sheet's pace, the last held; `back`: backwards; `frames`: just these frames,
 * spread over `ms`), moved along `path` (keyframes: a ground point, else the effect's `from`, plus
 * px; straight between them). Mirrored with `mirror` (px offsets too). `clip`: nothing of it is
 * drawn lower than this many px above its ground point (it rises out of a wall); `fade`: it fades
 * over its last ms.
 */
export interface SpriteRun {
  group: string;
  name: string;
  rows: { anim: string; ms: number; back?: boolean; frames?: number[] }[];
  path?: { ms: number; at?: Pt; dx?: number; dy: number }[];
  mirror?: boolean;
  clip?: number;
  fade?: number;
}

export type VolleyPath = 'high' | 'straight' | 'low';

/** How high the casting hand is in the cast pose (px above the feet), and how far before the body (m). */
const HAND_LIFT = 62;
/** How long the Chidori's lightning gathers in the hand before the ninja moves (ms at speed 1). */
const HAND_GATHER = 760;
const HAND_DX = 0.6;
/** Where a cast leaves the hand of a ninja standing at `p` and facing `facing`. */
const handOf = (p: Pt, facing: number): Pt => ({ x: p.x + facing * HAND_DX, z: p.z });

export interface Banner {
  text: string;
  sub?: string;
  t0: number;
  dur: number;
  tone: 'neutral' | 'good' | 'bad' | 'alarm';
}

/**
 * A d20 on screen: the roll the engine already made, thrown over the one who rolls it (the
 * attacker, the one saving, the one checking) and landing on its exact number. `t0` is when it was
 * thrown; its own clock runs at the battle speed.
 */
export interface DieShow {
  unit: string;
  roll: RollInfo;
  kind: 'attack' | 'save' | 'check' | 'death';
  t0: number;
  /** It went on into the big window, which shows it from then on. */
  windowed?: boolean;
}

/** The big window of a critical or an important roll (opened `t0`, once the small die has landed). */
export interface DiceWindow {
  die: DieShow;
  kind: WindowKind;
  t0: number;
}

/** A critical's blow landing on its target: the bloom, the burst and the maximum damage. */
export interface CritImpact {
  unit: string;
  amount: number;
  t0: number;
}

/** Which events roll a d20 the screen shows (initiative is not shown). */
const diceKind = (ev: BattleEvent): DieShow['kind'] | null =>
  ev.t === 'attack' ? 'attack' : ev.t === 'save' ? 'save' : ev.t === 'check' ? 'check' : ev.t === 'deathSave' ? 'death' : null;

/**
 * Which rolls open the big window (the owner's rules, docs/GAMEPLAY_DESIGN.md "Dice"): a natural
 * 20 on an attack (the critical), a natural 1 on a save (it takes the critical), and a natural 20
 * on a save, a check or a death save.
 */
export function windowOf(ev: BattleEvent): WindowKind | null {
  const k = diceKind(ev);
  if (!k || !('roll' in ev)) return null;
  if (k === 'attack') return ev.roll.crit ? 'crit' : null;
  if (k === 'save' && ev.roll.fumble) return 'fumble';
  return ev.roll.d20 === 20 ? 'nat20' : null;
}

/** A natural 20 or 1, for the die's own effect. */
export const natOf = (r: RollInfo): 20 | 1 | undefined => (r.d20 === 20 ? 20 : r.d20 === 1 ? 1 : undefined);

/** Hooks the screen gives the player: sounds, the log, the roll toast, the camera. */
export interface PlaybackHooks {
  sound(name: SoundName, detail?: string): void;
  log(ev: BattleEvent): void;
  roll(ev: BattleEvent): void;
  focus(unit: string): void;
  shake(power: number): void;
  label(ev: BattleEvent): string | null;
}

export type SoundName =
  | 'step' | 'swing' | 'hit' | 'crit' | 'miss' | 'jutsu' | 'explosion' | 'heal' | 'down' | 'alarm' | 'kawarimi' | 'turn' | 'victory' | 'defeat' | 'roar' | 'splash' | 'bells' | 'stone' | 'draw'
  | 'diceThrow' | 'dicePop' | 'diceNat20' | 'diceNat1' | 'critSting';

const RUN = 5.5;
const WALK = 3.2;
const SNEAK = 2.4;
/** How long a Kōton structure takes to rise out of the ground, and to sink back when it goes (ms). */
export const RISE_MS = 320;
export const FALL_MS = 450;
/**
 * A Ryusei's phase (ms at speed 1): turning to light where it stands, the dash as light, turning
 * solid where it lands. Quick, as a bonus action should be: about two thirds of a second in all.
 */
export const PHASE_IN = 150;
export const PHASE_DASH = 300;
export const PHASE_OUT = 210;
export const PHASE_MS = PHASE_IN + PHASE_DASH + PHASE_OUT;

/** How far along its dash a phase is (0..1) after `ms` of it (at speed 1): quick off the mark, easing into the landing. */
export const phaseDash = (ms: number): number => {
  const t = Math.min(1, Math.max(0, (ms - PHASE_IN) / PHASE_DASH));
  return 1 - (1 - t) ** 2.2;
};

/**
 * A Shooting-Star Thrust (UnitView.warp), ms at speed 1. The throw's wind-up plays a frame each WARP_FRAME
 * ('throw' 0 carga, 1 armado, 2 the throw), so the weapon leaves the hand at WARP_REL, in the
 * release pose (the owner's reference), where the ninja turns to light over WARP_LIGHT. The weapon
 * flies for `fly` (longer the farther it goes); the light body dashes after it and lands WARP_LAG
 * after it, turns solid over WARP_SOLID in the thrust's chamber (catching it), then thrusts
 * ('pierce' 2 estocada, 3 impacto, 4 retroceso, WARP_THRUST each) and stands. About a second in all.
 */
export const WARP_FRAME = 110;
export const WARP_REL = 3 * WARP_FRAME;
export const WARP_LIGHT = 110;
export const WARP_LAG = 50;
export const WARP_SOLID = 100;
export const WARP_THRUST = [90, 100, 100] as const;
/** How long a Shooting-Star Thrust's weapon flies over `metres`. */
export const warpFly = (metres: number): number => Math.round(Math.min(420, Math.max(250, 200 + 12 * metres)));

export interface WarpTimes {
  /** The weapon leaves the hand; the ninja starts turning to light. */
  rel: number;
  /** The light body sets off after the weapon. */
  dash: number;
  /** The weapon reaches the catch. */
  caught: number;
  /** The light body lands; it turns solid, catching the weapon. */
  land: number;
  /** Solid, in the thrust's chamber: the thrust plays. */
  solid: number;
  /** Standing again: the Shooting-Star Thrust is over. */
  end: number;
}

export function warpTimes(fly: number): WarpTimes {
  const caught = WARP_REL + fly;
  const land = caught + WARP_LAG;
  const solid = land + WARP_SOLID;
  return { rel: WARP_REL, dash: WARP_REL + WARP_LIGHT, caught, land, solid, end: solid + WARP_THRUST[0] + WARP_THRUST[1] + WARP_THRUST[2] };
}

/** How far the light body is along a Shooting-Star Thrust's dash (0..1) `ms` into it: quick off the mark, easing into the landing, like a phase. */
export const warpDash = (ms: number, t: WarpTimes): number => {
  const k = Math.min(1, Math.max(0, (ms - t.dash) / (t.land - t.dash)));
  return 1 - (1 - k) ** 2.2;
};

/** How hard the thrown weapon slows into the catch (warpFlight). */
const FLIGHT_EASE = 1.5;

/** How far the thrown weapon is along its flight (0..1) `ms` into the Shooting-Star Thrust: flung hard, slowing a little as it arrives. */
export const warpFlight = (ms: number, t: WarpTimes): number => {
  const k = Math.min(1, Math.max(0, (ms - t.rel) / (t.caught - t.rel)));
  return 1 - (1 - k) ** FLIGHT_EASE;
};

/** When (ms into the Shooting-Star Thrust) the thrown weapon was `w` (0..1) along its flight: warpFlight turned round. */
export const warpFlightMs = (w: number, t: WarpTimes): number => t.rel + (1 - (1 - Math.min(1, Math.max(0, w))) ** (1 / FLIGHT_EASE)) * (t.caught - t.rel);

/** How solid the fire on a burning ninja is drawn (his fire aura, faint so the ninja shows). */
const BURN_ALPHA = 0.6;

export class Playback {
  views = new Map<string, UnitView>();
  floaters: Floater[] = [];
  fx: Fx[] = [];
  banners: Banner[] = [];
  /** Animals that took off (prop index → when). */
  fled = new Map<number, number>();
  /** When each jutsu wall was raised, so it plays its rise before standing. */
  wallBorn = new Map<string, number>();
  /**
   * When a wave's crest gets to each one it reaches (the Devouring Tide): that one's own events (its
   * save, its damage, its sweep and fall) wait for it, so they play as the water goes over them.
   */
  due = new Map<string, number>();
  /** When each gale on the ground started turning, and the ones dying down (from when their event played). */
  zoneBorn = new Map<string, number>();
  zoneGone: { zone: GaleZone; t0: number }[] = [];
  /**
   * When each wet cell and each steam cell ("c,r") showed up on the screen (the wave's cells as its
   * crest goes over them), and the ones drying or thinning away (from when their event played).
   */
  groundBorn = { wet: new Map<string, number>(), steam: new Map<string, number>() };
  groundGone: { kind: 'wet' | 'steam'; cells: string[]; t0: number; blown?: Pt }[] = [];
  /** Kōton structures that crumbled or broke, sinking out of sight (from when their event played). */
  fallen: { wall: Wall; t0: number }[] = [];
  /** Whose turn the screen shows (it trails the engine while events play). */
  turnUnit: string | undefined;
  round = 0;
  queue: BattleEvent[] = [];
  busyUntil = 0;
  /**
   * The queue has emptied but its last event is still playing (a walk, a dart aside, a blow): the
   * views snap to the state only once it has, so nothing jumps to where it ends up.
   */
  private settling = false;
  /** A big signature still playing: the next turn waits for it to finish. */
  lingerUntil = 0;
  speed = 1;
  /** Shakes timed to land with an impact still to come (when, how strong). */
  private shakes: { at: number; power: number }[] = [];
  /**
   * Units wrapped in a lingering aura while a condition lasts (the Breeze Mantle: its wind stays
   * on the ninja, faint, until its next turn): unit → the aura's element, opacity and start.
   */
  lingers = new Map<string, { element: VfxElement; alpha: number; t0: number; tint?: string; charged?: boolean }>();
  /**
   * Ground cracked under a charged ninja's steps (battle/charged.ts), by cell ("c,r"): when it
   * cracks on the screen (as the walker passes it) and when it mends (it fades).
   */
  cracks = new Map<string, { t0: number; gone?: number }>();
  /**
   * Units on fire (Burning): his fire aura burns round them, faint, while it lasts, so water putting
   * it out shows on the map ("el agua apaga el fuego"): unit → when it caught.
   */
  burns = new Map<string, { element: VfxElement; alpha: number; t0: number }>();
  /** Flames put out (Burning ended): a puff of steam rises off the ninja (unit, when). */
  douses: { unit: string; t0: number }[] = [];
  /** What a staged jutsu does later in its own time (piece P5: the next blow of a combo). */
  private timers: { at: number; run: (now: number) => void }[] = [];
  /** Casts played so far: part of the seed of their varied paths, so two casts never fly alike. */
  private casts = 0;
  /** Sounds due later in something already playing (a Shooting-Star Thrust's throw and catch). */
  private cues: { at: number; name: SoundName }[] = [];
  /** The d20s on screen, the big window (one at a time) and the criticals landing. */
  dice: DieShow[] = [];
  diceWindow: DiceWindow | null = null;
  impacts: CritImpact[] = [];
  /** Throw the dice for every roll (off for tools that only want the events paced). */
  diceOn = true;
  /** The roll events whose dice are already thrown (the event itself plays once they land). */
  private thrown = new WeakSet<BattleEvent>();
  /** Until when the queue waits for dice to land (the skip button cuts it short). */
  private diceWait = 0;
  /** Dice sounds still to come (the throw, the click of each die, the natural's chime), at screen time. */
  private sounds: { at: number; name: SoundName; detail?: string }[] = [];
  /**
   * When the jutsu being played reaches its targets (screen time; 0 when not known): the saves
   * against it are thrown so they land then, not after the blast has played out.
   */
  private hitAt = 0;
  /** The skip button never plays a roll before this (the jutsu it answers has not hit yet). */
  private diceFloor = 0;
  /**
   * Blood drops on the screen itself (the owner: "las gotas de sangre manchan la pantalla cuando
   * exitosamente se consigue el sangrado"): when they landed and toward which side the cut went.
   * Drawn over the battle in screen pixels (vfxSprites.ts, drawScreenBlood); nothing waits for them.
   */
  screenBlood: { t0: number; side: 1 | -1; seed: number }[] = [];
  /** The way the last cut that draws blood went (1 right, -1 left), for the drops on the screen. */
  private cutSide: 1 | -1 = 1;

  constructor(state: BattleState, private hooks: PlaybackHooks) {
    this.sync(state, 0);
  }

  /** Snaps every unit to the state (when nothing is playing). */
  sync(state: BattleState, now: number): void {
    for (const u of Object.values(state.units)) {
      const v = this.views.get(u.id);
      const pose = restPose(u);
      const next: UnitView = {
        pos: { ...u.pos },
        facing: u.facing,
        pose: v && !v.walk && v.pose === pose ? v.pose : pose,
        poseT0: v && v.pose === pose ? v.poseT0 : now,
        stride: v?.stride ?? 0,
        hp: u.hp,
        tempHp: u.tempHp,
        chakra: u.chakra,
        down: u.down,
        armed: u.armed,
        hidden: u.cond.hidden !== undefined,
        crouched: !!u.cond.crouched,
        hurtUntil: 0,
        severed: !!u.head?.severed,
        creature: v?.creature,
        fade: u.down === 'fled' ? v?.fade ?? { t0: now - 1000, dur: 1 } : undefined,
        // A charged hand keeps its lightning (the activated Chidori).
        held: u.charged && !u.down ? (v?.held?.charged ? v.held : chargedHeld(u, now)) : undefined,
        imbue: u.imbued && !u.down ? u.imbued.element : undefined,
      };
      this.views.set(u.id, next);
      const mantle = JUTSU.wind_breeze_mantle;
      const charged = u.charged && !u.down ? JUTSU[u.charged.jutsu] : undefined;
      if (charged) {
        if (!this.lingers.get(u.id)?.charged) this.lingers.set(u.id, { element: charged.element, alpha: CHARGE_AURA, t0: now - 2000, tint: jutsuTint(charged, u), charged: true });
      } else if (u.cond.mantle && !u.down && mantle?.seq?.lingerAura) {
        if (!this.lingers.has(u.id)) this.lingers.set(u.id, { element: mantle.element, alpha: mantle.seq.lingerAura, t0: now - 2000, tint: jutsuTint(mantle, u) });
      } else this.lingers.delete(u.id);
      if (u.effects.some((e) => e.id === 'burning') && !u.down) {
        if (!this.burns.has(u.id)) this.burns.set(u.id, { element: 'fire', alpha: BURN_ALPHA, t0: now - 1000 });
      } else this.burns.delete(u.id);
    }
    // The cracked ground as the state has it: new cells show at once, mended ones fade.
    const cracked = state.cracks ?? {};
    for (const k of Object.keys(cracked)) if (!this.cracks.has(k) || this.cracks.get(k)!.gone !== undefined) this.cracks.set(k, { t0: now - 1000 });
    for (const [k, c] of this.cracks) if (!(k in cracked) && c.gone === undefined) c.gone = now;
    if (state.phase === 'combat') {
      this.turnUnit = state.order[state.turn];
      this.round = state.round;
    }
    // Ground that is gone from the state needs no start time any more.
    for (const kind of ['wet', 'steam'] as const) {
      const have = state[kind] ?? {};
      for (const k of this.groundBorn[kind].keys()) if (!(k in have)) this.groundBorn[kind].delete(k);
    }
  }

  /** Events are still playing (the last one too, until it has played out). */
  get busy(): boolean {
    return this.queue.length > 0 || this.settling;
  }

  push(events: BattleEvent[], now: number): void {
    if (!this.queue.length) this.busyUntil = Math.max(this.busyUntil, now);
    this.queue.push(...events);
  }

  /**
   * Throws the dice of the roll at the head of the queue, and of the rolls right after it that
   * happen at the same moment (everyone a blast reaches saves at once; a shove is a contest), each
   * over the one who rolls it. Opens the big window for a critical or an important natural.
   * Returns how long (ms at speed 1) the queue waits before the roll's event plays.
   */
  private throwDice(now: number, real = now): number {
    const first = this.queue[0];
    const group: BattleEvent[] = [first];
    if (first.t === 'save' || first.t === 'check')
      for (let i = 1; i < this.queue.length && group.length < 8 && this.queue[i].t === first.t; i++) {
        // One a wave has still to reach throws its own die when the crest gets there.
        if (this.due.has(unitOfEvent(this.queue[i]) ?? '')) break;
        group.push(this.queue[i]);
      }
    let windowed: DieShow | null = null;
    let kind: WindowKind | null = null;
    let fumble = false;
    for (const ev of group) {
      this.thrown.add(ev);
      const k = diceKind(ev);
      if (!k || !('roll' in ev) || !('unit' in ev)) continue;
      const die: DieShow = { unit: ev.unit, roll: ev.roll, kind: k, t0: now };
      this.dice = this.dice.filter((d) => d.unit !== ev.unit);
      this.dice.push(die);
      const w = windowOf(ev);
      if (w && !windowed) {
        windowed = die;
        die.windowed = true;
        kind = w;
      }
      if (ev.roll.d20 === 1) fumble = true;
    }
    const click = now + CLICK_MS / this.speed;
    // Dice thrown ahead (while a jutsu flies) make their sound when they leave the hand.
    if (now > real) this.sounds.push({ at: now, name: 'diceThrow', detail: String(this.speed) });
    else this.hooks.sound('diceThrow', String(this.speed));
    if (windowed && kind) {
      this.diceWindow = { die: windowed, kind, t0: now + (CLICK_MS + WINDOW.open) / this.speed };
      this.sounds.push({ at: click, name: kind === 'fumble' ? 'diceNat1' : 'diceNat20' });
      return CLICK_MS + WINDOW.go;
    }
    this.sounds.push({ at: click, name: fumble ? 'diceNat1' : 'dicePop' });
    // A natural 1 shows its crack before the action goes on.
    return CLICK_MS + (fumble ? 260 : 90);
  }

  /** Dice are still in the air or the big window is open: the skip button shows. */
  diceRolling(now: number): boolean {
    return now < this.diceWait || (!!this.diceWindow && now < this.diceWindow.t0 + (WINDOW.go - WINDOW.open) / this.speed);
  }

  /** The skip button: the dice land at once, the window closes, and the roll's event plays. */
  skipDice(now: number): void {
    for (const d of this.dice) d.t0 = Math.min(d.t0, now - dieLife(natOf(d.roll)) / this.speed + 300 / this.speed);
    this.diceWindow = null;
    this.sounds = [];
    if (this.busyUntil === this.diceWait && now < this.busyUntil) this.busyUntil = Math.max(now, this.diceFloor);
    this.diceWait = 0;
  }

  /**
   * Runs the queue up to `now`. Returns true once everything has played out: the last event's own
   * time, every walk and every one-shot pose (then the views can snap to the state).
   */
  step(now: number, state: BattleState): boolean {
    while (this.queue.length && now >= this.busyUntil) {
      const next = this.queue[0].t;
      if ((next === 'turn' || next === 'round' || next === 'end') && now < this.lingerUntil) break;
      if (next === 'turn') this.due.clear();
      // A roll: its dice are thrown first, and the event plays once they land. The first event of
      // one a wave's crest has still to reach (due) waits for it, and a roll's dice are thrown so
      // they land as the crest goes over that one (the skip button never plays it sooner).
      const head = this.queue[0];
      const who = unitOfEvent(head);
      const due = who === undefined ? undefined : this.due.get(who);
      const roll = this.diceOn && !!diceKind(head) && !this.thrown.has(head);
      const wait = due === undefined ? 0 : roll ? due - CLICK_MS / this.speed : due;
      if (now < wait) {
        this.busyUntil = wait;
        break;
      }
      if (due !== undefined) this.due.delete(who!);
      if (roll) {
        this.busyUntil = this.diceWait = Math.max(due ?? 0, now + this.throwDice(now) / this.speed);
        this.diceFloor = due ?? 0;
        continue;
      }
      const ev = this.queue.shift()!;
      this.hitAt = 0;
      const d = this.apply(ev, now, state);
      this.busyUntil = now + d / this.speed;
      this.diceFloor = 0;
      // A jutsu its targets save against: their dice are thrown while it flies and land as it hits,
      // and the saves (and the damage) play from there (thrown after the blast had played out, the
      // damage came a second after the explosion).
      const nx = this.queue[0];
      // (Not when a wave's crest has still to reach the one saving: that waits for the crest, above.)
      if (this.diceOn && ev.t === 'jutsu' && nx?.t === 'save' && !this.thrown.has(nx) && !this.due.has(nx.unit)) {
        const hit = Math.max(now, Math.min(this.hitAt || this.busyUntil, this.busyUntil));
        const t0 = Math.max(now, hit - CLICK_MS / this.speed);
        this.busyUntil = this.diceWait = Math.max(hit, t0 + this.throwDice(t0, now) / this.speed);
        this.diceFloor = hit;
      }
      if (!this.queue.length) this.settling = true;
    }
    if (this.timers.length) {
      const due = this.timers.filter((x) => now >= x.at);
      this.timers = this.timers.filter((x) => now < x.at);
      for (const x of due) x.run(now);
    }
    if (this.shakes.length) {
      for (const sh of this.shakes) if (now >= sh.at) this.hooks.shake(sh.power);
      this.shakes = this.shakes.filter((sh) => now < sh.at);
    }
    if (this.cues.length) {
      for (const c of this.cues) if (now >= c.at) this.hooks.sound(c.name);
      this.cues = this.cues.filter((c) => now < c.at);
    }
    // One-shot poses fall back to rest.
    for (const [id, v] of this.views) {
      if (v.poseUntil && now >= v.poseUntil) {
        const u = state.units[id];
        v.poseUntil = undefined;
        v.pose = u ? restPoseView(u, v) : 'idle';
        v.poseT0 = now;
        v.holdFrame = undefined;
      }
      if (v.held && now >= v.held.end) v.held = undefined;
      if (v.phase && now >= v.phase.t0 + PHASE_MS / this.speed) {
        v.phase = undefined;
        const u = state.units[id];
        if (u) v.facing = u.facing;
      }
      if (v.warp && now >= v.warp.t0 + warpTimes(v.warp.fly).end / this.speed) {
        v.facing = v.warp.land;
        v.warp = undefined;
        const u = state.units[id];
        v.pose = u ? restPoseView(u, v) : 'idle';
        v.poseT0 = now;
      }
      if (v.walk && now >= v.walk.t0 + (v.walk.total / v.walk.speed) * 1000 / this.speed) {
        v.pos = { ...v.walk.path[v.walk.path.length - 1] };
        v.walk = undefined;
        // A one-shot pose that began as the walk ended (the Rush's tackle out of its run) plays on.
        if (!v.poseUntil) {
          const u = state.units[id];
          v.pose = u ? restPoseView(u, v) : 'idle';
          v.poseT0 = now;
        }
      }
    }
    for (const s of this.sounds) if (now >= s.at) this.hooks.sound(s.name, s.detail);
    this.sounds = this.sounds.filter((s) => now < s.at);
    this.dice = this.dice.filter((d) => now < d.t0 + dieLife(natOf(d.roll)) / this.speed + 260);
    if (this.diceWindow && now > this.diceWindow.t0 + (WINDOW.go - WINDOW.open + WINDOW.fade) / this.speed) this.diceWindow = null;
    this.impacts = this.impacts.filter((c) => now < c.t0 + (IMPACT.number + IMPACT.numberLife) / this.speed);
    this.floaters = this.floaters.filter((f) => now < f.t0 + f.dur);
    this.zoneGone = this.zoneGone.filter((z) => now < z.t0 + 1000 / this.speed);
    for (const [k, c] of this.cracks) if (c.gone !== undefined && now > c.gone + CRACK_FADE / this.speed) this.cracks.delete(k);
    this.groundGone = this.groundGone.filter((g) => now < g.t0 + (g.blown ? BLOW_MS : GROUND_FADE) / this.speed);
    this.fx = this.fx.filter((f) => now < f.t0 + f.dur);
    this.banners = this.banners.filter((b) => now < b.t0 + b.dur);
    this.fallen = this.fallen.filter((f) => now < f.t0 + FALL_MS / this.speed);
    this.screenBlood = this.screenBlood.filter((b) => now < b.t0 + (SCREEN_MS + 300) / this.speed);
    this.douses = this.douses.filter((d) => now < d.t0 + DOUSE_MS / this.speed);
    // The last jutsu's effects play out whole first (the movement overlay and the next order wait for them).
    if (!this.settling || this.queue.length || this.timers.length || now < this.busyUntil || now < this.lingerUntil) return false;
    for (const v of this.views.values()) if (v.walk || v.phase || v.warp || (v.poseUntil && now < v.poseUntil)) return false;
    this.settling = false;
    return true;
  }

  /** Where a unit is drawn right now (meters), following its walk. */
  posOf(id: string, now: number): Pt {
    const v = this.views.get(id);
    if (!v) return { x: 0, z: 0 };
    if (v.phase) {
      const { from, to, t0 } = v.phase;
      const k = phaseDash((now - t0) * this.speed);
      return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k };
    }
    if (v.warp) {
      const { from, to, t0, fly } = v.warp;
      const k = warpDash((now - t0) * this.speed, warpTimes(fly));
      return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k };
    }
    const w = v.walk;
    if (!w) return v.pos;
    const travelled = Math.max(0, Math.min(w.total, (((now - w.t0) * this.speed) / 1000) * w.speed));
    let acc = 0;
    let prev = v.pos;
    for (let i = 0; i < w.path.length; i++) {
      const seg = w.lengths[i];
      const p = w.path[i];
      if (acc + seg >= travelled) {
        const t = seg > 0 ? (travelled - acc) / seg : 1;
        return { x: prev.x + (p.x - prev.x) * t, z: prev.z + (p.z - prev.z) * t };
      }
      acc += seg;
      prev = p;
    }
    return w.path[w.path.length - 1];
  }

  /** Walls already gone from the state whose breaking (or fading) hasn't played yet: they still show. */
  goneWalls(): Wall[] {
    const out: Wall[] = [];
    for (const e of this.queue) if (e.t === 'wall' && !e.on) out.push(e.wall);
    return out;
  }

  /**
   * Ground cells whose event is still to play: the ones coming (`on`, not shown yet unless the
   * wave already timed them) and the ones going (still shown).
   */
  groundQueued(kind: 'wet' | 'steam', on: boolean): Set<string> {
    const out = new Set<string>();
    for (const e of this.queue) if (e.t === 'ground' && e.kind === kind && e.on === on) for (const k of e.cells) out.add(k);
    return out;
  }

  /**
   * Props burnt, cut or blown up by events still to play: they still stand until their moment comes
   * (a bush burns as the fireball lands, not as it is cast).
   */
  propsQueued(): Set<number> {
    const out = new Set<number>();
    for (const e of this.queue) if (e.t === 'prop') out.add(e.prop);
    return out;
  }

  /** Gales already gone from the state whose dying down hasn't played yet: they still turn. */
  goneZones(): GaleZone[] {
    const out: GaleZone[] = [];
    for (const e of this.queue) if (e.t === 'zone' && !e.on) out.push(e.zone);
    return out;
  }

  /** Weapon Nodes already gone from the state (a fourth replaced them) whose removal hasn't played yet. */
  goneNodes(): WeaponNode[] {
    const out: WeaponNode[] = [];
    for (const e of this.queue) if (e.t === 'node' && !e.on) out.push(e.node);
    return out;
  }

  /** A wall by id: standing, or gone with an event still to play. */
  wallOf(id: string, state: BattleState): Wall | undefined {
    return state.walls.find((w) => w.id === id) ?? this.goneWalls().find((w) => w.id === id);
  }

  /** A unit is shown under a Northstar's Command: from when its Command plays until its release does. */
  commandedNow(u: Unit): boolean {
    const next = this.queue.find((e) => e.t === 'command' && e.unit === u.id);
    return next?.t === 'command' ? !next.on : !!u.commanded;
  }

  /** A structure's HP as the screen shows it: the hits still waiting to play haven't landed yet. */
  wallHp(w: Wall): number {
    let hp = w.hp;
    for (const e of this.queue) if (e.t === 'wallHit' && e.wall === w.id) hp += e.amount;
    return Math.min(w.maxHp ?? hp, hp);
  }

  /** Metres walked so far (for the gait frame). */
  walked(id: string, now: number): number {
    const w = this.views.get(id)?.walk;
    if (!w) return 0;
    return Math.max(0, Math.min(w.total, (((now - w.t0) * this.speed) / 1000) * w.speed));
  }

  private view(id: string): UnitView | undefined {
    return this.views.get(id);
  }

  /** The jutsu just played is followed by its caster's phase (a Spatial Swap resisted has none). */
  private phaseFollows(id: string): boolean {
    for (const e of this.queue) {
      if (e.t === 'teleport' && e.how === 'phase' && e.unit === id) return true;
      if (e.t === 'jutsu' || e.t === 'turn' || e.t === 'attack' || e.t === 'move') return false;
    }
    return false;
  }

  /**
   * Who the jutsu just played reaches, in the order its events tell them (their saves, the rolls
   * against them, their damage), up to the next thing that happens on its own.
   */
  private reached(id: string): string[] {
    const out: string[] = [];
    for (const e of this.queue) {
      if (e.t === 'jutsu' || e.t === 'turn' || e.t === 'round' || e.t === 'move' || e.t === 'end') break;
      const who = e.t === 'save' || e.t === 'damage' ? e.unit : e.t === 'attack' ? e.target : undefined;
      if (who && who !== id && !out.includes(who) && !who.includes(':')) out.push(who);
    }
    return out;
  }

  /** The jutsu just played misses its target (its attack roll comes next and fails). */
  private missedNext(id: string): boolean {
    for (const e of this.queue) {
      if (e.t === 'attack' && e.unit === id) return !e.roll.success;
      if (e.t === 'jutsu' || e.t === 'turn' || e.t === 'move') break;
    }
    return false;
  }

  /** A shake that lands `ms` (at speed 1) from now, with the impact it goes with. */
  private shakeAt(now: number, ms: number, power: number): void {
    this.shakes.push({ at: now + ms / this.speed, power });
  }

  /** Runs `run` `ms` (at speed 1) from now. */
  private later(now: number, ms: number, run: (now: number) => void): void {
    this.timers.push({ at: now + ms / this.speed, run });
  }

  private setPose(v: UnitView, pose: SpritePose, now: number, dur?: number): void {
    v.pose = pose;
    v.poseT0 = now;
    v.holdFrame = undefined;
    v.poseUntil = dur ? now + dur / this.speed : undefined;
  }

  private float(text: string, color: string, at: Pt, now: number, o: Partial<Floater> = {}): void {
    // Words and numbers on the same spot stack upward, clear of each other ("Resiste" over "-3").
    const near = this.floaters.filter((f) => dist(f.at, at) < 0.8 && now - f.t0 < 800 / this.speed);
    let rise = o.rise ?? 96;
    while (near.some((f) => Math.abs(f.rise - rise) < 17)) rise += 17;
    this.floaters.push({ text, color, at: { ...at }, t0: now, dur: 1100 / this.speed, ...o, rise });
  }

  /**
   * The rank D and C jutsu that are staged their own way (the owner's answers of 2026-10-21;
   * JutsuSpec seq, pose and vfxSet): three projectiles on three paths, the joined fan, the stomp,
   * the white cut, the tackle, the geyser out of the ground, the healing orb. Returns how long to
   * wait before the next event, or null to play the jutsu the usual way.
   */
  private staged(ev: Extract<BattleEvent, { t: 'jutsu' }>, spec: JutsuSpec, a: UnitView, from: Pt, now: number, label: string | null, tint: string | undefined): number | null {
    const h = this.hooks;
    const seq = spec.seq ?? {};
    const el = spec.element;
    const at = (ms: number) => now + ms / this.speed;
    const linger = (ms: number) => (this.lingerUntil = Math.max(this.lingerUntil, now + ms / this.speed));
    // In the caster's chakra colour when it is an elemental jutsu (the owner, 2026-10-21); a heal's in green.
    const base = { element: el, enhanced: ev.enhanced, role: spec.vfx, tint };
    // What it throws leaves the casting hand (before the body, at chest height), not the head.
    const hand = handOf(from, a.facing);
    const announce = () => {
      h.sound('jutsu', el);
      if (label) this.float(label, '#fde68a', from, now, { rise: 128, dur: 1400 });
    };
    // The cast beat and the flight pace of every jutsu (see the usual way below).
    const CAST = 560;
    const flight = (to: Pt) => Math.max(500, dist(hand, to) * 115);
    if (seq.stage) return this.round1(seq.stage, ev, spec, a, from, now, label, tint);

    if (spec.pose === 'tackle') {
      // The Rush (the owner: the weapon put away, a tackle): straight out of the run into the
      // shoulder, the blow landing on the tackle's impact frame with a jolt of the screen.
      announce();
      const hit = (TACKLE_IMPACT_FRAME / POSE_FPS.tackle) * 1000;
      this.setPose(a, 'tackle', now, 650);
      // The shoulder drives on into the foe (about 57 px a metre), not just a lean.
      const d = Math.max(0.01, dist(from, ev.at));
      const reach = Math.max(12, Math.min(30, (d - 0.6) * 57));
      a.lunge = { dx: ((ev.at.x - from.x) / d) * reach, dy: ((ev.at.z - from.z) / d) * reach * 0.4, t0: now, dur: 2 * hit };
      if (!this.missedNext(ev.unit)) {
        const hitMs = impactMs(el, 'hit', 700);
        this.fx.push({ ...base, kind: 'burst', from, to: ev.at, t0: at(hit), dur: hitMs, lift: [54, 54], role: 'hit' });
        this.shakeAt(now, hit, 4);
        linger(hit + hitMs);
      }
      return hit + 60;
    }

    if (spec.vfxSet === 'neutral') {
      // The Bleeding Cut: the attack pose, and on its strike frame one white crescent (his wind cut
      // with no element) crosses the target and fades.
      announce();
      this.setPose(a, 'attack', now, 900);
      // The blade comes down on the attack pose's second frame: the cut follows it, and a miss cuts nothing.
      const strike = 1000 / POSE_FPS.attack + 30;
      h.sound('swing');
      if (this.missedNext(ev.unit)) return strike;
      this.fx.push({ ...base, kind: 'slash', set: 'neutral', from, to: ev.at, t0: at(strike), dur: 480, lift: [58, 58] });
      linger(strike + 480);
      if (seq.blood) {
        // The blood bursts out of the target as the crescent crosses it, thrown the way the cut goes
        // (from → to), and the next turn waits until its drops are down. Never in a chakra colour.
        this.cutSide = ev.at.x < from.x - 0.01 ? -1 : 1;
        this.fx.push({ ...base, tint: undefined, kind: 'burst', blood: 'spray', from, to: ev.at, t0: at(strike + SPRAY_DELAY), dur: SPRAY_MS });
        linger(strike + SPRAY_DELAY + SPRAY_LANDED);
      }
      return strike + 120;
    }

    if (spec.pose === 'charge') {
      // The Spike Crown: the charge pose's stomp in the element's aura, then a burst of rock on
      // each one it reaches, one after another; the ninja stays in sight.
      announce();
      const gather = seq.castAura ?? 400;
      this.setPose(a, 'charge', now, gather + 250);
      this.fx.push({ ...base, kind: 'aura', from, to: from, t0: now, dur: gather + 450, unit: ev.unit });
      const who = this.reached(ev.unit);
      const stagger = seq.hitEach?.stagger ?? 80;
      const hitMs = impactMs(el, 'hit', 900);
      who.forEach((id, i) => this.fx.push({ ...base, kind: 'burst', from, to: this.posOf(id, now), t0: at(gather + i * stagger), dur: hitMs, lift: [50, 50], role: 'hit' }));
      this.shakeAt(now, gather, 2);
      const last = gather + Math.max(0, who.length - 1) * stagger;
      linger(last + hitMs);
      return last + 250;
    }

    if (seq.volley && !ev.shape) {
      // Three Embers, Jolt, Pebble Shot (the owner): the projectiles fly apart, one after another,
      // each on its own path (a high arc, a straight line, a low curve) so they reach the target
      // from different angles, each with its own impact. A miss sends them past, into the ground.
      announce();
      this.setPose(a, 'cast', now, 900);
      if (seq.castAura) this.fx.push({ ...base, kind: 'aura', from, to: from, t0: now, dur: seq.castAura + 300, unit: ev.unit });
      const miss = this.missedNext(ev.unit);
      const hitMs = impactMs(el, spec.vfx, 900);
      const { paths, stagger } = seq.volley;
      let end = 0;
      paths.forEach((path, i) => {
        const to = miss ? pastTarget(hand, ev.at, path) : ev.at;
        const fly = flight(ev.at) * VOLLEY[path].pace;
        const t0 = CAST + i * stagger;
        const lift: [number, number] = [HAND_LIFT, miss ? 4 : VOLLEY[path].lands];
        this.fx.push({ ...base, kind: 'projectile', from: hand, to, t0: at(t0), dur: fly, lift, path, piece: i });
        this.fx.push({ ...base, kind: 'burst', from, to, t0: at(t0 + fly), dur: hitMs, lift, path, piece: i });
        end = Math.max(end, t0 + fly);
      });
      linger(end + hitMs);
      return end;
    }

    if (seq.connected && ev.shape?.kind === 'cone') {
      // The Spark Fan: his forked lightning chained from the hand into one joined fan over the
      // cone, then a spark bursting on each one it reaches, one after another.
      announce();
      this.setPose(a, 'cast', now, 900);
      const who = this.reached(ev.unit);
      const pts = who.map((id) => this.posOf(id, now));
      this.fx.push({ ...base, kind: 'cone', from, to: ev.at, area: ev.shape, t0: at(CAST), dur: FAN_MS, lift: [64, 44], joined: pts });
      const stagger = seq.hitEach?.stagger ?? 80;
      const hitMs = impactMs(el, 'hit', 900);
      const len = ev.shape.length;
      let end = CAST + FAN_MS;
      pts.forEach((p, i) => {
        const reach = FAN_ROLL * Math.min(1, dist(from, p) / len);
        const t0 = CAST + reach + i * stagger;
        this.fx.push({ ...base, kind: 'burst', from, to: p, t0: at(t0), dur: hitMs, lift: [56, 56], role: 'hit' });
        end = Math.max(end, t0 + hitMs);
      });
      // The next turn waits for the fan and its last spark.
      linger(end);
      return CAST + 900;
    }

    if (seq.fromGround && ev.shape?.kind === 'circle') {
      // The Geyser: no projectile; the ground splashes where it will burst, then the geyser rises
      // out of it with a jolt of the screen (piece P4, like the Kirin's storm).
      announce();
      this.setPose(a, 'cast', now, 900);
      const c = ev.shape.center;
      const warn = seq.fromGround.warn;
      // The splash sits on the ground where it will burst (its middle at the feet), not on the body.
      this.fx.push({ ...base, kind: 'burst', from: c, to: c, t0: at(CAST), dur: warn + 200, lift: [6, 6], role: 'hit' });
      const boom = blastMs(el, 1200);
      this.fx.push({ ...base, kind: 'area', from: c, to: c, area: ev.shape, t0: at(CAST + warn), dur: boom });
      if (seq.shake) this.shakeAt(now, CAST + warn, seq.shake + (ev.enhanced ? 1 : 0));
      linger(CAST + warn + boom);
      return CAST + warn + 300;
    }

    if (seq.wave && ev.shape?.kind === 'cone') {
      // The Devouring Tide: the water rises round the caster, then a wave runs out along the cone (a
      // row of the element's water columns, the rows behind its crest fading, its spray before it);
      // a splash on each one as the crest goes over them, and a heavy jolt as it breaks at the end.
      announce();
      this.setPose(a, 'cast', now, 900);
      const gather = seq.castAura ?? CAST;
      this.fx.push({ ...base, kind: 'aura', from, to: from, t0: now, dur: gather + 400, unit: ev.unit });
      const cone = ev.shape;
      const run = seq.wave.ms;
      // The water stays a moment at the end of its run (WAVE_HOLD), while the last ones are swept.
      this.fx.push({ ...base, kind: 'wave', from: cone.origin, to: ev.at, area: cone, t0: at(gather), dur: run + WAVE_HOLD, rows: seq.wave.rows, ...(seq.wave.dragon ? { tideS: true } : {}) });
      // The ground it soaks darkens as the crest goes over each cell (its event plays later).
      const soaked = this.queue.find((e) => e.t === 'ground' && e.kind === 'wet' && e.on && e.by === ev.unit);
      if (soaked && soaked.t === 'ground') for (const k of soaked.cells) this.groundBorn.wet.set(k, at(gather + run * WAVE_CREST(dist(cone.origin, keyCenter(k)), cone.length)));
      const hitMs = impactMs(el, 'hit', 900);
      // Nearest first: each one's save, damage, sweep and fall play as the crest goes over them.
      const crest = (id: string) => gather + run * WAVE_CREST(dist(cone.origin, this.posOf(id, now)), cone.length);
      const who = this.reached(ev.unit).sort((p, q) => crest(p) - crest(q));
      this.groupByUnit(who);
      this.due.clear();
      who.forEach((id) => {
        const t0 = crest(id);
        this.fx.push({ ...base, kind: 'burst', from, to: this.posOf(id, now), t0: at(t0), dur: hitMs, lift: [50, 50], role: 'hit' });
        this.due.set(id, at(t0 + 80));
      });
      this.shakeAt(now, gather + run * 0.9, (seq.shake ?? 6) + (ev.enhanced ? 1 : 0));
      linger(gather + run + WAVE_HOLD);
      return gather;
    }

    if (seq.tower && ev.shape?.kind === 'circle') {
      // The Whirlwind Tower: a warning burst of leaves at the point, then the element's tornado
      // column rises there and turns with small whirlwinds circling it, an impact on each one reached.
      announce();
      this.setPose(a, 'cast', now, 900);
      const c = ev.shape.center;
      const warn = seq.tower.warn;
      this.fx.push({ ...base, kind: 'burst', from: c, to: c, t0: at(CAST), dur: impactMs(el, 'hit', 700), lift: [6, 6], role: 'hit' });
      this.fx.push({ ...base, kind: 'tower', from: c, to: c, area: ev.shape, t0: at(CAST + warn), dur: TOWER_MS, minis: seq.tower.minis });
      const up = CAST + warn + TOWER_RISE;
      const who = this.reached(ev.unit);
      const hitMs = impactMs(el, 'hit', 900);
      who.forEach((id, i) => this.fx.push({ ...base, kind: 'burst', from, to: this.posOf(id, now), t0: at(up + i * 80), dur: hitMs, lift: [56, 56], role: 'hit' }));
      if (seq.shake) this.shakeAt(now, up, seq.shake + (ev.enhanced ? 1 : 0));
      // The saves' dice land as the column has risen and strikes.
      this.hitAt = at(up);
      linger(CAST + warn + TOWER_MS);
      return up + Math.max(0, who.length - 1) * 80 + 200;
    }

    if (seq.hitEach && ev.shape?.kind === 'line') {
      // The Thunder Beam: the element's beam runs out along the line, a spark on each one it reaches
      // as its head gets there.
      announce();
      this.setPose(a, 'cast', now, 900);
      const LINE = 1300;
      // The beam runs the whole line, wherever the point was aimed (the engine hits everyone in it).
      this.fx.push({ ...base, kind: 'line', from, to: areaEnd(ev.shape), area: ev.shape, t0: at(CAST), dur: LINE, lift: [HAND_LIFT, 50] });
      const who = this.reached(ev.unit);
      const hitMs = impactMs(el, 'hit', 900);
      const len = ev.shape.length;
      let end = CAST + 900;
      who.forEach((id, i) => {
        const p = this.posOf(id, now);
        // The beam's head reaches the end of the line at 1/1.8 of its play (vfxSprites.ts).
        const t0 = CAST + (LINE / 1.8) * Math.min(1, dist(from, p) / len) + i * seq.hitEach!.stagger;
        this.fx.push({ ...base, kind: 'burst', from, to: p, t0: at(t0), dur: hitMs, lift: [56, 56], role: 'hit' });
        end = Math.max(end, t0 + hitMs);
        // The saves' dice land as the beam's head reaches the first one.
        if (i === 0 || at(t0) < this.hitAt) this.hitAt = at(t0);
      });
      linger(Math.max(end, CAST + LINE));
      return CAST + 900;
    }

    if (seq.breathMs && ev.shape?.kind === 'cone') {
      // The Rubble Gust: the earth aura rises while the ninja casts, then the dust and stones roll
      // out along the cone, a rock impact on each one reached as the dust gets there.
      announce();
      this.setPose(a, 'cast', now, 900);
      const gather = seq.castAura ?? CAST;
      this.fx.push({ ...base, kind: 'aura', from, to: from, t0: now, dur: gather + 300, unit: ev.unit });
      this.fx.push({ ...base, kind: 'cone', from, to: ev.at, area: ev.shape, t0: at(gather), dur: seq.breathMs, lift: [70, 30], spread: true });
      const who = this.reached(ev.unit);
      const hitMs = impactMs(el, 'hit', 900);
      const len = ev.shape.length;
      let end = gather + 900;
      who.forEach((id, i) => {
        const p = this.posOf(id, now);
        // The breaths show one by one over the first 60 % of its play (vfxSprites.ts).
        const t0 = gather + seq.breathMs! * 0.6 * Math.min(1, dist(from, p) / len) + i * (seq.hitEach?.stagger ?? 80);
        this.fx.push({ ...base, kind: 'burst', from, to: p, t0: at(t0), dur: hitMs, lift: [50, 50], role: 'hit' });
        end = Math.max(end, t0 + hitMs);
        // The saves' dice land as the dust reaches the first one.
        if (i === 0 || at(t0) < this.hitAt) this.hitAt = at(t0);
      });
      linger(Math.max(end, gather + seq.breathMs));
      return gather + 900;
    }

    if (seq.healAura && spec.special === 'heal') {
      // The Healing Dew: the element's orb flies to the ally and its aura wraps them as they heal.
      // The Mystical Palm heals by touch: no orb, only the aura (the owner: the Dew's aura on it too).
      announce();
      this.setPose(a, 'cast', now, 900);
      const healed = this.healedNext();
      const to = healed ? this.posOf(healed, now) : ev.at;
      const fly = spec.vfx === 'aura' || dist(from, to) < 0.3 ? 0 : flight(to);
      if (fly) this.fx.push({ ...base, kind: 'projectile', from: hand, to, t0: at(CAST), dur: fly, lift: [HAND_LIFT, 50], role: 'bolt' });
      this.fx.push({ ...base, kind: 'aura', from: to, to, t0: at(CAST + fly), dur: seq.healAura, unit: healed });
      linger(CAST + fly + seq.healAura);
      return CAST + fly + 250;
    }
    return null;
  }

  /**
   * The jutsu staged with the pieces of the owner's first round of effect answers (2026-10-21;
   * docs/GAMEPLAY_DESIGN.md, "Jutsu effects, round 1"), all from his sheets. Times are ms after the
   * jutsu's event at speed 1 (for a melee one, the moment the ninja reaches its target). Returns how
   * long to wait before the next event (the damage shows then); `hitAt` is set to when it first hits
   * someone, so the saves' dice are thrown while it plays and land with that blow.
   */
  private round1(stage: StageKind, ev: Extract<BattleEvent, { t: 'jutsu' }>, spec: JutsuSpec, a: UnitView, from: Pt, now: number, label: string | null, tint: string | undefined): number {
    const h = this.hooks;
    const el = spec.element;
    const at = (ms: number) => now + ms / this.speed;
    const linger = (ms: number) => (this.lingerUntil = Math.max(this.lingerUntil, now + ms / this.speed));
    const base = { element: el, enhanced: ev.enhanced, tint };
    const f = a.facing;
    const CAST = 560;
    const seed = seedOf(`${ev.unit}|${ev.jutsu}|${ev.at.x.toFixed(2)}|${ev.at.z.toFixed(2)}|${this.casts++}`);
    const announce = (rise = 128) => {
      h.sound('jutsu', el);
      if (label) this.float(label, '#fde68a', from, now, { rise, dur: 1400 });
    };
    const burst = (element: VfxElement, to: Pt, t0: number, lift: number, role: VfxRole = 'hit', tintOf = tint) => {
      const dur = impactMs(element, role, 800);
      this.fx.push({ element, tint: tintOf, kind: 'burst', from, to, t0: at(t0), dur, lift: [lift, lift], role });
      return t0 + dur;
    };
    /** A piece of a sheet (P1) starting `t0` ms from now: its rows, path and the rest (SpriteRun). */
    const piece = (o: Omit<SpriteRun, 'mirror'> & { t0: number; from: Pt; element?: VfxElement; tint?: string; depth?: number }) => {
      const dur = o.rows.reduce((n, r) => n + r.ms, 0);
      const { t0, from: p, element, tint: tt, depth, ...run } = o;
      this.fx.push({ kind: 'sprite', element: element ?? el, tint: element && element !== el ? undefined : tt ?? tint, from: p, to: p, t0: at(t0), dur, depth, run: { ...run, mirror: f < 0 } });
      return t0 + dur;
    };
    const who = this.reached(ev.unit);
    const pts = who.map((id) => this.posOf(id, now));
    const ahead = (dx: number, dz = 0): Pt => ({ x: from.x + f * dx, z: from.z + dz });
    /** The saves' dice land as it first hits someone, `ms` from now. */
    const hits = (ms: number) => (this.hitAt = at(ms));
    /**
     * How long a blow that would land sooner than a die can fly waits (ms), so the saves' dice,
     * thrown with the jutsu, land with it `first` ms from now (a melee jutsu strikes as it arrives).
     */
    const lead = (first: number) => (this.diceOn && this.queue[0]?.t === 'save' && !this.thrown.has(this.queue[0]) ? Math.max(0, CLICK_MS - first) : 0);

    switch (stage) {
      case 'dragonHead': {
        // 1A: his flame wall rises behind the ninja, his dragon head of the Great Annihilation rises
        // out of it with a fireball in its mouth and spits a fan of fireballs over the cone, each
        // bursting on the one it reaches (or at the cone's end); the head burns and sinks as in his
        // Annihilation, and the wall goes down with its own frames backwards.
        // The name at the usual height: higher, it floated up among the round counter and the initiative bar.
        announce();
        this.setPose(a, 'cast', now, 900);
        const cone = ev.shape?.kind === 'cone' ? ev.shape : null;
        const wallAt = ahead(-3.3, -0.37);
        const mouth = ahead(-0.7, -0.37);
        const UP = 151;
        piece({ group: 'vfx_fire', name: 'wall', element: 'fire', t0: CAST, from: wallAt, depth: wallAt.z, rows: [{ anim: 'rise', ms: 1000 }, { anim: 'idle', ms: 900 }, { anim: 'rise', ms: 1000, back: true }] });
        const headPath = [{ ms: 0, dy: -UP + 260 }, { ms: 400, dy: -UP }, { ms: 750, dy: -UP }, { ms: 1417, dy: -UP + 200 }];
        piece({ group: 'vfx_dragon', name: 'fire_head', element: 'fire', t0: 950, from: mouth, depth: wallAt.z - 0.002, clip: 0, path: headPath, rows: [{ anim: 'idle', ms: 750 }, { anim: 'fade', ms: 667 }] });
        // The fireball in its mouth until it spits.
        piece({ group: 'vfx_fire', name: 'bolt', element: 'fire', t0: 1150, from: mouth, depth: wallAt.z - 0.001, path: [{ ms: 0, dy: -UP }], rows: [{ anim: 'fly', ms: 200 }] });
        const n = ev.enhanced ? 7 : 5;
        const dir = ((cone?.dir ?? (f > 0 ? 0 : 180)) * Math.PI) / 180;
        const spread = ((cone?.angle ?? 60) * Math.PI) / 180;
        const len = cone?.length ?? 9;
        // The fan's angles; each one reached takes the ball nearest its own angle, the rest burst at the cone's end.
        const angles = Array.from({ length: n }, (_, i) => dir - spread / 2 + (spread * (i + 0.5)) / n);
        const dest: { to: Pt; foe: boolean }[] = angles.map((ang) => ({ to: { x: from.x + Math.cos(ang) * len, z: from.z + Math.sin(ang) * len }, foe: false }));
        const free = new Set(angles.map((_, i) => i));
        for (const p of pts) {
          const ang = Math.atan2(p.z - from.z, p.x - from.x);
          let best = -1;
          for (const i of free) if (best < 0 || Math.abs(angles[i] - ang) < Math.abs(angles[best] - ang)) best = i;
          if (best < 0) break;
          free.delete(best);
          dest[best] = { to: p, foe: true };
        }
        let first = Infinity;
        let end = 3460;
        dest.forEach((d, i) => {
          const t0 = 1350 + (i * 400) / Math.max(1, n - 1);
          const fly = Math.max(350, dist(mouth, d.to) * 75);
          this.fx.push({ ...base, kind: 'projectile', role: 'bolt', from: mouth, to: d.to, t0: at(t0), dur: fly, lift: [UP, d.foe ? 50 : 24] });
          end = Math.max(end, burst(el, d.to, t0 + fly, d.foe ? 50 : 24));
          if (d.foe) first = Math.min(first, t0 + fly);
        });
        if (Number.isFinite(first)) this.shakeAt(now, first, 3);
        hits(Number.isFinite(first) ? first : 1750);
        linger(end);
        return Number.isFinite(first) ? first : 1750;
      }
      case 'dragonStream': {
        // 2A: the half-size wall and head behind the ninja; the stream leaves the mouth and reaches
        // the END of the line in 400 ms, a hit on each one as it gets there; the head burns.
        announce(260);
        this.setPose(a, 'cast', now, 900);
        const line = ev.shape?.kind === 'line' ? ev.shape : null;
        const wallAt = ahead(-1.6, -0.32);
        const mouth = ahead(-0.5, -0.32);
        const UP = 106;
        piece({ group: 'vfx_dragon', name: 'fire_wall_half', element: 'fire', t0: CAST, from: wallAt, depth: wallAt.z, rows: [{ anim: 'rise', ms: 1000 }, { anim: 'idle', ms: 590 }, { anim: 'rise', ms: 1000, back: true }] });
        piece({ group: 'vfx_dragon', name: 'fire_head_half', element: 'fire', t0: 800, from: mouth, depth: wallAt.z - 0.002, clip: 0, path: [{ ms: 0, dy: -UP + 130 }, { ms: 300, dy: -UP }, { ms: 1200, dy: -UP }, { ms: 1867, dy: -UP + 100 }], rows: [{ anim: 'idle', ms: 1200 }, { anim: 'fade', ms: 667 }] });
        // The whole line, wherever the point was aimed (areaEnd, as the Thunder Beam).
        const endAt = line ? areaEnd(line) : ahead(spec.length ?? 10.5);
        const GROW = 400;
        this.fx.push({ ...base, kind: 'line', from: mouth, to: endAt, t0: at(1100), dur: 1200, lift: [UP, 50], beam: { grow: GROW, fade: 300 } });
        let first = Infinity;
        let end = 3150;
        pts.forEach((p) => {
          const k = Math.min(1, dist(mouth, p) / Math.max(0.1, dist(mouth, endAt)));
          const t0 = 1100 + GROW * k;
          first = Math.min(first, t0);
          // The fire hit where the stream passes it (the stream comes down from the mouth to the line's end).
          end = Math.max(end, burst(el, p, t0, Math.round(UP + (50 - UP) * k)));
        });
        hits(Number.isFinite(first) ? first : 1500);
        linger(end);
        return Number.isFinite(first) ? first : 1500;
      }
      case 'waterDragon': {
        // 7: no beast (the owner: the elemental beasts will be summons). His dragon head in water
        // leaves the hands on the tip of his stream, flies a varied path that bends before it hits,
        // its body of water laid behind it; it splashes, and the body fades whole.
        announce();
        this.setPose(a, 'cast', now, 900);
        const hand = handOf(from, f);
        const miss = this.missedNext(ev.unit);
        const to = miss ? pastTarget(hand, ev.at, 'straight') : ev.at;
        const fly = Math.max(800, dist(hand, to) * 130);
        const endLift = miss ? 12 : 56;
        // His head is 2.7 m long and its middle rides the jet's tip: it forms there once the tip is
        // 1.3 m out of the hands (the jet leaves them alone until then), so it never covers the
        // caster. The bend is on the rest of the way.
        const d = Math.max(0.01, dist(hand, to));
        const clear = Math.min(1.3, Math.max(0, d - 1.5));
        const launch = { x: hand.x + ((to.x - hand.x) * clear) / d, z: hand.z + ((to.z - hand.z) * clear) / d };
        const route = clear > 0.05 ? [{ at: hand, lift: HAND_LIFT }, { at: launch, lift: HAND_LIFT + ((endLift - HAND_LIFT) * clear) / d }, { at: to, lift: endLift }] : [{ at: hand, lift: HAND_LIFT }, { at: to, lift: endLift }];
        const bends = [...(clear > 0.05 ? [{ a: 0, b: 0 }] : []), ...bendsOf(seed, 1, 34, 80, 0.5)];
        this.fx.push({ ...base, kind: 'projectile', from: hand, to, t0: at(CAST), dur: fly + 300, route, bends, trail: { arrive: fly, appear: (fly * clear) / d } });
        const end = burst(el, to, CAST + fly, miss ? 12 : 56);
        if (!miss) this.shakeAt(now, CAST + fly, 2);
        hits(CAST + fly);
        linger(Math.max(end, CAST + fly + 300));
        return CAST + fly;
      }
      case 'rockVolleys': {
        // 8A: the ground bursts 1.5 m before the ninja (his rock explosion), and three volleys of his
        // rock bullets (three each) fly out of it down the whole line, each bullet on its own varied
        // path through the ones it reaches; his bullet burst on each one as a volley passes it, and
        // the last volley breaks at the line's end.
        announce();
        this.setPose(a, 'cast', now, 900);
        const line = ev.shape?.kind === 'line' ? ev.shape : null;
        const rad = ((line?.dir ?? (f > 0 ? 0 : 180)) * Math.PI) / 180;
        const length = line?.length ?? spec.length ?? 9;
        const o = line?.origin ?? from;
        const along = (d: number): Pt => ({ x: o.x + Math.cos(rad) * d, z: o.z + Math.sin(rad) * d });
        const start = along(1.5);
        const endAt = line ? areaEnd(line) : along(length);
        burst(el, start, CAST, 30);
        this.shakeAt(now, CAST, 2);
        // The ones it reaches, nearest first, by how far down the line they stand.
        const on = pts.map((p) => ({ p, d: (p.x - o.x) * Math.cos(rad) + (p.z - o.z) * Math.sin(rad) })).filter((x) => x.d > 1.5).sort((x, y) => x.d - y.d);
        const route = [{ at: start, lift: 30 }, ...on.map((x) => ({ at: x.p, lift: 50 })), { at: endAt, lift: 26 }];
        const legs = route.slice(1).map((r, i) => Math.max(0.05, dist(route[i].at, r.at)));
        const total = legs.reduce((n, l) => n + l, 0);
        const FLY = 900;
        let first = Infinity;
        let end = 0;
        [700, 850, 1000].forEach((vt, v) => {
          for (let k = 0; k < 3; k++) {
            const t0 = vt + k * 45;
            this.fx.push({ ...base, role: 'multi', kind: 'projectile', from: start, to: endAt, t0: at(t0), dur: FLY, piece: k, route, bends: bendsOf(seed + v * 7 + k, route.length - 1, 8, 30) });
          }
          let acc = 0;
          on.forEach((x, i) => {
            acc += legs[i];
            const t = vt + FLY * (acc / total);
            first = Math.min(first, t);
            end = Math.max(end, burst(el, x.p, t, 50, 'multi'));
          });
        });
        end = Math.max(end, burst(el, endAt, 1000 + 2 * 45 + FLY, 26, 'multi'));
        hits(Number.isFinite(first) ? first : 1200);
        linger(end);
        return Number.isFinite(first) ? first : 1200;
      }
      case 'sealChain': {
        // 5A: his chain leaves the ninja's chest and stretches to the target in 400 ms; his chakra
        // star hits it and his gold seal circle opens under its feet (only the frames where it opens
        // and closes, no pillar: the target stays in sight); the chain stays taut, then fades.
        announce();
        this.setPose(a, 'cast', now, 900);
        const chest = ahead(0.25);
        const miss = this.missedNext(ev.unit);
        const to = miss ? pastTarget(chest, ev.at, 'straight') : ev.at;
        this.fx.push({ ...base, kind: 'line', from: chest, to, t0: at(CAST), dur: 1640, lift: [60, miss ? 20 : 56], beam: { grow: 400, fade: 300, noHead: true } });
        hits(miss ? CAST + 400 : 960);
        if (miss) {
          linger(CAST + 1640);
          return CAST + 400;
        }
        const end = burst(el, to, 960, 56);
        // A target that resists takes the blow but is not sealed: no seal circle closes on it.
        if (!effectLands(this.queue, spec.effect ?? 'chakra_sealed')) {
          linger(Math.max(end, CAST + 1640));
          return 1060;
        }
        piece({ group: 'vfx_chakra', name: 'blast', t0: 960, from: to, depth: to.z - 0.01, rows: [{ anim: 'blast', ms: 170, frames: [0, 1] }, { anim: 'blast', ms: 800, frames: [11] }, { anim: 'blast', ms: 270, frames: [12, 13, 14, 15] }] });
        linger(Math.max(end, 2200));
        return 1060;
      }
      case 'crescents': {
        // 9A: three blows in a row, each sending his chakra crescent (white and blue with gold
        // motes, like moonlight) out of the blade through the target and 1 m on (high, middle,
        // low); his chakra star to finish. Enhanced: five.
        announce();
        const n = ev.enhanced ? 5 : 3;
        const miss = this.missedNext(ev.unit);
        const d = Math.max(0.01, dist(from, ev.at));
        const ux = (ev.at.x - from.x) / d;
        const uz = (ev.at.z - from.z) / d;
        const blade = { x: from.x + ux * 0.6, z: from.z + uz * 0.6 };
        const past = { x: ev.at.x + ux * 1, z: ev.at.z + uz * 1 };
        // Each crescent leaves on the cut itself (the sword's frame 1), not in the wind-up (stagePlan).
        const { BLOW, WIND, STRIKE } = CRESCENT;
        // The first cut waits for the saves' die, which lands as its crescent goes through.
        const L = lead(STRIKE + 150);
        for (let i = 0; i < n; i++) {
          const t = L + i * BLOW;
          const lift = n === 3 ? [74, 56, 38][i] : 80 - (i * 50) / (n - 1);
          // From the blow's own time, not the tick its timer runs on (a late tick would put the pose behind its crescent).
          const blow = () => this.setPose(a, 'attack', at(t) - WIND / this.speed, 480);
          if (i === 0 && !L) blow();
          else this.later(now, t, blow);
          this.later(now, t, () => h.sound('swing'));
          piece({ group: 'vfx_chakra', name: 'slash', element: 'chakra', t0: t + STRIKE, from: blade, path: [{ ms: 0, at: blade, dy: -lift }, { ms: 300, at: past, dy: -lift }], rows: [{ anim: 'fly', ms: 360 }], fade: 90 });
        }
        // The first crescent goes through the target.
        hits(L + STRIKE + 150);
        if (miss) {
          linger(L + n * BLOW + 400);
          return L + STRIKE + 150;
        }
        const end = burst('chakra', ev.at, L + n * BLOW + 60, 56, 'hit', undefined);
        linger(end);
        return L + STRIKE + 170;
      }
      case 'crowDive': {
        // 10A: his vortex opens up to one side of the circle and his crows come out of it (his summon
        // row), the flock dives on a diagonal to the middle, his pillar with feathers rises there,
        // and his genjutsu hit lands on each one in it.
        announce();
        this.setPose(a, 'cast', now, 900);
        const c = ev.shape?.kind === 'circle' ? ev.shape.center : ev.at;
        const r = ev.shape?.kind === 'circle' ? ev.shape.radius : 3;
        // Beside the circle on the caster's side, or on the far side when that would be over the caster.
        const vortex = vortexAt(c, r, from, f);
        const UP = 170;
        // The flock faces the way it dives (back toward the caster when it opens on the far side).
        const flip = (c.x - vortex.x) * f < 0;
        const crows = (o: Parameters<typeof piece>[0]) => {
          const t0 = piece(o);
          const fx = this.fx[this.fx.length - 1];
          if (flip && fx.run) fx.run.mirror = !fx.run.mirror;
          return t0;
        };
        crows({ group: 'vfx_beasts', name: 'genjutsu', element: 'genjutsu', t0: CAST, from: vortex, path: [{ ms: 0, dy: -UP }], rows: [{ anim: 'summon', ms: 500 }, { anim: 'summon', ms: 400, frames: [1, 0] }], fade: 300 });
        crows({ group: 'vfx_beasts', name: 'genjutsu', element: 'genjutsu', t0: 1060, from: vortex, path: [{ ms: 0, at: vortex, dy: -UP }, { ms: 600, at: c, dy: -40 }], rows: [{ anim: 'fly', ms: 640 }], fade: 120 });
        const boom = blastMs(el, 1200);
        this.fx.push({ ...base, kind: 'area', from: c, to: c, area: ev.shape, t0: at(1660), dur: boom });
        let end = 1660 + boom;
        pts.forEach((p) => (end = Math.max(end, burst(el, p, 1990, 56))));
        hits(1990);
        linger(end);
        return 1990;
      }
      case 'woodDragon': {
        // 4 (new art from his icon): roots (his coil, arching) break out of the ground in a row from
        // the ninja to the target; his wood dragon rises out of the ground just behind the target,
        // facing it, sways, rears and brings its head down on it; his rock burst and his leaves fly
        // there; the dragon falls apart. Enhanced (it constricts and drains): it holds on longer.
        announce();
        this.setPose(a, 'cast', now, 900);
        const miss = this.missedNext(ev.unit);
        const to = ev.at;
        const d = Math.max(0.01, dist(from, to));
        const ux = (to.x - from.x) / d;
        const uz = (to.z - from.z) / d;
        const n = Math.max(1, Math.min(6, Math.floor((d - 1.2) / 1.2)));
        for (let i = 0; i < n; i++) {
          const k = n === 1 ? 0.5 : i / (n - 1);
          const at0 = { x: from.x + ux * (0.9 + k * Math.max(0, d - 2.1)), z: from.z + uz * (0.9 + k * Math.max(0, d - 2.1)) };
          piece({ group: 'vfx_wood', name: 'wood_root', t0: CAST + i * 90, from: at0, depth: at0.z, clip: 0, path: [{ ms: 0, dy: 32 }, { ms: 160, dy: 0 }, { ms: 520, dy: 0 }, { ms: 820, dy: 34 }], rows: [{ anim: 'idle', ms: 820 }] });
        }
        // His drawing faces left: behind the target as the caster sees it, turned to face it.
        const behind = { x: to.x + (f > 0 ? 1 : -1) * 1.1, z: to.z };
        const rise = CAST + n * 90 + 80;
        const RISE = 450;
        const HOLD = 350;
        const STRIKE = 4 * (1000 / 14);
        const grip = ev.enhanced ? 600 : 160;
        const BREAK = 5 * (1000 / 12);
        piece({ group: 'vfx_wood', name: 'wood_leaves', t0: rise, from: behind, depth: to.z + 0.001, rows: [{ anim: 'burst', ms: 714 }] });
        const end0 = piece({
          group: 'vfx_wood',
          name: 'wood_dragon',
          t0: rise,
          from: behind,
          depth: to.z - 0.02,
          clip: 0,
          path: [{ ms: 0, dy: 160 }, { ms: RISE, dy: 0 }],
          rows: [{ anim: 'sway', ms: RISE + HOLD }, { anim: 'strike', ms: STRIKE + grip }, { anim: 'break', ms: BREAK + 120 }],
          fade: 120,
        });
        const hit = rise + RISE + HOLD + 3 * (1000 / 14);
        this.later(now, rise, () => h.sound('jutsu', el));
        hits(hit);
        if (miss) {
          linger(end0);
          return hit;
        }
        let end = Math.max(end0, burst(el, to, hit, 40, 'multi'));
        end = Math.max(end, burst(el, to, hit + 60, 20));
        piece({ group: 'vfx_wood', name: 'wood_leaves', t0: hit, from: to, depth: to.z + 0.001, rows: [{ anim: 'burst', ms: 714 }] });
        this.shakeAt(now, hit, ev.enhanced ? 5 : 4);
        linger(end);
        return hit;
      }
      case 'handLightning': {
        // 11 (new: his lightning in the hand, then a thrust): the lightning gathered in the bare hand
        // as the ninja set off (or here, when it was already beside the target), then the thrust (the
        // pierce from its chamber), his lightning hit on the target as the hand lands, the ball gone.
        if (label) this.float(label, '#fde68a', from, now, { rise: 128, dur: 1400 });
        let t = 0;
        if (!a.held) {
          h.sound('jutsu', el);
          this.gatherHand(a, el, tint, now, ev.enhanced, [], HAND_GATHER + 1200);
          t = HAND_GATHER;
        } else {
          // It ran in with the lightning in its hand: the hand stays drawn back, crackling, while
          // the saves' die flies, and the thrust lands with it.
          t = lead(15);
          if (t) {
            this.setPose(a, 'attack', now);
            a.holdFrame = 0;
          }
        }
        // Straight from the gather (the hand drawn back low) into the pierce's lunge (frame 2): its
        // chamber would bring the hand, and the lightning in it, up over the chest.
        const FRAME = 1000 / POSE_FPS.pierce;
        // From the thrust's own time, not the tick its timer runs on: a late tick put the lunge a
        // frame after the hit when the lightning gathered here.
        const thrust = () => {
          this.setPose(a, 'pierce', at(t) - (2 * FRAME) / this.speed, 5 * FRAME);
          h.sound('swing');
        };
        if (t) this.later(now, t, thrust);
        else thrust();
        const hit = t + 15;
        const held = a.held;
        if (held) held.end = at(hit + 50);
        hits(hit);
        if (this.missedNext(ev.unit)) {
          linger(hit + 4 * FRAME);
          return hit;
        }
        const end = burst(el, ev.at, hit, 56);
        this.shakeAt(now, hit, ev.enhanced ? 5 : 3);
        linger(Math.max(end, hit + 3 * FRAME));
        return hit;
      }
      case 'hurricane': {
        // 12A and the owner's unarmed combo: the weapon put away, a jab, a cross, the spin into a
        // spinning back kick, a finishing kick; with each half turn and kick one of his wind
        // crescents goes out to one of them, and his wind X with leaves bursts on it.
        if (label) this.float(label, '#fde68a', from, now, { rise: 128, dur: 1400 });
        const ms = (k: number) => (k * 1000) / POSE_FPS.combo;
        const slots = [ms(COMBO_KICKS[0]), ms(COMBO_KICKS[1]), ms(COMBO_TURNED[0]), ms(5)];
        // The ones in front take the kicks first, then the ones behind. Each crescent sets off out
        // in front of the ninja on its way there, not on its body.
        const order = pts
          .map((p, i) => ({ p, i, front: (p.x - from.x) * f >= 0 }))
          .sort((x, y) => Number(y.front) - Number(x.front))
          .map((x, j) => {
            const out = crescentStart(from, x.p);
            return { ...x, j, out, fly: Math.max(140, dist(out, x.p) * 60) };
          });
        // The combo starts a beat later when the first crescent would hit before the saves' die lands.
        const L = lead(Math.min(Infinity, ...order.map((x) => slots[x.j % slots.length] + Math.floor(x.j / slots.length) * 90 + x.fly)));
        const start = (tn: number) => {
          h.sound('swing');
          this.setPose(a, 'combo', Math.min(tn, at(L)), ms(8));
        };
        if (L) this.later(now, L, start);
        else start(now);
        let first = Infinity;
        let end = L + ms(8);
        order.forEach((x) => {
          const { j, out, fly } = x;
          const t0 = L + slots[j % slots.length] + Math.floor(j / slots.length) * 90;
          const away = x.p.x < from.x - 0.01;
          this.fx.push({ kind: 'sprite', element: 'wind', from: out, to: x.p, t0: at(t0), dur: fly + 60, run: { group: 'vfx_wind', name: 'slash', mirror: away, rows: [{ anim: 'fly', ms: fly + 60 }], path: [{ ms: 0, at: out, dy: -54 }, { ms: fly, at: x.p, dy: -54 }], fade: 60 } });
          first = Math.min(first, t0 + fly);
          end = Math.max(end, burst('wind', x.p, t0 + fly, 56, 'hit', undefined));
          this.later(now, t0, () => h.sound('swing'));
        });
        hits(Number.isFinite(first) ? first : L + ms(6));
        linger(end);
        return Number.isFinite(first) ? first : L + ms(6);
      }
    }
  }

  /**
   * The Chidori's lightning gathering in the near hand (the owner's answer 11): the hand drawn back
   * low behind the hip (the sword's wind-up frame, held, with the hand empty: the pierce's chamber put
   * the lightning over the chest), his lightning hit growing and crackling there, then `after`, and
   * it crackles on until the thrust lands (round1 'handLightning' ends it), or `ms` at most (a run cut
   * short never leaves it in the hand).
   */
  private gatherHand(v: UnitView, element: VfxElement, tint: string | undefined, now: number, enhanced: boolean, after: Held['rows'], ms: number): void {
    this.setPose(v, 'attack', now);
    v.holdFrame = 0;
    const crackle = enhanced ? 'crackle_enh' : 'crackle';
    v.held = { group: 'vfx_hand', name: 'lightning_hand', element, tint, t0: now, end: now + ms / this.speed, rows: [{ anim: 'gather', ms: 330 }, { anim: crackle, ms: HAND_GATHER - 330 }, ...after, { anim: crackle, ms: 1 }] };
  }

  /** The jutsu event: the cast, its flight and its effects (the staged ones apart). Returns how long to wait. */
  private playJutsu(ev: Extract<BattleEvent, { t: 'jutsu' }>, now: number, state: BattleState, label: string | null): number {
    const h = this.hooks;
    const a = this.view(ev.unit);
    if (!a) return 0;
    const spec = JUTSU[ev.jutsu];
    const from = this.posOf(ev.unit, now);
    if (Math.abs(ev.at.x - from.x) > 0.05) a.facing = ev.at.x > from.x ? 1 : -1;
    const caster = state.units[ev.unit];
    const head = caster?.kind === 'hydra_head';
    const cross = spec?.special === 'warp' ? this.queue.find((e) => e.t === 'teleport' && e.how === 'phase' && e.unit === ev.unit) : undefined;
    if (cross?.t === 'teleport' && this.phaseFollows(ev.unit)) {
      // A Shooting-Star Thrust that goes through: its name, and the throw starts at once (UnitView.warp).
      // The crossing's own event comes at the release; the thrust faces the foe it lands beside
      // (the engine's edgeFoe), if any.
      const face: 1 | -1 = Math.abs(cross.to.x - cross.from.x) > 0.05 ? (cross.to.x > cross.from.x ? 1 : -1) : a.facing;
      const foe = caster ? edgeFoe(state, caster, cross.to) : undefined;
      const land: 1 | -1 = foe && foe.pos.x !== cross.to.x ? (foe.pos.x > cross.to.x ? 1 : -1) : caster ? caster.facing : face;
      const fly = warpFly(dist(cross.from, cross.to));
      a.warp = { from: { ...cross.from }, to: { ...cross.to }, t0: now, face, land, foe: foe?.id, fly };
      a.facing = face;
      a.walk = undefined;
      a.lunge = undefined;
      a.poseUntil = undefined;
      h.sound('jutsu', 'chakra');
      if (label) this.float(label, '#fde68a', from, now, { rise: 128, dur: 1400 });
      // A whoosh as the arm whips the weapon away, a ring as the hand closes on it again.
      this.cues.push({ at: now + (2 * WARP_FRAME) / this.speed, name: 'swing' }, { at: now + warpTimes(fly).land / this.speed, name: 'draw' });
      return WARP_REL;
    }
    if ((spec?.special === 'warp' || spec?.special === 'swap') && this.phaseFollows(ev.unit)) {
      // A Shooting-Star Thrust or a Spatial Swap that goes through: its name and a beat, then the phase
      // itself plays (no cast pose, no chakra flare: the ninja turns to light at once).
      h.sound('jutsu', 'chakra');
      if (label) this.float(label, '#fde68a', from, now, { rise: 128, dur: 1400 });
      return 90;
    }
    // An enhanced jutsu's cast pose plays its chakra burst empowered.
    if (!head) a.castEnhanced = !!ev.enhanced;
    if (spec?.seq || spec?.pose || spec?.vfxSet) {
      const staged = this.staged(ev, spec, a, from, now, label, jutsuTint(spec, caster));
      if (staged !== null) return staged;
    }
    if (!head) this.setPose(a, spec?.melee ? 'attack' : 'cast', now, 900);
    else {
      a.creature = { anim: ev.jutsu === 'hydra_roar' ? 'roar' : 'spit', t0: now };
      if (ev.jutsu === 'hydra_roar') h.sound('roar');
    }
    const el: VfxElement = spec?.element ?? 'chakra';
    // Jutsu play at a pace the player can follow: a beat for the cast, a flight you can watch
    // (beasts slower still), and the impact plays out whole before the next turn starts.
    const castDelay = head ? 150 : 560;
    // A dream's drift flies slower (the Mind Twist).
    const fly = (spec?.vfx === 'beast' ? Math.max(900, dist(from, ev.at) * 150) : Math.max(500, dist(from, ev.at) * 115)) * (spec?.seq?.slowFlight ?? 1);
    const linger = (ms: number) => (this.lingerUntil = Math.max(this.lingerUntil, t1 + ms / this.speed));
    h.sound('jutsu', el);
    if (label) this.float(label, '#fde68a', from, now, { rise: 128, dur: 1400 });
    const t1 = now + castDelay / this.speed;
    const base = { element: el, t0: t1, enhanced: ev.enhanced, sig: spec?.sig, role: spec?.vfx, tint: jutsuTint(spec, caster) };
    switch (spec?.special) {
      case 'heal':
        this.fx.push({ ...base, kind: 'heal', from: ev.at, to: ev.at, dur: 1300 });
        linger(1300);
        return castDelay + 700;
      case 'clone':
      case 'mantle':
        this.fx.push({ ...base, kind: 'aura', from, to: from, dur: 1100, unit: ev.unit });
        linger(1100);
        return castDelay + 400;
      case 'galeZone':
        // The wind gathers round the caster; the gale itself starts turning when its event plays.
        this.fx.push({ ...base, kind: 'aura', from, to: from, t0: now, dur: castDelay + 500, unit: ev.unit });
        return castDelay;
      case 'flicker':
      case 'warp':
      case 'swap':
        // The chakra flares while it gathers, and is gone with the ninja when it vanishes (it
        // would otherwise burn on at the spot it left, around whoever is swapped in there).
        this.fx.push({ ...base, kind: 'aura', from, to: from, t0: now, dur: castDelay + 400, unit: ev.unit, follow: true });
        return castDelay + 400;
      case 'earthWall':
      case 'waterWall':
        this.fx.push({ ...base, kind: 'wall', from: ev.at, to: ev.at, dur: 1200 });
        // The wall itself rises when its event plays, right as the jutsu lands.
        return castDelay;
      case 'metalBlock':
      case 'metalWall':
        // Steel dust where the structure rises (the earth wall's sheet would hide it otherwise);
        // the structure itself grows out of the ground when its event plays (renderer.ts).
        this.fx.push({ ...base, kind: 'wall', from: ev.at, to: ev.at, dur: 1200, sig: 'debris' });
        return castDelay;
      case 'command':
      case 'submission':
        // The Northstar's will flares around it; the mind it takes glows when its event plays.
        this.fx.push({ ...base, kind: 'aura', from, to: from, dur: 900, unit: ev.unit });
        linger(900);
        return castDelay + 300;
    }
    if (ev.shape?.kind === 'cone') {
      // A signature cone (the Great Fire Annihilation) plays its whole surge, burn and fade.
      // It hits once the fire has spread all the way, and the next turn waits for it to burn out.
      const long = signatureMs(el, spec?.sig, ev.enhanced);
      this.fx.push({ ...base, kind: 'cone', from, to: ev.at, area: ev.shape, dur: long?.total ?? 1400, lift: [head ? 120 : 70, 30] });
      if (!long) {
        linger(1400);
        return castDelay + 900;
      }
      h.shake(ev.enhanced ? 7 : 5);
      this.lingerUntil = Math.max(this.lingerUntil, t1 + long.total / this.speed);
      this.hitAt = t1 + long.hit / this.speed;
      return castDelay + long.hit;
    }
    if (ev.shape?.kind === 'line') {
      this.fx.push({ ...base, kind: 'line', from, to: areaEnd(ev.shape), area: ev.shape, dur: 1300, lift: [head ? 120 : 70, 50] });
      linger(1300);
      return castDelay + 900;
    }
    if (spec?.melee) {
      const hitMs = impactMs(el, spec.vfx, 900);
      this.fx.push({ ...base, kind: 'burst', from: ev.at, to: ev.at, dur: hitMs, lift: [60, 60] });
      linger(hitMs);
      return castDelay + 450;
    }
    // A signature from the sky (Kirin) needs no projectile: the storm gathers over the target.
    const sky = ev.shape?.kind === 'circle' ? skySignature(el, spec?.sig, ev.enhanced) : null;
    if (sky) {
      this.fx.push({ ...base, kind: 'area', from: ev.at, to: ev.at, area: ev.shape, dur: sky.total });
      h.shake(ev.enhanced ? 8 : 6);
      this.lingerUntil = Math.max(this.lingerUntil, t1 + sky.total / this.speed);
      return castDelay + sky.hit / this.speed;
    }
    // The rank D and C jutsu (staged by seq) leave the casting hand; the others fly as they always have.
    const out = spec?.seq && !head ? handOf(from, a.facing) : from;
    this.fx.push({ ...base, kind: 'projectile', from: out, to: ev.at, dur: fly, lift: [head ? 120 : spec?.seq ? HAND_LIFT : 70, ev.shape ? 30 : 60] });
    this.hitAt = t1 + fly / this.speed;
    if (ev.shape?.kind === 'circle') {
      const boom = blastMs(el, spec?.sig ? 1400 : 1200);
      this.fx.push({ ...base, kind: 'area', from: ev.at, to: ev.at, area: ev.shape, t0: t1 + fly / this.speed, dur: boom });
      h.shake(ev.enhanced ? 5 : 3);
      linger(fly + boom);
    } else {
      const hitMs = impactMs(el, spec?.vfx, 900);
      this.fx.push({ ...base, kind: 'burst', from, to: ev.at, t0: t1 + fly / this.speed, dur: hitMs, lift: [60, 60] });
      linger(fly + hitMs);
    }
    return castDelay + fly + 300;
  }

  /**
   * A fire fanned by a gale (the Gale Curtain; the owner: "que se vea como efecto"): every fire
   * effect the jutsu just pushed burns brighter from where it meets the wind (a Fireball grows into
   * the Great Fireball there), the wind swirls round the fire at that spot in the gale's colour, and
   * the word floats over it.
   */
  private fan(ev: Extract<BattleEvent, { t: 'jutsu' }>, before: number, now: number, state: BattleState): void {
    const f = ev.fanned!;
    let meet = Infinity;
    for (const fx of this.fx.slice(before)) {
      // A staged piece (a dragon's wall and head) stands by its caster, out of the wind.
      if (fx.element !== 'fire' || fx.kind === 'aura' || fx.kind === 'sprite') continue;
      // A flight meets the wind part of the way along; a beam's head gets there at 1/1.8 of its
      // play (vfxSprites.ts), a staged beam's in its `grow`; a burst, a blast or a cone is in the
      // wind from the start.
      const reach = fx.beam ? fx.beam.grow / fx.dur : 1 / 1.8;
      const k = fx.kind === 'projectile' ? nearSegment(fx.from, fx.to, f.at).t : fx.kind === 'line' ? nearSegment(fx.from, fx.to, f.at).t * reach : 0;
      fx.fan = k;
      meet = Math.min(meet, fx.t0 + (fx.dur * k) / this.speed);
    }
    if (!Number.isFinite(meet)) meet = now;
    const zone = (state.zones ?? []).find((z) => z.id === f.zone) ?? this.goneZones().find((z) => z.id === f.zone);
    const tint = zone ? unitTint(state.units[zone.owner]) : undefined;
    this.fx.push({ kind: 'swirl', element: 'wind', from: f.at, to: f.at, t0: meet - 120 / this.speed, dur: 900, lift: [56, 56], tint });
    const text = this.hooks.label({ t: 'note', key: 'fanned', params: {} });
    if (text) this.float(text, '#fdba74', f.at, now, { t0: meet, rise: 112, dur: 1300 / this.speed });
  }

  /**
   * Puts together the events of each one the jutsu just played reaches (as reached() reads them),
   * in `order`: a wave's rolls and falls then play one after another as it goes over them. Notes go
   * with the event before them; what concerns nobody in `order` stays first.
   */
  private groupByUnit(order: string[]): void {
    let end = 0;
    while (end < this.queue.length) {
      const t = this.queue[end].t;
      if (t === 'jutsu' || t === 'turn' || t === 'round' || t === 'move' || t === 'end') break;
      end++;
    }
    const rest: BattleEvent[] = [];
    const of = new Map<string, BattleEvent[]>(order.map((id) => [id, []]));
    let owner: string | undefined;
    for (const e of this.queue.slice(0, end)) {
      const u = unitOfEvent(e);
      if (u !== undefined || e.t !== 'note') owner = u;
      const list = owner === undefined ? undefined : of.get(owner);
      (list ?? rest).push(e);
    }
    this.queue.splice(0, end, ...rest, ...order.flatMap((id) => of.get(id)!));
  }

  /** Who the jutsu just played heals (its heal event, if it comes before anything else happens). */
  private healedNext(): string | undefined {
    for (const e of this.queue) {
      if (e.t === 'heal') return e.unit;
      if (e.t === 'jutsu' || e.t === 'turn' || e.t === 'move') break;
    }
    return undefined;
  }

  /** Applies one event to the view; returns how long (ms) to wait before the next. */
  private apply(ev: BattleEvent, now: number, state: BattleState): number {
    const h = this.hooks;
    h.log(ev);
    const label = h.label(ev);
    switch (ev.t) {
      case 'move': {
        const v = this.view(ev.unit);
        if (!v || !ev.path.length) return 0;
        const u = state.units[ev.unit];
        const start = this.posOf(ev.unit, now);
        v.pos = start;
        const lengths: number[] = [];
        let prev = start;
        for (const p of ev.path) {
          lengths.push(dist(prev, p));
          prev = p;
        }
        const total = lengths.reduce((a, b) => a + b, 0);
        const sneaking = state.phase === 'stealth' && !ev.run;
        const pose: SpritePose = ev.run ? 'run' : sneaking && u?.cond.crouched ? 'sneak' : total > 3 ? 'run' : 'walk';
        // The run in of a melee jutsu staged its own way (the Rush): a flash of chakra where it sets
        // off, a beat, then the run at its own pace.
        const seq = ev.jutsu ? JUTSU[ev.jutsu]?.seq : undefined;
        const speed = (pose === 'run' ? RUN : pose === 'sneak' ? SNEAK : WALK) * (seq?.fastRun ?? 1);
        // The Chidori gathers its lightning in the hand before it runs in, and carries it there.
        const gather = seq?.stage === 'handLightning' ? HAND_GATHER : 0;
        const beat = (seq?.launchFlash ? 140 : 0) + gather;
        if (seq?.launchFlash) this.fx.push({ kind: 'aura', element: JUTSU[ev.jutsu!].element, from: start, to: start, t0: now, dur: 520, unit: ev.unit, tint: jutsuTint(JUTSU[ev.jutsu!], u) });
        const last = ev.path[ev.path.length - 1];
        if (Math.abs(last.x - start.x) > 0.05) v.facing = last.x > start.x ? 1 : -1;
        v.walk = { path: ev.path.map((p) => ({ ...p })), t0: now + beat / this.speed, speed, pose, lengths, total };
        if (gather) {
          const runMs = (total / speed) * 1000;
          const enh = this.queue.find((e) => e.t === 'jutsu' && e.unit === ev.unit);
          this.gatherHand(v, JUTSU[ev.jutsu!].element, jutsuTint(JUTSU[ev.jutsu!], u), now, enh?.t === 'jutsu' && !!enh.enhanced, [{ anim: 'dash', ms: runMs }], gather + runMs + 1200);
          h.sound('jutsu', JUTSU[ev.jutsu!].element);
          this.later(now, gather, (tn) => {
            v.pose = pose;
            v.poseT0 = tn;
            v.holdFrame = undefined;
          });
        } else {
          v.pose = pose;
          v.poseT0 = now;
        }
        // The ground cracking under a charged hand's steps: each crack as the walker gets there.
        const cr = this.queue[0];
        if (cr?.t === 'cracks' && cr.unit === ev.unit && cr.on) {
          let along = 0;
          let prevP = start;
          const when = new Map<string, number>();
          for (const p of ev.path) {
            along += dist(prevP, p);
            prevP = p;
            when.set(crackKey(cellOf(p)), v.walk.t0 + ((along / speed) * 1000) / this.speed);
          }
          for (const k of cr.cells) this.cracks.set(k, { t0: when.get(k) ?? now });
        }
        h.sound('step');
        if (ev.unit === this.turnUnit || state.phase === 'stealth') h.focus(ev.unit);
        return beat + (total / speed) * 1000;
      }
      case 'teleport': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        // A Spatial Swap's two jumps happen at once.
        const together = this.queue[0]?.t === 'teleport';
        if (ev.how === 'phase' && v.warp) {
          // A Shooting-Star Thrust's crossing, already under way since its jutsu played (the throw): the
          // events after it wait until the ninja stands solid where it lands.
          v.pos = { ...ev.to };
          v.walk = undefined;
          return Math.max(0, (v.warp.t0 + warpTimes(v.warp.fly).solid / this.speed - now) * this.speed);
        }
        if (ev.how === 'phase') {
          // A Ryusei's Spatial Swap: no smoke, the ninja crosses as blue light.
          v.phase = { from: { ...ev.from }, to: { ...ev.to }, t0: now };
          v.pos = { ...ev.to };
          v.walk = undefined;
          v.lunge = undefined;
          if (!together) h.sound('kawarimi');
          return together ? 0 : PHASE_MS;
        }
        this.fx.push({ kind: 'smoke', element: 'chakra', from: ev.from, to: ev.from, t0: now, dur: 500 });
        this.fx.push({ kind: 'smoke', element: 'chakra', from: ev.to, to: ev.to, t0: now + 120, dur: 500 });
        v.pos = { ...ev.to };
        v.walk = undefined;
        return together ? 0 : 320;
      }
      case 'kawarimi': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        this.fx.push({ kind: 'smoke', element: 'chakra', from: ev.from, to: ev.from, t0: now, dur: 700 });
        this.fx.push({ kind: 'seal', element: 'earth', from: ev.from, to: ev.from, t0: now, dur: 1100, sig: 'log' });
        this.fx.push({ kind: 'smoke', element: 'chakra', from: ev.to, to: ev.to, t0: now + 200, dur: 500 });
        v.pos = { ...ev.to };
        v.walk = undefined;
        if (label) this.float(label, '#e9d8a6', ev.from, now);
        h.roll(ev);
        h.sound('kawarimi');
        return 650;
      }
      case 'evade': {
        // Premonitory Evasion: the Mirai's eyes flare and it darts a step aside as the blow lands;
        // the flare goes with it, and the word floats where it ends up.
        const v = this.view(ev.unit);
        if (!v) return 0;
        const d = dist(ev.from, ev.to);
        this.fx.push({ kind: 'aura', element: 'fire', sig: 'eyes', from: ev.from, to: ev.to, t0: now, dur: 700, unit: ev.unit, follow: true });
        v.pos = { ...ev.from };
        v.walk = { path: [{ ...ev.to }], t0: now, speed: 7, pose: 'run', lengths: [d], total: d };
        v.pose = 'run';
        v.poseT0 = now;
        if (label) this.float(label, '#fecaca', ev.to, now);
        h.roll(ev);
        h.sound('kawarimi');
        return 420;
      }
      case 'command':
      case 'joined': {
        // Taken by a Northstar: a genjutsu glow and a word over it (and a word when it goes free).
        const at = this.posOf(ev.unit, now);
        const taken = ev.t === 'joined' || ev.on;
        if (taken) this.fx.push({ kind: 'aura', element: 'genjutsu', from: at, to: at, t0: now, dur: 900, unit: ev.unit });
        if (label) this.float(label, taken ? '#c4b5fd' : '#e2e8f0', at, now, { rise: 120 });
        return taken ? 500 : 250;
      }
      case 'slowed': {
        // Warped or dashed into a Northstar's aura: half the movement left is gone.
        const at = this.posOf(ev.unit, now);
        this.fx.push({ kind: 'aura', element: 'genjutsu', from: at, to: at, t0: now, dur: 500, unit: ev.unit });
        if (label) this.float(label, '#c4b5fd', at, now, { rise: 120 });
        return 300;
      }
      case 'pushed': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        v.walk = { path: [{ ...ev.to }], t0: now, speed: 6, pose: 'hurt', lengths: [dist(ev.from, ev.to)], total: dist(ev.from, ev.to) };
        v.pos = { ...ev.from };
        this.setPose(v, 'hurt', now, 300);
        if (ev.fall) h.shake(3);
        // Swept by a jutsu: the fall follows at once, while it still slides.
        return ev.what ? 120 : 280;
      }
      case 'attack': {
        const a = this.view(ev.unit);
        const target = ev.target.startsWith('prop:') || ev.target.startsWith('wall:') ? undefined : state.units[ev.target];
        const wall = ev.target.startsWith('wall:') ? this.wallOf(ev.target.slice(5), state) : undefined;
        const to = target ? this.posOf(target.id, now) : wall ? closestPoint(wall, this.posOf(ev.unit, now)) : propPos(state, ev.target);
        h.roll(ev);
        if (!a) return 0;
        const from = this.posOf(ev.unit, now);
        if (Math.abs(to.x - from.x) > 0.05) a.facing = to.x > from.x ? 1 : -1;
        if (state.units[ev.unit]?.kind === 'hydra_head') {
          a.creature = { anim: 'bite', t0: now };
          if (!ev.roll.success) this.float(label ?? 'Miss', '#cbd5e1', to, now + 300);
          h.sound(ev.roll.success ? 'hit' : 'miss');
          return 520;
        }
        const jutsu = JUTSU[ev.what];
        if (jutsu) {
          // A jutsu that needs an attack roll: the effect is played by the jutsu event.
          if (!ev.roll.success) this.float(label ?? 'Miss', '#cbd5e1', to, now + 350);
          return 120;
        }
        this.setPose(a, 'attack', now, 520);
        if (ev.ranged) {
          this.fx.push({ kind: 'kunai', element: 'chakra', from, to, t0: now + 120 / this.speed, dur: 260, lift: [70, 60] });
          h.sound('swing');
        } else {
          const d = Math.max(0.01, dist(from, to));
          a.lunge = { dx: ((to.x - from.x) / d) * 14, dy: ((to.z - from.z) / d) * 6, t0: now, dur: 420 };
          this.fx.push({ kind: 'slash', element: 'wind', from, to, t0: now + 150 / this.speed, dur: 260, lift: [60, 60] });
          h.sound('swing');
        }
        if (!ev.roll.success) {
          this.float(label ?? 'Miss', '#cbd5e1', to, now + 260);
          h.sound('miss');
        }
        return ev.ranged ? 420 : 380;
      }
      case 'jutsu': {
        // A fire through a gale (the Gale Curtain): the effects it pushes now burn brighter from where
        // they meet the wind, and the wind swirls round the fire there.
        const before = this.fx.length;
        const d = this.playJutsu(ev, now, state, label);
        if (ev.fanned) {
          this.fan(ev, before, now, state);
          // Its line in the log ("the gale fans…") goes out with it, so a save right after it still
          // has its dice thrown during the flight, to land as the fire hits.
          const nx = this.queue[0];
          if (nx?.t === 'note' && (nx.key === 'fanned' || nx.key === 'fanned2')) this.apply(this.queue.shift()!, now, state);
        }
        return d;
      }
      case 'save': {
        h.roll(ev);
        const u = state.units[ev.unit];
        if (u && ev.roll.success) this.float(label ?? 'Save', '#a5b4fc', this.posOf(u.id, now), now, { rise: 110 });
        return 0;
      }
      case 'check':
        h.roll(ev);
        return 0;
      case 'damage': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        v.hp = ev.hp;
        if (isBleedTick(ev, state.units[ev.unit]) && !v.hidden) {
          // Bleeding hurts at the start of its turn: a few drops fall from the wound.
          const p = this.posOf(ev.unit, now);
          this.fx.push({ kind: 'burst', blood: 'drip', element: 'chakra', from: { x: p.x - v.facing * 0.05, z: p.z }, to: p, t0: now, dur: DRIP_MS });
        }
        v.hurtUntil = now + 260 / this.speed;
        if (!v.walk && !v.down) this.setPose(v, 'hurt', now, 300);
        const hit = state.units[ev.unit];
        if (hit && (hit.kind === 'hydra_head' || hit.kind === 'hydra_body') && !v.severed && ev.hp > 0) v.creature = { anim: 'hurt', t0: now };
        const at = this.posOf(ev.unit, now);
        if (ev.crit) {
          // A critical (always maximum damage): a hit-stop, a bloom of light and a burst on the
          // target, the number in big gold digits marked "MÁX", a camera kick and the sting.
          this.impacts.push({ unit: ev.unit, amount: ev.amount, t0: now });
          h.sound('critSting');
          h.shake(6);
          return 110 + IMPACT.hitStop + 300;
        }
        this.float(`${ev.amount}`, '#f87171', at, now, { dur: 1200 });
        h.sound('hit');
        return 110;
      }
      case 'heal': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        v.hp = ev.hp;
        if (v.down === 'downed' || v.down === 'stable') {
          v.down = undefined;
          this.setPose(v, 'idle', now);
        }
        this.float(`+${ev.amount}`, '#4ade80', this.posOf(ev.unit, now), now);
        h.sound('heal');
        return 200;
      }
      case 'chakra': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        v.chakra = ev.chakra;
        if (ev.delta > 0) this.float(`+${ev.delta}`, '#60a5fa', this.posOf(ev.unit, now), now, { rise: 112 });
        return 0;
      }
      case 'down': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        v.down = ev.state;
        const u = state.units[ev.unit];
        if (u?.kind === 'hydra_body') {
          v.creature = { anim: 'death', t0: now };
          h.sound('roar');
          h.shake(6);
          return 900;
        }
        if (u?.kind === 'hydra_head') {
          if (!v.severed) v.creature = { anim: 'sever', t0: now };
          return 120;
        }
        if (ev.state === 'stable') return 0;
        this.lingers.delete(ev.unit);
        this.setPose(v, 'downed', now);
        v.walk = undefined;
        h.sound('down');
        if (label) this.float(label, ev.state === 'dead' ? '#fca5a5' : '#fcd34d', this.posOf(ev.unit, now), now, { rise: 70 });
        return 450;
      }
      case 'condition': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        if (ev.cond === 'hidden') v.hidden = ev.on;
        if (ev.cond === 'crouched') {
          v.crouched = ev.on;
          if (!v.walk && !v.poseUntil && !v.down) this.setPose(v, ev.on ? 'crouch' : 'idle', now);
        }
        if (ev.cond === 'prone' && ev.on) this.setPose(v, 'downed', now, 500);
        if (ev.cond === 'mantle') {
          const seq = JUTSU.wind_breeze_mantle?.seq;
          if (ev.on && seq?.lingerAura) this.lingers.set(ev.unit, { element: JUTSU.wind_breeze_mantle.element, alpha: seq.lingerAura, t0: now, tint: jutsuTint(JUTSU.wind_breeze_mantle, state.units[ev.unit]) });
          else this.lingers.delete(ev.unit);
        }
        if (label) this.float(label, '#c4b5fd', this.posOf(ev.unit, now), now, { rise: 120 });
        return label ? 200 : 0;
      }
      case 'effect': {
        // The cut has left Bleeding: drops splash onto the screen, on the side the cut went.
        if (bleedingStarts(ev)) this.screenBlood.push({ t0: now, side: this.cutSide, seed: [...ev.unit].reduce((n, c) => n + c.charCodeAt(0), this.round) });
        // Flames catch, or go out with a puff of steam.
        if (ev.effect === 'burning') {
          if (ev.on) this.burns.set(ev.unit, { element: 'fire', alpha: BURN_ALPHA, t0: now });
          else if (this.burns.delete(ev.unit)) this.douses.push({ unit: ev.unit, t0: now });
        }
        if (label) this.float(label, ev.on ? '#e879f9' : '#a1a1aa', this.posOf(ev.unit, now), now, { rise: 124 });
        return 0;
      }
      case 'deathSave': {
        h.roll(ev);
        if (label) this.float(label, ev.roll.success ? '#86efac' : '#fca5a5', this.posOf(ev.unit, now), now, { rise: 60 });
        // The die over the ninja already took its time.
        return this.diceOn ? 300 : 600;
      }
      case 'turn': {
        this.turnUnit = ev.unit;
        h.focus(ev.unit);
        h.sound('turn');
        return 260;
      }
      case 'round': {
        this.round = ev.round;
        this.banners.push({ text: label ?? `Round ${ev.round}`, t0: now, dur: 900, tone: 'neutral' });
        return 350;
      }
      case 'combatStart': {
        this.banners.push({ text: label ?? 'Fight!', t0: now, dur: 1500, tone: 'alarm' });
        h.sound('alarm');
        return 900;
      }
      case 'initiative':
        return 0;
      case 'suspicion': {
        const g = state.units[ev.guard];
        if (g && ev.value >= 40) this.float(ev.value >= 100 ? '!' : '?', ev.value >= 70 ? '#f97316' : '#facc15', this.posOf(g.id, now), now, { rise: 118, big: true, dur: 800 });
        return 0;
      }
      case 'alert': {
        const g = state.units[ev.guard];
        if (g) this.float('!', '#ef4444', this.posOf(g.id, now), now, { rise: 118, big: true, dur: 1300 });
        h.sound('alarm');
        return 450;
      }
      case 'noise': {
        this.fx.push({ kind: 'noise', element: 'wind', from: ev.at, to: ev.at, radius: ev.radius, t0: now, dur: 900 });
        h.sound(ev.source === 'bells' ? 'bells' : ev.source === 'stone' ? 'stone' : 'step');
        return 200;
      }
      case 'investigate':
        return 0;
      case 'animalFlees':
        this.fled.set(ev.prop, now);
        return 0;
      case 'body':
        return 0;
      case 'wall': {
        if (ev.on) {
          this.wallBorn.set(ev.wall.id, now);
          // A Kōton structure rises before anything else happens to it (an oldest one crumbling).
          return ev.wall.kind === 'metal' || ev.wall.kind === 'metalBlock' ? RISE_MS : 0;
        }
        // A broken structure falls apart in a cloud of dust (a water barrier just fades); a Kōton
        // structure sinks back into the ground as it goes.
        if (ev.wall.kind === 'metal' || ev.wall.kind === 'metalBlock') this.fallen.push({ wall: ev.wall, t0: now });
        if (!label) return 0;
        const at = midpoint(ev.wall.a, ev.wall.b);
        this.fx.push({ kind: 'wall', element: 'earth', from: at, to: at, t0: now, dur: 900, sig: 'debris' });
        this.float(label, '#e2e8f0', at, now, { rise: 110 });
        h.sound('crit');
        h.shake(3);
        return 300;
      }
      case 'charged': {
        // A hand charged (the activated Chidori): his lightning in the hand, the element's aura round
        // the ninja and its sparks crackling; or the charge ends (a blow that struck lets its own
        // thrust end the lightning).
        const v = this.view(ev.unit);
        const u = state.units[ev.unit];
        const spec = JUTSU[ev.jutsu];
        if (!v || !spec) return 0;
        if (ev.on) {
          const tint = u ? jutsuTint(spec, u) : undefined;
          this.setPose(v, 'cast', now, 520);
          v.castEnhanced = !!ev.enhanced;
          v.held = chargedHeld(u, now, ev.jutsu);
          this.lingers.set(ev.unit, { element: spec.element, alpha: CHARGE_AURA, t0: now, tint, charged: true });
          this.fx.push({ kind: 'aura', element: spec.element, from: v.pos, to: v.pos, t0: now, dur: 700, unit: ev.unit, tint, enhanced: ev.enhanced });
          h.sound('jutsu', spec.element);
          if (label) this.float(label, '#fde68a', v.pos, now, { rise: 128, dur: 1200 });
          return 560;
        }
        if (this.lingers.get(ev.unit)?.charged) this.lingers.delete(ev.unit);
        if (ev.end === 'struck') return 0;
        if (v.held?.charged) v.held = undefined;
        this.fx.push({ kind: 'smoke', element: 'chakra', from: v.pos, to: v.pos, t0: now, dur: 420 });
        return 200;
      }
      case 'imbue': {
        // The element goes onto the weapon (Weapon Element Enhancement): the weapon raised in the victory
        // pose, the element gathers into the hand, surges up the blade and flares (its activation,
        // sprite/imbue.ts; the owner: "hazle una animacion para activar la mejora de elemento con la pose de
        // victoria"); or it leaves the weapon in a puff.
        const v = this.view(ev.unit);
        if (!v) return 0;
        const el = ev.element.toLowerCase() as VfxElement;
        if (ev.on) {
          v.imbue = ev.element;
          this.setPose(v, 'victory', now, ACTIVATE_MS);
          v.imbueAct = { t0: now, end: now + ACTIVATE_MS / this.speed };
          h.sound('jutsu', el);
          if (label) this.float(label, '#fde68a', v.pos, now, { rise: 128, dur: 1100 });
          return ACTIVATE_MS;
        }
        v.imbue = undefined;
        v.imbueAct = undefined;
        this.fx.push({ kind: 'smoke', element: 'chakra', from: v.pos, to: v.pos, t0: now, dur: 380 });
        return 150;
      }
      case 'cracks':
        // Cracks not timed with a walk show now; mended ones fade.
        for (const k of ev.cells) {
          const c = this.cracks.get(k);
          if (ev.on && !c) this.cracks.set(k, { t0: now });
          else if (!ev.on && c) c.gone = now;
        }
        return 0;
      case 'zone':
        // A gale starts turning (it rises out of the ground), or dies down (it fades).
        if (ev.on) this.zoneBorn.set(ev.zone.id, now);
        else this.zoneGone.push({ zone: ev.zone, t0: now });
        return 0;
      case 'ground': {
        // Wet ground darkens in (where a wave's crest timed it, as it goes over), steam rises; or they
        // dry and thin away; steam the wind carries off drifts away from it as it goes (a beat to see it).
        const born = this.groundBorn[ev.kind];
        if (ev.on) {
          for (const k of ev.cells) if (!born.has(k)) born.set(k, now);
          return ev.kind === 'steam' ? 450 : 0;
        }
        for (const k of ev.cells) born.delete(k);
        this.groundGone.push({ kind: ev.kind, cells: ev.cells, t0: now, ...(ev.blown ? { blown: ev.blown } : {}) });
        return ev.blown ? 420 : 0;
      }
      case 'conduct':
        // The lightning runs out across the wet patch from where it struck, in its caster's colour.
        this.fx.push({ kind: 'conduct', element: 'lightning', from: ev.at, to: ev.at, cells: ev.cells, t0: now, dur: CONDUCT_MS, tint: unitTint(ev.source ? state.units[ev.source] : undefined) });
        h.sound('hit');
        return 420;
      case 'wallHit':
        this.float(`-${ev.amount}`, '#cbd5e1', ev.at, now, { rise: 70 });
        this.fx.push({ kind: 'burst', element: 'earth', from: ev.at, to: ev.at, t0: now, dur: 400, lift: [40, 40] });
        h.sound('hit');
        return 120;
      case 'prop': {
        const at = propPos(state, `prop:${ev.prop}`);
        if (ev.state === 'burnt') this.fx.push({ kind: 'fire', element: 'fire', from: at, to: at, t0: now, dur: 1400 });
        if (ev.state === 'exploded') this.fx.push({ kind: 'explosion', element: 'fire', from: at, to: at, radius: 1.5, t0: now, dur: 800 });
        return ev.state === 'exploded' ? 250 : 0;
      }
      case 'electrified':
        // Along the water only (and not through a metal wall): renderer.ts clips its rays.
        // In the chakra colour of whoever's lightning it is.
        this.fx.push({ kind: 'electric', element: 'lightning', from: ev.at, to: ev.at, radius: ev.radius, t0: now, dur: 800, sig: 'water', tint: unitTint(ev.source ? state.units[ev.source] : undefined) });
        return 300;
      case 'trap':
        return 0;
      case 'node':
        // A Weapon Node lands: a glint where it sticks in the ground.
        if (ev.on) this.fx.push({ kind: 'burst', element: 'chakra', from: ev.node.pos, to: ev.node.pos, t0: now, dur: 420, lift: [6, 6] });
        return 0;
      case 'explode':
        this.fx.push({ kind: 'explosion', element: 'fire', from: ev.at, to: ev.at, radius: ev.radius, t0: now, dur: 800 });
        h.sound('explosion');
        h.shake(6);
        return 380;
      case 'clone':
        if (ev.on) this.fx.push({ kind: 'aura', element: 'chakra', from: this.posOf(ev.unit, now), to: this.posOf(ev.unit, now), t0: now, dur: 600, unit: ev.unit });
        else {
          this.fx.push({ kind: 'smoke', element: 'chakra', from: this.posOf(ev.unit, now), to: this.posOf(ev.unit, now), t0: now, dur: 500 });
          h.roll(ev);
        }
        if (!ev.on && label) this.float(label, '#e9d8a6', this.posOf(ev.unit, now), now);
        return 250;
      case 'sever': {
        const v = this.view(ev.unit);
        if (v) {
          v.severed = true;
          v.creature = { anim: 'sever', t0: now };
        }
        if (label) this.float(label, '#fca5a5', this.posOf(ev.unit, now), now, { rise: 150, big: true });
        h.sound('roar');
        h.shake(4);
        return 500;
      }
      case 'seal': {
        const at = this.posOf(ev.unit, now);
        // The flare of the fire or lightning that sealed it, in its caster's chakra colour (an explosion has none).
        const tint = ev.how === 'explosion' ? undefined : unitTint(ev.source ? state.units[ev.source] : undefined);
        this.fx.push({ kind: ev.how === 'lightning' ? 'electric' : 'fire', element: ev.how === 'lightning' ? 'lightning' : 'fire', from: at, to: at, radius: 0.8, t0: now, dur: 900, lift: [140, 140], tint });
        if (label) this.float(label, '#fdba74', at, now, { rise: 160 });
        return 400;
      }
      case 'regrow': {
        const v = this.view(ev.unit);
        if (v) {
          v.severed = false;
          v.hp = state.units[ev.unit]?.maxHp ?? v.hp;
          v.creature = { anim: 'regrow', t0: now };
        }
        if (label) this.float(label, '#4ade80', this.posOf(ev.unit, now), now, { rise: 150, big: true });
        h.sound('roar');
        return 600;
      }
      case 'reactionAsk':
        return 0;
      case 'fled': {
        const v = this.view(ev.unit);
        if (v) v.fade = { t0: now, dur: 600 };
        return 400;
      }
      case 'end':
        this.banners.push({ text: label ?? ev.outcome, t0: now, dur: 2600, tone: ev.outcome === 'victory' ? 'good' : 'bad' });
        h.sound(ev.outcome === 'victory' ? 'victory' : 'defeat');
        return 600;
      case 'note': {
        // A fanned fire's word floats where the fire meets the wind (fan), not over its caster.
        if (ev.key === 'fanned' || ev.key === 'fanned2') return 0;
        const u = Object.values(state.units).find((x) => x.name === ev.params?.name);
        if (u && label) this.float(label, '#e5e7eb', this.posOf(u.id, now), now, { rise: 130, dur: 1500 });
        return label ? 250 : 0;
      }
      case 'weapon': {
        const v = this.view(ev.unit);
        if (v) v.armed = ev.armed;
        h.sound('draw');
        return 120;
      }
      case 'act': {
        if (label) this.float(label, '#e2e8f0', this.posOf(ev.unit, now), now, { rise: 124 });
        return 180;
      }
      case 'intent':
        return 0;
    }
    return 0;
  }
}

/**
 * A volley's paths: how long each flies against a straight shot (the high arc the longest), and
 * how high on the target it lands (px above its feet: the arc comes down on the shoulders, the low
 * curve rises into the legs).
 */
export const VOLLEY: Record<VolleyPath, { pace: number; lands: number }> = {
  high: { pace: 1.18, lands: 70 },
  straight: { pace: 0.92, lands: 56 },
  low: { pace: 1.04, lands: 40 },
};

/** Where a projectile that misses comes down: on past the target, each path to its own side. */
/** The unit an event is about (its save, its damage, its fall…), if it is about one. */
function unitOfEvent(e: BattleEvent): string | undefined {
  return 'unit' in e && typeof e.unit === 'string' ? e.unit : undefined;
}

function pastTarget(from: Pt, to: Pt, path: VolleyPath): Pt {
  const d = Math.max(0.01, dist(from, to));
  const ux = (to.x - from.x) / d;
  const uz = (to.z - from.z) / d;
  const side = path === 'high' ? -0.45 : path === 'low' ? 0.45 : 0;
  return { x: to.x + ux * 1.1 - uz * side, z: to.z + uz * 1.1 + ux * side };
}

/** The pose a unit rests in. */
export function restPose(u: Unit): SpritePose {
  if (u.down === 'downed' || u.down === 'stable' || u.down === 'dead' || u.down === 'ko' || u.cond.prone) return 'downed';
  if (u.cond.crouched) return 'crouch';
  return 'idle';
}

function restPoseView(u: Unit, v: UnitView): SpritePose {
  if (v.down && v.down !== 'fled') return 'downed';
  if (v.crouched) return 'crouch';
  if (u.cond.prone) return 'downed';
  return 'idle';
}

function propPos(state: BattleState, id: string): Pt {
  const i = Number(id.replace('prop:', ''));
  const p = state.props[i]?.def;
  return p ? { x: p.x, z: p.z } : { x: 0, z: 0 };
}

export type { AreaShape };
