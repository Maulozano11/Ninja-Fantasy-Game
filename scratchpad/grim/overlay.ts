// Prints a hair template over the bald head in template coordinates: overlay.ts cand.json [body]
import { readFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { BODY_PARAMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { baseLook } from '../shared/sheet';
const [file, body = 'male'] = process.argv.slice(2);
const c = JSON.parse(readFileSync(file, 'utf8'));
const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { top: { id: 'top_tee', colors: ['#2c3448'] } } } as any), 'idle', 0);
const k = (BODY_PARAMS as any)[body].headScale;
const nx = Math.floor((f.rig.head.x - 1.9 * k) * 2), ny = Math.floor((f.rig.head.y + 1.0 * k) * 2);
const ox = nx + 2 - c.fa[0], oy = ny + 1 - c.fa[1];
const W = Math.max(...c.f.map((r: string) => r.length));
for (let r = -2; r < c.f.length + 6; r++) {
  let line = '';
  for (let q = -4; q < W + 4; q++) {
    const ch = c.f[r]?.[q];
    if (ch && ch !== '.') { line += ch; continue; }
    const x = ox + q, y = oy + r;
    const i = (y * 128 + x) * 4;
    if (x < 0 || y < 0 || x >= 128 || y >= 128 || !f.rgba[i + 3]) { line += '`'; continue; }
    const [R, G, B] = [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]];
    line += R > 150 && R > B + 30 ? (R > 225 && G > 190 ? 'S' : 's') : R < 60 && G < 60 ? '#' : '+';
  }
  console.log(String(r).padStart(3) + ' ' + line + (r === c.fa[1] ? '  <- iris row' : ''));
}
console.log('    ' + ' '.repeat(4) + Array.from({ length: W }, (_, i) => i % 10).join(''));
