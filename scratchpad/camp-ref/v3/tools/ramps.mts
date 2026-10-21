// Prints the skin ramps of the presets and some materials: tsx ramps.mts <root>
const root = process.argv[2];
const { makeRamp, mixHex } = await import(root + '/src/sprite/color.ts');
const { getAppearance } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
for (const i of [0, 1, 2]) {
  const p = LEGENDARY_PRESETS[i];
  const look = getAppearance(p.character);
  const r = [...makeRamp(look.skin, 'skin')];
  console.log(p.character.name, look.skin, 'hands:', JSON.stringify(look.slots.hands), 'top:', look.slots.top?.id, 'armor:', look.slots.armor?.id);
  console.log('  skin ramp', r.join(' '));
}
for (const h of ['#7f5a3c', '#5a3020', '#ece2c6']) console.log(h, [...makeRamp(h, 'leather')].join(' '));
void mixHex;
