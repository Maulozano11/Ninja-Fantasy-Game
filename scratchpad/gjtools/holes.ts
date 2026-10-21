// Counts the blast's column holes under the feathers / smoke (key frame pieces).
import { GJ_REF } from '../../../../../../home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3-refdata';
const s = GJ_REF['blast'];
const dec = (pc: { x: number; y: number; w: number; h: number; rle: string }) => {
  const out = new Uint8Array(s.w * s.h);
  const b = Buffer.from(pc.rle, 'base64');
  let i = 0;
  for (let k = 0; k + 1 < b.length; k += 2) {
    for (let r = 0; r < b[k]; r++) {
      const x = pc.x + ((i + r) % pc.w), y = pc.y + Math.floor((i + r) / pc.w);
      if (b[k + 1]) out[y * s.w + x] = b[k + 1];
    }
    i += b[k];
  }
  return out;
};
const P: Record<string, Uint8Array> = {};
for (const [n, pc] of Object.entries(s.pieces)) P[n] = dec(pc);
console.log(Object.keys(P));
let underFx = 0, underSm = 0, underBoth = 0;
const col = P.column;
for (let y = 0; y < s.h; y++) {
  let l = -1;
  const xs: number[] = [];
  for (let x = 0; x < s.w; x++) if (col[y * s.w + x]) xs.push(x);
  if (!xs.length) continue;
  const x0 = xs[0], x1 = xs[xs.length - 1];
  for (let x = x0; x <= x1; x++) {
    const i = y * s.w + x;
    if (col[i]) continue;
    const f = !!P.main[i], m = !!P.smoke[i], p = !!P.pool[i];
    if (f) underFx++;
    if (m) underSm++;
    if (!f && !m && !p) underBoth++;
  }
}
console.log({ underFx, underSm, emptyInside: underBoth });
import { GJ_PAL } from '../../../../../../home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3-refdata';
const hist: Record<string, number> = {};
for (let y = 0; y < s.h; y++) {
  const xs: number[] = [];
  for (let x = 0; x < s.w; x++) if (col[y * s.w + x]) xs.push(x);
  if (!xs.length) continue;
  for (let x = xs[0]; x <= xs[xs.length - 1]; x++) {
    const i = y * s.w + x;
    if (col[i] || !P.smoke[i]) continue;
    const p = GJ_PAL[P.smoke[i] - 1];
    const k = p.kind + ':' + p.rgba.slice(7);
    hist[k] = (hist[k] ?? 0) + 1;
  }
}
console.log(hist);
