// Placeholder ground for the height test map (practice only): flat colours, a 1.5 m test grid, the
// levels as terraces with an earth-and-stone cliff face between them and grey stone stairs (the way
// the owner's paint-over shows height, docs/reference/map-height-owner-reference.jpg), a rock ledge,
// a wooden block for the watch tower and a ladder on its front.
// It is drawn in the browser from the map's own formulas (src/battle/maps/heightTest.ts), so what
// you see is where you walk. Not art for the game: the owner draws the real world himself.

import type { MapDef } from '../../battle/map';
import { LADDER, LEDGE, TOWER, inBox, onLadder, stairsAt } from '../../battle/maps/heightTest';

type Rgb = [number, number, number];

const GRASS: Rgb[] = [
  [86, 112, 78],
  [112, 138, 92],
  [140, 164, 104],
];
const DIRT: Rgb = [104, 82, 58];
const STONE: Rgb = [128, 124, 116];
const ROCK_TOP: Rgb = [138, 138, 130];
const ROCK_FACE: Rgb = [92, 92, 88];
const WOOD_TOP: Rgb = [164, 124, 78];
const WOOD_FACE: Rgb = [112, 80, 48];
const RAIL: Rgb = [70, 48, 28];
const EDGE: Rgb = [38, 50, 36];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];

/** The top of the ground at a point: grass by level (a test grid of 1.5 m squares), rock, planks. */
function topColor(x: number, z: number, level: number): Rgb {
  if (inBox(x, z, TOWER)) return (x * 4) % 1 < 0.08 ? shade(WOOD_TOP, 0.8) : WOOD_TOP;
  if (inBox(x, z, LEDGE)) return ROCK_TOP;
  // Stone stairs: a darker edge on each step (4 steps a level, 37 cm each).
  if (stairsAt(x, z)) return (level * 4) % 1 < 0.2 ? shade(STONE, 0.72) : STONE;
  const l = Math.max(0, Math.min(2, level));
  const i = Math.min(1, Math.floor(l));
  const c = mix(GRASS[i], GRASS[i + 1], l - i);
  return (Math.floor(x / 1.5) + Math.floor(z / 1.5)) % 2 ? shade(c, 0.93) : c;
}

/**
 * A face under a higher top: under the terraces a band of earth with courses of stone (`down`: px
 * below the top edge), rock under the ledge, planks under the tower.
 */
function faceColor(x: number, z: number, k: number, down = 0): Rgb {
  if (inBox(x, z, TOWER)) {
    const post = x - TOWER.x0 < 0.18 || TOWER.x1 - x < 0.18;
    return shade(post ? RAIL : (x * 3) % 1 < 0.1 ? shade(WOOD_FACE, 0.8) : WOOD_FACE, k);
  }
  if (inBox(x, z, LEDGE)) return shade(ROCK_FACE, k);
  // A lip of grass at the top, then earth with rough courses of stone.
  if (down < 4) return shade(GRASS[1], 0.8);
  const row = Math.floor((down - 4) / 13);
  const col = Math.floor((x * 57 + (row % 2) * 11) / 22);
  const stone = (row * 7 + col * 13) % 5 < 2;
  const joint = (down - 4) % 13 < 2;
  return shade(joint ? shade(DIRT, 0.7) : stone ? STONE : DIRT, k);
}

/** The ladder over the tower's front: two rails and a rung every 30 cm of height; the tower's planks between. */
function ladderColor(x: number, level: number): Rgb | null {
  const rail = Math.abs(x - (LADDER.x0 + 0.1)) < 0.06 || Math.abs(LADDER.x1 - 0.1 - x) < 0.06;
  const rung = ((level * 1.5) / 0.3) % 1 < 0.22;
  if (rail || rung) return RAIL;
  return null;
}

let cache: { ground: string; backdrop: string } | null = null;

function paint(map: MapDef): { ground: string; backdrop: string } {
  const { perM, perMDepth, level: LV, backY, width: W, height: H } = map.px;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const put = (X: number, Y: number, c: Rgb) => {
    if (Y < 0 || Y >= H) return;
    const i = (Y * W + X) * 4;
    img.data[i] = c[0];
    img.data[i + 1] = c[1];
    img.data[i + 2] = c[2];
    img.data[i + 3] = 255;
  };
  const dz = 0.5 / perMDepth;
  for (let X = 0; X < W; X++) {
    const x = (X + 0.5) / perM;
    // From the front edge back: each point of ground shows only above what is in front of it.
    const front = Math.round(backY + map.depthM * perMDepth);
    for (let Y = front; Y < H; Y++) put(X, Y, shade(EDGE, 1 - (0.4 * (Y - front)) / Math.max(1, H - front)));
    let minY = front;
    for (let z = map.depthM; z >= 0; z -= dz) {
      const l = map.levelAt(x, z);
      const y = Math.round(backY + z * perMDepth - l * LV);
      if (y >= minY) continue;
      const ladder = onLadder(x, z);
      const lad = ladder ? ladderColor(x, l) : null;
      // A jump of more than a few pixels is a face, from this top down to the ground in front.
      const face = minY - y > 3 && !ladder;
      for (let Y = y; Y < minY; Y++) {
        if (ladder) put(X, Y, lad ?? faceColor(x, TOWER.z1 - 0.01, 0.75));
        else if (face && Y > y) {
          const k = 0.95 - (0.3 * (Y - y)) / Math.max(1, minY - y);
          put(X, Y, faceColor(x, z, k, Y - y));
        } else put(X, Y, topColor(x, z, l));
      }
      minY = y;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Said on the art itself: this is a placeholder.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('ARTE PROVISIONAL · PRUEBA DE ALTURA', 16, H - 16);
  const ground = canvas.toDataURL('image/png');

  // The backdrop: a plain sky and a flat band of far hills, clearly a placeholder.
  const bd = document.createElement('canvas');
  bd.width = W;
  bd.height = backY + 40;
  const b = bd.getContext('2d')!;
  const sky = b.createLinearGradient(0, 0, 0, bd.height);
  sky.addColorStop(0, '#30425a');
  sky.addColorStop(1, '#7a8fa6');
  b.fillStyle = sky;
  b.fillRect(0, 0, W, bd.height);
  b.fillStyle = '#4b5d52';
  b.beginPath();
  b.moveTo(0, bd.height);
  for (let X = 0; X <= W; X += 24) b.lineTo(X, backY - 70 - 30 * Math.sin(X / 210) - 14 * Math.sin(X / 67));
  b.lineTo(W, bd.height);
  b.closePath();
  b.fill();
  b.fillStyle = 'rgba(255,255,255,0.5)';
  b.font = 'bold 16px monospace';
  b.fillText('PROVISIONAL', 16, 28);
  return { ground, backdrop: bd.toDataURL('image/png') };
}

/** The placeholder ground and backdrop of a map, painted once. */
export function placeholderArt(map: MapDef): { ground: string; backdrop: string } {
  if (!cache) cache = paint(map);
  return cache;
}
