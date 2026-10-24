// The chakra beast as the owner painted it: a winged griffin of blue chakra (eagle head and wings, lion
// body, gold beak, crest, trims and talons). One sprite, 'chakra', in the group vfx_beasts_griffin (for
// approval; it replaces the chakra fox of vfx_beasts once approved).
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-beast-griffin.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets. The frames are copied from the
// BEAST panel of his chakra sheet by tools/refs/griffin-from-ref.py into vfx-beasts-ref-chakra.ts (palette
// + run-length rows), decoded here:
//
//   fly   8 frames, 10 fps, loop, facing right (the renderer mirrors it). Frame 0 is his one picture (wings
//         raised), pixel for pixel at the game scale (his pale claw tips kept unrimmed). 1-7 are a wing beat
//         derived from it: his two wings (the near one in front of the body, the far one behind it) are cut
//         along his back line and swung down and back up about their roots as cut-out pieces of his own
//         wings (eased in from the root so they bend there; the near wing's tips lag by about the same
//         amount through each stroke, so the tip never rushes; the far wing pivots at the top of its rounded
//         gold-trimmed base and follows the near one a little less far, its outer half flexing up so its
//         leading edge keeps rising to his pointed tip and never lies flat; a little shorter at the bottom
//         of the beat, where they come toward us), sampled through a Scale2x x3 copy so his feather lines
//         stay crisp. The body rises 1 px every other frame (0, 0, -1, -1, -2, -2, -1, -1), his tail sways
//         in a wave from the root with its tuft lifting and dropping out of the near wing's way, his ribbon
//         of chakra under the talons ripples, his light streak off the hind foot flows, his cyan wisps are
//         carried (never turned) with the wing tips they trail from and fade out while the tips are down,
//         and his other specks stream back as cross-fading copies (a fading one stays one soft stroke). No
//         frame flashes (the converter checks the light of every frame, and the light outside the griffin,
//         against its neighbours).
//
// The anchor is the middle of his griffin's torso. To merge into vfx-beasts.ts: import { chakraGriffin }
// from './vfx-beast-griffin' and put it in BUILDERS in place of chakraFox (['chakra', chakraGriffin]).
//
// The characters' black line goes round the griffin (solid-outline.ts, the owner's decision of
// 2026-10-22; SOLID_OUTLINE=0 leaves it off), never round his light: the splash and streak at its feet,
// the wisps and specks are his semi-transparent colours.

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, WorldSprite, hex, writeGroup } from './kit';
import * as REF_CHAKRA from './vfx-beasts-ref-chakra';
import { lightOf, outlineSprite, solidOutlineOn, type SolidOutlineOptions } from './solid-outline';

interface RefSheet {
  SIZE: [number, number];
  ANCHOR: [number, number];
  ALPHABET: string;
  PALETTE: string[];
  FRAMES: Record<string, string[][]>;
}

/** The fly loop's speed: 8 frames at 10 fps, one slow wing beat in 0.8 s. */
export const GRIFFIN_FPS = 10;

/** Decodes frames copied from a reference sheet: run-length rows of palette symbols. */
function decode(ref: RefSheet): Record<string, Canvas[]> {
  const pal = ref.PALETTE.map((c) => hex(c.slice(0, 7), parseInt(c.slice(7, 9), 16)));
  const out: Record<string, Canvas[]> = {};
  for (const [anim, list] of Object.entries(ref.FRAMES)) {
    out[anim] = list.map((rows, i) => {
      if (rows.length !== ref.SIZE[1]) throw new Error(`${anim} ${i} has ${rows.length} rows, not ${ref.SIZE[1]}`);
      const c = new Canvas(ref.SIZE[0], ref.SIZE[1]);
      rows.forEach((row, y) => {
        let x = 0;
        for (const m of row.matchAll(/(\D)(\d*)/g)) {
          const k = ref.ALPHABET.indexOf(m[1]);
          const n = m[2] ? Number(m[2]) : 1;
          if (k < 0 || k >= pal.length) throw new Error(`${anim} ${i} row ${y}: unknown symbol ${m[1]}`);
          if (k > 0) for (let j = 0; j < n; j++) c.set(x + j, y, pal[k]);
          x += n;
        }
        if (x !== ref.SIZE[0]) throw new Error(`row ${y} of ${anim} ${i} is ${x} px wide, not ${ref.SIZE[0]}`);
      });
      return c;
    });
  }
  return out;
}

