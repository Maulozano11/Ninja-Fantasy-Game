// Prints part names of opaque pixels in a box for one look: tsx px.mts <root> preset body pose frame x0 y0 x1 y1 [hands]
const [root, pi, body, pose, fr, x0, y0, x1, y1, hands] = process.argv.slice(2);
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { PARTS, GRID } = await import(root + '/src/sprite/raster.ts');
const p = LEGENDARY_PRESETS[+pi];
const base = getAppearance(p.character);
const look: any = { ...base, body, slots: { ...base.slots } };
if (hands === 'bare') delete look.slots.hands; else if (hands) look.slots.hands = { id: hands, colors: [] };
const r = renderSprite(look, pose, +fr, dojutsuToEye(p.character.dojutsu));
for (let y = +y0; y <= +y1; y++) {
  const row: string[] = [];
  for (let x = +x0; x <= +x1; x++) {
    const k = y * GRID + x;
    if (!r.rgba[k * 4 + 3]) { row.push('.'.padEnd(10)); continue; }
    const hex = [0, 1, 2].map((c) => r.rgba[k * 4 + c].toString(16).padStart(2, '0')).join('');
    row.push(((PARTS[r.part[k]] ?? '?').slice(0, 9)).padEnd(10));
  }
  console.log(String(y).padStart(3), row.join(''));
}
