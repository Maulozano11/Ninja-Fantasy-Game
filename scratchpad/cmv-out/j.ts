import { JUTSUS_DATA, SHINOBI_CLASSES, SHINOBI_FEATS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/src/data/shinobiData';
for (const j of JUTSUS_DATA as any[]) console.log(j.id, '|', j.name, '|', j.nameEs ?? '');
console.log('classes', (SHINOBI_CLASSES as any[]).length ?? Object.keys(SHINOBI_CLASSES).length, 'feats', (SHINOBI_FEATS as any[]).length ?? Object.keys(SHINOBI_FEATS).length);
