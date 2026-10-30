// The clans' Paths of Mastery (docs/CLANS_DESIGN.md, "Later phases"): a ninja chooses one in the
// creator, and it is in force from level 3 (the owner, 2026-10-30). Only the Mirai's three exist so
// far, and of them only the Path of the Infernal Fire has abilities built: the Ember Armour (level 6)
// and the Colossal Avatar (level 9, improved at 12), the owner's approved numbers (D-T24).
// English text only; the Spanish names are data pairs.

import type { ClanPath, ClanType, ShinobiCharacter } from '../types/shinobi';

export interface PathDef {
  id: ClanPath;
  clan: ClanType;
  name: string;
  nameEs: string;
  role: string;
  roleEs: string;
}

/** The level a chosen Path comes into force. */
export const PATH_LEVEL = 3;

export const PATHS: PathDef[] = [
  { id: 'mirai_oracle', clan: 'Mirai', name: 'Path of the Oracle', nameEs: 'Camino del Oráculo', role: 'Leadership and foresight', roleEs: 'Liderazgo y previsión' },
  { id: 'mirai_infernal_fire', clan: 'Mirai', name: 'Path of the Infernal Fire', nameEs: 'Camino del Fuego Infernal', role: 'Fire and the avatar', roleEs: 'Fuego y el avatar' },
  { id: 'mirai_ash_weaver', clan: 'Mirai', name: 'Path of the Ash Weaver', nameEs: 'Camino del Tejedor de Ceniza', role: 'Traps and smoke', roleEs: 'Trampas y humo' },
];

export const pathsOf = (clan: ClanType): PathDef[] => PATHS.filter((p) => p.clan === clan);

/** The ninja's Path, if it has one of its own clan's and has reached PATH_LEVEL. */
export function activePath(c: Pick<ShinobiCharacter, 'clan' | 'level' | 'path'> | undefined): ClanPath | undefined {
  if (!c?.path || c.level < PATH_LEVEL) return undefined;
  return PATHS.some((p) => p.id === c.path && p.clan === c.clan) ? c.path : undefined;
}

/** The levels of the Infernal Fire's steps (D-T24). */
export const EMBER_LEVEL = 6;
export const COLOSSAL_LEVEL = 9;
export const COLOSSAL_PLUS_LEVEL = 12;

/** Which of the Infernal Fire's steps the ninja has. */
export function infernalSteps(c: Pick<ShinobiCharacter, 'clan' | 'level' | 'path'> | undefined): { ember: boolean; colossal: boolean; plus: boolean } {
  const on = activePath(c) === 'mirai_infernal_fire';
  const l = c?.level ?? 0;
  return { ember: on && l >= EMBER_LEVEL, colossal: on && l >= COLOSSAL_LEVEL, plus: on && l >= COLOSSAL_PLUS_LEVEL };
}
