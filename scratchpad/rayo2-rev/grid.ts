import { writeFileSync } from 'node:fs';
// Review renders: npx tsx grid.ts outDir
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/data/shinobiData';
import { renderSpriteCached as renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/compose';
import { dojutsuToEye, defaultAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/legacy';
import { GRID } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/raster';
import { CHAKRA_LOOP, renderChakra, sparkCount } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/chakra';
import { POSE_FPS, frameCount, rigPoseFor } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/rig';
import { writePng } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/tools/world-sprites/kit';

const out = process.argv[2];
const BODIES = ['male', 'female', 'bulky', 'slender'];
const POSES = ['idle', 'walk', 'run', 'attack', 'cast', 'hurt', 'victory', 'charge', 'sit', 'downed', 'crouch', 'lean', 'train', 'throw'];
const MODES = ['aura', 'charge', 'cast', 'victory'];
const aiden = LEGENDARY_PRESETS.find((p: any) => p.character.id === 'preset_reference_aiden')!.character;

function lookFor(body: string, base: 'aiden' | 'default', tint?: string) {
  const l = base === 'aiden' ? JSON.parse(JSON.stringify(aiden.appearance)) : defaultAppearance();
  l.body = body;
  l.chakra = { ...l.chakra, color: 'cyan', tint, onCharge: true, onCast: true, onVictory: true };
  return l;
}

// distance (chebyshev-ish BFS 8-neighbour) from each pixel to nearest opaque sprite pixel
function distField(rgba: Uint8ClampedArray): Int32Array {
  const d = new Int32Array(GRID * GRID).fill(1e9);
  const q: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3] > 0) { d[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; const x = i % GRID, y = (i - x) / GRID;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const nx = x + ox, ny = y + oy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      const j = ny * GRID + nx;
      if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); }
    }
  }
  return d;
}

const stats: any[] = [];
const C = 140; // crop size
const SC = 2;
for (const base of (process.argv[3] ?? 'aiden').split(',') as ('aiden'|'default')[]) {
  for (const mode of (process.argv[4] ?? MODES.join(',')).split(',')) {
    // sheet: rows = poses, cols = bodies; each cell shows sprite + union of all ticks' bolt pixels
    const cols = BODIES.length, rows = POSES.length;
    const W = cols * C * SC, H = rows * C * SC;
    const img = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) { img[i * 4] = 40; img[i * 4 + 1] = 46; img[i * 4 + 2] = 58; img[i * 4 + 3] = 255; }
    POSES.forEach((pose, r) => BODIES.forEach((body, cI) => {
      const look = lookFor(body, base);
      const eye = base === 'aiden' ? dojutsuToEye(aiden.dojutsu) : 'none';
      const n = frameCount(rigPoseFor(pose as any, look.cast?.style));
      const ref = renderSprite(look, pose as any, 0, eye);
      const cx = Math.round(ref.rig.pelvis.x * 2), cy = Math.round(ref.rig.pelvis.y * 2);
      const x0 = cx - C / 2, y0 = cy - C / 2 - 10;
      const union = new Uint8ClampedArray(GRID * GRID * 4);
      let maxD = 0, worst = -1, empty = 0, totalPx = 0;
      for (let t = 0; t < CHAKRA_LOOP; t++) {
        if (!sparkCount(mode as any, t)) { empty++; continue; }
        const f = Math.floor((t * POSE_FPS[pose]) / 12) % n;
        const spr = renderSprite(look, pose as any, f, eye);
        const fx = renderChakra('cyan', mode as any, t, spr.rgba, spr.rig, undefined);
        const df = distField(spr.rgba);
        let any = false;
        for (let i = 0; i < GRID * GRID; i++) for (const b of [fx.back, fx.front]) if (b[i * 4 + 3] > 0) {
          any = true; totalPx++;
          if (df[i] > maxD) { maxD = df[i]; worst = t; }
          if (b[i * 4 + 3] === 255 || union[i * 4 + 3] === 0) union.set(b.subarray(i * 4, i * 4 + 4), i * 4);
        }
        if (!any) empty++;
        if (t === 0) {
          // sprite from frame 0 as base
        }
      }
      stats.push({ base, mode, pose, body, maxD, worst, empty, totalPx });
      // draw: sprite frame 0 then union over it
      const spr = renderSprite(look, pose as any, 0, eye);
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
        const sx = x0 + x, sy = y0 + y;
        if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) continue;
        const s = (sy * GRID + sx) * 4;
        let px = [40, 46, 58];
        if (spr.rgba[s + 3]) px = [spr.rgba[s] * 0.6 + 40 * 0.4, spr.rgba[s + 1] * 0.6 + 46 * 0.4, spr.rgba[s + 2] * 0.6 + 58 * 0.4];
        if (union[s + 3]) { const a = union[s + 3] / 255; px = [union[s] * a + px[0] * (1 - a), union[s + 1] * a + px[1] * (1 - a), union[s + 2] * a + px[2] * (1 - a)]; }
        for (let dy = 0; dy < SC; dy++) for (let dx = 0; dx < SC; dx++) {
          const X = (cI * C + x) * SC + dx, Y = (r * C + y) * SC + dy;
          const d = (Y * W + X) * 4;
          img[d] = px[0]; img[d + 1] = px[1]; img[d + 2] = px[2];
        }
      }
    }));
    writePng(`${out}/union_${base}_${mode}.png`, W, H, img);
  }
}
import('node:fs').then((fs) => fs.writeFileSync(`${out}/stats_${process.argv[3]}_${process.argv[4]}.json`, JSON.stringify(stats)));
console.log('done');
