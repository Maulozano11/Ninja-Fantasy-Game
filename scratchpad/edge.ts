import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const base = LEGENDARY_PRESETS[0].character.appearance!;
const cases: [string, string, number, any][] = [
  ['male', 'crouch', 0, {}], ['male', 'crouch', 0, { blade: 'b' }], ['bulky', 'run', 0, {}], ['female', 'train', 5, {}], ['male', 'idle', 0, {}],
];
for (const [body, pose, f, parts] of cases) {
  const look = { ...base, body, slots: { ...base.slots, held: { id: 'held_katana', colors: [], parts } } } as any;
  const fr = renderSprite(look, pose as any, f);
  // print the region near the edge the sword touches
  let minX = GRID, maxX = -1, minY = GRID, maxY = -1;
  const filled = (x: number, y: number) => fr.rgba[(y * GRID + x) * 4 + 3] > 0;
  const edges = { left: 0, right: 0, top: 0, bottom: 0 };
  for (let i = 0; i < GRID; i++) { if (filled(0, i)) edges.left++; if (filled(GRID - 1, i)) edges.right++; if (filled(i, 0)) edges.top++; if (filled(i, GRID - 1)) edges.bottom++; }
  console.log(body, pose, f, JSON.stringify(parts), 'edge pixels', JSON.stringify(edges));
  if (pose === 'crouch' || pose === 'train') {
    for (let y = 70; y < 100; y++) {
      let s = '';
      for (let x = 100; x < GRID; x++) {
        const i = (y * GRID + x) * 4;
        if (fr.rgba[i + 3] === 0) s += '.';
        else { const l = fr.rgba[i] + fr.rgba[i+1] + fr.rgba[i+2]; s += l < 60 ? '#' : l > 600 ? 'W' : 'o'; }
      }
      if (s.replace(/\./g, '')) console.log(String(y).padStart(3), s + '|');
    }
  }
}
