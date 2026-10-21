// Quick look: npx tsx prev.mts out.png scale "group/sprite:anim:frame[:el]" ... -- colours
// Rows = colours ('orig' first), columns = effects.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_jutsu-tint-2';
const imp = (p: string) => import(pathToFileURL(join(ROOT, p)).href);
const { tintVfx } = await imp('src/sprite/vfxTint.ts');
const { writePng } = await imp('tools/world-sprites/kit.ts');
const { inflateSync } = await import('node:zlib');
function readPng(path: string) {
  const buf = readFileSync(path); let p = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p); const t = buf.toString('ascii', p + 4, p + 8); const d = buf.subarray(p + 8, p + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } else if (t === 'IDAT') idat.push(d); p += 12 + n; }
  const raw = inflateSync(Buffer.concat(idat)); const s = w * 4; const px = new Uint8Array(s * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (s + 1)]; for (let x = 0; x < s; x++) { const v = raw[y * (s + 1) + 1 + x];
    const a = x >= 4 ? px[y * s + x - 4] : 0, b = y > 0 ? px[(y - 1) * s + x] : 0, c = x >= 4 && y > 0 ? px[(y - 1) * s + x - 4] : 0; const q = a + b - c;
    const pr = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (Math.abs(q - a) <= Math.abs(q - b) && Math.abs(q - a) <= Math.abs(q - c) ? a : Math.abs(q - b) <= Math.abs(q - c) ? b : c) : 0;
    px[y * s + x] = (v + pr) & 255; } }
  return { w, h, rgba: px };
}
const args = process.argv.slice(2);
const out = args[0], k = +args[1];
const sep = args.indexOf('--');
const specs = args.slice(2, sep), colours = args.slice(sep + 1);
const cells: { w: number; h: number; rows: Uint8Array[] }[] = [];
for (const sp of specs) {
  const [gs, anim, f, elx] = sp.split(':'); const [g, s] = gs.split('/');
  const m = JSON.parse(readFileSync(join(ROOT, 'src/assets/world', g, 'manifest.json'), 'utf8')).sprites[s];
  const sh = readPng(join(ROOT, 'src/assets/world', g, m.file));
  const { frameW: w, frameH: h } = m; const row = m.anims[anim].row; const fi = +f;
  const fr = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) fr.set(sh.rgba.subarray(((row * h + y) * sh.w + fi * w) * 4, ((row * h + y) * sh.w + fi * w + w) * 4), y * w * 4);
  const el = elx ?? (g === 'vfx_beasts' ? s : g.slice(4));
  const rows = colours.map((c) => c === 'orig' ? fr : tintVfx(fr, el, c, { width: w, height: h, beast: g === 'vfx_beasts', sprite: s }));
  cells.push({ w, h, rows });
}
const G = 6;
const W = cells.reduce((a, c) => a + c.w * k + G, G), H = colours.length * (Math.max(...cells.map((c) => c.h)) * k + G) + G;
const rh = Math.max(...cells.map((c) => c.h)) * k + G;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([12, 12, 14, 255], i * 4);
let X = G;
for (const c of cells) {
  colours.forEach((_, r) => {
    const Y = G + r * rh; const src = c.rows[r];
    for (let y = 0; y < c.h * k; y++) for (let x = 0; x < c.w * k; x++) {
      const si = (((y / k) | 0) * c.w + ((x / k) | 0)) * 4; const a = src[si + 3] / 255; const di = ((Y + y) * W + X + x) * 4;
      const bg = [30, 33, 39];
      for (let q = 0; q < 3; q++) img[di + q] = Math.round(src[si + q] * a + bg[q] * (1 - a));
    }
  });
  X += c.w * k + G;
}
writePng(out, W, H, img);
console.log(out, W, H);
