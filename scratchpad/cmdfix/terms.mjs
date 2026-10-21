// Count lines matching each term (case-insensitive) in src, without src/assets.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const root = process.argv[2];
const src = join(root, 'src');
const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (p === join(src, 'assets')) continue;
    if (statSync(p).isDirectory()) walk(p); else files.push(p);
  }
})(src);
const terms = [
  ['sharingan'], ['byakugan'], ['mangekyo'], ['kamui'], ['amaterasu'], ['susanoo'],
  ['rasengan'], ['rasenshuriken'], ['chidori'], ['raikiri'], ['kirin'],
  ['hokage'], ['akatsuki'], ['konoha'], ['kage', '\\bkage\\b'],
  ['eight gates', 'eight[ _-]?gates'], ['shadow clone', 'shadow[ _-]?clone'], ['kawarimi'],
  ['shunshin'], ['body flicker', 'body[ _-]?flicker'],
  ['goukakyu'], ['suiryuudan'], ['doryuudan'], ['doryuheki'], ['suijinheki'], ['mikazuki'],
  ['uchiha'], ['hyuga'], ['senju'], ['uzumaki'], ['taki', '\\btaki(\\b|_)'],
  ['names', '\\b(naruto|sasuke|kakashi|itachi|madara|hashirama|tobirama|hinata|neji|gaara|jiraiya|tsunade|orochimaru|minato|obito|shisui|kushina|nagato|kisame|deidara)\\b'],
  ['naruto', '\\bnaruto\\b'],
  ['tomoe/pinwheel/pale eyes', 'tomoe|pinwheel|pale[ _-]?eyes?'], ['sage eyes', 'sage[ _-]?eyes?'],
  ['kurama/tailed beast', 'kurama|tailed[ _-]?beasts?'],
  ['chunin', 'chu+nin'], ['genin'], ['jonin', 'jo+u?nin'], ['anbu', '\\banbu\\b'], ['tenketsu'],
];
const text = files.map((f) => [relative(root, f), readFileSync(f, 'utf8').split('\n')]);
for (const [name, pat] of terms) {
  const re = new RegExp(pat ?? name, 'i');
  let total = 0; const per = {};
  for (const [f, lines] of text) {
    const n = lines.filter((l) => re.test(l)).length;
    if (n) { total += n; per[f] = n; }
  }
  const top = Object.entries(per).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f.replace(/^src\//, '')} ${n}`).join(', ');
  console.log(`${name}: ${total} | ${top}`);
}
