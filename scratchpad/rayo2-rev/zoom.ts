// npx tsx zoom.ts out.png preset burst mode pose ticks tints scale [body]
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/data/shinobiData';
import { renderSpriteCached } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/compose';
import { dojutsuToEye, defaultAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/legacy';
import { GRID } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/raster';
import { renderChakra } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/chakra';
import { POSE_FPS, frameCount, rigPoseFor } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/src/sprite/rig';
import { writePng } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rayo-2-review/tools/world-sprites/kit';
const [outp, preset, burst, mode, pose, ticksS, tintsS, scaleS, body, bgS] = process.argv.slice(2);
const ch = preset === 'default' ? null : LEGENDARY_PRESETS.find((p: any) => p.character.id === preset)!.character;
const ticks = ticksS.split(',').map(Number);
const tints = tintsS.split(',').map((t) => (t === 'natural' ? undefined : t));
const k = Number(scaleS);
const bg = (bgS ?? '2a2f3a').match(/../g)!.map((h) => parseInt(h, 16));
const C = 112;
const W = C * k * ticks.length, H = C * k * tints.length;
const img = new Uint8Array(W * H * 4);
tints.forEach((tint, r) => ticks.forEach((t, ci) => {
  const look = ch ? JSON.parse(JSON.stringify(ch.appearance)) : defaultAppearance();
  if (body) look.body = body;
  if (process.env.STYLE) look.cast = { ...(look.cast ?? {}), style: process.env.STYLE };
  look.chakra = { ...look.chakra, color: burst, tint, onCharge: true, onCast: true, onVictory: true };
  const eye = ch ? dojutsuToEye(ch.dojutsu) : 'none';
  const n = frameCount(rigPoseFor(pose as any, look.cast?.style));
  const f = Math.floor((t * POSE_FPS[pose as keyof typeof POSE_FPS]) / 12) % n;
  const spr = renderSpriteCached(look, pose as any, f, eye);
  const fx = mode === 'none' ? null : renderChakra(burst as any, mode as any, t, spr.rgba, spr.rig, tint);
  const cx = Math.round(spr.rig.pelvis.x * 2), cy = Math.round(spr.rig.pelvis.y * 2);
  const x0 = cx - C / 2, y0 = cy - C / 2 - 12;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const s = ((y0 + y) * GRID + x0 + x) * 4;
    let px = [...bg];
    for (const b of fx ? [fx.back, spr.rgba, fx.front] : [spr.rgba]) {
      const a = b[s + 3] / 255; if (!a) continue;
      px = [b[s] * a + px[0] * (1 - a), b[s + 1] * a + px[1] * (1 - a), b[s + 2] * a + px[2] * (1 - a)];
    }
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const d = (((r * C + y) * k + dy) * W + (ci * C + x) * k + dx) * 4;
      img[d] = px[0]; img[d + 1] = px[1]; img[d + 2] = px[2]; img[d + 3] = 255;
    }
  }
}));
writePng(outp, W, H, img);
