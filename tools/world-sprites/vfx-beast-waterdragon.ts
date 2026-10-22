// The water beast as the owner painted it in the BEAST panel of his water set sheet: his four-legged
// water drake with fins. A standalone generator that writes ONE group, vfx_beasts_waterdragon, with
// ONE sprite, 'water' (fly: 8 frames at 10 fps, looping, facing right; the game mirrors it).
// The frames come from tools/refs/waterdragon-from-ref.py: his striding picture is frame 0, his
// leaping picture is frame 5, and the frames between swing his legs, sway his tail and fins and
// drift his spray. They are decoded here from vfx-beasts-ref-water2.ts, so the build needs no images.
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-beast-waterdragon.ts
//   SOLID_OUTLINE=1 adds the characters' dark outline around his drake's body, not his spray
//   (solid-outline.ts; a proposal, off by default so the sheet stays the approved one).
//
// buildWaterDragon() is exported so the sprite can later join the vfx_beasts group.

import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Canvas, WorldSprite, hex, writeGroup } from './kit';
import * as REF from './vfx-beasts-ref-water2';
import { solidOutlineFrames, solidOutlineRequested } from './solid-outline';

interface RefSheet {
  SIZE: [number, number];
  ANCHOR: [number, number];
  ALPHABET: string;
  PALETTE: string[];
  FRAMES: Record<string, string[][]>;
}

/** Decodes a frame set copied from a reference sheet: run-length rows of palette symbols. */
function refFrames(ref: RefSheet): Record<string, Canvas[]> {
  const pal = ref.PALETTE.map((c) => hex(c.slice(0, 7), parseInt(c.slice(7, 9), 16)));
  const out: Record<string, Canvas[]> = {};
  for (const [anim, list] of Object.entries(ref.FRAMES)) {
    out[anim] = list.map((rows) => {
      const c = new Canvas(ref.SIZE[0], ref.SIZE[1]);
      rows.forEach((row, y) => {
        let x = 0;
        for (const m of row.matchAll(/(\D)(\d*)/g)) {
          const i = ref.ALPHABET.indexOf(m[1]);
          const n = m[2] ? Number(m[2]) : 1;
          if (i > 0) for (let k = 0; k < n; k++) c.set(x + k, y, pal[i]);
          x += n;
        }
      });
      return c;
    });
  }
  return out;
}

/** Crops all frames to their union with a 1 px clear border, so no frame touches the edge. */
function cropToUnion(frames: Canvas[], ax: number, ay: number): { frames: Canvas[]; anchor: [number, number] } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of frames) {
    const b = f.bounds();
    if (!b) continue;
    x0 = Math.min(x0, b[0]);
    y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, b[2]);
    y1 = Math.max(y1, b[3]);
  }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const out = frames.map((f) => {
    const c = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    c.draw(f, -x0, -y0);
    return c;
  });
  return { frames: out, anchor: [Math.round(ax - x0), Math.round(ay - y0)] };
}

/**
 * The owner's water drake: fly, 8 frames at 10 fps, looping. With `outline` each frame gets the
 * characters' dark line outside his drake's body (his droplets keep none), before the crop, so the
 * frame keeps its clear border.
 */
export function buildWaterDragon({ outline = solidOutlineRequested() }: { outline?: boolean } = {}): WorldSprite {
  let fly = refFrames(REF).fly;
  if (outline) {
    const lined = solidOutlineFrames(fly);
    fly = fly.map((f, i) => new Canvas(f.w, f.h, lined[i]));
  }
  const { frames, anchor } = cropToUnion(fly, ...REF.ANCHOR);
  return { name: 'water', label: 'Water dragon', meters: [3.0, 1.6], anchor, tags: ['vfx'], anims: { fly: { frames, fps: 10, loop: true } } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.env.WORLD_OUT;
  if (!root) {
    console.error('Set WORLD_OUT to the staging folder (this generator never writes into src/assets).');
    process.exit(1);
  }
  const group = 'vfx_beasts_waterdragon';
  const s = buildWaterDragon();
  // Written whole: the group goes to a temp folder first, then each file is renamed into place.
  const tmp = join(root, `.${group}.part`);
  rmSync(tmp, { recursive: true, force: true });
  writeGroup(group, [s], tmp);
  mkdirSync(join(root, group), { recursive: true });
  for (const file of [`${s.name}.png`, 'manifest.json']) renameSync(join(tmp, group, file), join(root, group, file));
  rmSync(tmp, { recursive: true, force: true });
  const f = s.anims.fly.frames[0];
  console.log(`water  frame ${f.w}x${f.h} anchor ${s.anchor} fly ${s.anims.fly.frames.length}@${s.anims.fly.fps}`);
}
