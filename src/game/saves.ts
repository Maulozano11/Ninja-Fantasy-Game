// What the title screen's Continue and Load offer: your current ninja and the ninjas you have made,
// kept on this device. (The mission in progress has its own slot, game/missionRun.ts.)

import type { ShinobiCharacter } from '../types/shinobi';
import { migrateCharacter } from '../rules/ninja';
import { asMade } from '../rules/progression';

const HERO_KEY = 'shinobi5e.hero.v1';
const ROSTER_KEY = 'shinobi5e.roster.v1';
/** The roster keeps the latest ninjas made, newest first. */
export const ROSTER_MAX = 12;

export interface SavedNinja {
  character: ShinobiCharacter;
  /** When it was last saved (ms since 1970). */
  savedAt: number;
}

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game goes on, it just won't be remembered.
  }
};

const isNinja = (c: unknown): c is ShinobiCharacter =>
  !!c && typeof c === 'object' && typeof (c as ShinobiCharacter).id === 'string' && typeof (c as ShinobiCharacter).clan === 'string';

/**
 * The ninja you play now, if one was made on this device. A saved ninja has been made: its chakra
 * type is fixed (rules/progression.ts), also on sheets saved before that rule.
 */
export function loadHero(): ShinobiCharacter | null {
  const c = read<unknown>(HERO_KEY);
  return isNinja(c) ? asMade(migrateCharacter(c)) : null;
}

/** Makes this the ninja you play, and keeps it in the roster. */
export function saveHero(c: ShinobiCharacter): void {
  write(HERO_KEY, c);
  const rest = loadRoster().filter((s) => s.character.id !== c.id);
  write(ROSTER_KEY, [{ character: c, savedAt: Date.now() }, ...rest].slice(0, ROSTER_MAX));
}

/** The ninjas made on this device, newest first (each one made: its type is fixed). */
export function loadRoster(): SavedNinja[] {
  const list = read<unknown[]>(ROSTER_KEY);
  if (!Array.isArray(list)) return [];
  return list
    .filter((s): s is SavedNinja => !!s && typeof s === 'object' && isNinja((s as SavedNinja).character))
    .map((s) => ({ character: asMade(migrateCharacter(s.character)), savedAt: Number(s.savedAt) || 0 }));
}

export function forgetNinja(id: string): void {
  write(ROSTER_KEY, loadRoster().filter((s) => s.character.id !== id));
}
