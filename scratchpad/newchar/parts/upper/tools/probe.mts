// probe.mts <body> <pose> <frame> <slots-json> <x0> <y0> <x1> <y1>: per pixel, the part letter of the
// top-most pixel and whether it is skin-coloured (upper case = skin tone).
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/raster';

const [body, pose, frame, slots, x0, y0, x1, y1] = process.argv.slice(2);
const look = {
  version: 1,
  body,
  skin: '#f6bb96',
  faceShape: 'valiant',
  eyeShape: 'valiant',
  eyeColor: '#d97706',
  slots: JSON.parse(slots),
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const f = renderSprite(look as any, pose as any, +frame);
const letters = '.htpAaHBbCcNnSsFfk';
let head = '    ';
for (let x = +x0; x < +x1; x++) head += x % 10;
console.log(head);
for (let y = +y0; y < +y1; y++) {
  let s = '';
  for (let x = +x0; x < +x1; x++) {
    const i = y * GRID + x;
    if (!f.rgba[i * 4 + 3]) {
      s += ' ';
      continue;
    }
    const [r, g, b] = [f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2]];
    const skin = r > 120 && r > g + 30 && g > b - 10 && r - b > 40;
    const ch = letters[f.part[i]] ?? '?';
    s += skin ? ch.toUpperCase() === ch ? '#' : ch.toUpperCase() : ch;
  }
  console.log(String(y).padStart(3) + ' ' + s);
}
