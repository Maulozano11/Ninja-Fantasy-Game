import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/compose';
import { renderChakra, CHAKRA_LOOP } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/chakra';
import { dojutsuToEye, getAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/legacy';
import { frameCount, POSE_FPS, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/rig';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/raster';
import { TICK_FPS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/ticker';
import { writeFileSync } from 'node:fs';
const ids = ['preset_reference_aiden', 'preset_founder'];
const modes: [string, any][] = [['charge', 'charge'], ['cast', 'cast'], ['victory', 'victory'], ['idle', 'aura']];
for (const id of ids) {
  const c = LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
  const look: any = { ...getAppearance(c), chakra: { ...getAppearance(c).chakra, color: 'brown', tint: undefined, onCharge: true, onCast: true, onVictory: true } };
  const eye = dojutsuToEye(c.dojutsu);
  for (const [stance, mode] of modes) {
    for (let tick = 0; tick < 48; tick++) {
      const n = frameCount(rigPoseFor(stance as any, look.cast?.style));
      const frame = Math.floor((tick * POSE_FPS[stance as keyof typeof POSE_FPS]) / TICK_FPS) % n;
      const spr = renderSprite(look, stance as any, frame, eye);
      const fx = renderChakra('brown' as any, mode, tick % CHAKRA_LOOP, spr.rgba, spr.rig, undefined);
      const out = new Uint8Array(GRID * GRID * 4);
      const over = (src: Uint8ClampedArray) => { for (let i = 0; i < out.length; i += 4) { const a = src[i + 3] / 255; if (!a) continue; for (let k = 0; k < 3; k++) out[i + k] = Math.round(src[i + k] * a + out[i + k] * (1 - a)); out[i + 3] = Math.max(out[i + 3], src[i + 3]); } };
      over(fx.back); over(spr.rgba); over(fx.front);
      writeFileSync('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/tierra-gif/frames/' + id + '-' + stance + '-' + String(tick).padStart(2, '0') + '.raw', out);
    }
  }
}
console.log('ok', GRID);
