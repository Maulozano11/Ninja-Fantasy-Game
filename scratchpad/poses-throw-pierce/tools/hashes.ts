// Hashes every frame of every existing pose for a set of looks: run before and after the change
// and compare (the other poses must stay pixel-identical).
//   npx tsx hashes.ts <out.json>
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1/src/sprite/compose';
import { defaultAppearance, getAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1/src/sprite/legacy';
import { frameCount, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1/src/sprite/rig';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1/src/data/shinobiData';
import type { CastStyle, SpriteAppearance, SpritePose } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1/src/sprite/types';

const POSES: SpritePose[] = ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'lean', 'sit', 'read', 'train'];
const looks: [string, SpriteAppearance][] = [];
for (const p of LEGENDARY_PRESETS) looks.push([p.name, getAppearance(p.character)]);
for (const body of ['male', 'female', 'bulky', 'slender'] as const)
  for (const held of [undefined, 'held_katana', 'held_naginata', 'held_kunai', 'held_ice_crystal']) {
    const l = defaultAppearance();
    l.body = body;
    if (held) l.slots.held = { id: held, colors: [] };
    looks.push([`${body}/${held ?? 'none'}`, l]);
  }
const castStyles: CastStyle[] = ['signs', 'runes', 'book', 'script', 'sphere', 'lightning', 'wave', 'flash', 'eye'];
const out: Record<string, string> = {};
for (const [name, look] of looks) {
  for (const pose of POSES) {
    const styles = pose === 'cast' && name.startsWith('male/') ? castStyles : [look.cast?.style ?? 'runes'];
    for (const st of styles) {
      const l = { ...look, cast: { style: st } };
      const n = frameCount(rigPoseFor(pose, st, l.stowed ? undefined : l.slots.held?.id));
      for (let f = 0; f < n; f++) {
        const s = renderSprite(l, pose, f);
        out[`${name}|${pose}|${st}|${f}`] = createHash('md5').update(s.rgba).digest('hex');
      }
    }
  }
  // stowed variants
  const st = { ...look, stowed: true };
  for (const pose of ['idle', 'attack', 'run'] as SpritePose[]) {
    const n = frameCount(rigPoseFor(pose, 'runes', undefined));
    for (let f = 0; f < n; f++) out[`${name}|stowed|${pose}|${f}`] = createHash('md5').update(renderSprite(st, pose, f).rgba).digest('hex');
  }
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 0));
console.log('hashed', Object.keys(out).length, 'frames');
