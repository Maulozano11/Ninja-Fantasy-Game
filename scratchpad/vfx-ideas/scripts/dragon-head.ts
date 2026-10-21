// The dragon head of his Great Annihilation (enhanced) on its own, made the way the generator
// makes it in annihilation_enh (tools/world-sprites/vfx-a-fire-s.ts), with the repo's own functions:
//   - burn loop: his s_breath jet churning (breathJet's displace), 6 phases (t = i/6);
//   - fade: his s_head burnt by burnOut() with the fade's own k (1 - dragon, fadeCurve), in the
//     frame coordinates his piece has in annihilation_enh, so the noise is the same.
// The rise and the sinking are moves (done by the mockup). Read-only on the repo. Run from the repo root:
//   npx tsx <scratch>/scripts/dragon-head.ts <outdir>
import { Canvas, writePng } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { refPiece, burnOut, displace } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-ref';
import { FIRE } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-fire-kit';
import { TAU, palette } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-lib';
import { fadeCurve, FADE_N, S_FRAME } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-fire-s';
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const { W, H, GY } = S_FRAME;
const SEED = 1900;
// (the same palette as SMOKE_HIS in vfx-a-fire-s.ts, which it does not export)
const SMOKE_HIS = palette('#24141a', '#3a1f22', '#472625', '#553f3d', '#7c4838', '#8a5e4b', '#a07a64');
const save = (name: string, c: Canvas, x0: number, y0: number, w: number, h: number) => {
  const crop = new Canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = c.get(x0 + x, y0 + y); if (p[3]) crop.set(x, y, p); }
  writePng(`${out}/${name}.png`, w, h, crop.px);
};
const head = refPiece('s_head'), jet = refPiece('s_breath');
const info: any = { head: { x: head.x, y: head.y, w: head.c.w, h: head.c.h }, jet: { x: jet.x, y: jet.y, w: jet.c.w, h: jet.c.h }, fadeK: [] };
// fade: the head in its annihilation_enh place, burnt as dragonLayers() burns it (without the sink)
const dragon = fadeCurve(1, [0.85, 0.62, 0.4, 0.2, 0.06, 0]);
for (let i = 0; i < FADE_N; i++) {
  const k = 1 - dragon[i];
  info.fadeK.push(k);
  const c = new Canvas(W, H);
  c.draw(head.c, head.x, head.y);
  const b = burnOut(c, k, SMOKE_HIS, FIRE[0], SEED + 118, GY - 520, 420, 30);
  save(`fade_${i}`, b, head.x, head.y, head.c.w, head.c.h);
}
// burn: his jet churning, as breathJet() moves it
for (let i = 0; i < 6; i++) {
  const ph = (i / 6) * TAU;
  const pc = jet;
  const moved = displace(pc.c, (x, y) => [Math.round(2 * Math.sin(y * 0.3 - ph * 2) + (x / pc.c.w) * 2 * Math.sin(ph + y * 0.1)), Math.round(2 * Math.sin(x * 0.2 - ph * 3) * (x / pc.c.w))]);
  writePng(`${out}/jet_${i}.png`, moved.w, moved.h, moved.px);
}
writePng(`${out}/head.png`, head.c.w, head.c.h, head.c.px);
writePng(`${out}/jet.png`, jet.c.w, jet.c.h, jet.c.px);
writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1));
console.log(JSON.stringify(info));
