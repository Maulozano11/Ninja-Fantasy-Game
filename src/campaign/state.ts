// The world between missions: the campaign state (docs/WORLD_DESIGN.md, sections 2, 3, 7, 8 and 10).
// Pure TypeScript: no React, no images, no Math.random (every roll comes from the seeded rng keyed
// by the campaign's seed, so two players with the same seed and decisions see the same world).
// The engine knows only its own vocabulary (factions, origins, wealth levels); a setting pack
// (src/settings/<pack>/) fills it with names. Step 1 of the build order: no people yet.

import { rngFor, rollDie } from '../rules/rng';

export type FactionId = string;
export type OriginId = string;
export type SettingId = string;

/** Spring, summer, autumn, winter. */
export type Season = 0 | 1 | 2 | 3;
export type Wealth = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Someone waiting at home for the hero (a Person once people exist, step 3). */
export interface PersonSeed {
  id: string;
  name: string;
  nameEs: string;
  /** What they are to the hero, in the pack's words (shown as is). */
  role: string;
  roleEs: string;
}

/**
 * A narrative origin: where the hero starts in the world (section 3). It never touches the battle
 * rules. Reputation keys are faction ids, or the two relative keys the engine resolves from the
 * hero's own faction when the campaign starts: 'own' (the hero's faction) and 'rival' (its rival).
 */
export interface Origin {
  id: OriginId;
  name: string;
  nameEs: string;
  /** One line of where you come from. */
  blurb: string;
  blurbEs: string;
  wealth: Wealth;
  reputation: Partial<Record<FactionId | 'own' | 'rival', number>>;
  fame: number;
  family: PersonSeed[];
  /** With what base you start (1..4). */
  baseTier: number;
  /** The beat your campaign opens with (the generator, step 8): an id and, for now, its one line. */
  hook: { id: string; line: string; lineEs: string };
  traits: string[];
  giftBias?: string[];
}

export interface ChronicleEntry {
  year: number;
  season: Season;
  line: string;
  lineEs: string;
}

export interface CampaignState {
  version: 1;
  /** The campaign's seed: the same seed, the same world. */
  seed: number;
  settingId: SettingId;
  time: { year: number; season: Season };
  originId: OriginId;
  /** The hero played now (the protagonist; it changes with the generational relay, step 7). */
  heroId: string;
  /** The hero's own faction (a clan here), the one 'own' resolved to. */
  factionId: FactionId;
  factions: Record<FactionId, { reputation: number }>;
  /** 0..10: how much the world talks about you, whatever it thinks. */
  fame: number;
  wealth: Wealth;
  base: { tier: number; modules: string[] };
  holdings: string[];
  family: PersonSeed[];
  chronicle: ChronicleEntry[];
  /** Missions finished, whatever the outcome: keys the per-mission rolls. */
  missions: number;
}

/** Reputation −10..+10 in five levels (section 7). */
export type ReputationLevel = 'hostile' | 'cold' | 'neutral' | 'friend' | 'ally';

export const REPUTATION_MIN = -10;
export const REPUTATION_MAX = 10;
export const FAME_MAX = 10;
export const WEALTH_MAX: Wealth = 6;

