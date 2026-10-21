// Our female body at idle frame 0, bare (no clothes, hair or headband), for tools/refs/princess_ref.py:
// writes <out>.rgba (256 x 256 x 4) and <out>.json (the rig's joints in fine pixels of our frame) and
// prints the joints. princess_ref.OUR_JOINTS is this print; when the female body changes (the new
// female body of body/female-v2), rerun this and paste the print there.
//
//   npx tsx tools/refs/princess-idle.ts <out> [body]      (body: female by default)
import { writeFileSync } from 'node:fs';
import { renderSprite } from '../../src/sprite/compose';
import { defaultAppearance } from '../../src/sprite/legacy';
import { RES } from '../../src/sprite/raster';
import type { BodyType } from '../../src/sprite/types';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/refs/princess-idle.ts <out> [body]');
const look = defaultAppearance();
look.body = (process.argv[3] || 'female') as BodyType;
look.slots = {};
delete (look as { headband?: unknown }).headband;
const f = renderSprite(look, 'idle', 0);
writeFileSync(out + '.rgba', Buffer.from(f.rgba.buffer, f.rgba.byteOffset, f.rgba.byteLength));
const joints = ['head', 'neck', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF',
  'pelvis', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'] as const;
const J: Record<string, [number, number]> = {};
for (const k of joints) J[k] = [+(f.rig[k].x * RES).toFixed(2), +(f.rig[k].y * RES).toFixed(2)];
writeFileSync(out + '.json', JSON.stringify(J));
for (const k of joints) console.log(`    '${k}': (${J[k][0].toFixed(2)}, ${J[k][1].toFixed(2)}),`);
