import { Img, hex, savePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/ui-img';
import { nat20Frames, nat1Frames, popFrames } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/dice-d20-fx';

const out = new Img(160 * 3 * 4, 160 * 3 * 2);
out.fill(hex('#3a5a35'));
const n20 = nat20Frames('ivory', 'big');
[0, 3, 5, 10].forEach((i, k) => out.draw(n20[i].img.scaled(3), k * 480, 0));
const n1 = nat1Frames('gem', 'big');
[0, 2, 4, 7].forEach((i, k) => out.draw(n1[i].img.scaled(3), k * 480, 480));
savePng(process.argv[2], out);
void popFrames;
