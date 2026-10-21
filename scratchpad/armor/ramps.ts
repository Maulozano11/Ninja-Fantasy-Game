import { makeRamp } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
for (const [h, k] of [['#aeb7c2','metal'],['#b3202a','cloth'],['#6b4226','leather'],['#d4a531','metal'],['#3b3d4b','metal'],['#c08a3e','metal'],['#d9dde4','cloth']] as const) console.log(h, k, makeRamp(h, k as any).join(' '));
