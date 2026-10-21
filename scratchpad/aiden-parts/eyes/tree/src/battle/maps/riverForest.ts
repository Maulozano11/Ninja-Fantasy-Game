// The River Forest map (docs/GAMEPLAY_DESIGN.md, First map): 60 x 20 m with the forest edge and a
// shrine, a clearing, the river with its bridge and stepping stones, the hill camp (level 1) and
// the rock lookout (level 2). The ground art is baked by tools/maps/river_forest.py from the same
// formulas used here, so what you see is where you walk.

import type { PropDef, Pt, WaterKind } from '../types';
import type { MapDef } from '../map';

const PXM = 57;
const PZM = 38;
const LV = 86;
const BACK_Y = 360;
const DEPTH = 20;
const WIDTH = 3456 / PXM;

/** River center and half width (m) at depth z: it runs from the far forest toward the viewer. */
export function riverAt(z: number): { c: number; hw: number } {
  return { c: 29.6 - (2.4 * z) / DEPTH + 0.5 * Math.sin(z * 0.44), hw: 2.3 + (0.7 * z) / DEPTH };
}

const BRIDGE = { x0: 1390.612 / PXM, x1: 1804.717 / PXM, z0: 9.5 - 2.4, z1: 9.5 };
const HILL_X = 37.5;
const LOOK_X = 50;
const hillFront = (x: number): number => 10.75 + 0.45 * Math.sin((x - HILL_X) / 2.6) + 0.25 * Math.sin((x - HILL_X) / 0.9 + 1);
const lookFront = (x: number): number => 4.25 + 0.25 * Math.sin((x - LOOK_X) / 1.3);

/** The grassy slope from the clearing up to the hill camp: its left edge (m) at depth z. */
function slopeLeft(z: number): number {
  const pts: [number, number][] = [
    [-0.3, 36.9],
    [1.9, 36.1],
    [7.5, 35.1],
    [12.4, 34.9],
  ];
  if (z <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (z <= pts[i][0]) {
      const [z0, x0] = pts[i - 1];
      const [z1, x1] = pts[i];
      return x0 + ((x1 - x0) * (z - z0)) / (z1 - z0);
    }
  }
  return pts[pts.length - 1][1];
}
/** The slope's front edge (m) at x: from the foot at (34.9, 12.4) to the plateau's corner. */
const slopeFront = (x: number): number => 12.4 + ((hillFront(37.6) - 12.4) * (x - 34.9)) / (37.6 - 34.9);

/** Stone steps from the plateau to the lookout: centerline points (x, z, level). */
const STEPS: [number, number, number][] = Array.from({ length: 8 }, (_, k) => {
  const t = k / 7;
  return [LOOK_X - 1.5 + 1.25 * t, lookFront(LOOK_X) + 1.75 - 1.75 * t, 1 + t];
});

function onSteps(x: number, z: number): number | null {
  for (let k = 0; k < STEPS.length - 1; k++) {
    const [x0, z0, l0] = STEPS[k];
    const [x1, z1, l1] = STEPS[k + 1];
    // Distance to the segment, stretched across (the steps are about 1.3 m wide).
    const dx = x1 - x0;
    const dz = z1 - z0;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz)));
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    if (Math.abs(x - px) <= 0.7 && Math.abs(z - pz) <= 0.45) return l0 + (l1 - l0) * t;
  }
  return null;
}

function levelAt(x: number, z: number): number {
  const step = onSteps(x, z);
  if (step !== null) return step;
  if (x >= LOOK_X && z <= lookFront(x)) return 2;
  if (x >= HILL_X && z <= hillFront(x)) return 1;
  const left = slopeLeft(z);
  if (x > left && x < HILL_X + 0.1 && z <= slopeFront(x)) return Math.max(0, Math.min(1, (x - left) / (HILL_X + 0.1 - left)));
  return 0;
}

function isRamp(x: number, z: number): boolean {
  if (onSteps(x, z) !== null) return true;
  const l = levelAt(x, z);
  return l > 0 && l < 1;
}

const STONES: Pt = { x: 28.4, z: 13.75 };

function waterAt(x: number, z: number): WaterKind {
  if (x >= BRIDGE.x0 && x <= BRIDGE.x1 && z >= BRIDGE.z0 && z <= BRIDGE.z1) return 'none';
  const { c, hw } = riverAt(z);
  const across = Math.abs(x - c) / hw;
  if (across > 1) return 'none';
  if (Math.hypot(x - STONES.x, (z - STONES.z) * 1.4) < 0.9) return 'shallow';
  return across > 0.8 ? 'shallow' : 'deep';
}

function walkable(x: number, z: number): boolean {
  if (x < 0 || x > WIDTH || z < 0.15 || z > DEPTH - 0.1) return false;
  return true;
}

// Props laid out for a 16 m deep field in the mockup, stretched to the real 20 m (z x 1.25).
const ZK = DEPTH / 16;
let nextId = 0;
function P(group: string, name: string, x: number, z: number, o: Partial<PropDef> = {}): PropDef {
  // Props on the hill and the lookout stand on their level.
  const zz = z * ZK;
  return { id: `${name}_${nextId++}`, group, name, x, z: zz, level: Math.floor(levelAt(x, Math.max(0.2, zz)) + 1e-6), ...o };
}
const LAMP: [number, number, number] = [255, 196, 110];
const WARM: [number, number, number] = [255, 170, 80];

