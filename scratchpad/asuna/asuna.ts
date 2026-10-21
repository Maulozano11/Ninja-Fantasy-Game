// Preview of a long-hair style with a ribbon at the back (not in the catalog yet).
// asuna.ts out.png
import { readFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { hairTemplate, hd, hlock, lock } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/hairkit';
import { ellipse, poly, v, type Layer, type Pen, type Vec } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook, writePng } from '../shared/sheet';

const DRIFTER = JSON.parse(readFileSync('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/dbz/dbz-hair.json', 'utf8')).hair_drifter;

// --- copies of hair.ts helpers -------------------------------------------
function backPt(g: any, ty: number, out: number): Vec {
  const b = g.bp; const Lt = b.torsoLen;
  const sh = b.shoulderHalf * 0.86, ch = b.chestHalf * 0.86, wa = b.waistHalf * 0.86, hi = b.hipHalf * 0.86 + 0.3;
  let k: number;
  if (ty >= Lt - 1.2) k = sh; else if (ty >= Lt - 5) k = ch + (sh - ch) * ((ty - (Lt - 5)) / 3.8);
  else if (ty >= 5) k = wa + (ch - wa) * ((ty - 5) / (Lt - 10)); else k = hi + (wa - hi) * (Math.max(0, ty) / 5);
  return g.rig.T(-k - out, ty);
}
const toHead = (g: any, p: Vec): [number, number] => { const k = g.bp.headScale || 1; return [(p.x - g.rig.head.x) / k, (p.y - g.rig.head.y) / k]; };
const sway = (g: any, k = 0.22): number => -g.rig.lean * k;
function curtain(g: any, L: Layer, pen: Pen, o: any): void {
  const n = o.n ?? 4, out = o.out ?? 2, spread = o.spread ?? 3, w = o.w ?? 6, top = o.top ?? -5, front = o.front ?? -2, back = o.back ?? -6, bulge = o.bulge ?? 1.5;
  const sw = sway(g, 0.12);
  const mid = backPt(g, (o.ty + g.bp.torsoLen) / 2, out + spread);
  const form = hd(g, (toHead(g, mid)[0] - 6) / 2, -4);
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0.5 : i / (n - 1);
    const rootX = back + (front - back) * k, rootY = top + 4 * k;
    const jag = o.jag ? (i % 2 ? o.jag : 0) : 0;
    const tip = backPt(g, o.ty + jag + k * 1.2, out + spread * (1 - k));
    const [tx, ty] = toHead(g, tip);
    const ctrl = hd(g, Math.min(rootX - 2, tx) - bulge * (1 - k * 0.5), (rootY + ty) * 0.42);
    lock(L, hd(g, rootX, rootY), ctrl, hd(g, tx + sw, ty), w, pen, { hold: o.hold ?? 0.65, tipW: o.tipW ?? 1.5, form, clumps: 3.4, seed: i * 3 + 1 });
  }
}
// -------------------------------------------------------------------------

