const root = process.argv[2];
const { getAppearance } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
LEGENDARY_PRESETS.slice(0, 3).forEach((p: any) => {
  const l = getAppearance(p.character);
  console.log(p.name, l.body, l.slots.held?.id, l.slots.hands?.id, l.slots.armor?.id, l.cast?.style, l.stowed);
});
