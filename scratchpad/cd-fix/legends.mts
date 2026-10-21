const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e52913af-893-3/src';
const { COMPANIONS } = await import(R + '/data/missions');
const { JUTSUS_DATA } = await import(R + '/data/shinobiData');
const { LEGEND_OLD_BURST } = await import(R + '/rules/ninja');
const { offNatureJutsus } = await import(R + '/rules/jutsuNature');
const { BURST_NATURE } = await import(R + '/sprite/chakraNature');
for (const [id, old] of Object.entries(LEGEND_OLD_BURST)) {
  const c = COMPANIONS.find((x: any) => x.id === id);
  const oldN = BURST_NATURE[old as string];
  const nowN = BURST_NATURE[c.appearance.chakra.color];
  const j = Object.entries(c.selectedJutsus).map(([s, x]) => `${s}=${x}(${JUTSUS_DATA.find((y: any) => y.id === x)?.nature})`).join(' ');
  console.log(id, old, oldN, '->', c.appearance.chakra.color, nowN, 'tint', c.appearance.chakra.tint, '\n  ', j, '\n   offOld', offNatureJutsus(c.selectedJutsus, oldN), 'offNow', offNatureJutsus(c.selectedJutsus, nowN));
}
