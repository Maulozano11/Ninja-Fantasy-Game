// The legends whose chakra type changed, before and after, charging: one PNG per cell in <outdir>.
// npx tsx <this> <outdir>
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/data/missions';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/compose';
import { renderChakra } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/chakra';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/legacy';
import { GRID, BOX } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/raster';
import type { ChakraChoice, ChakraColorId } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/types';
import type { ShinobiCharacter } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/types/shinobi';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/tools/world-sprites/kit';

const byId = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const rows: [string, ShinobiCharacter, ChakraColorId][] = [
  ['kaien', byId('preset_storm'), 'violet'],
  ['ren', byId('preset_night'), 'blue'],
  ['hiro', byId('preset_sunburst'), 'orange'],
  ['raiga', byId('preset_warlord'), 'violet'],
  ['hana', HANA, 'green'],
  ['kenji', KENJI, 'violet'],
];
const k = 3;
const cw = 150, ch = 160, x0 = BOX.x - 10, y0 = BOX.y - 24;
function cell(c: ShinobiCharacter, chakra: ChakraChoice, tick: number, out: string) {
  const look = { ...c.appearance!, chakra };
  const spr = renderSprite(look, 'charge', 0, dojutsuToEye(c.dojutsu));
  const fx = renderChakra(chakra.color, 'charge', tick, spr.rgba, spr.rig, chakra.tint);
  const W = cw * k, H = ch * k;
  const img = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) img.set([40, 34, 30, 255], i * 4);
  for (const buf of [fx.back, spr.rgba, fx.front])
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = x0 + ((x / k) | 0), sy = y0 + ((y / k) | 0);
      if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) continue;
      const s = (sy * GRID + sx) * 4;
      const a = buf[s + 3] / 255;
      if (!a) continue;
      const d = (y * W + x) * 4;
      for (let q = 0; q < 3; q++) img[d + q] = Math.round(buf[s + q] * a + img[d + q] * (1 - a));
    }
  writePng(out, W, H, img);
}
const dir = process.argv[2];
for (const [name, c, old] of rows) {
  const now = c.appearance!.chakra;
  cell(c, { ...now, color: old, tint: undefined }, 6, `${dir}/${name}-antes.png`);
  cell(c, now, 6, `${dir}/${name}-ahora.png`);
}
