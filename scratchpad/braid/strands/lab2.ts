// Prototype: braid built from strand segments drawn as lock()s in crossing order.
import { lock } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hairkit';
import { Layer, MaterialTable, v, Vec } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/raster';
import { hexToRgb } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/color';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
function crc32(b: Uint8Array) { let c, r = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (r ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(t: string, d: Uint8Array) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), Buffer.from(d)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(p: string, w: number, h: number, rgba: Uint8Array) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
const mats = new MaterialTable();
const mat = mats.get('#f2cb52', 'hair');
const ramp = mats.ramps[mat].map(hexToRgb);

const qb = (a: Vec, c: Vec, b: Vec, t: number): Vec => v((1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y);
function braid2(L: Layer, root: Vec, ctrl: Vec, tip: Vec, w: number, V: any): void {
  const N = 64;
  const pts: Vec[] = [];
  const arc: number[] = [];
  for (let i = 0; i <= N; i++) {
    pts.push(qb(root, ctrl, tip, i / N));
    arc.push(i ? arc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) : 0);
  }
  const total = arc[N];
  // point at arc length s, pushed `off` across (toward the screen right when hanging down)
  const at = (s: number, off: number): Vec => {
    s = Math.max(0, Math.min(total, s));
    let i = 1;
    while (i < N && arc[i] < s) i++;
    const f = (s - arc[i - 1]) / (arc[i] - arc[i - 1] || 1);
    const p = v(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f);
    const tx = pts[i].x - pts[i - 1].x, ty = pts[i].y - pts[i - 1].y, l = Math.hypot(tx, ty) || 1;
    return v(p.x + (ty / l) * off, p.y - (tx / l) * off);
  };
  const step = V.plait / 2;
  const hw = w / 2;
  const sw = w * (V.segW ?? 0.6);
  const n = Math.ceil(total / step);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const s0 = i * step - (V.lead ?? 0.2) * step;
    const s1 = s0 + step * (V.len ?? 1.6);
    const a = at(s0, side * (hw - sw / 2) * (V.out ?? 1));
    const b = at(s1, -side * hw * (V.cross ?? 0.25));
    const c = at((s0 + s1) / 2, side * hw * (V.bow ?? 0.15));
    lock(L, a, c, b, sw, { mat, part: 'back' }, { hold: V.hold ?? 0.5, tipW: sw * (V.tip ?? 0.6), tipDark: true, keep: (x, y) => true });
  }
}

const variants = process.argv.slice(3).map((s) => JSON.parse(s));
const K = 10, CW = 18, CH = 46, S = 3;
const W = variants.length * (CW * K + 10) + 10, H = CH * K + 20 + CH * S + 10;
const o = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) o.set([44, 52, 72, 255], i * 4);
variants.forEach((V, n) => {
  const L = new Layer();
  L.xf = { cx: 4.5, cy: 3, k: 0.76 };
  const b = V.bend || 0;
  braid2(L, v(4.3, 3), v(4.3 - b, 14), v(4.3 + b * 0.3, 30), V.w ?? 3.9, { plait: 3.9, ...V });
  L.applyOutline();
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (!L.has(x, y)) continue;
    const c = ramp[L.getShade(x, y)];
    for (let j = 0; j < K; j++) for (let q = 0; q < K; q++) o.set([c[0], c[1], c[2], 255], ((10 + y * K + j) * W + 10 + n * (CW * K + 10) + x * K + q) * 4);
    for (let j = 0; j < S; j++) for (let q = 0; q < S; q++) o.set([c[0], c[1], c[2], 255], ((20 + CH * K + y * S + j) * W + 10 + n * (CW * K + 10) + x * S + q) * 4);
  }
});
writePng(process.argv[2], W, H, o);
