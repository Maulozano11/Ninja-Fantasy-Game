import { Mask, spiral, cbez } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-draw';
const mk = new Mask(48, 22);
mk.taper(spiral(23.6, 15.4, 4.4, 1.9, -Math.PI * 0.62, Math.PI * 1.15, 40), 2.2, 1.5);
let s = '';
for (let y = 0; y < 22; y++) { for (let x = 0; x < 48; x++) s += mk.get(x, y) ? '#' : '.'; s += '\n'; }
console.log(s);
