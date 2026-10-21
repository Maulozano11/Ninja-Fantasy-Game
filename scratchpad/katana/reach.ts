// How far past the 128-pixel frame each long blade's tip would reach, per pose (fine pixels).
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { swordAngle, gripPoint } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/grip';
import { DEFAULT_CHARACTER } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { RES } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/raster';
const base = DEFAULT_CHARACTER.appearance!;
// blade reach from the grip pivot: tip offset along and across, for each template
const reach: Record<string, [number, number]> = { katana: [52, -3], oldKatana: [45, -2], crystal: [46, 0] };
for (const body of ['male', 'female', 'bulky', 'slender'] as const)
  for (const [pose, frames] of [['attack', 3], ['victory', 1], ['crouch', 2], ['train', 8], ['hurt', 2], ['run', 6], ['walk', 1]] as const)
    for (let f = 0; f < frames; f++) {
      const look: any = { ...base, body, slots: { ...base.slots, held: { id: 'held_katana', colors: [] } } };
      const fr = renderSpriteCached(look, pose as any, f);
      const g: any = { rig: fr.rig, look };
      const a = (swordAngle(g) * Math.PI) / 180;
      const p = gripPoint(g);
      const out = Object.entries(reach).map(([k, [al, ac]]) => {
        const x = p.x * RES + Math.cos(a) * al - Math.sin(a) * ac;
        const y = p.y * RES + Math.sin(a) * al + Math.cos(a) * ac;
        const over = Math.max(0, -x, x - 127, -y, y - 127);
        return `${k}:${over.toFixed(0)}`;
      });
      console.log(body, `${pose}${f}`, out.join(' '));
    }
