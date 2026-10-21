import { Img, hex, savePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/ui-img';
import { recolour, gemKeys, renderDie, restRotation, faceOf, NUMBERS, FACES, STYLE_IDS, axisAngle, mmul, EDGES, VERTS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/dice-d20-art';

console.log('numbers', NUMBERS.join(','));
// check opposite sums
console.log('opp ok', FACES.every((f, i) => NUMBERS[i] + NUMBERS[f.opp] === 21), 'edges', EDGES.length, 'verts', VERTS.length);
const f20 = faceOf(20);
console.log('20 adj', FACES[f20].adj.map((a) => NUMBERS[a]));
const out = new Img(1400, 1000);
out.fill(hex('#2c4a2a'));
let y = 4;
for (const st of STYLE_IDS) {
  let x = 4;
  for (const n of [20, 7, 13, 1, 6]) {
    const fi = faceOf(n);
    const r = renderDie({ style: st, R: 15, rot: restRotation(fi), w: 36, h: 36, upright: fi });
    out.draw(r.img.scaled(4), x, y);
    x += 150;
  }
  for (const n of [20, 17]) {
    const fi = faceOf(n);
    const r = renderDie({ style: st, R: 38, rot: restRotation(fi), w: 84, h: 84, upright: fi });
    out.draw(r.img.scaled(2), x, y);
    x += 172;
  }
  // tumble samples
  const r2 = renderDie({ style: st, R: 38, rot: mmul(axisAngle([0.5, 0.8, -0.3], 35), restRotation(faceOf(12))), w: 84, h: 84 });
  out.draw(r2.img.scaled(2), x, y);
  y += 180;
}
// tumble row small
let x = 4;
for (let k = 0; k < 9; k++) {
  const r = renderDie({ style: 'ivory', R: 15, rot: mmul(axisAngle([0.5, 0.8, -0.3], k * 20), restRotation(faceOf(20))), w: 36, h: 36, upright: k === 0 ? faceOf(20) : undefined });
  out.draw(r.img.scaled(4), x, y);
  x += 150;
}
import { diceGemRamp } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/src/sprite/diceGem';
y += 160; x = 4;
for (const t of ['red','orange','yellow','green','blue','indigo','violet','white','black','brown']) {
  const r = renderDie({ style: 'gem', R: 15, rot: restRotation(faceOf(20)), w: 36, h: 36, upright: faceOf(20) });
  out.draw(recolour(r.img, gemKeys(), diceGemRamp(t)).scaled(3), x, y);
  x += 115;
}
savePng(process.argv[2], out);
