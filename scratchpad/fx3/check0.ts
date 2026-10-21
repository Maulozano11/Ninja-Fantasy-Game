// Frame 0 of each fly loop against his piece placed in the frame.
import { placed } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-ref';
import { REF_FRAMES } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-fire-refdata';
import * as V3 from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-fire-v3';
const same = (a: any, b: any) => { let d = 0; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const p = a.get(x, y), q = b.get(x, y); if (p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2] || p[3] !== q[3]) d++; } return d; };
const chk = (label: string, f: any, piece: string, frame: string) => { const F = REF_FRAMES[frame]; console.log(label, 'diff px vs his piece:', same(f, placed(piece, F.w, F.h))); };
chk('bolt', V3.bolt().anims.fly.frames[0], 'p_bolt', 'bolt');
chk('sphere', V3.sphere().anims.fly.frames[0], 'p_sphere', 'sphere');
chk('slash', V3.slash().anims.fly.frames[0], 'p_slash', 'slash');
chk('multi', V3.multi().anims.fly.frames[0], 'p_multi', 'multi');
chk('breath', V3.breath().anims.fly.frames[0], 'p_breath', 'breath');
chk('hit#3', V3.hit().anims.hit.frames[3], 'p_hit', 'hit');
const a = V3.aura(); chk('aura_back#0', a[1].anims.idle.frames[0], 'a_back', 'aura');
