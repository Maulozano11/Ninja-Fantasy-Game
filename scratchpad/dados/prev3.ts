import { Img, hex, savePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/ui-img';
import { ROLL_FRAMES, rollFrame, rollPath, nat20Frames, nat1Frames, popFrames, SIZES, shadowSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/dice-d20-fx';
import { STYLE_IDS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/dice-d20-art';

const size = (process.argv[3] ?? 'small') as 'small' | 'big';
const result = Number(process.argv[4] ?? 17);
const z = SIZES[size];
const cell = size === 'small' ? 84 : 200;
const sc = size === 'small' ? 3 : 1;
const out = new Img(cell * 9 * sc, cell * 2 * 3 * sc + cell * sc * 2);
out.fill(hex('#3a5a35'));
STYLE_IDS.forEach((st, si) => {
  const path = rollPath(result, size);
  for (let i = 0; i < ROLL_FRAMES; i++) {
    const r = rollFrame(result, i, { style: st, size });
    const cimg = new Img(cell, cell);
    const gx = cell - z.box / 2 - 6, gy = cell * 0.62;
    const sh = shadowSprite(Math.round(z.R * 1.6 * (0.55 + 0.45 * path[i].ground)));
    cimg.draw(sh, Math.round(gx + path[i].dx - sh.w / 2 + 0), Math.round(gy + z.R + 0 - sh.h / 2 + 1));
    cimg.draw(r.img, Math.round(gx + path[i].dx - r.centre[0]), Math.round(gy + path[i].dy - r.centre[1]));
    const col = i % 9, row = si * 2 + Math.floor(i / 9);
    out.draw(cimg.scaled(sc), col * cell * sc, row * cell * sc);
  }
});
// nat20 and nat1 for ivory
const n20 = nat20Frames('obsidian', size);
n20.forEach((f, i) => out.draw(f.img.scaled(sc), i * (z.fx + 4) * sc, cell * 6 * sc));
const n1 = nat1Frames('ivory', size);
n1.forEach((f, i) => out.draw(f.img.scaled(sc), i * (z.fx + 4) * sc, (cell * 6 + z.fx + 4) * sc));
savePng(process.argv[2], out);
void popFrames;
