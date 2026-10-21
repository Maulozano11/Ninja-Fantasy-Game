// Prints the crest template overlaid on the bald head: '#' = skull skin not covered by hair (above the brow), template chars otherwise.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { faceAnchor } from '/home/user/Ninja-Fantasy-Game/src/sprite/body';
import { readFileSync } from 'node:fs';
import { baseLook } from '../shared/sheet';
const src = readFileSync('/home/user/Ninja-Fantasy-Game/src/sprite/items/hair.ts', 'utf8');
const m = src.match(/const CREST_TEMPLATE = \[([\s\S]*?)\];\nconst CREST_ANCHOR: \[number, number\] = \[(\d+), (\d+)\]/)!;
const rows = [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]); const ax = +m[2], ay = +m[3];
for (const body of ['male', 'female', 'bulky']) {
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: {} } as any), 'idle', 0);
  const g: any = { rig: f.rig, bp: f.rig.bp };
  const { nx, ny } = faceAnchor(g);
  const ox = nx + 2 - ax, oy = ny + 1 - ay;
  console.log(body, 'template origin', ox, oy, 'lash row', ny - oy);
  for (let r = -2; r < rows.length + 3; r++) {
    let line = '';
    for (let c = -4; c < 36; c++) {
      const ch = rows[r]?.[c] ?? '.';
      const X = ox + c, Y = oy + r; const i = (Y * 128 + X) * 4;
      const skin = f.rgba[i + 3] && f.rgba[i] > f.rgba[i + 2] + 40;
      line += ch !== '.' ? ch : skin && Y < ny ? '#' : skin ? 's' : ' ';
    }
    console.log(String(r).padStart(3), line);
  }
  break;
}
