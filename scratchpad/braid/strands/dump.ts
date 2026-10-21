// Dumps a region of the rendered sprite as characters: hair shades 0-5, '.' empty, other colors as letters.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/compose';
import { MaterialTable } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/raster';
import { hexToRgb } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/color';
const pose = process.env.POSE || 'idle', frame = Number(process.env.FR || 0), body = process.env.BODY || 'female';
const look = { version: 1, body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: { hair: { id: 'hair_charlotte', colors: ['#f2cb52'] }, top: { id: 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } }, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, pixelEdits: [] } as any;
(globalThis as any).__braidV = JSON.parse(process.env.BV || '{}');
const f = renderSprite(look, pose as any, frame);
const mats = new MaterialTable();
const ramp = mats.ramps[mats.get('#f2cb52', 'hair')].map(hexToRgb);
const x0 = Math.round(f.rig.head.x * 2) + Number(process.argv[2] || -14), y0 = Math.round(f.rig.head.y * 2) + Number(process.argv[3] || -6);
const w = Number(process.argv[4] || 20), h = Number(process.argv[5] || 44);
const other = new Map<string, string>();
for (let y = y0; y < y0 + h; y++) {
  let row = '';
  for (let x = x0; x < x0 + w; x++) {
    const i = (y * 128 + x) * 4;
    if (!f.rgba[i + 3]) { row += '.'; continue; }
    const c = [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]];
    const k = ramp.findIndex((r) => r[0] === c[0] && r[1] === c[1] && r[2] === c[2]);
    if (k >= 0) { row += String(k); continue; }
    const key = c.join(',');
    if (!other.has(key)) other.set(key, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[other.size % 52]);
    row += other.get(key);
  }
  console.log(String(y - y0).padStart(2) + ' ' + row);
}
