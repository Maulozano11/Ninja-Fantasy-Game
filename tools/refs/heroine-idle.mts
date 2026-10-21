// Our female (and slender) body at idle frame 0 with no items, for the heroine study
// (tools/refs/heroine-study.py): writes <out>/female-idle.png and <out>/slender-idle.png (256 x 256)
// and prints each rig's joints in fine pixels (heroine_ref.OUR_JOINTS is the female's). Then the same
// bodies with his Lyra's long arms (appearance `arms: 'long'`, rig.ts LONG_ARMS) holding her sword, and
// the near fist's grip point (grip.ts gripPoint): the joints the Lyra scripts (tools/refs/lyra-*.py) lay
// her pieces on.
//
//   npx tsx tools/refs/heroine-idle.mts <out>

import { gripPoint } from '../../src/sprite/grip';
import type { DrawCtx } from '../../src/sprite/ctx';
import { renderSprite } from '../../src/sprite/compose';
import { GRID, RES } from '../../src/sprite/raster';
import { drawRig, rigPoseFor, type Rig } from '../../src/sprite/rig';
import type { BodyType, SpriteAppearance } from '../../src/sprite/types';
import { writePng } from '../world-sprites/kit';

const joints = ['head', 'neck', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'pelvis', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'] as const;
const print = (r: Rig) => {
  for (const j of joints) console.log(`    '${j}': (${(r[j].x * RES).toFixed(2)}, ${(r[j].y * RES).toFixed(2)}),`);
};

for (const body of ['female', 'slender'] as BodyType[]) {
  const look: SpriteAppearance = {
    version: 1,
    body,
    skin: '#f6c7a6',
    eyeShape: 'standard',
    eyeColor: '#2f9e6a',
    slots: {},
    accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
    pixelEdits: [],
  };
  const f = renderSprite(look, 'idle', 0);
  writePng(`${process.argv[2]}/${body}-idle.png`, GRID, GRID, new Uint8Array(f.rgba.buffer, f.rgba.byteOffset, f.rgba.length));
  console.log(`# ${body}`);
  print(f.rig);
}

for (const body of ['female', 'slender'] as BodyType[]) {
  const r = drawRig(body, rigPoseFor('idle', undefined, 'held_gilded_rapier'), 0, 'long');
  console.log(`# ${body}, his Lyra's long arms, holding her sword`);
  print(r);
  const p = gripPoint({ rig: r } as DrawCtx);
  console.log(`    grip point: (${(p.x * RES).toFixed(2)}, ${(p.y * RES).toFixed(2)})`);
}
