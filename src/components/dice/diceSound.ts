// The dice sounds, made on the fly with Web Audio: the throw (a whoosh, a bounce at each ground
// contact, each softer, and the click as the die rolls onto its face), the result's pop, the
// natural 20's chime, the natural 1's thud and crack, and the critical's sting (a deep boom, a
// ringing blade, a rising gold chime). Each sound is a list of voices; tools/ui/dice-d20-sound.ts
// renders the same recipes to WAV files to listen to offline.
//
// Muting follows the game's sound switch, and a sound that fails never stops what asked for it.

import { soundManager } from '../../utils/audio';
import { CONTACTS, CLICK_MS } from './diceData';

export interface Voice {
  wave: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise';
  /** Start (seconds) and length. */
  at: number;
  dur: number;
  /** Pitch at the start and the end (exponential glide); unused for noise. */
  f0?: number;
  f1?: number;
  gain: number;
  attack?: number;
  /** Exponential decay time constant (seconds). */
  tau: number;
  filter?: { type: 'lowpass' | 'highpass' | 'bandpass'; f: number; q?: number };
}

/** The critical hit's sting (about 1 s): a deep boom, a ringing blade, a rising gold chime. */
export const CRIT_STING: Voice[] = [
  { wave: 'sine', at: 0, dur: 0.45, f0: 150, f1: 40, gain: 0.9, attack: 0.002, tau: 0.16 },
  { wave: 'noise', at: 0, dur: 0.1, gain: 0.55, tau: 0.035, filter: { type: 'lowpass', f: 900 } },
  { wave: 'sine', at: 0.02, dur: 1.0, f0: 98, f1: 96, gain: 0.16, attack: 0.01, tau: 0.45 },
  { wave: 'sine', at: 0.02, dur: 1.0, f0: 147, f1: 145, gain: 0.1, attack: 0.01, tau: 0.4 },
  { wave: 'noise', at: 0.01, dur: 0.2, gain: 0.32, attack: 0.004, tau: 0.06, filter: { type: 'bandpass', f: 6500, q: 4 } },
  { wave: 'sine', at: 0.015, dur: 0.9, f0: 1760, f1: 1760, gain: 0.16, tau: 0.3 },
  { wave: 'sine', at: 0.015, dur: 0.9, f0: 2637, f1: 2637, gain: 0.11, tau: 0.26 },
  { wave: 'sine', at: 0.015, dur: 0.9, f0: 3545, f1: 3545, gain: 0.08, tau: 0.22 },
  { wave: 'triangle', at: 0.12, dur: 0.5, f0: 1318.5, f1: 1318.5, gain: 0.2, tau: 0.2 },
  { wave: 'triangle', at: 0.17, dur: 0.5, f0: 1568, f1: 1568, gain: 0.2, tau: 0.2 },
  { wave: 'triangle', at: 0.22, dur: 0.5, f0: 1975.5, f1: 1975.5, gain: 0.2, tau: 0.22 },
  { wave: 'triangle', at: 0.27, dur: 0.7, f0: 2637, f1: 2637, gain: 0.22, tau: 0.3 },
  { wave: 'noise', at: 0.27, dur: 0.6, gain: 0.05, attack: 0.05, tau: 0.25, filter: { type: 'highpass', f: 7000 } },
];

/** One bounce of the die on the ground, or the final click onto its face (sharper). */
export function tick(at: number, gain: number, click = false): Voice[] {
  return [
    { wave: 'noise', at, dur: click ? 0.03 : 0.04, gain: gain * 0.7, tau: click ? 0.008 : 0.012, filter: { type: 'bandpass', f: click ? 3800 : 2400, q: 2 } },
    { wave: click ? 'square' : 'triangle', at, dur: 0.05, f0: click ? 1900 : 950, f1: click ? 1250 : 320, gain: gain * (click ? 0.22 : 0.4), tau: click ? 0.012 : 0.018 },
  ];
}

