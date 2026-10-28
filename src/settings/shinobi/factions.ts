// The shinobi pack's factions (docs/WORLD_DESIGN.md, section 1): the four clans, the village, the
// renegades and the forest sanctuary. Faction ids are the engine's vocabulary; the clan ids are the
// sheet's ClanType so a hero's own clan is its own faction.

import type { ClanType } from '../../types/shinobi';
import type { FactionId } from '../../campaign/state';

export interface FactionDef {
  id: FactionId;
  name: string;
  nameEs: string;
  /** A clan faction: the sheet's clan it is. */
  clan?: ClanType;
}

export const SHINOBI_FACTIONS: FactionDef[] = [
  { id: 'Mirai', name: 'Mirai clan', nameEs: 'Clan Mirai', clan: 'Mirai' },
  { id: 'Koton', name: 'Kōton clan', nameEs: 'Clan Kōton', clan: 'Koton' },
  { id: 'Ryusei', name: 'Ryusei clan', nameEs: 'Clan Ryusei', clan: 'Ryusei' },
  { id: 'Northstar', name: 'Northstar clan', nameEs: 'Clan Northstar', clan: 'Northstar' },
  { id: 'village', name: 'The village', nameEs: 'La aldea' },
  { id: 'renegades', name: 'The renegades', nameEs: 'Los renegados' },
  { id: 'sanctuary', name: 'The forest sanctuary', nameEs: 'El santuario del bosque' },
];

export const SHINOBI_FACTION_IDS: FactionId[] = SHINOBI_FACTIONS.map((f) => f.id);

/** The clan that beats yours in the counter cycle (docs/CLANS_DESIGN.md): the rival of the cycle. */
const RIVAL: Record<ClanType, ClanType> = { Mirai: 'Koton', Koton: 'Ryusei', Ryusei: 'Northstar', Northstar: 'Mirai' };

export const rivalOf = (faction: FactionId): FactionId | undefined => RIVAL[faction as ClanType];

export const factionDef = (id: FactionId): FactionDef | undefined => SHINOBI_FACTIONS.find((f) => f.id === id);

/** The faction that gives a mission (every shipped mission is the village's for now). */
export const MISSION_FACTION: FactionId = 'village';
