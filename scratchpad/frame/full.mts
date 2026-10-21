// Whole frames of the poses that used to be cut, for a look at the new room.
const root = '/home/user/Ninja-Fantasy-Game';
const { renderSprite } = await import(`${root}/src/sprite/compose.ts`);
const { LEGENDARY_PRESETS } = await import(`${root}/src/data/shinobiData.ts`);
const { getAppearance, dojutsuToEye } = await import(`${root}/src/sprite/legacy.ts`);
const { writeFileSync } = await import('node:fs');
const out = process.argv[2];
const pick = (name: string) => LEGENDARY_PRESETS.find((p: any) => p.character.name === name).character;
const shots: [string, string, number][] = [['Aiden', 'victory', 0], ['Aiden', 'attack', 1], ['Ren Kuroba', 'crouch', 0], ['Raiga', 'attack', 1], ['Raiga', 'victory', 0], ['Solen', 'victory', 0]];
shots.forEach(([who, pose, f], i) => {
  const c = LEGENDARY_PRESETS.find((p: any) => p.character.name.startsWith(who)).character;
  writeFileSync(`${out}/full-${i}.rgba`, renderSprite(getAppearance(c), pose, f, dojutsuToEye(c.dojutsu)).rgba);
});
