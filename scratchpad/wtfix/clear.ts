// Release clearance: for each body and weapon, the release frame with the weapon where it is first
// drawn in flight (and, faint, where the fist let go of it). npx tsx clear.ts out.png
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/compose';
import { throwRelease } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/grip';
import { defaultAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/raster';
import { THROW_RELEASE_FRAME } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/rig';
import { releaseClear, releaseStart, renderThrown, thrownItem } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/thrown';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/data/shinobiData';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/tools/world-sprites/kit';
import type { BodyType, SpriteAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/types';

const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
const HELD = [undefined, 'held_katana', 'held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_kunai', 'held_naginata', 'held_spiral'];
const looks: { name: string; look: SpriteAppearance }[] = [];
for (const body of BODIES)
  for (const held of HELD) {
    const l = defaultAppearance();
    l.body = body;
    if (held) l.slots.held = { id: held, colors: [] };
    else delete l.slots.held;
    looks.push({ name: `${body} ${held ?? 'none'}`, look: l });
  }
for (const id of ['preset_reference_aiden', 'preset_founder']) looks.push({ name: id, look: LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character.appearance! });

const CW = 200, CH = 140, X0 = 40, Y0 = 70, K = 2;
const cols = 8;
const rows = Math.ceil(looks.length / cols);
const W = cols * CW * K, H = rows * CH * K;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < out.length; i += 4) { out[i] = 40; out[i + 1] = 90; out[i + 2] = 50; out[i + 3] = 255; }
const put = (cx: number, cy: number, x: number, y: number, r: number, g: number, b: number, a = 1) => {
  if (x < 0 || y < 0 || x >= CW || y >= CH) return;
  for (let dy = 0; dy < K; dy++) for (let dx = 0; dx < K; dx++) {
    const o = (((cy * CH + y) * K + dy) * W + (cx * CW + x) * K + dx) * 4;
    out[o] = out[o] * (1 - a) + r * a; out[o + 1] = out[o + 1] * (1 - a) + g * a; out[o + 2] = out[o + 2] * (1 - a) + b * a;
  }
};
looks.forEach(({ name, look }, n) => {
  const cx = n % cols, cy = Math.floor(n / cols);
  const rel = throwRelease(look.body, thrownItem(look));
  const fig = renderSprite(look, 'throw', THROW_RELEASE_FRAME).rgba;
  const th = renderThrown(look, rel.weaponAngle);
  const t0 = performance.now();
  const s = releaseClear(fig, th, rel.lastHeld, rel.weaponAngle);
  const ms = performance.now() - t0;
  const st = releaseStart(rel.lastHeld, rel.weaponAngle, s);
  console.log(name, 'clear', s, 'ms', ms.toFixed(1));
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = (y * GRID + x) * 4;
    if (fig[i + 3]) put(cx, cy, x - X0, y - Y0, fig[i], fig[i + 1], fig[i + 2]);
  }
  const draw = (p: { x: number; y: number }, a: number) => {
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const i = (y * GRID + x) * 4;
      if (th.rgba[i + 3]) put(cx, cy, x - th.grip.x + Math.floor(p.x) - X0, y - th.grip.y + Math.floor(p.y) - Y0, th.rgba[i], th.rgba[i + 1], th.rgba[i + 2], a);
    }
  };
  draw(rel.lastHeld, 0.25);
  draw(st, 1);
});
writePng(process.argv[2], W, H, out);
