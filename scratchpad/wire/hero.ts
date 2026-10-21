// Prints a hero for the practice battle: Akira with a green chakra and elemental jutsu of several elements.
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/data/shinobiData';
const id = process.argv[2] ?? 'preset_akira';
const tint = process.argv[3] ?? 'green';
const p = LEGENDARY_PRESETS.find((x) => x.character.id.includes(id)) ?? LEGENDARY_PRESETS[1];
const c = structuredClone(p.character) as any;
c.id = 'test_hero';
c.appearance.chakra.tint = tint;
c.selectedJutsus = { utility: 'body_flicker', element1: 'fireball_goukakyu', element2: 'earth_wall_doryuheki', clan: c.selectedJutsus?.clan ?? 'water_dragon_suiryuudan', srank: 'great_fire_annihilation' };
c.level = 20;
c.maxChakra = 200;
c.currentChakra = 200;
console.log(JSON.stringify(c));
console.error(LEGENDARY_PRESETS.map((x) => x.character.id).join(' '), '->', p.character.id);
