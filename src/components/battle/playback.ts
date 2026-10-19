// Turns the engine's events into what the screen shows over time: units walking their paths,
// striking and casting, damage numbers, effects, banners and sounds. The engine has already
// decided everything; this only paces it so it can be watched.

import type { AreaShape, BattleEvent, BattleState, Down, Pt, Unit, Wall } from '../../battle/types';
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
}

export interface Banner {
  text: string;
  sub?: string;
  t0: number;
  dur: number;
  tone: 'neutral' | 'good' | 'bad' | 'alarm';
}

/** Hooks the screen gives the player: sounds, the log, the roll toast, the camera. */
export interface PlaybackHooks {
  sound(name: SoundName, detail?: string): void;
  log(ev: BattleEvent): void;
  roll(ev: BattleEvent): void;
  focus(unit: string): void;
  shake(power: number): void;
  label(ev: BattleEvent): string | null;
}

export type SoundName = 'step' | 'swing' | 'hit' | 'crit' | 'miss' | 'jutsu' | 'explosion' | 'heal' | 'down' | 'alarm' | 'kawarimi' | 'turn' | 'victory' | 'defeat' | 'roar' | 'splash' | 'bells' | 'stone' | 'draw';

const RUN = 5.5;
const WALK = 3.2;
const SNEAK = 2.4;

export class Playback {
  views = new Map<string, UnitView>();
  floaters: Floater[] = [];
  fx: Fx[] = [];
  banners: Banner[] = [];
  /** Animals that took off (prop index → when). */
  fled = new Map<number, number>();
  /** When each jutsu wall was raised, so it plays its rise before standing. */
  wallBorn = new Map<string, number>();
  /** Whose turn the screen shows (it trails the engine while events play). */
  turnUnit: string | undefined;
  round = 0;
  queue: BattleEvent[] = [];
  busyUntil = 0;
  /** A big signature still playing: the next turn waits for it to finish. */
  lingerUntil = 0;
  speed = 1;

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

  get busy(): boolean {
    return this.queue.length > 0;
  }

  push(events: BattleEvent[], now: number): void {
    if (!this.queue.length) this.busyUntil = Math.max(this.busyUntil, now);
    this.queue.push(...events);
  }

  /** Runs the queue up to `now`. Returns true when it just emptied. */
  step(now: number, state: BattleState): boolean {
    let emptied = false;
    while (this.queue.length && now >= this.busyUntil) {
      const next = this.queue[0].t;
      if ((next === 'turn' || next === 'round' || next === 'end') && now < this.lingerUntil) break;
      const ev = this.queue.shift()!;
      const d = this.apply(ev, now, state);
      this.busyUntil = now + d / this.speed;
      if (!this.queue.length) emptied = true;
    }
    // One-shot poses fall back to rest.
    for (const [id, v] of this.views) {
      if (v.poseUntil && now >= v.poseUntil) {
        const u = state.units[id];
        v.poseUntil = undefined;
        v.pose = u ? restPoseView(u, v) : 'idle';
        v.poseT0 = now;
      }
      if (v.walk && now >= v.walk.t0 + (v.walk.total / v.walk.speed) * 1000 / this.speed) {
        v.pos = { ...v.walk.path[v.walk.path.length - 1] };
        v.walk = undefined;
        const u = state.units[id];
        v.pose = u ? restPoseView(u, v) : 'idle';
        v.poseT0 = now;
      }
    }
    this.floaters = this.floaters.filter((f) => now < f.t0 + f.dur);
    this.fx = this.fx.filter((f) => now < f.t0 + f.dur);
    this.banners = this.banners.filter((b) => now < b.t0 + b.dur);
    return emptied && now >= this.busyUntil;
  }

