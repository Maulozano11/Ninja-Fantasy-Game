import { sFrame, sStates } from './ws/vfx-a-fire-s';
const st = sStates();
const want = (process.argv[3] ?? 'all');
const seq: [string, any][] = [
  ...st.surge.map((s, i) => [`surge${String(i).padStart(2, '0')}`, s] as [string, any]),
  ...st.burn.map((s, i) => [`burn${i}`, s] as [string, any]),
  ...st.fade.map((s, i) => [`fade${i}`, s] as [string, any]),
];
for (const [n, s] of seq) if (want === 'all' || want.split(',').includes(n)) sFrame(s).save(`${process.argv[2]}/${n}.png`);
console.log('done');
