import { Img, hex, savePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/ui-img';
import { renderDie, restRotation, faceOf, STYLE_IDS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/dice-d20-art';

const out = new Img(1040, 360);
out.fill(hex('#3a5a35'));
let x = 4;
for (const st of STYLE_IDS) {
  const fi = faceOf(14);
  const r = renderDie({ style: st, R: 38, rot: restRotation(fi), w: 84, h: 84, upright: fi });
  out.draw(r.img.scaled(4), x, 4);
  x += 344;
}
savePng(process.argv[2], out);
