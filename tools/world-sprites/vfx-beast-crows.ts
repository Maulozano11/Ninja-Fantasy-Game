// The genjutsu beast as the owner painted it: a swarm of crows. One sprite, 'genjutsu', in the group
// vfx_beasts_crows (for approval; it replaces the single illusion crow of vfx_beasts once approved).
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-beast-crows.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets. The frames are copied
// from his genjutsu sheet by tools/refs/crows-from-ref.py into vfx-beasts-ref-genjutsu.ts (palette +
// run-length rows), decoded here:
//
//   fly     6 frames, 12 fps, loop. Frame 0 is his left picture (crows circling the vortex), frame 4 his
//           right picture (the flock streaming right). 1-3 and 5 move his crows as cut-out pieces (whole
//           pixels; the two looking back mirrored to turn round) along loops round the swarm's centre,
//           out one way and back the other; they beat their wings with his own wing pixels flipped below
//           the shoulder or folded half way, in two flights that never beat as one. His vortex spins and
//           closes as the flock forms and opens again; his smoke trails in behind the flock and its tail
//           is left behind; his feathers drift back.
//   summon  6 frames, 12 fps, once: his vortex opens at the caster, spinning, and the crows come up out of
//           it (dark, with lit eyes, at first) and spiral out round it, ending on his left picture (fly 0).
//
// The anchor is the centre of the swarm's mass, the same point in both of his pictures. Facing right
// (the game mirrors it). To merge into vfx-beasts.ts: import crowSwarm() and use it for 'genjutsu'
// (see art2/beasts-crows-NOTES.md).

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, WorldSprite, hex, writeGroup } from './kit';
import * as REF_GENJUTSU from './vfx-beasts-ref-genjutsu';

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

/** The crow swarm (vfx_beasts/genjutsu): 'fly' (loop) and 'summon' (once), cropped to their union + 1 px. */
export function crowSwarm(): WorldSprite {
  const f = decode(REF_GENJUTSU);
  const anims: [string, Canvas[], number, boolean][] = [
    ['fly', f.fly, 12, true],
    ['summon', f.summon, 12, false],
  ];
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
  const [ax, ay] = REF_GENJUTSU.ANCHOR;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  return {
    name: 'genjutsu',
    label: 'Crow swarm (genjutsu)',
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

const GROUP = 'vfx_beasts_crows';

function main(): void {
  const root = process.env.WORLD_OUT;
  if (!root) {
    console.error('vfx-beast-crows: set WORLD_OUT=<dir> (this sprite is waiting for approval; it is never written into src/assets).');
    process.exit(1);
  }
  const sprite = crowSwarm();
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

if (process.argv[1] && /vfx-beast-crows\.ts$/.test(process.argv[1])) main();