const PROPS: PropDef[] = [
  // forest edge (party side)
  P('trees', 'pine', 1.2, 0.2),
  P('trees', 'oak', 4.6, 0.8),
  P('trees', 'maple', 9.4, 0.4),
  P('trees', 'oak', 12.6, 1.2),
  P('trees', 'stump', 7.6, 6.0),
  P('landmarks', 'hokora', 6.6, 2.4),
  P('landmarks', 'stone_lantern', 5.3, 2.9, { anim: 'lit', glow: LAMP }),
  P('plants', 'fern', 3.0, 3.0),
  P('plants', 'fern', 10.8, 2.8),
  P('plants', 'mushroom_log', 10.0, 6.6),
  P('plants', 'bush_round', 2.6, 8.6),
  P('plants', 'bush_flower', 0.8, 11.0),
  P('plants', 'bush_wide', 5.2, 13.6),
  P('plants', 'tall_grass', 8.0, 14.4),
  P('plants', 'tall_grass', 3.6, 15.4),
  P('plants', 'flowers', 6.4, 9.0),
  P('plants', 'flowers', 11.6, 13.0),
  P('landmarks', 'rocks_small', 9.2, 11.4),
  P('animals', 'fireflies', 3.2, 7.6, { lift: 60 }),
  P('animals', 'rabbit', 12.6, 12.0, { anim: 'graze' }),
  // clearing
  P('trees', 'bamboo', 18.4, 0.3),
  P('trees', 'bamboo', 20.2, 0.9),
  P('trees', 'maple', 23.4, 1.0),
  P('landmarks', 'signpost', 14.8, 8.8),
  P('landmarks', 'boulder', 18.0, 6.4),
  P('landmarks', 'rock', 21.4, 12.4),
  P('landmarks', 'fence', 15.0, 12.9),
  P('landmarks', 'fence', 17.0, 12.9),
  P('landmarks', 'fence', 19.0, 13.0, { anim: 'broken' }),
  P('plants', 'bush_round', 22.6, 5.0),
  P('plants', 'tall_grass', 16.2, 4.6),
  P('plants', 'flowers', 20.0, 9.4),
  P('landmarks', 'rocks_small', 13.8, 14.6),
  P('animals', 'deer', 16.0, 3.2, { anim: 'graze' }),
  P('animals', 'crow', 17.2, 12.9, { anim: 'perch', lift: 54 }),
  P('animals', 'butterfly_blue', 12.0, 9.6, { lift: 70 }),
  P('animals', 'butterfly_yellow', 20.6, 10.4, { lift: 50 }),
  // river and bridge
  P('landmarks', 'stone_lantern', 24.0, 9.0, { anim: 'lit', glow: LAMP }),
  P('landmarks', 'stone_lantern', 32.2, 9.0, { anim: 'lit', glow: LAMP }),
  P('plants', 'reeds', 25.4, 13.2),
  P('plants', 'reeds', 31.6, 4.4),
  P('plants', 'reeds', 30.6, 14.6),
  P('plants', 'lily_pads', 27.2, 14.2),
  P('plants', 'lily_pads', 29.0, 12.6),
  P('landmarks', 'river_stones', 28.4, 11.0),
  P('animals', 'frog', 27.0, 11.2, { lift: 6 }),
  P('animals', 'koi', 29.6, 3.4, { anim: 'swim' }),
  P('animals', 'dragonfly', 26.6, 6.0, { lift: 50 }),
  // below the hill
  P('camp', 'barrel_explosive', 35.6, 11.4),
  P('camp', 'barrel_explosive', 36.4, 12.2),
  P('landmarks', 'boulder', 41.0, 12.2),
  P('landmarks', 'fence_bamboo', 44.0, 13.4),
  P('landmarks', 'fence_bamboo', 46.0, 13.4),
  P('plants', 'bush_wide', 49.4, 12.6),
  P('plants', 'tall_grass', 38.6, 14.6),
  P('plants', 'bush_round', 53.4, 14.0),
  P('landmarks', 'rock', 56.8, 11.6),
  P('plants', 'flowers', 33.6, 14.8),
  P('trees', 'oak', 58.6, 14.8),
  // hill camp (level 1)
  P('trees', 'pine', 38.6, -0.2),
  P('trees', 'pine', 47.6, -0.3),
  P('camp', 'tent', 43.2, 2.0),
  P('camp', 'weapon_rack', 40.2, 2.4),
  P('camp', 'campfire', 44.8, 5.2, { anim: 'burning', glow: WARM }),
  P('camp', 'smoke', 44.9, 5.2),
  P('camp', 'crate_stack', 48.6, 1.8),
  P('camp', 'crate', 47.6, 3.6),
  P('camp', 'sacks', 46.6, 6.6),
  P('camp', 'barrel', 39.6, 6.2),
  P('camp', 'barrel', 40.4, 6.9),
  P('camp', 'barrel_explosive', 49.2, 6.0),
  P('landmarks', 'stone_lantern', 43.6, 7.9, { anim: 'lit', glow: LAMP }),
  // lookout (level 2)
  P('trees', 'pine', 56.4, -0.2),
  P('landmarks', 'stone_lantern', 52.0, 2.6, { anim: 'unlit' }),
  P('camp', 'crate', 54.2, 2.4),
  P('animals', 'sparrow', 54.3, 2.4, { anim: 'perch', lift: 46 }),
];

export const RIVER_FOREST: MapDef = {
  id: 'river_forest',
  widthM: WIDTH,
  depthM: DEPTH,
  px: { perM: PXM, perMDepth: PZM, level: LV, backY: BACK_Y, width: 3456, height: 1200 },
  levelAt,
  isRamp,
  waterAt,
  walkable,
  props: PROPS,
  exits: { left: true, right: true },
  bridge: BRIDGE,
  river: (z) => riverAt(z),
};
