import { writeFileSync } from 'fs';
import { buildKatana, NATURES, KatanaChoice } from './katanas';
const out = process.argv[2];
const base: KatanaChoice = { steel: 'a', blade: 'a', guard: 'a', hilt: 'a' };
const variants: Record<string, KatanaChoice> = {};
for (const p of ['a', 'b', 'c'] as const) {
  variants[`steel-${p}`] = { ...base, steel: p };
  variants[`blade-${p}`] = { ...base, blade: p };
  variants[`guard-${p}`] = { ...base, guard: p };
  variants[`hilt-${p}`] = { ...base, hilt: p };
}
for (const [n, c] of Object.entries(NATURES)) variants[`nature-${n}`] = { ...base, steel: 'c', nature: c };
variants['combo-fire'] = { steel: 'c', nature: NATURES.fire, blade: 'c', guard: 'b', hilt: 'a' };
variants['combo-sun'] = { steel: 'b', blade: 'a', guard: 'c', hilt: 'c' };
variants['combo-crow'] = { steel: 'a', blade: 'b', guard: 'a', hilt: 'b' };
const res: Record<string, unknown> = {};
for (const [n, c] of Object.entries(variants)) res[n] = buildKatana(c);
writeFileSync(`${out}/variants.json`, JSON.stringify(res));
console.log(Object.keys(res).length);
