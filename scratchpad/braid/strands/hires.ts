// Standalone study: the 3-strand model rendered at high resolution with tube shading, plus box-downsampled versions.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
function crc32(b: Uint8Array) { let c, r = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (r ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(t: string, d: Uint8Array) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), Buffer.from(d)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(p: string, w: number, h: number, rgba: Uint8Array) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
const ramp = [[30, 20, 10], [140, 80, 10], [200, 120, 15], [235, 165, 30], [248, 205, 80], [255, 240, 160]];
const A = Number(process.argv[3] || 0.8), R = Number(process.argv[4] || 0.62), sign = Number(process.argv[5] || -1);
const per = Number(process.argv[6] || 36); // rows of hi-res per full turn at hi-res width 24
const HW = 24, HH = 72;
// returns [strand, value] at hi-res coordinate (X in -1..1, a in rows)
function sample(X: number, a: number): [number, number, number] {
  const th = (2 * Math.PI * a) / per;
  let top = -1, z = -Infinity, val = 0;
  for (let k = 0; k < 3; k++) {
    const f = th + (2 * Math.PI * k) / 3;
    const xk = A * Math.sin(f);
    const d = (X - xk) / R;
    if (Math.abs(d) > 1) continue;
    const zk = sign * Math.sin(2 * f);
    if (zk <= z) continue;
    top = k; z = zk;
    // 3D tangent: (dx/da in half-width units -> scale to rows), 1, dz/da
    const sc = (2 * Math.PI) / per;
    const T = [A * Math.cos(f) * sc * (HW / 2), 1, sign * 2 * Math.cos(2 * f) * sc * (HW / 2) * 0.5];
    const tl = Math.hypot(T[0], T[1], T[2]); const t = T.map((q) => q / tl);
    let b1 = [-t[1], t[0], 0]; const bl = Math.hypot(b1[0], b1[1]); b1 = b1.map((q) => q / bl);
    // b2 = t x b1
    let b2 = [t[1] * b1[2] - t[2] * b1[1], t[2] * b1[0] - t[0] * b1[2], t[0] * b1[1] - t[1] * b1[0]];
    if (b2[2] < 0) b2 = b2.map((q) => -q);
    const s = Math.sqrt(Math.max(0, 1 - d * d));
    const n = [d * b1[0] + s * b2[0], d * b1[1] + s * b2[1], d * b1[2] + s * b2[2]];
    const L = [-0.55, -0.55, 0.63];
    const lam = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
    val = 0.25 + 0.75 * Math.max(0, lam) + 0.35 * zk; // depth: diving strands get darker
  }
  return [top, val, z];
}
const toShade = (v: number) => (v < 0.15 ? 1 : v < 0.45 ? 2 : v < 0.75 ? 3 : v < 1.0 ? 4 : 5);
const K = 6;
const scales = (process.argv[7] || "1,2,3,4").split(",").map(Number); // hi-res, and downsampled so the braid is HW/s px wide
const W = 20 + scales.length * (HW * K + 20), H = HH * K + 20;
const o = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) o.set([44, 52, 72, 255], i * 4);
scales.forEach((s, n) => {
  const w = HW / s, h = HH / s, px = K * s;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const acc = [0, 0, 0], cnt = [0, 0, 0], zs = [0, 0, 0]; let gap = 0, tot = 0;
    for (let j = 0; j < s * 2; j++) for (let i = 0; i < s * 2; i++) {
      const X = ((x * s + (i + 0.5) / 2) / HW) * 2 - 1, a = y * s + (j + 0.5) / 2;
      const [k, val, z] = sample(X, a);
      tot++;
      if (k < 0) gap++; else { acc[k] += val; cnt[k]++; zs[k] += z; }
    }
    let m = 0; for (let k = 1; k < 3; k++) if (cnt[k] > cnt[m]) m = k;
    let sh = cnt[m] ? toShade(acc[m] / cnt[m]) : 1;
    if (s > 1) for (let k = 0; k < 3; k++) if (k !== m && cnt[k] >= tot * 0.2 && zs[k] / cnt[k] > zs[m] / cnt[m]) sh = 1;
    if (gap > tot / 2) sh = 1;
    if (x === 0 || x === w - 1) sh = 0;
    const c = sh === 0 ? [20, 12, 8] : ramp[sh];
    for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) o.set([c[0], c[1], c[2], 255], ((10 + y * px + j) * W + 10 + n * (HW * K + 20) + x * px + i) * 4);
  }
});
writePng(process.argv[2], W, H, o);
