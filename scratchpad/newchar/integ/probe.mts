// Which item paints a pixel: render the preset without each slot and print the pixel.
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/sprite/compose';
const c = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_scarlet')!.character;
const pts = process.argv.slice(2).map((s) => s.split(',').map(Number));
const hex = (a: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * 256 + x) * 4;
  return a[i + 3] ? '#' + [a[i], a[i + 1], a[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('') : '----';
};
const full = renderSprite(c.appearance!, 'idle', 0).rgba;
console.log('full   ', pts.map(([x, y]) => hex(full, x, y)).join(' '));
for (const slot of Object.keys(c.appearance!.slots)) {
  const slots = { ...c.appearance!.slots } as any;
  delete slots[slot];
  const f = renderSprite({ ...c.appearance!, slots }, 'idle', 0).rgba;
  console.log(('-' + slot).padEnd(7), pts.map(([x, y]) => hex(f, x, y)).join(' '));
}
