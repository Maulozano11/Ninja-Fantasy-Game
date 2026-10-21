// Aiden's cast pose as the battle draws it: with the chakra burst (onCast) when it is on.
const S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/vfx-ideas/snap/src';
const { LEGENDARY_PRESETS } = await import(S + '/data/shinobiData');
const { renderSprite } = await import(S + '/sprite/compose');
const { dojutsuToEye } = await import(S + '/sprite/legacy');
const { GRID } = await import(S + '/sprite/raster');
const { renderChakra, CHAKRA_LOOP } = await import(S + '/sprite/chakra');
const { writePng } = await import('/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit');
const c = LEGENDARY_PRESETS.find((p: any) => p.character.id === 'preset_reference_aiden')!.character;
const look = { ...c.appearance!, stowed: true };
console.log('chakra', JSON.stringify(look.chakra), 'loop', CHAKRA_LOOP);
const ticks = [0, 3, 6, 9];
const k = 2, W = GRID * k;
const out = new Uint8Array(W * ticks.length * W * 4);
ticks.forEach((tick, n) => {
  const spr = renderSprite(look, 'cast', 1, dojutsuToEye(c.dojutsu));
  const fx = renderChakra(look.chakra.color, 'cast', tick, spr.rgba, spr.rig, look.chakra.tint);
  const comp = new Uint8ClampedArray(GRID * GRID * 4);
  const over = (src: Uint8ClampedArray) => { for (let i = 0; i < GRID * GRID; i++) { const a = src[i*4+3] / 255; if (!a) continue; for (let ch = 0; ch < 3; ch++) comp[i*4+ch] = src[i*4+ch] * a + comp[i*4+ch] * (1 - a); comp[i*4+3] = Math.max(comp[i*4+3], src[i*4+3]); } };
  for (let i = 0; i < GRID * GRID; i++) { comp[i*4] = 60; comp[i*4+1] = 120; comp[i*4+2] = 70; comp[i*4+3] = 255; }
  over(fx.back); over(spr.rgba); over(fx.front);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const s = (((y / k) | 0) * GRID + ((x / k) | 0)) * 4;
    out.set(comp.subarray(s, s + 4), (y * W * ticks.length + n * W + x) * 4);
  }
});
writePng(process.argv[2], W * ticks.length, W, out);
