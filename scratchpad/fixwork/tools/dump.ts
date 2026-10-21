// Renders sprite frames to PNGs + a manifest. Usage:
//   npx tsx dump.ts <outDir> <spec.json>
// spec: [{ key, preset?: name-prefix, body?: BodyType, held?: itemId|null, pose, frames?: number[], extra?: partial look }]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/compose';
import { defaultAppearance, getAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/legacy';
import { GRID } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/raster';
import { frameCount, rigPoseFor } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/rig';
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/data/shinobiData';
import type { SpriteAppearance, SpritePose } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/types';

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
export function writePng(path: string, w: number, h: number, rgba: Uint8Array | Uint8ClampedArray): void {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}

interface Spec {
  key: string;
  preset?: string;
  body?: SpriteAppearance['body'];
  held?: string | null;
  pose: SpritePose;
  frames?: number[];
  look?: Partial<SpriteAppearance>;
  slots?: Record<string, { id: string; colors?: string[] } | null>;
}

const [outDir, specPath] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const specs: Spec[] = JSON.parse(readFileSync(specPath, 'utf8'));
const manifest: Record<string, unknown>[] = [];
for (const s of specs) {
  let look: SpriteAppearance;
  if (s.preset) {
    const p = LEGENDARY_PRESETS.find((q) => q.name.startsWith(s.preset!));
    if (!p) throw new Error('no preset ' + s.preset);
    look = structuredClone(getAppearance(p.character));
  } else look = defaultAppearance();
  if (s.body) look.body = s.body;
  if (s.look) Object.assign(look, s.look);
  if (s.slots) for (const [k, v] of Object.entries(s.slots)) {
    if (v === null) delete (look.slots as Record<string, unknown>)[k];
    else (look.slots as Record<string, unknown>)[k] = { id: v.id, colors: v.colors ?? [] };
  }
  if (s.held === null) delete look.slots.held;
  else if (s.held) look.slots.held = { id: s.held, colors: [] };
  const n = frameCount(rigPoseFor(s.pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
  const frames = s.frames ?? Array.from({ length: n }, (_, i) => i);
  for (const f of frames) {
    const spr = renderSprite(look, s.pose, f);
    const file = `${s.key}_${s.pose}_${f}.png`;
    writePng(`${outDir}/${file}`, GRID, GRID, spr.rgba);
    const r = spr.rig;
    manifest.push({ key: s.key, pose: s.pose, frame: f, n, file, handN: r.handN, wristN: r.wristN, pelvis: r.pelvis, head: r.head, neck: r.neck, elbowN: r.elbowN, shoulderN: r.shoulderN, handF: r.handF, elbowF: r.elbowF, shoulderF: r.shoulderF, kneeN: r.kneeN, kneeF: r.kneeF, ankleN: r.ankleN, ankleF: r.ankleF, hipN: r.hipN, hipF: r.hipF, lean: r.lean });
  }
}
writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log('wrote', manifest.length, 'frames');
