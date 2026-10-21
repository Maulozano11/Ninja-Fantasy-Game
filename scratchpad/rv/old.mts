const R = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-review';
const { LEGENDARY_PRESETS, DEFAULT_CHARACTER, CLANS_DATA } = await import(R + '/src/data/shinobiData.ts');
const { natureOf, migrateCharacter } = await import(R + '/src/rules/ninja.ts');
const { chakraNature, CHAKRA_TYPES, withNature, BURST_NATURE } = await import(R + '/src/sprite/chakraNature.ts');
const { randomAppearance } = await import(R + '/src/sprite/random.ts');
const { getAppearance } = await import(R + '/src/sprite/legacy.ts');
const { chakraHex } = await import(R + '/src/sprite/chakraInfo.ts');
const m = new Map<string,string>();
(globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) };
const saves = await import(R + '/src/game/saves.ts');
// 1. old saved legends (their pre-branch chakra)
const OLD: Record<string, any> = { preset_storm: { color: 'violet' }, preset_sunburst: { color: 'orange' }, preset_warlord: { color: 'violet' }, preset_night: { color: 'blue' } };
for (const p of LEGENDARY_PRESETS) {
  const c = JSON.parse(JSON.stringify(p.character));
  if (OLD[c.id]) c.appearance.chakra = { ...c.appearance.chakra, ...OLD[c.id] }, delete c.appearance.chakra.tint;
  delete c.sheetVersion; // an older sheet
  m.set('shinobi5e.hero.v1', JSON.stringify(c));
  const h = saves.loadHero();
  const same = JSON.stringify(h.appearance) === JSON.stringify(c.appearance);
  console.log('saved', c.id, 'nature', natureOf(h), 'lookSame', same, 'presetNow', natureOf(p.character));
}
// 2. legacy (no appearance) + clan change
const { appearance: _a, ...rest } = DEFAULT_CHARACTER;
const leg = migrateCharacter({ ...rest, palette: { ...rest.palette, chakraAuraColor: '#06b6d4' } });
console.log('legacy has appearance?', !!leg.appearance, 'nature', natureOf(leg));
for (const [id, info] of Object.entries<any>(CLANS_DATA)) {
  const after = { ...leg, clan: id, palette: { ...leg.palette, chakraAuraColor: info.recommendedChakraColor } };
  console.log('  after clan change to', id, info.recommendedChakraColor, '->', natureOf(after), getAppearance(after).chakra.color);
}
// 3. random
const count: Record<string, number> = {};
let bad = 0;
for (let i = 0; i < 5000; i++) { const a = randomAppearance(); const n = chakraNature(a.chakra); count[n] = (count[n] ?? 0) + 1; if (!Object.hasOwn(BURST_NATURE, a.chakra.color)) bad++; }
console.log('random natures', count, 'bad', bad);
