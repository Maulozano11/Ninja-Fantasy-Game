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
//           pixels; the two looking back mirrored to turn round as they set off), at most 25 px a frame
//           (R1's swoop back to L1's place: 31): out round the swarm's centre into the flock, then back
//           round the reopening vortex (four flock crows head for his left picture's places, two sink
//           toward its eye behind its swirl). A crow only comes into or goes out of sight behind the vortex. Away from the
//           flock, a flock crow he painted half hidden is flown by the whole crow of his left picture, so
//           no cut edge shows. They beat their wings with his own raised wings (the near wing turned about
//           the shoulder by 30 and 60 degrees, the far wing sunk behind the body), in two flights that never
//           beat as one. His vortex spins and closes as the flock forms and opens again over two frames
//           (turned and scaled in polar space; the parts his crows hid are filled by his own vortex turned
//           rigidly about its eye, so his spiral arms run on through them); his smoke trails in behind the
//           flock and its tail is left behind; his feathers drift back. Only the swarm's outer edge is soft: the ground never
//           shows through his art. No frame flashes: the converter fails the build if a frame's light,
//           mean luma or the vortex's lit violet jumps from its neighbour's or his picture's. Colours: a
//           palette sampled from his pixels in brightness bands and chroma tiers, so his crows keep their
//           blue-violet sheen (the build fails if fly 0 / 4 have 20 % more or fewer saturated pixels than his).
//   summon  6 frames, 12 fps, once (our proposal: he painted only the fly frames): his vortex opens at the
//           caster (0.6 size, then a step bigger each frame), spinning, and the crows come up out of it
//           head first (beak and red eye past its rim, body still behind its swirl, a little dark at
//           first), each on its own side, and rise round it, ending on his left picture (fly 0).
//
// The anchor is the centre of the swarm's mass, the same point in both of his pictures. Facing right
// (the renderer mirrors it when the swarm flies left). To merge into vfx-beasts.ts: import { crowSwarm }
// from './vfx-beast-crows' and put it in BUILDERS in place of illusionCrow (['genjutsu', crowSwarm]).
//
// The characters' black line goes round the crows (solid-outline.ts, the owner's decision of 2026-10-22;
// SOLID_OUTLINE=0 leaves it off); his loose feathers and wisps are too small to get one.

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, WorldSprite, hex, writeGroup } from './kit';
import * as REF_GENJUTSU from './vfx-beasts-ref-genjutsu';
import { outlineSprite, solidOutlineOn, type SolidOutlineOptions } from './solid-outline';

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

/** The line's options for this beast. */
export const CROWS_LINE: SolidOutlineOptions = {};

/** The crow swarm (vfx_beasts/genjutsu): 'fly' (loop) and 'summon' (once), cropped to their union + 1 px. */
export function crowSwarm({ outline = solidOutlineOn() }: { outline?: boolean } = {}): WorldSprite {
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
  const s: WorldSprite = {
    name: 'genjutsu',
    label: 'Crow swarm (genjutsu)',
    meters: [Math.round((w / 57) * 10) / 10, Math.round((h / 57) * 10) / 10],
    anchor: [ax - x0, ay - y0],
    tags: ['vfx'],
    anims: out,
  };
  return outline ? outlineSprite(s, CROWS_LINE) : s;
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
  // The border check is on his art; the line may then take the clear pixel round it.
  const art = crowSwarm({ outline: false });
  checkBorders(art);
  const sprite = solidOutlineOn() ? outlineSprite(art, CROWS_LINE) : art;
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
