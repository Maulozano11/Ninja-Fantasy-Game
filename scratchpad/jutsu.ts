import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
const rows = Object.values(JUTSU).map((j) => `${j.id}\t${j.rank}\t${j.shape}\t${j.special ?? ''}\t${j.save ? 'SAVE ' + j.save + (j.saveHalf ? ' half' : ' negates') : (j.special && !['seal','confuse'].includes(j.special) ? '-' : (j.dice ? 'ATTACK' : '-'))}\t${j.dice ?? ''}\t${j.dmgType ?? ''}\t${j.cast}`);
console.log(rows.join('\n'));
