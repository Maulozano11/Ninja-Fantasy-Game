// What bulky-read-from-ref.py lines the owner's broad man reading up against: our broad man on the bulky body,
// read frame 0, drawn piece by piece (not his frame: renderSprite's skipOwner), as the owner had it to paint over
// (scratchpad picture "Leer 1", 10x), and the same frame with his skin, his hair and his eyes in other colours,
// so the script can tell which of his pixels follow the character's skin, hair and eyes; and the rock he sits on.
//
//   npx tsx tools/refs/bulky-read-base.ts <outDir>
//
// Run it on commit efb3ac0 (git worktree add <tmp> efb3ac0): that is the frame he painted over. Later trees
// sit the read on another rock (seats.ts seat_rock, the integration branch's) with another rig, so their base
// no longer lines up with his picture and the script's rock check stops it.
//
// Writes <outDir>/base.json: { grid, rgba: {plain, skin, hair, eye} as base64, part (base64), seat (base64) }.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSprite } from '../../src/sprite/compose';
import { BROAD_READ_BASE, BROAD_READ_LOOK } from '../../src/sprite/broadRead';
import { GRID } from '../../src/sprite/raster';
import { renderSeat, seatFor } from '../../src/sprite/seats';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/refs/bulky-read-base.ts <outDir>');
mkdirSync(out, { recursive: true });
const look = BROAD_READ_LOOK;
const b64 = (a: Uint8Array | Uint8ClampedArray) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const draw = (l: typeof look) => renderSprite(l, 'read', 0, 'none', { skipOwner: true });
const plain = draw(look);
const other = (hex: string) => (hex.toLowerCase() === '#2a6b3c' ? '#7a2a8c' : '#2a6b3c');
const hair = look.slots.hair!;
writeFileSync(
  join(out, 'base.json'),
  JSON.stringify({
    grid: GRID,
    rgba: {
      plain: b64(plain.rgba),
      skin: b64(draw({ ...look, skin: other(BROAD_READ_BASE.skin) }).rgba),
      hair: b64(draw({ ...look, slots: { ...look.slots, hair: { ...hair, colors: [other(BROAD_READ_BASE.hair)] } } }).rgba),
      eye: b64(draw({ ...look, eyeColor: other(BROAD_READ_BASE.eye) }).rgba),
    },
    part: b64(plain.part),
    hairBits: b64(plain.hair ?? new Uint8Array(GRID * GRID / 8)),
    seat: b64(renderSeat(seatFor('read')!)),
  }),
);
