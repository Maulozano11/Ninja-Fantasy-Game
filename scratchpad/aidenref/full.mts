// Aiden with every finished part of the owner's picture (integration worktree), poses for a look.
const root = process.argv[2];
const out = process.argv[3];
const { renderSprite } = await import(`${root}/src/sprite/compose.ts`);
const { LEGENDARY_PRESETS } = await import(`${root}/src/data/shinobiData.ts`);
const { getAppearance, dojutsuToEye } = await import(`${root}/src/sprite/legacy.ts`);
const { writeFileSync } = await import('node:fs');
const c = LEGENDARY_PRESETS.find((p: any) => p.character.name === 'Aiden').character;
const base = getAppearance(c);
const extra = JSON.parse(process.argv[4] ?? '{}');
const look = { ...base, skin: '#f6bb96', faceShape: 'valiant', eyeShape: 'valiant', eyeColor: '#d81b2a', ...extra.look, slots: { ...base.slots, hair: { id: 'hair_valiant', colors: [] }, armor: { id: 'armor_crimson_plate', colors: [] }, cape: { id: 'cape_crimson', colors: [] }, held: { id: 'held_flame_sword', colors: [] }, ...extra.slots } };
writeFileSync(`${out}/look.json`, JSON.stringify(look, null, 1));
const poses: [string, number][] = [['idle', 0], ['attack', 0], ['attack', 1], ['attack', 2], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 0], ['walk', 2], ['run', 1], ['crouch', 0], ['handsigns', 0], ['sit', 0], ['downed', 0]];
for (const [p, f] of poses) writeFileSync(`${out}/${p}${f}.rgba`, renderSprite(look, p, f, extra.eye ?? dojutsuToEye(c.dojutsu)).rgba);
