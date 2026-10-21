import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/compose';
import { throwRelease } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/grip';
import { defaultAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/legacy';
import { GRID, partIndex, PARTS, RES } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/raster';
import { drawRig, frameCount } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/rig';

const BODIES = ['male', 'female', 'bulky', 'slender'] as const;
const look = (body: string, held?: string, stowed = false, cape?: string): any => {
  const l: any = defaultAppearance();
  l.body = body;
  if (held) l.slots.held = { id: held, colors: [] };
  if (stowed) l.stowed = true;
  if (cape) l.slots.cape = { id: cape, colors: [] };
  return l;
};
function box(s: any, part: string) {
  const p = partIndex(part as any);
  let b: any = null;
  for (let i = 0; i < GRID * GRID; i++) {
    if (s.part[i] !== p || !s.rgba[i * 4 + 3]) continue;
    const x = i % GRID, y = (i / GRID) | 0;
    b = b ? { x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) } : { x0: x, y0: y, x1: x, y1: y };
  }
  return b;
}
for (const body of BODIES) {
  const heads = [];
  for (let f = 0; f < frameCount('throw'); f++) { const r = drawRig(body, 'throw', f); heads.push(`${r.head.x},${r.head.y} L${r.lean}`); }
  const r = drawRig(body, 'throw', 3);
  const dn = Math.hypot(r.handF.x - r.elbowN.x, r.handF.y - r.elbowN.y);
  const ang = (Math.atan2(r.head.y - r.neck.y, r.head.x - r.neck.x) * 180) / Math.PI;
  const t = throwRelease(body, 'held_katana');
  const tf = throwRelease(body, 'held_flame_sword');
  console.log(body, 'heads', heads.join(' | '), 'handF-elbowN', dn.toFixed(1), 'neck->head', ang.toFixed(1), 'shoulderN.y', r.shoulderN.y.toFixed(1));
  console.log('  release', JSON.stringify(t), 'flame lastHeld', JSON.stringify(tf.lastHeld), 'neck fine x', (r.neck.x * RES).toFixed(1));
  const k = box(renderSprite(look(body, 'held_katana'), 'throw', 2), 'held');
  console.log('  katana frame2 held box', JSON.stringify(k));
  for (const held of ['held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_naginata']) {
    for (const f of [3, 4]) {
      const s = renderSprite(look(body, held, true), 'throw', f);
      console.log('  stowed', held, f, JSON.stringify(box(s, 'held')), 'neck x', (s.rig.neck.x * RES).toFixed(1));
    }
  }
}
console.log(PARTS.join(','));
