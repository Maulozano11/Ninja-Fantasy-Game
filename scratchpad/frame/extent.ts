// How far past the figure's old 128-px box anything is drawn, per side, over every held item, body,
// pose, frame and cast style (run with a big temporary frame).
import { renderSprite } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { itemsForSlot } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { DEFAULT_CHARACTER, LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { GRID, PAD, RES } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { frameCount, rigPoseFor } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { CAST_STYLES, SPRITE_POSES, MOVE_POSES, CAMP_POSES } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/types';
const ox = PAD.x * RES, oy = PAD.y * RES;
const worst: Record<string, { v: number; at: string }> = { left: { v: 0, at: '' }, right: { v: 0, at: '' }, top: { v: 0, at: '' }, bottom: { v: 0, at: '' } };
const byItem: Record<string, number[]> = {};
const bases = [DEFAULT_CHARACTER.appearance!, ...LEGENDARY_PRESETS.map((p) => p.character.appearance!).filter(Boolean)];
const poses = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
for (const held of itemsForSlot('held')) for (const body of ['male', 'female', 'bulky', 'slender'] as const) for (const [bi, base] of [[0, bases[0]], [2, bases[2]]] as const) {
  const look: any = { ...base, body, slots: { ...base.slots, held: { id: held.id, colors: [] } } };
  for (const pose of poses) {
    const styles = pose === 'cast' ? CAST_STYLES : [undefined];
    for (const st of styles) {
      const l = st ? { ...look, cast: { style: st } } : look;
      const n = frameCount(rigPoseFor(pose as any, l.cast?.style));
      for (let f = 0; f < n; f++) {
        const a = renderSprite(l, pose as any, f).rgba;
        let x0 = GRID, y0 = GRID, x1 = -1, y1 = -1;
        for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (a[(y * GRID + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) continue;
        const over = { left: ox - x0, right: x1 - (ox + 127), top: oy - y0, bottom: y1 - (oy + 127) };
        const at = `${held.id} ${body} b${bi} ${pose}${st ? '/' + st : ''}${f}`;
        for (const k of Object.keys(over) as (keyof typeof over)[]) if (over[k] > worst[k].v) worst[k] = { v: over[k], at };
        const m = (byItem[held.id] ??= [0, 0, 0, 0]);
        m[0] = Math.max(m[0], over.left); m[1] = Math.max(m[1], over.right); m[2] = Math.max(m[2], over.top); m[3] = Math.max(m[3], over.bottom);
      }
    }
  }
}
console.log(JSON.stringify(worst, null, 1));
for (const [k, m] of Object.entries(byItem)) console.log(k, 'left', m[0], 'right', m[1], 'top', m[2], 'bottom', m[3]);
