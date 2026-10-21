const root = process.argv[2];
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { getAppearance } = await import(root + '/src/sprite/legacy.ts');
for (const i of [0, 1, 2, 3]) {
  const p = LEGENDARY_PRESETS[i];
  if (!p) continue;
  const a = getAppearance(p.character);
  console.log(i, p.name, a.skin, a.body, JSON.stringify(a.slots));
}
