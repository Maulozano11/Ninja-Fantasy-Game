// The dice sounds as WAV files to listen to (for the owner's approval), rendered offline from the
// very recipes the game plays with Web Audio (src/components/dice/diceSound.ts): each sound is a
// list of voices (an oscillator or noise, a pitch glide, an attack and an exponential decay, an
// optional filter).
//
//   UI_OUT=<staging dir> npx tsx tools/ui/dice-d20-sound.ts
//
// Sounds: the throw (a whoosh, three bounces and the click on the face), the result pop, the natural
// 20's chime, the natural 1's thud and crack, and the critical hit's sting.

import { join } from 'node:path';
import { writeAtomic } from './ui-img';
import { lcg } from './dice-d20-art';
import { CRIT_STING, NAT1, NAT20, POP, throwVoices } from '../../src/components/dice/diceSound';
import type { Voice } from '../../src/components/dice/diceSound';

const RATE = 44100;

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
  const OUT = process.env.UI_OUT;
  if (!OUT) {
    console.error('dice sounds: set UI_OUT=<staging dir>');
    process.exit(1);
  }
  const sounds: [string, Voice[]][] = [
    ['dado_tirada.wav', throwVoices()],
    ['dado_resultado.wav', POP],
    ['dado_20.wav', NAT20],
    ['dado_1.wav', NAT1],
    ['critico.wav', CRIT_STING],
  ];
  for (const [name, v] of sounds) writeAtomic(join(OUT, name), wav(render(v)));
  console.log(`dice sounds: wrote ${OUT}`);
}
