// Sounds of the battle, made on the fly with Web Audio: steps, blades, hits, jutsu, explosions and
// the ambience of the map (the river, birds by day, crickets at night). Muting follows the game's
// sound switch.

import { soundManager } from '../../utils/audio';
import { diceSound } from '../dice/diceSound';
import type { SoundName } from './playback';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
/** The browser or the frame the game runs in refused audio: the battle plays on silently. */
let refused = false;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || refused) return null;
  try {
    if (!ctx) {
      const A = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!A) return null;
      ctx = new A();
      master = ctx.createGain();
      master.gain.value = 0.7;
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
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
  }
  return noiseBuf;
}

/** A burst of filtered noise (whooshes, thuds, splashes). */
function burst(c: AudioContext, o: { dur: number; gain: number; type: BiquadFilterType; f0: number; f1?: number; q?: number; at?: number }): void {
  const t = c.currentTime + (o.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.f0, t);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(o.gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + o.dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t, Math.random());
  src.stop(t + o.dur + 0.05);
}

function tone(c: AudioContext, o: { f0: number; f1?: number; dur: number; gain: number; type?: OscillatorType; at?: number }): void {
  const t = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f0, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + o.dur);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

const NATURE: Record<string, string> = { fire: 'Fire', water: 'Water', wind: 'Wind', lightning: 'Lightning', earth: 'Earth' };
let lastStep = 0;

/** A sound that fails never stops the playback that asked for it. */
export function playSound(name: SoundName, detail?: string): void {
  try {
    play(name, detail);
  } catch {
    // no sound this time
  }
}

function play(name: SoundName, detail?: string): void {
  if (soundManager.getMuted()) return;
  const c = audio();
  if (!c || !master) return;
  switch (name) {
    case 'step':
      if (c.currentTime - lastStep < 0.12) return;
      lastStep = c.currentTime;
      burst(c, { dur: 0.06, gain: 0.08, type: 'bandpass', f0: 900, q: 0.8 });
      break;
    case 'swing':
      burst(c, { dur: 0.18, gain: 0.25, type: 'bandpass', f0: 600, f1: 3200, q: 1.4 });
      break;
    case 'miss':
      burst(c, { dur: 0.22, gain: 0.12, type: 'highpass', f0: 2500, f1: 800 });
      break;
    case 'hit':
      burst(c, { dur: 0.12, gain: 0.35, type: 'lowpass', f0: 900, f1: 120 });
      tone(c, { f0: 140, f1: 60, dur: 0.12, gain: 0.25, type: 'triangle' });
      break;
    case 'crit':
      soundManager.playCriticalHit();
      break;
    // The d20 (src/components/dice/diceSound.ts): the throw follows the battle speed.
    case 'diceThrow':
      diceSound('throw', Number(detail) || 1);
      break;
    case 'dicePop':
      diceSound('pop');
      break;
    case 'diceNat20':
      diceSound('nat20');
      break;
    case 'diceNat1':
      diceSound('nat1');
      break;
    case 'critSting':
      diceSound('crit');
      break;
    case 'jutsu':
      if (detail && NATURE[detail]) soundManager.playJutsuCast(NATURE[detail]);
      else {
        tone(c, { f0: 300, f1: 900, dur: 0.3, gain: 0.12, type: 'triangle' });
        burst(c, { dur: 0.3, gain: 0.1, type: 'bandpass', f0: 1500, f1: 400 });
      }
      break;
    case 'explosion':
      burst(c, { dur: 0.9, gain: 0.6, type: 'lowpass', f0: 1200, f1: 60 });
      tone(c, { f0: 70, f1: 30, dur: 0.6, gain: 0.4, type: 'sine' });
      break;
    case 'heal':
      [660, 880, 1320].forEach((f, i) => tone(c, { f0: f, dur: 0.4, gain: 0.08, at: i * 0.07 }));
      break;
    case 'down':
      burst(c, { dur: 0.3, gain: 0.25, type: 'lowpass', f0: 400, f1: 80 });
      break;
    case 'alarm':
      [523, 415].forEach((f, i) => tone(c, { f0: f, dur: 0.45, gain: 0.16, type: 'square', at: i * 0.22 }));
      break;
    case 'kawarimi':
      burst(c, { dur: 0.25, gain: 0.2, type: 'highpass', f0: 1200 });
      tone(c, { f0: 300, f1: 900, dur: 0.15, gain: 0.1, at: 0.05 });
      break;
    case 'turn':
      tone(c, { f0: 880, dur: 0.08, gain: 0.05 });
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) => tone(c, { f0: f, dur: 0.5, gain: 0.12, type: 'triangle', at: i * 0.12 }));
      break;
    case 'defeat':
      [392, 330, 262].forEach((f, i) => tone(c, { f0: f, dur: 0.7, gain: 0.12, type: 'triangle', at: i * 0.25 }));
      break;
    case 'roar':
      burst(c, { dur: 1.1, gain: 0.45, type: 'bandpass', f0: 220, f1: 90, q: 2 });
      tone(c, { f0: 95, f1: 55, dur: 1.0, gain: 0.25, type: 'sawtooth' });
      break;
    case 'splash':
      burst(c, { dur: 0.35, gain: 0.25, type: 'highpass', f0: 1500, f1: 600 });
      break;
    case 'bells':
      [1046, 1318, 1046, 1318].forEach((f, i) => tone(c, { f0: f, dur: 0.6, gain: 0.12, type: 'sine', at: i * 0.18 }));
      break;
    case 'stone':
      tone(c, { f0: 1800, f1: 900, dur: 0.06, gain: 0.15, type: 'square' });
      tone(c, { f0: 1500, f1: 800, dur: 0.05, gain: 0.1, type: 'square', at: 0.12 });
      break;
    case 'draw':
      burst(c, { dur: 0.25, gain: 0.12, type: 'bandpass', f0: 4000, f1: 7000, q: 6 });
      break;
  }
}

