// Builds variants.json from a text file: blocks separated by '---'; each block has
// sections 'top:', 'tile:', 'end:' followed by rows.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');
const out = src.split(/^---\s*$/m).map((blk) => {
  const art: any = { top: [], tile: [], end: [] };
  let cur = 'tile';
  for (const raw of blk.split('\n')) {
    const l = raw.trim();
    if (!l) continue;
    const m = l.match(/^(top|tile|end):$/);
    if (m) { cur = m[1]; continue; }
    art[cur].push(l);
  }
  return art;
}).filter((a) => a.tile.length);
writeFileSync(process.argv[3], JSON.stringify(out));
console.log(out.length, 'variants');
