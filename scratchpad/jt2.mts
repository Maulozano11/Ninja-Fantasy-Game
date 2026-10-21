const mod = await import(process.argv[2]);
for (const j of mod.JUTSUS_DATA as any[]) {
  if (!['Fire','Water','Wind','Lightning','Earth'].includes(j.nature)) continue;
  console.log([j.id, j.nature, j.rank, j.category, j.chakraCost+'(+'+j.enhancementChakraCost+')', j.castTime, (j.range*1.5)+'m', j.areaOfEffect ?? '-', j.aoeRadius ?? '', j.damageDice ?? '', j.damageType ?? '', j.savingThrow ?? 'atk', j.saveEffect ?? '', j.environmentalEffect ?? ''].join(' | '));
}
