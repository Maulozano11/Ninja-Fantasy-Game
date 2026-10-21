// Renders candidate hairstyles (cands.json) by temporarily taking over an existing hair item's draw.
// preview.ts cands.json outdir [ids...]  -> outdir/<id>.png (heads on 3 bodies + full body + attack)
import { readFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { hairTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/hairkit';
import { baseLook, writePng } from '../shared/sheet';
const [file, outdir, ...only] = process.argv.slice(2);
const cands = JSON.parse(readFileSync(file, 'utf8'));
const host = getItem('hair_crop')!;
const outfit = (body: string) => ({
  top: { id: 'top_tee', colors: ['#2c3448'] },
  bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] },
  feet: { id: 'feet_sandals', colors: [] },
});
for (const id of Object.keys(cands)) {
  if (only.length && !only.includes(id)) continue;
  const c = cands[id];
  (host as any).draw = (g: any, [col]: string[]) => {
    const mat = g.m(col, 'hair');
    if (c.b) hairTemplate(g, g.L('hairBack'), c.b, c.ba[0], c.ba[1], mat);
    hairTemplate(g, g.L('hairFront'), c.f, c.fa[0], c.fa[1], mat);
    if (c.band) hairTemplate(g, g.L('hairFront'), c.band, c.banda[0], c.banda[1], g.m(c.bandColor, 'cloth'));
  };
  // cells: heads (male, female, bulky) at k=6 and full bodies (male idle, female idle, male attack) at k=3
  const heads: [string, string, number][] = [['male', 'idle', 0], ['female', 'idle', 0], ['bulky', 'idle', 0]];
  const bodies: [string, string, number][] = [['male', 'idle', 0], ['female', 'idle', 0], ['male', 'attack', 1]];
  const HK = 6, HW = 40, HH = 40, BK = 3, BW = 84, BH = 112;
  const W = Math.max(heads.length * (HW * HK + 12), bodies.length * (BW * BK + 12)), H = HH * HK + 12 + BH * BK + 12;
  const o = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) o.set([40, 44, 56, 255], i * 4);
  const blit = (f: any, x0: number, y0: number, w: number, h: number, k: number, ox: number, oy: number) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
      for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((oy + y * k + j) * W + ox + x * k + q) * 4); }
  };
  heads.forEach(([body, pose, fr], n) => {
    const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { hair: { id: 'hair_crop', colors: [c.color] }, ...outfit(body) } } as any), pose as any, fr);
    blit(f, Math.round(f.rig.head.x * 2) - HW / 2, Math.round(f.rig.head.y * 2) - 24, HW, HH, HK, n * (HW * HK + 12) + 6, 6);
  });
  bodies.forEach(([body, pose, fr], n) => {
    const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { hair: { id: 'hair_crop', colors: [c.color] }, ...outfit(body) } } as any), pose as any, fr);
    blit(f, 22, 14, BW, BH, BK, n * (BW * BK + 12) + 6, HH * HK + 18);
  });
  writePng(`${outdir}/${id}.png`, W, H, o);
  console.log('wrote', id);
}
