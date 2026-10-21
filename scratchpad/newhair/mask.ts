// Prints the bald head in template coordinates for anchor (AX, AY) on a W x H canvas.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { faceAnchor } from '/home/user/Ninja-Fantasy-Game/src/sprite/body';
import { baseLook } from '../shared/sheet';
const [AX, AY, W, H, body] = [+(process.argv[2] || 14), +(process.argv[3] || 19), +(process.argv[4] || 32), +(process.argv[5] || 30), process.argv[6] || 'male'];
const look = baseLook({ body, skin: '#f3c39c', slots: { hair: { id: 'hair_none', colors: ['#222'] } } } as any);
const f = renderSprite(look, 'idle', 0);
// faceAnchor needs a DrawCtx; recompute nx, ny the same way
const k = (f as any).bp?.headScale;
const head = f.rig.head;
// find the near-eye lash start: the first lash row pixel. Use the known formula via headScale from rig
import { BODY_PARAMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
const hs = (BODY_PARAMS as any)[body].headScale;
const nx = Math.floor((head.x - 1.9 * hs) * 2), ny = Math.floor((head.y + 1.0 * hs) * 2);
const ox = nx + 2 - AX, oy = ny + 1 - AY;
console.log('    ' + Array.from({ length: W }, (_, c) => c % 10).join(''));
for (let r = 0; r < H; r++) {
  let s = '';
  for (let c = 0; c < W; c++) {
    const x = ox + c, y = oy + r; const i = (y * 128 + x) * 4;
    const [R, G, B, A] = [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], f.rgba[i + 3]];
    s += !A ? '.' : B > R + 40 ? 'e' : R + G + B < 150 ? 'o' : 's';
  }
  console.log(String(r).padStart(3) + ' ' + s + (r === AY ? '  <- anchor row (iris)' : ''));
}
