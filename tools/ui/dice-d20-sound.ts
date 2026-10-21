// The dice sounds, written as WAV files to listen to (for the owner's approval) from the same
// recipes the game will play with WebAudio: each sound is a list of voices (an oscillator or noise,
// a pitch glide, an attack and an exponential decay, an optional filter), like src/utils/audio.ts.
//
//   npx tsx tools/ui/dice-d20-sound.ts      writes into $UI_OUT (default: the dice staging folder)
//
// Sounds: the throw (three bounces and the click on the face), the result pop, the natural 20's
// shimmer, the natural 1's crack, and the critical hit's sting (boom, blade ring, gold chime).

import { join } from 'node:path';
import { writeAtomic } from './ui-img';
import { lcg } from './dice-d20-art';

const RATE = 44100;
const STAGING = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/dados/sprites';
const OUT = process.env.UI_OUT ?? STAGING;

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

/** One bounce or the final click of the die (louder and sharper). */
function tick(at: number, gain: number, click = false): Voice[] {
  return [
    { wave: 'noise', at, dur: click ? 0.03 : 0.04, gain: gain * 0.7, tau: click ? 0.008 : 0.012, filter: { type: 'bandpass', f: click ? 3800 : 2400, q: 2 } },
    { wave: click ? 'square' : 'triangle', at, dur: 0.05, f0: click ? 1900 : 950, f1: click ? 1250 : 320, gain: gain * (click ? 0.22 : 0.4), tau: click ? 0.012 : 0.018 },
  ];
}

/** The throw, timed on the throw's frames (contacts at frames 5, 10, 13, the click at 15). */
export function throwSound(frameMs: number[], contacts: number[], click: number): Voice[] {
  const at = (i: number) => frameMs.slice(0, i).reduce((a, b) => a + b, 0) / 1000;
  const v: Voice[] = [];
  // The die leaving the hand: a short whoosh.
  v.push({ wave: 'noise', at: 0, dur: 0.16, gain: 0.12, attack: 0.05, tau: 0.05, filter: { type: 'bandpass', f: 1200, q: 0.8 } });
  contacts.forEach((c, k) => v.push(...tick(at(c), [0.8, 0.55, 0.35][k] ?? 0.3)));
  v.push(...tick(at(click), 0.75, true));
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

// --- offline rendering -------------------------------------------------------------------------------

function biquad(type: 'lowpass' | 'highpass' | 'bandpass', f: number, q: number) {
  const w = (2 * Math.PI * f) / RATE, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0: number, b1: number, b2: number;
  if (type === 'lowpass') [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
  else if (type === 'highpass') [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
  else [b0, b1, b2] = [al, 0, -al];
  const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x: number) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

export function render(voices: Voice[]): Float32Array {
  const len = Math.ceil(Math.max(...voices.map((v) => v.at + v.dur)) * RATE) + 64;
  const out = new Float32Array(len);
  const rnd = lcg(42);
  for (const v of voices) {
    const n = Math.ceil(v.dur * RATE), start = Math.floor(v.at * RATE);
    const filt = v.filter ? biquad(v.filter.type, v.filter.f, v.filter.q ?? 0.707) : null;
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const f = v.f0 && v.f1 ? v.f0 * Math.pow(v.f1 / v.f0, Math.min(1, t / v.dur)) : 0;
      ph += f / RATE;
      const p = ph % 1;
      let s = 0;
      if (v.wave === 'sine') s = Math.sin(2 * Math.PI * ph);
      else if (v.wave === 'triangle') s = 1 - 4 * Math.abs(p - 0.5);
      else if (v.wave === 'square') s = p < 0.5 ? 1 : -1;
      else if (v.wave === 'sawtooth') s = 2 * p - 1;
      else s = rnd() * 2 - 1;
      if (filt) s = filt(s);
      const env = Math.min(1, t / (v.attack ?? 0.003)) * Math.exp(-t / v.tau) * Math.min(1, (v.dur - t) / 0.01);
      out[start + i] += s * v.gain * env;
    }
  }
  // Leave headroom: peak at -1 dBFS.
  const peak = out.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] / peak) * 0.89;
  return out;
}

export function wav(samples: Float32Array): Buffer {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + samples.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24);
  b.writeUInt32LE(RATE * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  return b;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // The throw's frame times, as in the manifest (frames 0..17).
  const ms = [34, 34, 34, 34, 34, 42, 38, 38, 38, 38, 42, 40, 40, 45, 45, 60, 70];
  const sounds: [string, Voice[]][] = [
    ['dado_tirada.wav', throwSound(ms, [5, 10, 13], 15)],
    ['dado_resultado.wav', POP],
    ['dado_20.wav', NAT20],
    ['dado_1.wav', NAT1],
    ['critico.wav', CRIT_STING],
  ];
  for (const [name, v] of sounds) writeAtomic(join(OUT, name), wav(render(v)));
  console.log(`dice sounds: wrote ${OUT}`);
}
