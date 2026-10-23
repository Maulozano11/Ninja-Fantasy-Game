// Our female body at idle frame 0 with no items, for the heroine study
// (tools/refs/heroine-study.py): writes <out>/female-idle.png (256 x 256) and prints its rig's
// joints in fine pixels (heroine_ref.OUR_JOINTS). Then the same body with his Lyra's long arms
// (appearance `arms: 'long'`, rig.ts LONG_ARMS) holding her sword, and
// the near fist's grip point (grip.ts gripPoint): the joints the Lyra scripts (tools/refs/lyra-*.py) lay
// her pieces on; and, per row, the first and last column of the body's near upper arm (with the
// shoulder), near forearm and far forearm as the body draws them there (lyra-upper-from-ref.py
// NEAR_UPPER_ARM, NEAR_FOREARM, FAR_FOREARM: what her sleeves, bracers and cuffs take off).
//
//   npx tsx tools/refs/heroine-idle.mts <out>

import { gripPoint } from '../../src/sprite/grip';
import type { DrawCtx } from '../../src/sprite/ctx';
import { renderSprite, spriteLayers } from '../../src/sprite/compose';
import { GRID, partIndex, type PartId, RES } from '../../src/sprite/raster';
import { drawRig, rigPoseFor, type Rig } from '../../src/sprite/rig';
import type { BodyType, SpriteAppearance } from '../../src/sprite/types';
import { writePng } from '../world-sprites/kit';

const joints = ['head', 'neck', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'pelvis', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'] as const;
const print = (r: Rig) => {
  for (const j of joints) console.log(`    '${j}': (${(r[j].x * RES).toFixed(2)}, ${(r[j].y * RES).toFixed(2)}),`);
};

const bare = (body: BodyType): SpriteAppearance => ({
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
});

for (const body of ['female'] as BodyType[]) {
  const look = bare(body);
  const f = renderSprite(look, 'idle', 0);
  writePng(`${process.argv[2]}/${body}-idle.png`, GRID, GRID, new Uint8Array(f.rgba.buffer, f.rgba.byteOffset, f.rgba.length));
  console.log(`# ${body}`);
  print(f.rig);
}

for (const body of ['female'] as BodyType[]) {
  const r = drawRig(body, rigPoseFor('idle', undefined, 'held_gilded_rapier'), 0, 'long');
  console.log(`# ${body}, his Lyra's long arms, holding her sword`);
  print(r);
  const p = gripPoint({ rig: r } as DrawCtx);
  console.log(`    grip point: (${(p.x * RES).toFixed(2)}, ${(p.y * RES).toFixed(2)})`);
}

// The body's arms under her clothes: her long arms holding her sword (the bare body, no clothes).
const lyra: SpriteAppearance = { ...bare('female'), arms: 'long', slots: { held: { id: 'held_gilded_rapier', colors: [] } } };
const { layers } = spriteLayers(lyra, 'idle', 0);
const spans = (depth: 'nearArm.body' | 'farArm.body', parts: PartId[]) => {
  const L = layers.get(depth)!;
  const want = new Set(parts.map(partIndex));
  const rows = new Map<number, [number, number]>();
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || !want.has(L.part[i])) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    const r = rows.get(y);
    rows.set(y, r ? [Math.min(r[0], x), Math.max(r[1], x)] : [x, x]);
  }
  return '{' + [...rows].sort((a, b) => a[0] - b[0]).map(([y, [a, b]]) => `${y}: (${a}, ${b})`).join(', ') + '}';
};
console.log('# female, his Lyra\'s long arms, holding her sword: the body\'s arm cells per row (first, last)');
console.log(`NEAR_UPPER_ARM = ${spans('nearArm.body', ['upperArmN'])}`);
console.log(`NEAR_FOREARM = ${spans('nearArm.body', ['forearmN'])}`);
console.log(`FAR_FOREARM = ${spans('farArm.body', ['forearmF'])}`);
