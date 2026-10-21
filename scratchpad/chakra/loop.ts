import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { renderChakra, CHAKRA_COLORS, CHAKRA_LOOP } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakra';
import { baseLook } from '../tools/sheet';
const eq = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.length === b.length && a.every((v, i) => v === b[i]);
let bad = 0; let worst = 0;
for (const body of ['male', 'female', 'bulky'] as const)
for (const mode of ['aura', 'charge', 'cast', 'victory'] as const) {
  const pose = mode === 'aura' ? 'idle' : mode;
  const f = renderSprite(baseLook({ body }), pose, 0);
  for (const c of CHAKRA_COLORS) {
    const a = renderChakra(c.id, mode, 3, f.rgba, f.rig);
    const b = renderChakra(c.id, mode, 3 + CHAKRA_LOOP, f.rgba, f.rig);
    const d = renderChakra(c.id, mode, 3 - CHAKRA_LOOP * 2, f.rgba, f.rig);
    if (!eq(a.back, b.back) || !eq(a.front, b.front) || !eq(a.back, d.back)) { bad++; console.log('mismatch', body, mode, c.id); }
    const t0 = performance.now(); for (let k = 0; k < 24; k++) renderChakra(c.id, mode, k, f.rgba, f.rig); const ms = (performance.now() - t0) / 24;
    if (ms > worst) { worst = ms; console.log('slowest so far', body, mode, c.id, ms.toFixed(1) + 'ms'); }
    // loop seam smoothness: tick 23 -> 0 should differ like any other step (just sanity: both non-empty)
  }
}
console.log('mismatches', bad, 'worst avg ms', worst.toFixed(1));
