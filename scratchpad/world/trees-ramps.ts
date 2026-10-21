import { ramp, MATERIALS, mix, hex, toHex } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const show = (n: string, r: ReturnType<typeof ramp>) => console.log(n.padEnd(10), r.map(toHex).join(' '));
show('leaf', ramp(MATERIALS.leaf)); show('leafDeep', ramp(MATERIALS.leafDeep)); show('leafLight', ramp(MATERIALS.leafLight));
show('bark', ramp(MATERIALS.bark)); show('cedar', ramp(MATERIALS.barkCedar)); show('charred', ramp(MATERIALS.charred));
show('maple', ramp(toHex(mix(hex(MATERIALS.red), hex(MATERIALS.fire), 0.28)), { shift: 18 }));
show('fire', ramp(MATERIALS.fire)); show('wood', ramp(MATERIALS.wood)); show('moss', ramp(MATERIALS.moss));
