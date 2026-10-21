// Head crops of every pose x body with the given eye shape: writes <dir>/<body>-<pose>-<frame>.png (28 x 24 around the face anchor).
// npx tsx poses.mts <dir> <eyeShape> [eyeSpecial] [hairId hairColor]
import { mkdirSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/tools/world-sprites/kit';

const [dir, eyeShape, special, hairId, hairColor] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const poses: [string, number][] = [
  ['idle', 0], ['attack', 0], ['attack', 1], ['attack', 2], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 0], ['handsigns', 0],
  ['walk', 0], ['run', 0], ['crouch', 0], ['sneak', 0], ['downed', 0], ['sit', 0], ['read', 0], ['lean', 0], ['train', 0],
];
for (const body of ['female', 'slender', 'male', 'bulky']) {
  for (const [pose, frame] of poses) {
    const look: any = {
      version: 1, body, skin: '#f4c8a5', eyeShape, eyeColor: '#088cce',
      slots: hairId ? { hair: { id: hairId, colors: [hairColor ?? '#f6d886'] } } : {},
      accessories: [],
      headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
      chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
      pixelEdits: [],
    };
    const f = renderSprite(look, pose as any, frame, (special ?? 'none') as any);
    const k = f.rig.bp.headScale;
    const nx = Math.floor((f.rig.head.x - 1.9 * k) * RES);
    const ny = Math.floor((f.rig.head.y + 1.0 * k) * RES);
    const w = 28, h = 24, x0 = nx - 12, y0 = ny - 14;
    const out = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const xx = x0 + x, yy = y0 + y;
      if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
      const s = (yy * GRID + xx) * 4;
      out.set(f.rgba.subarray(s, s + 4), (y * w + x) * 4);
    }
    writePng(`${dir}/${body}-${pose}-${frame}.png`, w, h, out);
  }
}
