// ad-hoc: bar_frame CSS repeat at the old (916x104) and new (920x112) image areas
import { Img } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-img';
import { allPieces } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-pieces';
import { nine } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-mockup';
const p = allPieces().find((q) => q.name === 'bar_frame')!;
const src = p.img.scaled(2), ins = p.slice!.map((v) => v * 2) as [number, number, number, number];
for (const [w, h] of [[916, 104], [920, 112], [912, 104], [918, 104]]) {
  const a = new Img(w, h), b = new Img(w, h);
  nine(a, src, ins, 0, 0, w, h); nine(b, src, ins, 0, 0, w, h, true);
  let diff = 0; for (let i = 0; i < a.px.length; i++) if (a.px[i] !== b.px[i]) diff++;
  console.log(w, h, 'differing bytes', diff, ((w - 48) % 8 === 0 && (h - 48) % 8 === 0) ? 'rule ok' : 'rule fails');
}
