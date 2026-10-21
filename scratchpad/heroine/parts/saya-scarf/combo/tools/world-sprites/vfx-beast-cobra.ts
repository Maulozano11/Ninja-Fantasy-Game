// The poison beast as the owner repainted it: a rearing hooded cobra, scaled green-and-yellow coils
// on the ground, the hood and head raised, the jaws open on two fangs, venom dripping, wreathed in
// purple venom mist. One sprite, 'poison', in the group vfx_beasts_cobra (for approval; it replaces
// the venom cobra of vfx_beasts once approved).
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-beast-cobra.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets. The frames are copied
// from his poison sheet by tools/refs/cobra-from-ref.py into vfx-beasts-ref-poison.ts (palette +
// run-length rows), decoded here:
//
//   fly     8 frames, 10 fps, loop. Frame 0 is his LEFT picture and frame 5 his RIGHT picture, his
//           pixels one to one: his mist over the coil where he painted it (the two-lobed puff at the
//           neck base), his head's warm accents (rosy-amber eye, crimson jaws, ochre hood spot) on
//           colours of their own hue. 1-4 (left to right, a fifth of the way each) and 6-7 (back, a
//           third each): the coils slither (his coil pixels carried along a spine that moves evenly
//           from one of his shapes to the other, in whole stretches of the nearer picture, so his
//           lattice and yellow saddles stay whole); his tail tip is a rigid piece of his own pixels
//           turned whole over the top from his curled LEFT tip to his long RIGHT point and back, at an
//           even speed, so it keeps his thin taper on every frame, and the tail end bends smoothly into
//           it (the least added curvature: no kink or wave at the joint); his head piece moves whole by whole
//           pixels (draws back, strikes, recoils) and changes over to his other head inside the recoil
//           (3 -> 4) and as it sways back (5 -> 6), the drops a frame apart; his mist blobs shrink out
//           and grow in (his great cloud over the hump behind the coil's rim, easing out on the
//           return), and how much mist shows goes on an even ramp between his two pictures. No frame
//           flashes: the converter fails the build if a frame's light (alpha x luma) or opaque mass is
//           more than 6 % off its neighbour's, if the tail tip is wider than his or turns back within a
//           half of the loop, or if the tail end kinks at the tip's joint.
//
// The anchor is the centre of the body's mass, the same point in both of his pictures. Facing right
// (the renderer mirrors it when the cobra flies left). To merge into vfx-beasts.ts: import
// { cobraFromRef } from './vfx-beast-cobra' and put it in BUILDERS in place of venomCobra
// (['poison', cobraFromRef]); the old procedural venomCobra can then go.

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, WorldSprite, hex, writeGroup } from './kit';
import * as REF_POISON from './vfx-beasts-ref-poison';

interface RefSheet {
  SIZE: [number, number];
  ANCHOR: [number, number];
  ALPHABET: string;
  PALETTE: string[];
  FRAMES: Record<string, string[][]>;
}

/** Decodes frames copied from a reference sheet: run-length rows of palette symbols. */
function decode(ref: RefSheet): Record<string, Canvas[]> {
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
          if (i < 0) throw new Error(`row ${y} of ${anim}: symbol ${m[1]} is not in the alphabet`);
          if (i > 0) for (let k = 0; k < n; k++) c.set(x + k, y, pal[i]);
          x += n;
        }
        if (x !== ref.SIZE[0]) throw new Error(`row ${y} of ${anim} is ${x} px wide, not ${ref.SIZE[0]}`);
      });
      return c;
    });
  }
  return out;
}

/** The venom cobra (vfx_beasts/poison): 'fly' (loop), cropped to the union of its frames + 1 px. */
export function cobraFromRef(): WorldSprite {
  const f = decode(REF_POISON);
  const anims: [string, Canvas[], number, boolean][] = [['fly', f.fly, REF_POISON.FPS, true]];
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
  const [ax, ay] = REF_POISON.ANCHOR;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  return {
    name: 'poison',
    label: 'Venom cobra (poison)',
    meters: [Math.round((w / 57) * 10) / 10, Math.round((h / 57) * 10) / 10],
    anchor: [ax - x0, ay - y0],
    tags: ['vfx'],
    anims: out,
  };
}

/** No opaque pixel may touch a frame's border (the renderer would show a hard edge). */
function checkBorders(s: WorldSprite): void {
  for (const [key, a] of Object.entries(s.anims))
    a.frames.forEach((c, i) => {
      for (let x = 0; x < c.w; x++) if (c.alpha(x, 0) || c.alpha(x, c.h - 1)) throw new Error(`${s.name} ${key} ${i}: opaque pixel on the top/bottom border`);
      for (let y = 0; y < c.h; y++) if (c.alpha(0, y) || c.alpha(c.w - 1, y)) throw new Error(`${s.name} ${key} ${i}: opaque pixel on the left/right border`);
    });
}

const GROUP = 'vfx_beasts_cobra';

function main(): void {
  const root = process.env.WORLD_OUT;
  if (!root) {
    console.error('vfx-beast-cobra: set WORLD_OUT=<dir> (this sprite is waiting for approval; it is never written into src/assets).');
    process.exit(1);
  }
  const sprite = cobraFromRef();
  checkBorders(sprite);
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

if (process.argv[1] && /vfx-beast-cobra\.ts$/.test(process.argv[1])) main();
