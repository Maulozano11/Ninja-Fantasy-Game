import { pnoise } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-b-lib';
for (let i = 0; i < 8; i++) {
  const t = i / 8;
  const v: number[] = [];
  for (let x = 0; x < 16; x += 0.125) v.push(pnoise(x, t * 16, 3, 16, 70));
  const share = v.filter((a) => a > 0.6).length / v.length;
  v.sort((a, b) => b - a);
  console.log('idle', i, 't', t, 'share@0.6', share.toFixed(2), 'cut15', v[Math.floor(0.15 * v.length)].toFixed(3), 'cut40', v[Math.floor(0.4 * v.length)].toFixed(3));
}
for (let r = 1; r < 12; r++) {
  const t = (r - 1) / 12;
  const v: number[] = [];
  for (let x = 0; x < 16; x += 0.125) v.push(pnoise(x, t * 16, 3, 16, 70));
  console.log('rise', r, 'share@0.6', (v.filter((a) => a > 0.6).length / v.length).toFixed(2));
}
