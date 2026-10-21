// The fire beast as the owner painted it in the BEAST panel of his fire set sheet: a standalone
// generator that writes ONE group, vfx_beasts_phoenix, with ONE sprite, 'fire' (fly, dive, attack).
// The frames come from tools/refs/phoenix-fire-from-ref.py, which copies his picture (fly frame 0)
// and cuts the wing beat, the dive and the attack from his own pixels; they are decoded here from
// vfx-beasts-ref-fire2.ts, so the build needs no image files.
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-beast-phoenix.ts
//
// buildPhoenix() is exported so the sprite can later join the vfx_beasts group.

import { pathToFileURL } from 'node:url';
import { Canvas, WorldSprite, hex, writeGroup } from './kit';
import * as REF from './vfx-beasts-ref-fire2';

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

/** Several animations sharing one frame: crops all of them to their union (+1 px) around the anchor. */
function sharedFrame(anims: [string, Canvas[], number, boolean][], ax: number, ay: number): { anchor: [number, number]; anims: WorldSprite['anims'] } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, frames] of anims)
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
  const crop = (f: Canvas): Canvas => {
    const c = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    c.draw(f, -x0, -y0);
    return c;
  };
  const out: WorldSprite['anims'] = {};
  for (const [key, frames, fps, loop] of anims) out[key] = { frames: frames.map(crop), fps, loop };
  return { anchor: [Math.round(ax - x0), Math.round(ay - y0)], anims: out };
}

/** The owner's fire-set phoenix: fly (8 frames), dive (5, loop) and attack (6, once), all at 10 fps. */
export function buildPhoenix(): WorldSprite {
  const f = refFrames(REF);
  const { anchor, anims } = sharedFrame(
    [
      ['fly', f.fly, 10, true],
      ['dive', f.dive, 10, true],
      ['attack', f.attack, 10, false],
    ],
    ...REF.ANCHOR,
  );
  return { name: 'fire', label: 'Phoenix (fire)', meters: [2.0, 1.7], anchor, tags: ['vfx'], anims };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.WORLD_OUT) {
    console.error('Set WORLD_OUT to the staging folder (this generator never writes into src/assets).');
    process.exit(1);
  }
  const s = buildPhoenix();
  writeGroup('vfx_beasts_phoenix', [s]);
  const f = s.anims.fly.frames[0];
  console.log(`fire  frame ${f.w}x${f.h} anchor ${s.anchor} ` + Object.entries(s.anims).map(([k, a]) => `${k} ${a.frames.length}@${a.fps}`).join(', '));
}