export function reputationLevel(n: number): ReputationLevel {
  return n <= -6 ? 'hostile' : n <= -2 ? 'cold' : n <= 1 ? 'neutral' : n <= 5 ? 'friend' : 'ally';
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const clampWealth = (n: number): Wealth => clamp(Math.round(n), 0, WEALTH_MAX) as Wealth;

/** The rival of the cycle, by the pack's table (docs/CLANS_DESIGN.md "The counter cycle"). */
export type RivalOf = (faction: FactionId) => FactionId | undefined;

/**
 * A new campaign from an origin. `factionIds` are every faction of the pack (reputation 0 unless
 * the origin says otherwise); `rivalOf` resolves the origin's 'rival' key from the hero's faction.
 */
export function newCampaign(seed: number, settingId: SettingId, origin: Origin, heroId: string, factionId: FactionId, factionIds: FactionId[], rivalOf: RivalOf): CampaignState {
  const factions: CampaignState['factions'] = {};
  for (const f of factionIds) factions[f] = { reputation: 0 };
  for (const [key, n] of Object.entries(origin.reputation)) {
    const f = key === 'own' ? factionId : key === 'rival' ? rivalOf(factionId) : key;
    if (f && factions[f] && n !== undefined) factions[f] = { reputation: clamp(n, REPUTATION_MIN, REPUTATION_MAX) };
  }
  return {
    version: 1,
    seed,
    settingId,
    time: { year: 1, season: 0 },
    originId: origin.id,
    heroId,
    factionId,
    factions,
    fame: clamp(origin.fame, 0, FAME_MAX),
    wealth: origin.wealth,
    base: { tier: Math.max(1, origin.baseTier), modules: [] },
    holdings: [],
    family: origin.family.map((p) => ({ ...p })),
    chronicle: [{ year: 1, season: 0, line: origin.hook.line, lineEs: origin.hook.lineEs }],
    missions: 0,
  };
}

/**
 * The origin a hero saved before campaigns existed gets the first time it comes home (section 2,
 * "Migración"): wealth 2, reputation 0 with everyone, no family, the smallest base.
 */
export const NO_PAST: Origin = {
  id: 'no_past',
  name: 'No past',
  nameEs: 'Sin pasado',
  blurb: 'Nobody knows where you came from, and you have never said.',
  blurbEs: 'Nadie sabe de dónde vienes, y tú nunca lo has dicho.',
  wealth: 2,
  reputation: {},
  fame: 0,
  family: [],
  baseTier: 1,
  hook: { id: 'no_past_opening', line: 'You came back from the road to a house that was waiting for someone.', lineEs: 'Volviste del camino a una casa que esperaba a alguien.' },
  traits: [],
};

export function addChronicle(s: CampaignState, line: string, lineEs: string): CampaignState {
  return { ...s, chronicle: [...s.chronicle, { year: s.time.year, season: s.time.season, line, lineEs }] };
}

export function changeReputation(s: CampaignState, faction: FactionId, by: number): CampaignState {
  const f = s.factions[faction];
  if (!f || !by) return s;
  return { ...s, factions: { ...s.factions, [faction]: { reputation: clamp(f.reputation + by, REPUTATION_MIN, REPUTATION_MAX) } } };
}

export function changeWealth(s: CampaignState, by: number): CampaignState {
  return by ? { ...s, wealth: clampWealth(s.wealth + by) } : s;
}

export function changeFame(s: CampaignState, by: number): CampaignState {
  return by ? { ...s, fame: clamp(s.fame + by, 0, FAME_MAX) } : s;
}

/**
 * A purchase is a test, not a subtraction (section 8): at or above the price level you buy without
 * dropping; one level under, you can stretch and drop a level; two under, you can't. A Cold faction
 * raises the price a level, an Ally lowers it.
 */
export function priceFor(price: number, sellerReputation?: number): number {
  if (sellerReputation === undefined) return price;
  const level = reputationLevel(sellerReputation);
  return level === 'cold' ? price + 1 : level === 'ally' ? price - 1 : price;
}

export function canBuy(s: CampaignState, price: number): 'free' | 'stretch' | 'no' {
  return s.wealth >= price ? 'free' : s.wealth === price - 1 ? 'stretch' : 'no';
}

export function buy(s: CampaignState, price: number): CampaignState | null {
  const how = canBuy(s, price);
  return how === 'no' ? null : how === 'stretch' ? changeWealth(s, -1) : s;
}

/** The fortune bands per wealth level (section 8, W5a+), in the pack's currency: [low, high]. */
export const FORTUNE_BANDS: [number, number][] = [
  [0, 900],
  [2_000, 9_000],
  [20_000, 90_000],
  [200_000, 900_000],
  [2_000_000, 9_000_000],
  [20_000_000, 90_000_000],
  [200_000_000, 900_000_000],
];

/**
 * The fortune shown next to the wealth seal: a figure drawn inside the level's band with the
 * seeded rng, rounded to zeros, that moves a little (±10 %) every season and jumps band with the
 * level. Nothing in the game has a price in it.
 */
export function fortune(s: CampaignState): number {
  const [lo, hi] = FORTUNE_BANDS[s.wealth];
  if (hi === 0) return 0;
  // the figure of the level, fixed for the campaign; the season moves it ±10 % inside the band
  const base = lo + (hi - lo) * rngFor(s.seed, 'fortune', s.wealth)();
  const wobble = 1 + (rngFor(s.seed, 'fortune', s.wealth, s.time.year, s.time.season)() * 2 - 1) * 0.1;
  const n = clamp(base * wobble, lo, hi);
  // rounded to the band's zeros: three significant digits at most
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(hi)) - 2));
  return Math.round(n / step) * step;
}

