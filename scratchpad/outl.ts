import * as W from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-water-v3-refdata';
import * as L from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-lightning-v3-refdata';
import * as E from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata';
import * as WI from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-wind-v3-refdata';
import * as F from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-fire-refdata';
import { writeFileSync } from 'fs';
const out: Record<string, Record<string, string[]>> = { fire: {}, water: {}, wind: {}, lightning: {}, earth: {} };
const add = (el: string, k: string, c: string) => ((out[el][k] ??= []).includes(c.slice(0, 7)) ? 0 : out[el][k].push(c.slice(0, 7)));
for (const p of Object.values(F.REF_PIECES)) { add('fire', 'outline', p.pal[0]); p.pal.slice(1).forEach((c) => add('fire', 'body', c)); }
for (const p of W.WV3_PAL) add('water', p.kind, p.rgba);
for (const p of L.LV3_PAL) add('lightning', p.kind, p.rgba);
for (const r of Object.values(E.EV3_REF)) for (const p of r.pal) add('earth', p.kind, p.rgba);
// wind: per the comment in the generator? print first entries per palette to see structure
for (const [n, pal] of Object.entries(WI.WV3_PALS)) pal.forEach((c, i) => add('wind', i < 27 ? 'body' : i < 36 ? 'body2' : c.endsWith('ff') ? 'stone' : 'glow', c));
writeFileSync(process.argv[2], JSON.stringify(out));
