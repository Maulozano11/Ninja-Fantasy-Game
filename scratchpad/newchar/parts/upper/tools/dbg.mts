// dbg.mts <pose> <frame> <x0> <y0> <x1> <y1>: the far arm's skin (s), the far sleeve's pieces (u upper,
// f fore, both B) for a pose, male.
import { drawBody } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/body';
import { Depth, DrawCtx } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/ctx';
import { segAngle, stampPiece } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/painted';
import { GRID, Layer, MaterialTable } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/raster';
import { drawRig, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/rig';
import * as A from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/items/scarletCoatArt';

const [pose, frame, x0, y0, x1, y1] = process.argv.slice(2);
const look = { version: 1, body: 'male', skin: '#f6bb96', faceShape: 'valiant', eyeShape: 'valiant', eyeColor: '#d97706', slots: {}, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rig = drawRig('male', rigPoseFor(pose as any), +frame);
const mats = new MaterialTable();
const layers = new Map<Depth, Layer>();
const g: DrawCtx = {
  rig,
  bp: rig.bp,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  look: look as any,
  eyeSpecial: 'none',
  mats,
  L(d) {
    let l = layers.get(d);
    if (!l) layers.set(d, (l = new Layer()));
    return l;
  },
  m: (hex, kind = 'cloth') => mats.get(hex, kind),
  pen: (hex, kind, part, bias = 0, flags = 0) => ({ mat: mats.get(hex, kind), part, bias, flags }),
  skin: mats.get(look.skin, 'skin'),
  has: () => false,
};
drawBody(g);
const r = rig;
stampPiece(g, 'farArm.cloth', A.COAT_SLEEVE_FORE_F, r.elbowF, segAngle(r.elbowF, r.wristF), 'forearmF');
stampPiece(g, 'farArm.armor', A.COAT_SLEEVE_UPPER_F, r.shoulderF, segAngle(r.shoulderF, r.elbowF), 'upperArmF');
stampPiece(g, 'torso.armor', A.COAT_BODY, r.neck, segAngle(r.pelvis, r.neck), 'torso');
const arm = layers.get('farArm.body')!;
const fo = layers.get('farArm.cloth')!;
const up = layers.get('farArm.armor')!;
const tb = layers.get('torso.body')!;
const co = layers.get('torso.armor')!;
console.log('shoulderF', r.shoulderF.x * 2, r.shoulderF.y * 2, 'upper angle', segAngle(r.shoulderF, r.elbowF), 'torso', segAngle(r.pelvis, r.neck));
for (let y = +y0; y < +y1; y++) {
  let s = '';
  for (let x = +x0; x < +x1; x++) {
    const i = y * GRID + x;
    s += co.mat[i] >= 0 ? 'C' : tb.mat[i] >= 0 ? 't' : up.mat[i] >= 0 ? (arm.mat[i] >= 0 ? 'u' : 'U') : fo.mat[i] >= 0 ? (arm.mat[i] >= 0 ? 'f' : 'F') : arm.mat[i] >= 0 ? 'S' : '.';
  }
  console.log(String(y).padStart(3), s);
}
