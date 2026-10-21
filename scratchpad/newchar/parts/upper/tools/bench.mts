// bench.mts: time per render of a look with and without the coat.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/compose';

const look = (slots: object) => ({
  version: 1,
  body: 'male',
  skin: '#f6bb96',
  faceShape: 'valiant',
  eyeShape: 'valiant',
  eyeColor: '#d97706',
  slots,
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});
const cases: [string, object][] = [
  ['bare', {}],
  ['plate', { armor: { id: 'armor_crimson_plate', colors: [] } }],
  ['royal', { top: { id: 'top_royalcoat', colors: [] } }],
  ['scarlet', { top: { id: 'top_noble_shirt', colors: [] }, armor: { id: 'armor_scarlet_coat', colors: [] } }],
];
for (const [name, slots] of cases) {
  const poses = ['idle', 'walk', 'run', 'attack'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of poses) renderSprite(look(slots) as any, p as any, 0);
  const t0 = performance.now();
  let n = 0;
  for (let k = 0; k < 5; k++)
    for (const p of poses)
      for (let f = 0; f < 4; f++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderSprite(look(slots) as any, p as any, f);
        n++;
      }
  console.log(name, ((performance.now() - t0) / n).toFixed(1), 'ms/frame');
}