/** The throw: a whoosh as it leaves the hand, a bounce at each contact (each softer), the click. */
export function throwVoices(contacts: { at: number; strength: number }[] = CONTACTS, clickMs = CLICK_MS, speed = 1): Voice[] {
  const v: Voice[] = [{ wave: 'noise', at: 0, dur: 0.16, gain: 0.12, attack: 0.05, tau: 0.05, filter: { type: 'bandpass', f: 1200, q: 0.8 } }];
  // A clatter on the first bounce: the die rattles as it tumbles.
  contacts.forEach((c, k) => {
    v.push(...tick(c.at / 1000 / speed, [0.8, 0.55, 0.35][k] ?? 0.3));
    if (k === 0) v.push(...tick(c.at / 1000 / speed + 0.025, 0.25));
  });
  v.push(...tick(clickMs / 1000 / speed, 0.75, true));
  return v;
}

export const POP: Voice[] = [
  { wave: 'sine', at: 0, dur: 0.06, f0: 880, f1: 1320, gain: 0.25, tau: 0.03 },
  { wave: 'triangle', at: 0.03, dur: 0.3, f0: 1760, f1: 1760, gain: 0.15, tau: 0.09 },
];

export const NAT20: Voice[] = [
  ...[1046.5, 1318.5, 1568, 2093, 2637].map((f, i): Voice => ({ wave: 'sine', at: i * 0.045, dur: 0.5, f0: f, f1: f, gain: 0.2, tau: 0.22 })),
  { wave: 'noise', at: 0.05, dur: 0.5, gain: 0.06, attack: 0.05, tau: 0.2, filter: { type: 'highpass', f: 7000 } },
];

export const NAT1: Voice[] = [
  { wave: 'sine', at: 0, dur: 0.3, f0: 90, f1: 55, gain: 0.6, tau: 0.1 },
  { wave: 'noise', at: 0.05, dur: 0.05, gain: 0.4, tau: 0.012, filter: { type: 'bandpass', f: 1200, q: 1.5 } },
  { wave: 'noise', at: 0.1, dur: 0.04, gain: 0.25, tau: 0.01, filter: { type: 'bandpass', f: 1800, q: 1.5 } },
  { wave: 'sawtooth', at: 0.12, dur: 0.45, f0: 220, f1: 110, gain: 0.16, attack: 0.02, tau: 0.18, filter: { type: 'lowpass', f: 900 } },
];

// --- playing them ---------------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let refused = false;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || refused) return null;
  try {
    if (!ctx) {
      const A = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!A) return null;
      ctx = new A();
      master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(() => {});
    return ctx;
  } catch {
    refused = true;
    return null;
  }
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let seed = 42;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
  }
  return noiseBuf;
}

/** Plays a list of voices now. Silent when muted; never throws. */
export function playVoices(voices: Voice[]): void {
  try {
    if (soundManager.getMuted()) return;
    const c = audio();
    if (!c || !master) return;
    const now = c.currentTime + 0.01;
    for (const v of voices) {
      const t = now + v.at;
      const g = c.createGain();
      const attack = v.attack ?? 0.003;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v.gain), t + attack);
      // An exponential decay with time constant tau, to silence by the end.
      g.gain.setTargetAtTime(0.0001, t + attack, v.tau);
      g.gain.setValueAtTime(0.0001, t + v.dur);
      let src: AudioScheduledSourceNode;
      if (v.wave === 'noise') {
        const b = c.createBufferSource();
        b.buffer = noise(c);
        src = b;
      } else {
        const o = c.createOscillator();
        o.type = v.wave;
        o.frequency.setValueAtTime(v.f0 ?? 440, t);
        if (v.f1 && v.f1 !== v.f0) o.frequency.exponentialRampToValueAtTime(v.f1, t + v.dur);
        src = o;
      }
      let node: AudioNode = src;
      if (v.filter) {
        const f = c.createBiquadFilter();
        f.type = v.filter.type;
        f.frequency.value = v.filter.f;
        f.Q.value = v.filter.q ?? 0.707;
        node.connect(f);
        node = f;
      }
      node.connect(g).connect(master);
      src.start(t);
      src.stop(t + v.dur + 0.02);
    }
  } catch {
    // no sound this time
  }
}

export type DiceSound = 'throw' | 'pop' | 'nat20' | 'nat1' | 'crit';

/** A dice sound by name; the throw follows the battle speed. */
export function diceSound(name: DiceSound, speed = 1): void {
  playVoices(name === 'throw' ? throwVoices(CONTACTS, CLICK_MS, speed) : name === 'pop' ? POP : name === 'nat20' ? NAT20 : name === 'nat1' ? NAT1 : CRIT_STING);
}