  /** Where a unit is drawn right now (meters), following its walk. */
  posOf(id: string, now: number): Pt {
    const v = this.views.get(id);
    if (!v) return { x: 0, z: 0 };
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

  /** A wall by id: standing, or gone with an event still to play. */
  wallOf(id: string, state: BattleState): Wall | undefined {
    return state.walls.find((w) => w.id === id) ?? this.goneWalls().find((w) => w.id === id);
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

  private setPose(v: UnitView, pose: SpritePose, now: number, dur?: number): void {
    v.pose = pose;
    v.poseT0 = now;
    v.poseUntil = dur ? now + dur / this.speed : undefined;
  }

  private float(text: string, color: string, at: Pt, now: number, o: Partial<Floater> = {}): void {
    // Numbers on the same spot stack upward.
    const stack = this.floaters.filter((f) => dist(f.at, at) < 0.6 && now - f.t0 < 500).length;
    this.floaters.push({ text, color, at: { ...at }, rise: 96 + stack * 16, t0: now, dur: 1100 / this.speed, ...o });
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
        this.fx.push({ kind: 'smoke', element: 'chakra', from: ev.from, to: ev.from, t0: now, dur: 500 });
        this.fx.push({ kind: 'smoke', element: 'chakra', from: ev.to, to: ev.to, t0: now + 120, dur: 500 });
        v.pos = { ...ev.to };
        v.walk = undefined;
        return 320;
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
        h.sound('kawarimi');
        return 650;
      }
      case 'evade': {
        // Premonitory Evasion: the Mirai's eyes flare and it darts a step aside as the blow lands.
        const v = this.view(ev.unit);
        if (!v) return 0;
        const d = dist(ev.from, ev.to);
        this.fx.push({ kind: 'aura', element: 'fire', sig: 'eyes', from: ev.from, to: ev.from, t0: now, dur: 700, unit: ev.unit });
        v.pos = { ...ev.from };
        v.walk = { path: [{ ...ev.to }], t0: now, speed: 7, pose: 'run', lengths: [d], total: d };
        v.pose = 'run';
        v.poseT0 = now;
        if (label) this.float(label, '#fecaca', ev.from, now);
        h.sound('kawarimi');
        return 420;
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
          case 'flicker':
            this.fx.push({ ...base, kind: 'aura', from, to: from, dur: 1100, unit: ev.unit });
            linger(1100);
            return castDelay + 400;
          case 'trap':
            this.fx.push({ ...base, kind: 'seal', from: ev.at, to: ev.at, dur: 1000, sig: 'tag' });
            return castDelay + 500;
          case 'earthWall':
          case 'waterWall':
            this.fx.push({ ...base, kind: 'wall', from: ev.at, to: ev.at, dur: 1200 });
            // The wall itself rises when its event plays, right as the jutsu lands.
            return castDelay;
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
        this.float(`${ev.amount}`, ev.crit ? '#fde047' : '#f87171', at, now, { big: ev.crit, dur: 1200 });
        h.sound(ev.crit ? 'crit' : 'hit');
        if (ev.crit) h.shake(4);
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
        return 600;
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
          return 0;
        }
        // A broken structure falls apart in a cloud of dust (a water barrier just fades).
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
        this.fx.push({ kind: 'electric', element: 'lightning', from: ev.at, to: ev.at, radius: ev.radius, t0: now, dur: 800 });
        return 300;
      case 'trap':
        return 0;
      case 'explode':
        this.fx.push({ kind: 'explosion', element: 'fire', from: ev.at, to: ev.at, radius: ev.radius, t0: now, dur: 800 });
        h.sound('explosion');
        h.shake(6);
        return 380;
      case 'clone':
        if (ev.on) this.fx.push({ kind: 'aura', element: 'chakra', from: this.posOf(ev.unit, now), to: this.posOf(ev.unit, now), t0: now, dur: 600, unit: ev.unit });
        else this.fx.push({ kind: 'smoke', element: 'chakra', from: this.posOf(ev.unit, now), to: this.posOf(ev.unit, now), t0: now, dur: 500 });
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
