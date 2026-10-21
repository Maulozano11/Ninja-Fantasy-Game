// Renders a list of jobs to raw RGBA files: argv[2] = worktree root, argv[3] = jobs JSON, argv[4] = out dir.
// Each job: { name, look (overrides on Aiden's appearance; slots merged), pose, frame, special }.
const root = process.argv[2];
const { renderSprite } = await import(`${root}/src/sprite/compose.ts`);
const { LEGENDARY_PRESETS } = await import(`${root}/src/data/shinobiData.ts`);
const { getAppearance } = await import(`${root}/src/sprite/legacy.ts`);
const { readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
const jobs = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const out = process.argv[4];
mkdirSync(out, { recursive: true });
const c = LEGENDARY_PRESETS.find((p: any) => p.character.name === 'Aiden').character;
const base = getAppearance(c);
const { RES } = await import(`${root}/src/sprite/raster.ts`);
const heads: Record<string, [number, number]> = {};
for (const j of jobs) {
  const o = j.look || {};
  const slots = { ...(o.bare ? {} : base.slots), ...(o.slots || {}) };
  for (const k of Object.keys(slots)) if (slots[k] === null) delete slots[k];
  const look = { ...base, ...o, slots };
  delete (look as any).bare;
  const fr = renderSprite(look, j.pose || 'idle', j.frame || 0, j.special || 'none');
  writeFileSync(`${out}/${j.name}.rgba`, fr.rgba);
  heads[j.name] = [fr.rig.head.x * RES, fr.rig.head.y * RES];
}
writeFileSync(`${out}/heads.json`, JSON.stringify(heads));
console.log('rendered', jobs.length);
