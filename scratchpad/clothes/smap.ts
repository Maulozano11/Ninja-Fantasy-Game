// smap.ts out.png zoom x0 y0 w h cellspec... : like grid2 but shows the main color of the first listed item as shade levels
// (0 black, 1 dark blue, 2 blue, 3 green, 4 yellow, 5 white); other pixels faded
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { makeRamp, mixHex } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
import { baseLook, writePng } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
const [out, zs, xs, ys, ws, hs, ...specs] = process.argv.slice(2);
const k = +zs, x0 = +xs, y0 = +ys, w = +ws, h = +hs;
const PAL = [[10, 10, 14], [40, 50, 120], [60, 110, 200], [70, 170, 90], [230, 210, 70], [255, 255, 255]];
const rowsSpec: string[][] = [[]];
for (const s of specs) { if (s === '/') rowsSpec.push([]); else rowsSpec[rowsSpec.length - 1].push(s); }
const cols = Math.max(...rowsSpec.map((r) => r.length));
const W = cols * (w * k + 4) + 4, H = rowsSpec.length * (h * k + 4) + 4;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([44, 44, 52, 255], i * 4);
rowsSpec.forEach((row, ri) => row.forEach((spec, ci) => {
  const [ss, body = 'male', pose = 'idle', fr] = spec.split('@');
  const slots: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, feet: { id: 'feet_sandals', colors: [] } };
  let mainHex = '', mainKind = 'cloth';
  for (const part of ss.split(',')) {
    const [id, ...cs] = part.split(':');
    const def = getItem(id)!; if (!def) throw new Error('unknown ' + id);
    slots[def.slot] = { id, colors: cs.map((c) => '#' + c) };
    if (!mainHex) { mainHex = cs[0] ? '#' + cs[0] : def.colors[0].default; mainKind = (def.colors[0] as any).kind || 'cloth'; }
  }
  const ramp = makeRamp(mainHex, mainKind as any).map((x) => x.toLowerCase());
  ramp[0] = mixHex(ramp[0], '#07060b', 0.7).toLowerCase();
  const frame = fr !== undefined ? +fr : pose === 'attack' ? 1 : 0;
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots } as any), pose as any, frame);
  const ox = 4 + ci * (w * k + 4), oy = 4 + ri * (h * k + 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x0 + x, Y = y0 + y; const i = (Y * 128 + X) * 4;
    let c: number[];
    if (!f.rgba[i + 3]) c = [58, 58, 68];
    else {
      const hx = '#' + [0, 1, 2].map((q) => f.rgba[i + q].toString(16).padStart(2, '0')).join('');
      const s = ramp.indexOf(hx);
      c = s >= 0 ? PAL[s] : [Math.round(f.rgba[i] * 0.3 + 60), Math.round(f.rgba[i + 1] * 0.3 + 60), Math.round(f.rgba[i + 2] * 0.3 + 60)];
    }
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([c[0], c[1], c[2], 255], ((oy + y * k + j) * W + ox + x * k + q) * 4);
  }
}));
writePng(out, W, H, o);
console.log(W, H);
