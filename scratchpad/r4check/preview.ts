// Preview: writes selected pieces at screen scale (2x) into the preview folder given as argv[2].
import { allPieces } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-pieces';
import { savePng } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-img';
const out = process.argv[2];
const want = new Set(process.argv.slice(3));
for (const p of allPieces()) if (want.has(p.name)) savePng(`${out}/${p.name}.png`, p.img.scaled(2));