function draw(g: any, [c, ribbon]: string[]): void {
  const mat = g.m(c, 'hair');
  const f: Pen = { mat, part: 'head' };
  const t: Pen = { mat, part: 'back', bias: -1 };
  // waist-length straight hair down the back
  curtain(g, g.L('hairBack'), t, { ty: 3, out: 1.3, spread: 2.6, n: 5, w: 5.5, tipW: 1.4, jag: 1.4, bulge: 1, hold: 0.72 });
  // long locks framing the face, falling in front of the shoulders
  const F = g.L('hairFront');
  const nearTip = toHead(g, g.rig.T(-g.bp.shoulderHalf * 0.55, g.bp.torsoLen - 6.5));
  const farTip = toHead(g, g.rig.T(g.bp.chestHalf * 0.45, g.bp.torsoLen - 5.5));
  const lp: Pen = { ...f, part: 'back' };
  hlock(g, F, [-3.4, 0, -3.8, 4, nearTip[0], nearTip[1]], 3, lp, { hold: 0.7, tipW: 1.2, form: hd(g, -1, -3), clumps: 3.2, seed: 2 });
  hlock(g, F, [6.2, 0, 6.8, 4, farTip[0], farTip[1]], 2.6, lp, { hold: 0.7, tipW: 1.1, form: hd(g, -1, -3), clumps: 3.2, seed: 7 });
  // the head: parted bangs that frame the face (as Drifter's Part)
  hairTemplate(g, F, DRIFTER.f, DRIFTER.fa[0], DRIFTER.fa[1], mat);
  // a thin braid from the temple back to the tie
  const braid: Pen = { mat, part: 'head' };
  lock(F, hd(g, -2.2, -3.6), hd(g, -4.6, -3.4), hd(g, -6.2, -1.6), 1.4, braid, { hold: 1, tipW: 1.2, edge: true, clumps: 1.2, seed: 4 });
  // the ribbon bow at the back of the head, with two tails down the hair
  const rp: Pen = { mat: g.m(ribbon, 'cloth'), part: 'head' };
  const K = hd(g, -6.6, -1.4);
  poly(F, [K, hd(g, -8.8, -4.0), hd(g, -7.6, -4.6), hd(g, -6.4, -2.4)], rp, 4);
  poly(F, [K, hd(g, -9.0, 0.8), hd(g, -7.8, 1.6), hd(g, -6.2, -0.6)], rp, 3);
  hlock(g, F, [-6.8, -0.8, -7.8, 2, -8.0, 5.2], 1.2, rp, { hold: 0.9, tipW: 1.0, clumps: 0 });
  hlock(g, F, [-6.2, -0.6, -6.6, 2.6, -6.4, 6.2], 1.1, rp, { hold: 0.9, tipW: 0.9, clumps: 0 });
  ellipse(F, K.x, K.y, 0.9, 0.9, rp, 2);
}

const [out] = process.argv.slice(2);
const host = getItem('hair_crop')!;
(host as any).draw = draw;
(host as any).colors = [{ key: 'hair', label: 'Hair', default: '#c87642', kind: 'hair' }, { key: 'ribbon', label: 'Ribbon', default: '#c8202c', kind: 'cloth' }];
const cells: [string, string, number][] = [['female', 'idle', 0], ['slender', 'idle', 0], ['male', 'idle', 0], ['female', 'attack', 1], ['female', 'victory', 0], ['female', 'hurt', 1]];
const k = 4, CW = 70, CH = 104;
const W = cells.length * (CW * k + 8), H = CH * k + 8;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([40, 44, 56, 255], i * 4);
cells.forEach(([body, pose, fr], n) => {
  const f = renderSprite(baseLook({ body, skin: '#f8dcc4', eyeShape: 'bright', eyeColor: '#a0652a', slots: { hair: { id: 'hair_crop', colors: ['#c87642', '#c8202c'] }, top: { id: 'top_tee', colors: ['#e9e6ef'] }, bottom: { id: 'bottom_leggings', colors: ['#2a2433', '#b02a3a'] } } } as any), pose as any, fr);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = 29 + x, sy = 12 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((4 + y * k + j) * W + n * (CW * k + 8) + 4 + x * k + q) * 4); }
});
writePng(out, W, H, o);

// head close-ups (female, slender) at 9x
if (process.argv[3]) {
  const kk = 9, cw = 46, ch = 44;
  const bodies = ['female', 'slender'];
  const W2 = bodies.length * (cw * kk + 8), H2 = ch * kk;
  const o2 = new Uint8Array(W2 * H2 * 4);
  for (let i = 0; i < W2 * H2; i++) o2.set([40, 44, 56, 255], i * 4);
  bodies.forEach((body, n) => {
    const f = renderSprite(baseLook({ body, skin: '#f8dcc4', eyeShape: 'bright', eyeColor: '#a0652a', slots: { hair: { id: 'hair_crop', colors: ['#c87642', '#c8202c'] }, top: { id: 'top_tee', colors: ['#e9e6ef'] } } } as any), 'idle', 0);
    const x0 = Math.round(f.rig.head.x * 2) - cw / 2 - 4, y0 = Math.round(f.rig.head.y * 2) - 24;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
      for (let j = 0; j < kk; j++) for (let q = 0; q < kk; q++) o2.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((y * kk + j) * W2 + n * (cw * kk + 8) + x * kk + q) * 4); }
  });
  writePng(process.argv[3], W2, H2, o2);
}
