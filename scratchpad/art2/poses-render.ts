// Renders the character movement poses to PNG for review (not part of the repo).
//
//   npx tsx poses-render.ts <outDir> <looks> [poses]
//
// <looks>: comma list of preset / companion ids, each optionally with overrides:
//   preset_founder            the preset as it is
//   preset_founder@bulky      ...on another body
//   preset_gentle+held=held_kunai+cape=cape_rogue   ...with slot overrides (slot=none clears it)
// [poses]: comma list (default walk,run,crouch,sneak,downed,idle).
//
// Writes <outDir>/<lookKey>/<pose>_<frame>.png (128x128 RGBA, transparent) and
// <outDir>/meta.json { lookKey: { pose: { fps, frames: [{ pelvisX, ground }] } } } for the
// layout script (poses-compose.py), which adds the background, the ground shadow and the zoom.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { frameCount, GROUND, POSE_FPS, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import type { BodyType, EyeSpecial, SpriteAppearance, SpritePose } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';

const DIR = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2';

// --- tiny PNG encoder (8-bit RGBA) -------------------------------------------------------
function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(path: string, w: number, h: number, rgba: Uint8Array | Uint8ClampedArray): void {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}

// --- looks ------------------------------------------------------------------------------
interface Entry {
  id: string;
  look: SpriteAppearance;
  eye: EyeSpecial;
}

async function baseLooks(): Promise<Map<string, Entry>> {
  try {
    const { LEGENDARY_PRESETS } = await import('/home/user/Ninja-Fantasy-Game/src/data/shinobiData');
    const { HANA, KENJI } = await import('/home/user/Ninja-Fantasy-Game/src/data/missions');
    const { getAppearance, dojutsuToEye } = await import('/home/user/Ninja-Fantasy-Game/src/sprite/legacy');
    const chars = [...LEGENDARY_PRESETS.map((p) => p.character), HANA, KENJI];
    return new Map(chars.map((c) => [c.id, { id: c.id, look: JSON.parse(JSON.stringify(getAppearance(c))), eye: dojutsuToEye(c.dojutsu) }]));
  } catch (e) {
    // The data files are being edited by others: fall back to the looks saved with the baseline.
    console.warn('preset import failed, using saved looks:', (e as Error).message);
    const saved: Entry[] = JSON.parse(readFileSync(join(DIR, 'poses-hash-looks.json'), 'utf8'));
    return new Map(saved.map((s) => [s.id, s]));
  }
}

function variant(base: Map<string, Entry>, key: string): Entry {
  const [head, ...mods] = key.split('+');
  const [id, body] = head.split('@');
  const e = base.get(id);
  if (!e) throw new Error(`unknown look ${id}`);
  const look: SpriteAppearance = JSON.parse(JSON.stringify(e.look));
  if (body) look.body = body as BodyType;
  for (const m of mods) {
    const [k, v] = m.split('=');
    if (k === 'acc') look.accessories = v === 'none' ? [] : v.split('/').map((id) => ({ id, colors: [] }));
    else if (k === 'hb') look.headband = { ...look.headband, position: v as SpriteAppearance['headband']['position'], tails: true };
    else if (k === 'cast') look.cast = { style: v as never };
    else if (v === 'none') delete look.slots[k as keyof SpriteAppearance['slots']];
    else look.slots[k as keyof SpriteAppearance['slots']] = { id: v, colors: [] };
  }
  return { id: key, look, eye: e.eye };
}

async function main(): Promise<void> {
  const out = process.argv[2];
  const keys = (process.argv[3] ?? 'preset_founder').split(',');
  const poses = (process.argv[4] ?? 'walk,run,crouch,sneak,downed,idle').split(',') as SpritePose[];
  const base = await baseLooks();
  const meta: Record<string, Record<string, { fps: number; frames: { pelvisX: number; ground: number; lying: boolean }[] }>> = {};
  for (const key of keys) {
    const e = variant(base, key);
    const dir = join(out, key.replace(/[^a-zA-Z0-9_@=+.-]/g, '_'));
    mkdirSync(dir, { recursive: true });
    meta[key] = {};
    for (const pose of poses) {
      const n = frameCount(rigPoseFor(pose, e.look.cast?.style));
      meta[key][pose] = { fps: POSE_FPS[pose], frames: [] };
      for (let f = 0; f < n; f++) {
        const spr = renderSprite(e.look, pose, f, e.eye);
        writePng(join(dir, `${pose}_${f}.png`), GRID, GRID, spr.rgba);
        // The ground shadow sits under the pelvis, or under the middle of a lying body (Rig.lay.cx).
        const lay = (spr.rig as { lay?: { cx: number } }).lay;
        meta[key][pose].frames.push({ pelvisX: (lay ? lay.cx : spr.rig.pelvis.x) * RES + 1, ground: GROUND * RES, lying: !!lay });
      }
    }
  }
  writeFileSync(join(out, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log(`rendered ${keys.length} looks x ${poses.length} poses -> ${out}`);
}

main();
