import { ramp, MATERIALS, toHex, Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const names = Object.keys(MATERIALS) as (keyof typeof MATERIALS)[];
const c = new Canvas(6 * 10, names.length * 10);
names.forEach((n, i) => {
  const r = ramp(MATERIALS[n]);
  console.log(n.padEnd(10), r.map(toHex).join(' '));
  r.forEach((col, k) => c.fillRect(k * 10, i * 10, 10, 10, col));
});
c.scaled(4).save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/world/landmarks-ramps.png');
