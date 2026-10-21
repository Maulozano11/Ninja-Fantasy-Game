import { makeRamp } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
for (const [h, k] of [['#d4af37','metal'],['#d4af37','cloth'],['#b8913a','metal'],['#b8913a','cloth'],['#e2b04a','metal'],['#22304d','cloth'],['#2f6fd6','cloth']] as const) console.log(h, k, makeRamp(h, k as any).join(' '));
