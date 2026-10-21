// Turns the engine's events into what the screen shows over time: units walking their paths,
// striking and casting, damage numbers, effects, banners and sounds. The engine has already
// decided everything; this only paces it so it can be watched.

import type { AreaShape, BattleEvent, BattleState, Down, Pt, Unit, Wall, WeaponNode } from '../../battle/types';
import type { RollInfo } from '../../battle/types';
import { CLICK_MS, IMPACT, WINDOW, dieLife } from '../dice/diceData';
import type { WindowKind } from '../dice/diceData';
import type { SpritePose } from '../../sprite/types';
import { JUTSU } from '../../battle/jutsu';
import type { VfxElement, VfxRole } from '../../battle/jutsu';
import { blastMs, impactMs, signatureMs, skySignature } from './vfxSprites';
import { dist } from '../../battle/map';
import { closestPoint } from '../../battle/structures';
import { midpoint } from '../../battle/combat';

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
   * A Ryusei's phase (Warp Strike, Spatial Swap): the ninja turns to blue light where it stands,
   * dashes as light to `to` and turns solid there (PHASE_IN, PHASE_DASH, PHASE_OUT; renderer.ts
   * draws it).
   */
  phase?: { from: Pt; to: Pt; t0: number };
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

export type FxKind = 'projectile' | 'kunai' | 'area' | 'cone' | 'line' | 'burst' | 'explosion' | 'electric' | 'smoke' | 'heal' | 'aura' | 'noise' | 'slash' | 'wall' | 'seal' | 'fire';

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
}

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

