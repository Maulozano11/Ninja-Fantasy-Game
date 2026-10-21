// npx tsx hash.ts <worktree> <out.json>
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const W = process.argv[2];
const out = process.argv[3];
const { renderSprite } = require(W + '/src/sprite/compose');
const { defaultAppearance, getAppearance } = require(W + '/src/sprite/legacy');
const { frameCount, rigPoseFor } = require(W + '/src/sprite/rig');
const { LEGENDARY_PRESETS } = require(W + '/src/data/shinobiData');
const poses = ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'lean', 'sit', 'read', 'train'];
const looks: [string, any][] = [];
for (const b of ['male', 'female', 'bulky', 'slender']) for (const h of [null, 'held_katana', 'held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_kunai', 'held_naginata', 'held_spiral', 'held_lightning', 'held_palm']) {
  const l = defaultAppearance(); l.body = b; if (h) l.slots.held = { id: h, colors: [] }; looks.push([`${b}-${h}`, l]);
}
{ const l = defaultAppearance(); l.slots.held = { id: 'held_crystal', colors: [] }; l.stowed = true; looks.push(['stowed', l]); }
for (const p of LEGENDARY_PRESETS) looks.push([p.name, getAppearance(p.character)]);
for (const s of ['signs','runes','book','sphere','lightning','wave','flash','eye','script']) { const l = defaultAppearance(); l.cast = { ...(l.cast||{}), style: s }; looks.push(['cast-'+s, l]); }
const H: Record<string, string> = {};
for (const [k, look] of looks) for (const pose of poses) {
  let n: number; try { n = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id)); } catch { continue; }
  for (let f = 0; f < n; f++) { const s = renderSprite(look, pose, f); H[`${k}|${pose}|${f}`] = createHash('md5').update(s.rgba).digest('hex'); }
}
writeFileSync(out, JSON.stringify(H));
console.log(Object.keys(H).length);
