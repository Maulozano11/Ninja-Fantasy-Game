import { characterRef, ramp, MATERIALS, toHex, mix, hex } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const c = characterRef();
console.log('bounds', c.bounds());
for (let y = 112; y < 124; y++) { let row = ''; for (let x = 40; x < 90; x++) row += c.alpha(x, y) ? '#' : '.'; console.log(y, row); }
for (const k of ['leaf','leafDeep','leafLight','bark','barkCedar','charred','moss','wood','fire'] as const) console.log(k, ramp(MATERIALS[k]).map(toHex).join(' '));
console.log('maple', ramp(toHex(mix(hex(MATERIALS.red), hex(MATERIALS.fire), 0.28)), { shift: 18 }).map(toHex).join(' '));
console.log('charred.8', ramp(MATERIALS.charred, { spread: 0.8 }).map(toHex).join(' '));
