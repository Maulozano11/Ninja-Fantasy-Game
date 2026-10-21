// Our Aiden (idle 0, full frame) and the rig joints, for lining him up with the owner's picture.
const root = '/home/user/Ninja-Fantasy-Game';
const { renderSprite } = await import(`${root}/src/sprite/compose.ts`);
const { LEGENDARY_PRESETS } = await import(`${root}/src/data/shinobiData.ts`);
const { getAppearance, dojutsuToEye } = await import(`${root}/src/sprite/legacy.ts`);
const { RES } = await import(`${root}/src/sprite/raster.ts`);
const { writeFileSync } = await import('node:fs');
const c = LEGENDARY_PRESETS.find((p: any) => p.character.name === 'Aiden').character;
const look = getAppearance(c);
const fr = renderSprite(look, 'idle', 0, dojutsuToEye(c.dojutsu));
writeFileSync(process.argv[2] + '/ours-idle.rgba', fr.rgba);
const r = fr.rig;
const j: Record<string, [number, number]> = {};
for (const k of ['head', 'neck', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'pelvis', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF']) j[k] = [(r as any)[k].x * RES, (r as any)[k].y * RES];
writeFileSync(process.argv[2] + '/ours-rig.json', JSON.stringify({ joints: j, look }, null, 1));
console.log(JSON.stringify(j));
