// grid2.ts out.png zoom x0 y0 w h cellspec... ; cell = slots spec "slot=id:hex:hex,slot=id" @body @pose ; use 'none' to clear a slot
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
const [out, zs, xs, ys, ws, hs, ...specs] = process.argv.slice(2);
const k = +zs, x0 = +xs, y0 = +ys, w = +ws, h = +hs;
const rowsSpec: string[][] = [[]];
for (const s of specs) { if (s === '/') rowsSpec.push([]); else rowsSpec[rowsSpec.length - 1].push(s); }
const cols = Math.max(...rowsSpec.map((r) => r.length));
const W = cols * (w * k + 4) + 4, H = rowsSpec.length * (h * k + 4) + 4;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([44, 44, 52, 255], i * 4);
rowsSpec.forEach((row, ri) => row.forEach((spec, ci) => {
  const [ss, body = 'male', pose = 'idle', fr] = spec.split('@');
  const slots: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, feet: { id: 'feet_sandals', colors: [] } };
  const accessories: any[] = [];
  for (const part of ss.split(',')) {
    if (!part) continue;
    const [slot, rest] = part.includes('=') ? part.split('=') : [null, part];
    const [id, ...cs] = rest.split(':');
    if (id === 'none') { delete slots[slot!]; continue; }
    const def = getItem(id); if (!def) throw new Error('unknown ' + id);
    if (def.slot === 'accessory') accessories.push({ id, colors: cs.map((c) => '#' + c) });
    else slots[def.slot] = { id, colors: cs.map((c) => '#' + c) };
  }
  const frame = fr !== undefined ? +fr : pose === 'attack' ? 1 : 0;
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots, accessories } as any), pose as any, frame);
  const ox = 4 + ci * (w * k + 4), oy = 4 + ri * (h * k + 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x0 + x, Y = y0 + y; const i = (Y * 128 + X) * 4;
    const c = f.rgba[i + 3] ? [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]] : ((x >> 3) + (y >> 3)) % 2 ? [58, 58, 68] : [62, 62, 72];
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([c[0], c[1], c[2], 255], ((oy + y * k + j) * W + ox + x * k + q) * 4);
  }
}));
writePng(out, W, H, o);
console.log(W, H);
