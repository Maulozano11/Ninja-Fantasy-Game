// npx tsx preview.ts <outDir> name1 name2 ... : writes <outDir>/<name>.png at screen scale (2x art)
import { join } from 'node:path';
import { allPieces } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-pieces';
import { savePng } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-img';
const [out, ...names] = process.argv.slice(2);
for (const p of allPieces()) if (!names.length || names.includes(p.name)) savePng(join(out, `${p.name}.png`), p.img.scaled(2));
