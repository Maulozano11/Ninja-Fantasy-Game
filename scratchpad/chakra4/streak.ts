import { pnoise } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-b-lib';
const cov = (t: number, thr: number) => { let n = 0, N = 0; for (let x = 0; x < 16; x += 0.125) { N++; if (pnoise(x, t * 16, 3, 16, 70) > thr) n++; } return n / N; };
const q = (t: number, share: number) => { const v: number[] = []; for (let x = 0; x < 16; x += 0.125) v.push(pnoise(x, t * 16, 3, 16, 70)); v.sort((a, b) => b - a); return v[Math.floor(share * v.length)]; };
for (const t of [0, 1/12, 2/12, 3/12, 4/12, 5/12, 6/12, 7/12, 8/12, 9/12, 10/12, 11/12, 1/8, 3/8, 5/8, 7/8]) console.log(t.toFixed(3), (cov(t, 0.6) * 100).toFixed(0) + '%', 'q15', q(t, 0.15).toFixed(3));
