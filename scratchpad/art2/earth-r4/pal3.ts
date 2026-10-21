import { EV3_REF } from '../../../../../../../home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata';
const name = process.argv[2];
const r = (EV3_REF as any)[name];
const seen = new Set<string>();
r.pal.forEach((p: any, i: number) => {
  const k = p.kind + p.rgba.slice(0, 7);
  if (p.kind === 'dust' && seen.has(k)) return;
  seen.add(k);
  const c = [1, 3, 5].map((o) => parseInt(p.rgba.slice(o, o + 2), 16));
  console.log(i + 1, p.kind, p.rgba, 'L', Math.round(0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]));
});
