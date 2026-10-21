import { ramp, MATERIALS, toHex, Canvas, mix, hex } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const rows: [string, ReturnType<typeof ramp>][] = [
  ['canvas', ramp(MATERIALS.canvas)],
  ['canvas s6', ramp(MATERIALS.canvas, { shift: 6 })],
  ['canvas s8 sp1.2', ramp(MATERIALS.canvas, { shift: 8, spread: 1.2 })],
  ['canvas s4 sp1.3', ramp(MATERIALS.canvas, { shift: 4, spread: 1.3 })],
  ['iron', ramp(MATERIALS.iron)],
];
const c = new Canvas(6 * 10, rows.length * 10);
rows.forEach(([n, r], i) => {
  console.log(n.padEnd(18), r.map(toHex).join(' '));
  r.forEach((col, k) => c.fillRect(k * 10, i * 10, 10, 10, col));
});
c.scaled(4).save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/world/camp-ramps.png');
