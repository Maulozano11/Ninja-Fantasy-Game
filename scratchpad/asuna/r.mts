// A female ninja in the Ribbon Cascade hair and the Seraph Paladin Plate, idle frame 0, for the owner to paint over.
const root = '/home/user/Ninja-Fantasy-Game';
const { renderSprite } = await import(`${root}/src/sprite/compose.ts`);
const { LEGENDARY_PRESETS } = await import(`${root}/src/data/shinobiData.ts`);
const { getAppearance } = await import(`${root}/src/sprite/legacy.ts`);
const { writeFileSync } = await import('node:fs');
const base = getAppearance(LEGENDARY_PRESETS[0].character);
const it = (id: string, ...colors: string[]) => ({ id, colors });
const slots: any = { ...base.slots, hair: it('hair_ribbon'), armor: it('armor_seraph'), top: it('top_longsleeve', '#ecebf2', '#cfcdd8'), bottom: it('bottom_shinobi', '#ecebf2', '#ecebf2') };
delete slots.held; delete slots.cape; delete slots.skirt; slots.feet = it('feet_leather', '#ecebf2', '#9a2a30');
const look = { ...base, accessories: [], eyeShape: 'bright', body: 'female', skin: '#f3c9a8', eyeColor: '#7a4a2a', slots };
writeFileSync(process.argv[2] + '/look.json', JSON.stringify(look, null, 1));
for (const [p, f] of [['idle', 0], ['attack', 1], ['cast', 0], ['victory', 0]] as const) writeFileSync(`${process.argv[2]}/${p}${f}.rgba`, renderSprite(look, p, f, 'normal').rgba);
console.log(JSON.stringify(slots));