/** The line's options for this beast. */
export const GRIFFIN_LINE: SolidOutlineOptions = { particleColour: lightOf(REF_CHAKRA.PALETTE) };

/** The chakra griffin (vfx_beasts/chakra): 'fly' (loop), cropped to the union of its frames + 1 px. */
export function chakraGriffin({ outline = solidOutlineOn() }: { outline?: boolean } = {}): WorldSprite {
  const f = decode(REF_CHAKRA);
  const anims: [string, Canvas[], number, boolean][] = [['fly', f.fly, GRIFFIN_FPS, true]];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, frames] of anims)
    for (const c of frames) {
      const b = c.bounds();
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
  const crop = (c: Canvas): Canvas => {
    const o = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    o.draw(c, -x0, -y0);
    return o;
  };
  const out: WorldSprite['anims'] = {};
  for (const [key, frames, fps, loop] of anims) out[key] = { frames: frames.map(crop), fps, loop };
  const [ax, ay] = REF_CHAKRA.ANCHOR;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const s: WorldSprite = {
    name: 'chakra',
    label: 'Chakra griffin',
    meters: [Math.round((w / 57) * 10) / 10, Math.round((h / 57) * 10) / 10],
    anchor: [ax - x0, ay - y0],
    tags: ['vfx'],
    anims: out,
  };
  return outline ? outlineSprite(s, GRIFFIN_LINE) : s;
}

/** No opaque pixel may touch a frame's border (the renderer would show a hard edge). */
function checkBorders(s: WorldSprite): void {
  for (const [key, a] of Object.entries(s.anims))
    a.frames.forEach((c, i) => {
      for (let x = 0; x < c.w; x++) if (c.alpha(x, 0) || c.alpha(x, c.h - 1)) throw new Error(`${s.name} ${key} ${i}: opaque pixel on the top/bottom border`);
      for (let y = 0; y < c.h; y++) if (c.alpha(0, y) || c.alpha(c.w - 1, y)) throw new Error(`${s.name} ${key} ${i}: opaque pixel on the left/right border`);
    });
}

const GROUP = 'vfx_beasts_griffin';

function main(): void {
  const root = process.env.WORLD_OUT;
  if (!root) {
    console.error('vfx-beast-griffin: set WORLD_OUT=<dir> (this sprite is waiting for approval; it is never written into src/assets).');
    process.exit(1);
  }
  // The border check is on his art; the line may then take the clear pixel round it.
  const art = chakraGriffin({ outline: false });
  checkBorders(art);
  const sprite = solidOutlineOn() ? outlineSprite(art, GRIFFIN_LINE) : art;
  for (const [key, a] of Object.entries(sprite.anims)) {
    const rowW = a.frames.length * a.frames[0].w;
    if (rowW >= 8192) throw new Error(`${key}: the sheet row would be ${rowW} px wide (8192 at most)`);
  }
  // Each file is written whole: the group goes to a temp folder first and is then renamed into place.
  const tmp = join(root, `.${GROUP}.part`);
  rmSync(tmp, { recursive: true, force: true });
  writeGroup(GROUP, [sprite], tmp);
  const dest = join(root, GROUP);
  mkdirSync(dest, { recursive: true });
  for (const file of [`${sprite.name}.png`, 'manifest.json']) {
    const part = join(dest, `${file}.part`);
    writeFileSync(part, readFileSync(join(tmp, GROUP, file)));
    renameSync(part, join(dest, file));
  }
  rmSync(tmp, { recursive: true, force: true });
  const fly = sprite.anims.fly.frames[0];
  console.log(`${GROUP}/${sprite.name}: frame ${fly.w}x${fly.h}, anchor ${sprite.anchor}, meters ${sprite.meters}, ` + Object.entries(sprite.anims).map(([k, a]) => `${k} ${a.frames.length}@${a.fps}${a.loop ? ' loop' : ' once'}`).join(', '));
}

if (process.argv[1] && /vfx-beast-griffin\.ts$/.test(process.argv[1])) main();