export class Playback {
  views = new Map<string, UnitView>();
  floaters: Floater[] = [];
  fx: Fx[] = [];
  banners: Banner[] = [];
  /** Animals that took off (prop index → when). */
  fled = new Map<number, number>();
  /** When each jutsu wall was raised, so it plays its rise before standing. */
  wallBorn = new Map<string, number>();
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
      };
      this.views.set(u.id, next);
    }
    if (state.phase === 'combat') {
      this.turnUnit = state.order[state.turn];
      this.round = state.round;
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
      for (let i = 1; i < this.queue.length && group.length < 8 && this.queue[i].t === first.t; i++) group.push(this.queue[i]);
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
      // A roll: its dice are thrown first, and the event plays once they land.
      if (this.diceOn && diceKind(this.queue[0]) && !this.thrown.has(this.queue[0])) {
        this.busyUntil = this.diceWait = now + this.throwDice(now) / this.speed;
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
      if (this.diceOn && ev.t === 'jutsu' && nx?.t === 'save' && !this.thrown.has(nx)) {
        const hit = Math.max(now, Math.min(this.hitAt || this.busyUntil, this.busyUntil));
        const t0 = Math.max(now, hit - CLICK_MS / this.speed);
        this.busyUntil = this.diceWait = Math.max(hit, t0 + this.throwDice(t0, now) / this.speed);
        this.diceFloor = hit;
      }
      if (!this.queue.length) this.settling = true;
    }
    // One-shot poses fall back to rest.
    for (const [id, v] of this.views) {
      if (v.poseUntil && now >= v.poseUntil) {
        const u = state.units[id];
        v.poseUntil = undefined;
        v.pose = u ? restPoseView(u, v) : 'idle';
        v.poseT0 = now;
      }
      if (v.phase && now >= v.phase.t0 + PHASE_MS / this.speed) {
        v.phase = undefined;
        const u = state.units[id];
        if (u) v.facing = u.facing;
      }
      if (v.walk && now >= v.walk.t0 + (v.walk.total / v.walk.speed) * 1000 / this.speed) {
        v.pos = { ...v.walk.path[v.walk.path.length - 1] };
        v.walk = undefined;
        const u = state.units[id];
        v.pose = u ? restPoseView(u, v) : 'idle';
        v.poseT0 = now;
      }
    }
    for (const s of this.sounds) if (now >= s.at) this.hooks.sound(s.name, s.detail);
    this.sounds = this.sounds.filter((s) => now < s.at);
    this.dice = this.dice.filter((d) => now < d.t0 + dieLife(natOf(d.roll)) / this.speed + 260);
    if (this.diceWindow && now > this.diceWindow.t0 + (WINDOW.go - WINDOW.open + WINDOW.fade) / this.speed) this.diceWindow = null;
    this.impacts = this.impacts.filter((c) => now < c.t0 + (IMPACT.number + IMPACT.numberLife) / this.speed);
    this.floaters = this.floaters.filter((f) => now < f.t0 + f.dur);
    this.fx = this.fx.filter((f) => now < f.t0 + f.dur);
    this.banners = this.banners.filter((b) => now < b.t0 + b.dur);
    this.fallen = this.fallen.filter((f) => now < f.t0 + FALL_MS / this.speed);
    if (!this.settling || this.queue.length || now < this.busyUntil) return false;
    for (const v of this.views.values()) if (v.walk || v.phase || (v.poseUntil && now < v.poseUntil)) return false;
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
    const w = v.walk;
    if (!w) return v.pos;
    const travelled = Math.min(w.total, (((now - w.t0) * this.speed) / 1000) * w.speed);
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
    return Math.min(w.total, (((now - w.t0) * this.speed) / 1000) * w.speed);
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

  private setPose(v: UnitView, pose: SpritePose, now: number, dur?: number): void {
    v.pose = pose;
    v.poseT0 = now;
    v.poseUntil = dur ? now + dur / this.speed : undefined;
  }

  private float(text: string, color: string, at: Pt, now: number, o: Partial<Floater> = {}): void {
    // Words and numbers on the same spot stack upward, clear of each other ("Resiste" over "-3").
    const near = this.floaters.filter((f) => dist(f.at, at) < 0.8 && now - f.t0 < 800 / this.speed);
    let rise = o.rise ?? 96;
    while (near.some((f) => Math.abs(f.rise - rise) < 17)) rise += 17;
    this.floaters.push({ text, color, at: { ...at }, t0: now, dur: 1100 / this.speed, ...o, rise });
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
        const speed = pose === 'run' ? RUN : pose === 'sneak' ? SNEAK : WALK;
        const last = ev.path[ev.path.length - 1];
        if (Math.abs(last.x - start.x) > 0.05) v.facing = last.x > start.x ? 1 : -1;
        v.walk = { path: ev.path.map((p) => ({ ...p })), t0: now, speed, pose, lengths, total };
        v.pose = pose;
        v.poseT0 = now;
        h.sound('step');
        if (ev.unit === this.turnUnit || state.phase === 'stealth') h.focus(ev.unit);
        return (total / speed) * 1000;
      }
      case 'teleport': {
        const v = this.view(ev.unit);
        if (!v) return 0;
        // A Spatial Swap's two jumps happen at once.
        const together = this.queue[0]?.t === 'teleport';
        if (ev.how === 'phase') {
          // A Ryusei's Warp Strike or Spatial Swap: no smoke, the ninja crosses as blue light.
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
        return 280;
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
        const a = this.view(ev.unit);
        if (!a) return 0;
        const spec = JUTSU[ev.jutsu];
        const from = this.posOf(ev.unit, now);
        if (Math.abs(ev.at.x - from.x) > 0.05) a.facing = ev.at.x > from.x ? 1 : -1;
        const caster = state.units[ev.unit];
        const head = caster?.kind === 'hydra_head';
        if ((spec?.special === 'warp' || spec?.special === 'swap') && this.phaseFollows(ev.unit)) {
          // A Warp Strike or a Spatial Swap that goes through: its name and a beat, then the phase
          // itself plays (no cast pose, no chakra flare: the ninja turns to light at once).
          h.sound('jutsu', 'chakra');
          if (label) this.float(label, '#fde68a', from, now, { rise: 128, dur: 1400 });
          return 90;
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
        const fly = spec?.vfx === 'beast' ? Math.max(900, dist(from, ev.at) * 150) : Math.max(500, dist(from, ev.at) * 115);
        const linger = (ms: number) => (this.lingerUntil = Math.max(this.lingerUntil, t1 + ms / this.speed));
        h.sound('jutsu', el);
        if (label) this.float(label, '#fde68a', from, now, { rise: 128, dur: 1400 });
        const t1 = now + castDelay / this.speed;
        const base = { element: el, t0: t1, enhanced: ev.enhanced, sig: spec?.sig, role: spec?.vfx };
        switch (spec?.special) {
          case 'heal':
            this.fx.push({ ...base, kind: 'heal', from: ev.at, to: ev.at, dur: 1300 });
            linger(1300);
            return castDelay + 700;
          case 'clone':
            this.fx.push({ ...base, kind: 'aura', from, to: from, dur: 1100, unit: ev.unit });
            linger(1100);
            return castDelay + 400;
          case 'flicker':
          case 'warp':
          case 'swap':
            // The chakra flares while it gathers, and is gone with the ninja when it vanishes (it
            // would otherwise burn on at the spot it left, around whoever is swapped in there).
            this.fx.push({ ...base, kind: 'aura', from, to: from, t0: now, dur: castDelay + 400, unit: ev.unit, follow: true });
            return castDelay + 400;
          case 'trap':
            this.fx.push({ ...base, kind: 'seal', from: ev.at, to: ev.at, dur: 1000, sig: 'tag' });
            return castDelay + 500;
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
          this.fx.push({ ...base, kind: 'line', from, to: ev.at, area: ev.shape, dur: 1300, lift: [head ? 120 : 70, 50] });
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
        this.fx.push({ ...base, kind: 'projectile', from, to: ev.at, dur: fly, lift: [head ? 120 : 70, ev.shape ? 30 : 60] });
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
        if (label) this.float(label, '#c4b5fd', this.posOf(ev.unit, now), now, { rise: 120 });
        return label ? 200 : 0;
      }
      case 'effect': {
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
        this.fx.push({ kind: 'electric', element: 'lightning', from: ev.at, to: ev.at, radius: ev.radius, t0: now, dur: 800, sig: 'water' });
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
        this.fx.push({ kind: ev.how === 'lightning' ? 'electric' : 'fire', element: ev.how === 'lightning' ? 'lightning' : 'fire', from: at, to: at, radius: 0.8, t0: now, dur: 900, lift: [140, 140] });
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
