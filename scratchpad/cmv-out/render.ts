import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/src/data/shinobiData';
import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/src/sprite/compose';
import { GRID } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/src/sprite/raster';
import { writePng } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/tools/world-sprites/kit';
const look = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character.appearance!;
const f = renderSprite(look, 'idle', 0); // any SpritePose, frame
const k = 4, W = GRID * k, out = new Uint8Array(W * W * 4);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const s = (((y / k) | 0) * GRID + ((x / k) | 0)) * 4;
  out.set(f.rgba.subarray(s, s + 4), (y * W + x) * 4);
}
writePng(process.argv[2], W, W, out);