export interface SeasonReport {
  state: CampaignState;
  /** What the turn of the year brought, if anything: the d20 of luck or ruin, the holdings' income. */
  luck?: 'ruin' | 'windfall';
  holdingsIncome: number;
}

/**
 * The season passes (section 10): one per mission, or chosen at home. At the turn of the year every
 * holding gives +1 wealth and the d20 of luck is rolled (1: −1, 20: +1).
 */
export function passSeason(s: CampaignState): SeasonReport {
  const season = ((s.time.season + 1) % 4) as Season;
  const year = season === 0 ? s.time.year + 1 : s.time.year;
  let state: CampaignState = { ...s, time: { year, season } };
  let luck: SeasonReport['luck'];
  let holdingsIncome = 0;
  if (season === 0) {
    holdingsIncome = s.holdings.length;
    state = changeWealth(state, holdingsIncome);
    const d = rollDie(rngFor(s.seed, 'luck', year), 20);
    if (d === 1) {
      luck = 'ruin';
      state = changeWealth(state, -1);
    } else if (d === 20) {
      luck = 'windfall';
      state = changeWealth(state, 1);
    }
  }
  return { state, luck, holdingsIncome };
}

export type MissionRank = 'D' | 'C' | 'B' | 'A' | 'S';

export interface MissionResultForCampaign {
  missionId: string;
  rank: MissionRank;
  outcome: 'complete' | 'failed';
  /** Who gave the mission: gains or loses reputation. Missing: the hero's own faction. */
  factionId?: FactionId;
  /** The pack's one line for the Chronicle. */
  line: string;
  lineEs: string;
}

export interface MissionReport {
  state: CampaignState;
  reputation: { faction: FactionId; by: number };
  fame: number;
  wealth: number;
}

/**
 * A finished mission comes home (section 2: the run's result is applied instead of lost): a season
 * passes; completed, +1 reputation with whoever gave it and, from rank B up, +1 fame and a d20 ≥ 12
 * for +1 wealth (section 8); failed, −1 reputation. The season's own effects ride on `passSeason`.
 */
export function applyMissionResult(s: CampaignState, r: MissionResultForCampaign): MissionReport {
  const faction = r.factionId ?? s.factionId;
  const high = r.rank === 'B' || r.rank === 'A' || r.rank === 'S';
  const n = s.missions + 1;
  let state: CampaignState = { ...s, missions: n };
  let fame = 0;
  let wealth = 0;
  const by = r.outcome === 'complete' ? 1 : -1;
  state = changeReputation(state, faction, by);
  if (r.outcome === 'complete' && high) {
    fame = 1;
    state = changeFame(state, fame);
    if (rollDie(rngFor(s.seed, 'mission', n, 'wealth'), 20) >= 12) {
      wealth = 1;
      state = changeWealth(state, wealth);
    }
  }
  state = addChronicle(state, r.line, r.lineEs);
  state = passSeason(state).state;
  return { state, reputation: { faction, by }, fame, wealth };
}

/** A saved campaign brought to today's shape (nothing to migrate yet; the slot is version 1). */
export function migrateCampaign(c: CampaignState): CampaignState {
  return c;
}
