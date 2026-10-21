import * as WI from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-wind-v3-refdata';
import { readFileSync, writeFileSync } from 'fs';
const k = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const ol = new Set<string>(), leaf = new Set<string>(), dust = new Set<string>();
for (const [n, p] of Object.entries(WI.WV3_PALS)) {
  ol.add(p[0].slice(0, 7)); ol.add(p[27].slice(0, 7));
  for (let i = 28; i < 36; i++) leaf.add(p[i].slice(0, 7));
  if (p[36]?.endsWith('ff')) { ol.add(p[36].slice(0, 7)); for (let i = 37; i < 44 && p[i]?.endsWith('ff'); i++) dust.add(p[i].slice(0, 7)); }
}
k.wind = { outline: [...ol], leaf: [...leaf], dust: [...dust] };
writeFileSync(process.argv[2], JSON.stringify(k));
console.log('wind outlines', [...ol].join(' '));
console.log('wind leaf', [...leaf].join(' '));
console.log('wind dust', [...dust].join(' '));
