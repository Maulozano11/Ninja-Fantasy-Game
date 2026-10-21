import { KATANA_PARTS } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
import * as fs from 'node:fs';
const src = fs.readFileSync('/home/user/Ninja-Fantasy-Game/src/components/creator/words.ts', 'utf8');
// evaluate the ES object literal
const m = src.match(/const ES: Record<string, string> = (\{[\s\S]*?\n\});/);
const ES = eval('(' + m![1] + ')') as Record<string, string>;
for (const p of KATANA_PARTS) {
  console.log(p.label, '=>', ES[p.label] ?? 'MISSING');
  for (const o of p.options) {
    console.log('  label', JSON.stringify(o.label), '=>', ES[o.label] ?? '(none)');
    console.log('  desc ok?', ES[o.desc] !== undefined, ES[o.desc] === undefined ? JSON.stringify(o.desc) : '');
  }
}
