// The look cache must not change a single byte: old (committed) vs new tintVfx on whole sheets.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { tintVfx as tNew } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/sprite/vfxTint';
import { tintVfx as tOld } from './vfxTintOld';
const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/assets/world/';
function readPng(path: string) {
  const buf = readFileSync(path); let p = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8); const data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } else if (type === 'IDAT') idat.push(data); p += 12 + n; }
  const raw = inflateSync(Buffer.concat(idat)); const s = w * 4; const px = new Uint8Array(s * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (s + 1)]; for (let x = 0; x < s; x++) { const v = raw[y * (s + 1) + 1 + x]; const a = x >= 4 ? px[y * s + x - 4] : 0; const b = y > 0 ? px[(y - 1) * s + x] : 0; const c = x >= 4 && y > 0 ? px[(y - 1) * s + x - 4] : 0; const q = a + b - c;
    const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (Math.abs(q - a) <= Math.abs(q - b) && Math.abs(q - a) <= Math.abs(q - c) ? a : Math.abs(q - b) <= Math.abs(q - c) ? b : c) : 0; px[y * s + x] = (v + pred) & 255; } }
  return { w, h, rgba: px };
}
const md5 = (b: Uint8Array) => createHash('md5').update(b).digest('hex');
let n = 0;
for (const el of ['fire', 'water', 'wind', 'lightning', 'earth'] as const) {
  const m = JSON.parse(readFileSync(`${R}vfx_${el}/manifest.json`, 'utf8')).sprites;
  for (const name of ['bolt', 'hit', 'blast', 'wall', 'wall_diag', 'stream_head', 'beast']) {
    const file = name === 'beast' ? `${R}vfx_beasts/${el}.png` : `${R}vfx_${el}/${name}.png`;
    const spec = name === 'beast' ? JSON.parse(readFileSync(`${R}vfx_beasts/manifest.json`, 'utf8')).sprites[el] : m[name];
    const s = readPng(file);
    for (const c of ['red', 'green', 'blue', 'yellow', 'indigo', 'violet', 'white', 'black', 'brown', '#ff00aa', '#120a08', '#f0f8ff']) {
      const opt = { width: s.w, height: s.h, frameW: spec.frameW, frameH: spec.frameH, beast: name === 'beast', sprite: name };
      const a = md5(tOld(s.rgba, el, c, opt));
      const b = md5(tNew(s.rgba, el, c, opt));
      const b2 = md5(tNew(s.rgba, el, c, opt));
      if (a !== b || b !== b2) console.log('DIFF', el, name, c);
      n++;
    }
  }
}
console.log('compared', n);
