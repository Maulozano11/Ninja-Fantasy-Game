// RotSprite for the Python lifts (tools/refs/*.py): the repo's own rotateTemplate (src/sprite/rotsprite.ts),
// the way stampPiece turns a painted piece of the owner's. Reads {"rows": [...], "pivot": [x, y], "deg": n}
// as JSON on stdin and prints the turned pixels as JSON, [[dx, dy, ch], ...] from the pivot cell (deg in
// screen degrees, + clockwise, rounded to whole degrees as stampPiece has it).
//
//   echo '{"rows": ["ab", ".c"], "pivot": [0, 0], "deg": 2}' | npx tsx tools/refs/rotsprite.mts

import { rotateTemplate } from '../../src/sprite/rotsprite';

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  const { rows, pivot, deg } = JSON.parse(input) as { rows: string[]; pivot: [number, number]; deg: number };
  console.log(JSON.stringify(rotateTemplate({ rows, pivot }, deg).map((p) => [p.dx, p.dy, p.ch])));
});
