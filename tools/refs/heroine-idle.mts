// Our female (and slender) body at idle frame 0 with no items, for the heroine study
// (tools/refs/heroine-study.py): writes <out>/female-idle.png and <out>/slender-idle.png (256 x 256)
// and prints each rig's joints in fine pixels (heroine_ref.OUR_JOINTS is the female's).
//
//   npx tsx tools/refs/heroine-idle.mts <out>

import { renderSprite } from '../../src/sprite/compose';
import { GRID, RES } from '../../src/sprite/raster';
import type { BodyType, SpriteAppearance } from '../../src/sprite/types';
import { writePng } from '../world-sprites/kit';

const joints = ['head', 'neck', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'pelvis', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'] as const;

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
  for (const j of joints) console.log(`    '${j}': (${(f.rig[j].x * RES).toFixed(2)}, ${(f.rig[j].y * RES).toFixed(2)}),`);
}
