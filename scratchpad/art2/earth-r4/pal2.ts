import { EV3_REF } from '../../../../../../../home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata';
for (const [n, r] of Object.entries(EV3_REF)) {
  const kinds: Record<string, number> = {};
  for (const p of (r as any).pal) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
  const dust = (r as any).pal.filter((p: any) => p.kind === 'dust');
  const alphas = [...new Set(dust.map((p: any) => p.rgba.slice(7, 9)))];
  console.log(n, (r as any).w, (r as any).h, (r as any).anchor, JSON.stringify(kinds), 'dust alphas', alphas.join(','), 'pieces', Object.keys((r as any).pieces).join(','));
}
