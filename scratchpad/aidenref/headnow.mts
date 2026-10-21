// Aiden with the owner's head shape and hair (integration worktree), next to his picture.
const root = process.argv[2];
const { renderSprite } = await import(`${root}/src/sprite/compose.ts`);
const { LEGENDARY_PRESETS } = await import(`${root}/src/data/shinobiData.ts`);
const { getAppearance, dojutsuToEye } = await import(`${root}/src/sprite/legacy.ts`);
const { writeFileSync } = await import('node:fs');
const c = LEGENDARY_PRESETS.find((p: any) => p.character.name === 'Aiden').character;
const base = getAppearance(c);
const look = { ...base, skin: '#f6bb96', faceShape: 'valiant', slots: { ...base.slots, hair: { id: 'hair_valiant', colors: [] } } };
writeFileSync(process.argv[3] + '/head-now.rgba', renderSprite(look, 'idle', 0, dojutsuToEye(c.dojutsu)).rgba);
writeFileSync(process.argv[3] + '/head-before.rgba', renderSprite(base, 'idle', 0, dojutsuToEye(c.dojutsu)).rgba);
