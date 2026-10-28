// What the title screen's Continue and Load offer: your current ninja and the ninjas you have made,
// kept on this device. (The mission in progress has its own slot, game/missionRun.ts.)

import type { ShinobiCharacter } from '../types/shinobi';
import { migrateCharacter } from '../rules/ninja';
import { asMade } from '../rules/progression';
import { migrateCampaign, newCampaign, NO_PAST, type CampaignState } from '../campaign/state';
import { rivalOf, SHINOBI_FACTION_IDS } from '../settings/shinobi/factions';
import { originDef } from '../settings/shinobi/origins';
import { hashString } from '../rules/rng';

const HERO_KEY = 'shinobi5e.hero.v1';
const ROSTER_KEY = 'shinobi5e.roster.v1';
const CAMPAIGN_KEY = 'shinobi5e.campaign.v1';
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

const isCampaign = (c: unknown): c is CampaignState =>
  !!c && typeof c === 'object' && (c as CampaignState).version === 1 && typeof (c as CampaignState).heroId === 'string' && typeof (c as CampaignState).seed === 'number';

/** The campaign saved on this device, if it is this hero's (one campaign per device for now). */
export function loadCampaign(hero: ShinobiCharacter): CampaignState | null {
  const c = read<unknown>(CAMPAIGN_KEY);
  return isCampaign(c) && c.heroId === hero.id ? migrateCampaign(c) : null;
}

export function saveCampaign(c: CampaignState | null): void {
  if (c) write(CAMPAIGN_KEY, c);
  else {
    try {
      localStorage.removeItem(CAMPAIGN_KEY);
    } catch {
      // nothing to forget
    }
  }
}

/**
 * The hero's campaign: the saved one, or a new one from the hero's origin. A hero saved before
 * campaigns existed (no originId) gets the neutral "no past" the first time it comes home
 * (docs/WORLD_DESIGN.md, section 2), as migrateCharacter does with old sheets.
 */
export function campaignFor(hero: ShinobiCharacter): CampaignState {
  const saved = loadCampaign(hero);
  if (saved) return saved;
  const origin = originDef(hero.originId) ?? NO_PAST;
  const c = newCampaign(hashString(`${hero.id}:${Date.now()}`), 'shinobi', origin, hero.id, hero.clan, SHINOBI_FACTION_IDS, rivalOf);
  saveCampaign(c);
  return c;
}
