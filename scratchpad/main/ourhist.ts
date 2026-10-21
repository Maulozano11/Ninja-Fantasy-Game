import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { rgbToHsl } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const [x0, y0, w, h] = process.argv.slice(2).map(Number);
const f = renderSprite(LEGENDARY_PRESETS[0].character.appearance!, 'idle', 0);
const bins = new Array(11).fill(0);
for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * 128 + x) * 4; if (!f.rgba[i + 3]) continue; const [, , l] = rgbToHsl(f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]); bins[Math.min(10, Math.floor(l * 20))]++; }
console.log(bins.map((n, k) => `${(k * 0.05).toFixed(2)}:${n}`).join(' '));
