// Regression guard for the character poses work (not part of the repo).
//
//   npx tsx poses-hash.ts baseline   renders every frame of every EXISTING pose for all
//                                    LEGENDARY_PRESETS + HANA + KENJI and stores a hash per frame
//   npx tsx poses-hash.ts check      re-renders the same looks and compares
//
// The looks are saved with the baseline (poses-hash-looks.json) and the check re-renders those
// exact looks, so edits other people make to the preset data can't show up as false regressions.
// Each frame hashes the RGBA pixels, the part map and the rig (every joint), with and without the
// character's eye special.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { frameCount, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import type { CastStyle, EyeSpecial, SpriteAppearance, SpritePose } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';

const DIR = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2';
const LOOKS = join(DIR, 'poses-hash-looks.json');
const HASHES = join(DIR, 'poses-hash-baseline.json');

const POSES: SpritePose[] = ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge'];
const CAST_STYLES: CastStyle[] = ['signs', 'runes', 'book', 'script', 'sphere', 'lightning', 'wave', 'flash', 'eye'];

interface Entry {
  id: string;
  look: SpriteAppearance;
  eye: EyeSpecial;
}

async function collectLooks(): Promise<Entry[]> {
  const { LEGENDARY_PRESETS } = await import('/home/user/Ninja-Fantasy-Game/src/data/shinobiData');
  const { HANA, KENJI } = await import('/home/user/Ninja-Fantasy-Game/src/data/missions');
  const { getAppearance, dojutsuToEye } = await import('/home/user/Ninja-Fantasy-Game/src/sprite/legacy');
  const chars = [...LEGENDARY_PRESETS.map((p) => p.character), HANA, KENJI];
  return chars.map((c) => ({ id: c.id, look: JSON.parse(JSON.stringify(getAppearance(c))), eye: dojutsuToEye(c.dojutsu) }));
}

function rigJson(r: object): string {
  return JSON.stringify(r, (k, v) => (typeof v === 'function' ? undefined : v));
}

function hashAll(entries: Entry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of entries) {
    for (const eye of [...new Set<EyeSpecial>(['none', e.eye])]) {
      for (const pose of POSES) {
        const styles: (CastStyle | undefined)[] = pose === 'cast' ? CAST_STYLES : [undefined];
        for (const style of styles) {
          const look: SpriteAppearance = style ? { ...e.look, cast: { ...(e.look.cast ?? { style }), style } } : e.look;
          const n = frameCount(rigPoseFor(pose, look.cast?.style));
          for (let f = 0; f < n; f++) {
            const spr = renderSprite(look, pose, f, eye);
            const key = `${e.id}|${eye}|${pose}${style ? ':' + style : ''}|${f}`;
            const px = createHash('sha256').update(spr.rgba).update(spr.part).digest('hex').slice(0, 24);
            const rg = createHash('sha256').update(rigJson(spr.rig)).digest('hex').slice(0, 12);
            out[key] = `${px}:${rg}`;
          }
        }
      }
    }
  }
  return out;
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? 'check';
  if (mode === 'baseline') {
    const entries = await collectLooks();
    writeFileSync(LOOKS, JSON.stringify(entries, null, 1));
    const h = hashAll(entries);
    writeFileSync(HASHES, JSON.stringify(h, null, 1));
    console.log(`baseline: ${Object.keys(h).length} frames for ${entries.length} characters -> ${HASHES}`);
    return;
  }
  if (!existsSync(LOOKS) || !existsSync(HASHES)) throw new Error('run "baseline" first');
  const entries: Entry[] = JSON.parse(readFileSync(LOOKS, 'utf8'));
  const base: Record<string, string> = JSON.parse(readFileSync(HASHES, 'utf8'));
  const now = hashAll(entries);
  let bad = 0;
  for (const k of Object.keys(base)) {
    if (now[k] !== base[k]) {
      bad++;
      if (bad <= 40) console.log(`DIFF ${k}: ${base[k]} -> ${now[k] ?? 'missing'}`);
    }
  }
  for (const k of Object.keys(now)) if (!(k in base)) console.log(`NEW ${k}`);
  console.log(bad ? `FAIL: ${bad} of ${Object.keys(base).length} frames differ` : `OK: all ${Object.keys(base).length} frames identical`);
  if (bad) process.exitCode = 1;
}

main();
