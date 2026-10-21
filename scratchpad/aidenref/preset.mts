// Aiden exactly as his preset wears him, in every pose of the sheet, from a source tree.
const [root, out] = process.argv.slice(2);
const { renderSprite } = await import(`${root}/src/sprite/compose.ts`);
const { LEGENDARY_PRESETS } = await import(`${root}/src/data/shinobiData.ts`);
const { getAppearance, dojutsuToEye } = await import(`${root}/src/sprite/legacy.ts`);
const { writeFileSync, mkdirSync } = await import('node:fs');
mkdirSync(out, { recursive: true });
const c = LEGENDARY_PRESETS.find((p: any) => p.character.name === 'Aiden').character;
const look = getAppearance(c);
const poses: [string, number][] = [['idle', 0], ['attack', 0], ['attack', 1], ['attack', 2], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 0], ['walk', 2], ['run', 1], ['crouch', 0], ['handsigns', 0], ['sit', 0], ['downed', 0]];
for (const [p, f] of poses) writeFileSync(`${out}/${p}${f}.rgba`, renderSprite(look, p, f, dojutsuToEye(c.dojutsu)).rgba);
console.log(JSON.stringify(look.slots));
