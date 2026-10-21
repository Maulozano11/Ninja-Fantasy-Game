import { placed } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-ref';
import { REF_FRAMES } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-fire-refdata';
const F = REF_FRAMES.wall_diag;
placed('w_diag', F.w, F.h).save(process.argv[2]);
