// npx tsx poses.mts <outdir> <lookJson> <tag>: every pose (frames listed) on every body, the head cropped
// (30 x 26 fine px round the head joint), written as <outdir>/<tag>-<body>-<pose>-<frame>.png, and a list.
import { writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/src/sprite/raster';
import type { BodyType, SpriteAppearance, SpritePose } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/src/sprite/types';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/tools/world-sprites/kit';

const [out, json, tag] = process.argv.slice(2);
const base: SpriteAppearance = {
  version: 1, body: 'female', skin: '#fdceb0', eyeShape: 'keen', eyeColor: '#4eb570', slots: {}, accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [],
  ...(json ? JSON.parse(json) : {}),
};
const POSES: [SpritePose, number][] = [
  ['idle', 0], ['attack', 0], ['attack', 1], ['attack', 2], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 0], ['handsigns', 0],
  ['walk', 0], ['run', 0], ['crouch', 0], ['sneak', 0], ['downed', 0], ['downed', 1], ['sit', 0], ['read', 0], ['lean', 0], ['train', 0],
];
const BODIES: BodyType[] = ['female', 'male', 'bulky', 'slender'];
const W = 30, H = 26;
const list: string[] = [];
for (const body of BODIES) {
  for (const [pose, frame] of POSES) {
    const f = renderSprite({ ...base, body }, pose, frame);
    const hx = Math.round(f.rig.head.x * RES), hy = Math.round(f.rig.head.y * RES);
    const x0 = hx - 15, y0 = hy - 14;
    const o = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = x0 + x, sy = y0 + y;
      if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) continue;
      const s = (sy * GRID + sx) * 4;
      o.set(f.rgba.subarray(s, s + 4), (y * W + x) * 4);
    }
    const name = `${tag}-${body}-${pose}-${frame}.png`;
    writePng(`${out}/${name}`, W, H, o);
    list.push(name);
  }
}
writeFileSync(`${out}/${tag}-list.json`, JSON.stringify(list));
