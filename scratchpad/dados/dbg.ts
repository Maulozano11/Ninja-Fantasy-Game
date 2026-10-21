import { renderDie, restRotation, faceOf, FACES, mul } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/dice-d20-art';
const fi = faceOf(14);
const r = renderDie({ style: 'ivory', R: 38, rot: restRotation(fi), w: 84, h: 84, upright: fi });
console.log(FACES[fi].v.map((i) => r.proj[i].map((v) => v.toFixed(1)).join(',')));
const rot = restRotation(fi);
console.log('normal', mul(rot, FACES[fi].n).map((v) => v.toFixed(3)));
