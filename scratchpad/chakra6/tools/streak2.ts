import { pnoise } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-b-lib';
for (let row = 5; row <= 13; row += 0.5) {
  const v: number[] = [];
  for (let x = 0; x < 16; x += 0.125) v.push(pnoise(x, row, 3, 16, 70));
  const mx = Math.max(...v), mn = Math.min(...v);
  console.log('row', row, 'share@0.6', (v.filter((a) => a > 0.6).length / v.length).toFixed(2), 'max', mx.toFixed(3), 'min', mn.toFixed(3));
}
