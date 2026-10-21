const mod = await import(process.argv[2]);
const J = mod.JUTSUS_DATA as any[];
for (const j of J) {
  console.log([j.id, j.rank, j.category, j.nature, j.requiredClan ?? '', j.chakraCost ?? j.cost ?? '', JSON.stringify(j.name), JSON.stringify(j.nameEs ?? ''), j.vfx ?? '', j.effectType ?? '', j.range ?? '', j.area ?? ''].join(' | '));
}
console.log('KEYS', Object.keys(J[0]).join(','));