/** The map's ambience: the river's murmur, and birds by day or crickets at night. */
export function startAmbience(night: boolean): () => void {
  try {
    return ambience(night);
  } catch {
    return () => {};
  }
}

function ambience(night: boolean): () => void {
  const c = audio();
  if (!c || !master || soundManager.getMuted()) return () => {};
  const out = c.createGain();
  out.gain.value = 0.0001;
  out.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 1.5);
  out.connect(master);
  const river = c.createBufferSource();
  river.buffer = noise(c);
  river.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  const rg = c.createGain();
  rg.gain.value = 0.09;
  river.connect(lp).connect(rg).connect(out);
  river.start();
  const timer = setInterval(
    () => {
      if (soundManager.getMuted()) return;
      const t0 = Math.random();
      if (night) {
        for (let i = 0; i < 3; i++) {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.frequency.value = 4200 + Math.random() * 300;
          const t = c.currentTime + i * 0.09;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.015, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          osc.connect(g).connect(out);
          osc.start(t);
          osc.stop(t + 0.07);
        }
      } else if (t0 < 0.45) {
        const n = 2 + Math.floor(Math.random() * 3);
        const base = 2400 + Math.random() * 1600;
        for (let i = 0; i < n; i++) {
          const osc = c.createOscillator();
          const g = c.createGain();
          const t = c.currentTime + i * 0.11;
          osc.frequency.setValueAtTime(base, t);
          osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.3), t + 0.07);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.02, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
          osc.connect(g).connect(out);
          osc.start(t);
          osc.stop(t + 0.1);
        }
      }
    },
    night ? 900 : 2200,
  );
  return () => {
    clearInterval(timer);
    try {
      out.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
      river.stop(c.currentTime + 0.6);
    } catch {
      // already stopped
    }
  };
}
