import { refPiece } from './ws/vfx-a-ref';
import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
for (const n of ['s_wall', 's_smoke', 's_tail', 's_hump', 's_head', 's_claw', 's_breath']) {
  const pc = refPiece(n);
  const c = new Canvas(1016, 968);
  c.draw(pc.c, pc.x, pc.y);
  c.save(`${process.argv[2]}/${n}.png`);
  console.log(n, pc.x, pc.y, pc.c.w, pc.c.h);
}
