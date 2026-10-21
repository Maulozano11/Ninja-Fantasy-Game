import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { frameCount, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { rotateTemplate, PixelTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/rotsprite';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { gripPoint, swordAngle, handsBusy, handsLimp } from '/home/user/Ninja-Fantasy-Game/src/sprite/grip';
import { katanaTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { SPRITE_POSES, MOVE_POSES, CAMP_POSES } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';

const OLD: PixelTemplate = {
  pivot: [6, 5],
  rows: [
    '....................................................',
    '............db...............................222....',
    '............cb...................2222222222224442222',
    'kkkkkkkkkkkkcbg2222222222222222224444444444443334444',
    'KKwKKwKKwKKwcbg4444444444444444444443333444434445444',
    'cKKwKKwKKwKKbbg344443333444433334444444444444555....',
    'KKwKKwKKwKKwbbG444444444444444444555555555555.......',
    'kkkkkkkkkkkkaaG555555555555555555...................',
    '............aa......................................',
    '............aa......................................',
    '....................................................',
  ],
};
function outside(t: PixelTemplate, hand: { x: number; y: number }, deg: number): { n: number; tipOut: number } {
  const a = ((deg % 360) + 540) % 360 - 180;
  let tt = t;
  if (Math.abs(a) > 90) tt = { rows: [...tt.rows].reverse(), pivot: [tt.pivot[0], tt.rows.length - 1 - tt.pivot[1]] };
  const ax = Math.floor(hand.x * RES), ay = Math.floor(hand.y * RES);
  let n = 0;
  for (const p of rotateTemplate(tt, a)) {
    const x = ax + p.dx, y = ay + p.dy;
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) n++;
  }
  return { n, tipOut: 0 };
}
const katana = getItem('held_katana')!;
let rec: any = null;
katana.draw = (g: any, _c: any, parts: any) => {
  if (handsBusy(g) || handsLimp(g)) { rec = null; return; }
  const hand = gripPoint(g), deg = swordAngle(g);
  const res: any = { old: outside(OLD, hand, deg).n };
  for (const b of ['a', 'b', 'c']) for (const h of ['a', 'b', 'c']) for (const gd of ['a','b','c']) res[`b${b}g${gd}h${h}`] = outside(katanaTemplate({ steel: 'a', blade: b, guard: gd, hilt: h }, '#ff0000') as any, hand, deg).n;
  rec = { hand, deg, ...res };
};
const base = LEGENDARY_PRESETS[0].character.appearance!;
const poses = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
for (const body of ['male', 'female', 'bulky', 'slender'] as const) {
  for (const pose of poses) {
    const look = { ...base, body, slots: { ...base.slots, held: { id: 'held_katana', colors: [] } } } as any;
    const rp = rigPoseFor(pose as any, look.cast?.style, 'held_katana');
    const n = frameCount(rp);
    for (let f = 0; f < n; f++) {
      rec = null;
      renderSprite(look, pose as any, f);
      if (!rec) continue;
      const vals = Object.entries(rec).filter(([k]) => k.startsWith('b')).map(([, v]) => v as number);
      const mn = Math.min(...vals), mx = Math.max(...vals), def = rec.bagaha;
      if (rec.old > 0 || mx > 0) console.log(`${body.padEnd(8)} ${pose.padEnd(9)} f${f} deg=${rec.deg.toFixed(0).padStart(5)} hand=(${rec.hand.x.toFixed(1)},${rec.hand.y.toFixed(1)}) old=${rec.old} newDefault=${def} newRange=${mn}-${mx}`);
    }
  }
}
