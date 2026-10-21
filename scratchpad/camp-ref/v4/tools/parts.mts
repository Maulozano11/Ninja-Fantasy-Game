// tsx parts.mts <root> <preset> <body> <frame> x0 y0 x1 y1: the part letter of each pixel of the read pose
// (u upperArmN, f forearmN, h handN, F forearmF, H handF, U upperArmF, d head, t torso, . other, ' ' empty).
const [root, pi, body, fr, ...box] = process.argv.slice(2);
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { PARTS, GRID } = await import(root + '/src/sprite/raster.ts');
const p = LEGENDARY_PRESETS[+pi];
const look: any = { ...getAppearance(p.character), body };
const fr0 = renderSprite(look, 'read', +fr, dojutsuToEye(p.character.dojutsu));
const [x0, y0, x1, y1] = box.map(Number);
const L: Record<string, string> = { upperArmN: 'u', forearmN: 'f', handN: 'h', forearmF: 'F', handF: 'H', upperArmF: 'U', head: 'd', torso: 't', held: 'b' };
let hdr = '     ';
for (let x = x0; x < x1; x++) hdr += x % 10;
console.log(hdr);
for (let y = y0; y < y1; y++) {
  let row = String(y).padStart(4) + ' ';
  for (let x = x0; x < x1; x++) {
    const k = y * GRID + x;
    row += fr0.rgba[k * 4 + 3] ? L[PARTS[fr0.part[k]]] ?? '.' : ' ';
  }
  console.log(row);
}
