// The height test map (practice only, never on a mission): the owner's answer on the Y axis
// (2026-10-22, "me gustaria darle alguna clase de altura ... terreno elevado ... trepando una colina
// bajando un colina ... alguien subio a una torre"), laid out the way his paint-over shows height
// (docs/reference/map-height-owner-reference.jpg): terraces with a cliff face between the levels and
// stone stairs between them. A field of 42 x 16 m with:
// - a terrace at the back left (level 1), its front a cliff face, stone stairs up to it on the right;
// - an upper terrace at its back (level 2), with its own cliff face and stairs (its right side drops
//   two levels to the field: only the ninja jump takes that);
// - a raised rock ledge in the middle, level 1 with bare sides (climbed at half speed);
// - a watch tower on the right, its platform at level 2 (3 m), with a ladder on its front face.
// The ground art is a placeholder drawn from these same formulas (components/battle/placeholderArt.ts).

import type { PropDef } from '../types';
import type { MapDef } from '../map';

const PXM = 57;
const PZM = 38;
const LV = 86;
const BACK_Y = 300;
const WIDTH = 42;
const DEPTH = 16;

type Box = { x0: number; x1: number; z0: number; z1: number };

/** The terrace (level 1) and the upper terrace on its back (level 2). */
export const TERRACE: Box = { x0: 2, x1: 18, z0: 0, z1: 8.5 };
export const UPPER: Box = { x0: 9, x1: 18, z0: 0, z1: 4.5 };
/** Stone stairs climbing into the depth: from the field to the terrace, and from the terrace to the upper terrace. */
export const STAIRS: (Box & { from: number; to: number })[] = [
  { x0: 14.5, x1: 16.5, z0: TERRACE.z1, z1: TERRACE.z1 + 2, from: 0, to: 1 },
  { x0: 10, x1: 12, z0: UPPER.z1, z1: UPPER.z1 + 2, from: 1, to: 2 },
];
/** The raised rock ledge (level 1). */
export const LEDGE: Box = { x0: 19, x1: 23, z0: 10, z1: 13 };
/** The watch tower's platform (level 2) and its ladder, leaning from the platform's front edge to the ground. */
export const TOWER = { x0: 28, x1: 30.5, z0: 3.5, z1: 6, level: 2 };
export const LADDER: Box = { x0: 29, x1: 30, z0: TOWER.z1, z1: TOWER.z1 + 1 };

export const inBox = (x: number, z: number, b: Box): boolean => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;

export const onLadder = (x: number, z: number): boolean => inBox(x, z, LADDER);
export const stairsAt = (x: number, z: number): (typeof STAIRS)[number] | undefined => STAIRS.find((s) => inBox(x, z, s));

function levelAt(x: number, z: number): number {
  if (inBox(x, z, TOWER)) return TOWER.level;
  // The ladder: the climber's feet rise from the ground at its foot to the platform at its top.
  if (onLadder(x, z)) return (TOWER.level * (LADDER.z1 - z)) / (LADDER.z1 - LADDER.z0);
  const st = stairsAt(x, z);
  if (st) return st.from + ((st.to - st.from) * (st.z1 - z)) / (st.z1 - st.z0);
  if (inBox(x, z, UPPER)) return 2;
  if (inBox(x, z, TERRACE)) return 1;
  if (inBox(x, z, LEDGE)) return 1;
  return 0;
}

let nextId = 0;
const P = (group: string, name: string, x: number, z: number, o: Partial<PropDef> = {}): PropDef => ({
  id: `h_${name}_${nextId++}`,
  group,
  name,
  x,
  z,
  level: Math.floor(levelAt(x, z) + 1e-6),
  ...o,
});

const PROPS: PropDef[] = [
  // trees at different depths
  P('trees', 'pine', 3.0, 0.6),
  P('trees', 'maple', 24.6, 0.5),
  P('trees', 'oak', 38.6, 0.7),
  P('trees', 'pine', 0.8, 9.6),
  // the upper terrace: a tent and a weapon rack, as on his picture
  P('camp', 'tent', 15.2, 1.6),
  P('camp', 'weapon_rack', 10.6, 1.4),
  // the terrace
  P('landmarks', 'stone_lantern', 6.2, 4.0, { anim: 'unlit' }),
  P('plants', 'bush_round', 3.4, 6.6),
  // the field below: the campfire and barrels
  P('camp', 'campfire', 9.0, 11.2, { anim: 'burning', glow: [255, 170, 80] }),
  P('camp', 'barrel', 4.6, 10.4),
  P('landmarks', 'fence', 16.6, 14.2),
  P('landmarks', 'rocks_small', 21.0, 10.8),
  // Cover in front of the tower, looked down on from its platform: a crate (half), a stack of
  // crates (three-quarters, blocks sight) and a barrel.
  P('camp', 'crate', 28.25, 11.5),
  P('camp', 'crate_stack', 29.75, 11.5),
  P('camp', 'barrel', 32.8, 10.4),
];

export const HEIGHT_TEST: MapDef = {
  id: 'height_test',
  widthM: WIDTH,
  depthM: DEPTH,
  px: { perM: PXM, perMDepth: PZM, level: LV, backY: BACK_Y, width: WIDTH * PXM, height: BACK_Y + DEPTH * PZM + 60 },
  levelAt,
  isRamp: (x, z) => !!stairsAt(x, z),
  isClimb: onLadder,
  floorAt: (x, z) => (onLadder(x, z) ? 0 : levelAt(x, z)),
  waterAt: () => 'none',
  walkable: (x, z) => x >= 0 && x <= WIDTH && z >= 0.15 && z <= DEPTH - 0.1,
  props: PROPS,
  exits: { left: true, right: false },
};
