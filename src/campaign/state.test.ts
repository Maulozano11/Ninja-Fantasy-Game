import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyMissionResult, buy, canBuy, FORTUNE_BANDS, fortune, newCampaign, NO_PAST, passSeason, priceFor, reputationLevel, type CampaignState } from './state';
import { SHINOBI_FACTION_IDS, rivalOf } from '../settings/shinobi/factions';
import { originDef, SHINOBI_ORIGINS } from '../settings/shinobi/origins';

const heir = originDef('clan_heir')!;
const fresh = (seed = 7, origin = heir, clan = 'Mirai'): CampaignState => newCampaign(seed, 'shinobi', origin, 'hero_1', clan, SHINOBI_FACTION_IDS, rivalOf);

describe('the campaign state', () => {
  it('starts from an origin: its wealth, its reputations resolved from the hero\'s clan, its family and hook', () => {
    const c = fresh();
    assert.equal(c.wealth, 5);
    assert.equal(c.factions.Mirai.reputation, 4, 'own clan');
    assert.equal(c.factions.Koton.reputation, -2, 'the rival of the cycle');
    assert.equal(c.factions.village.reputation, 0);
    assert.equal(c.family.length, 2);
    assert.deepEqual(c.time, { year: 1, season: 0 });
    assert.equal(c.chronicle[0].lineEs, heir.hook.lineEs);
    // a Northstar heir's rival is the Mirai
    assert.equal(fresh(7, heir, 'Northstar').factions.Mirai.reputation, -2);
    // the neutral origin of an old save
    const n = fresh(7, NO_PAST);
    assert.equal(n.wealth, 2);
    assert.ok(Object.values(n.factions).every((f) => f.reputation === 0));
    assert.equal(n.family.length, 0);
  });

  it('every pack origin is within the engine\'s bounds', () => {
    for (const o of SHINOBI_ORIGINS) {
      assert.ok(o.wealth >= 0 && o.wealth <= 6, o.id);
      for (const n of Object.values(o.reputation)) assert.ok(n! >= -10 && n! <= 10, o.id);
      assert.ok(o.baseTier >= 1 && o.baseTier <= 4, o.id);
      assert.ok(o.nameEs && o.blurbEs && o.hook.lineEs, o.id);
      const c = fresh(1, o);
      assert.equal(c.originId, o.id);
    }
    assert.ok(!SHINOBI_ORIGINS.some((o) => o.id.includes('two_clans')), 'mixed blood is earned by playing, not chosen');
  });

  it('reads reputation in five levels', () => {
    assert.deepEqual([-10, -6, -5, -2, -1, 0, 1, 2, 5, 6, 10].map(reputationLevel), ['hostile', 'hostile', 'cold', 'cold', 'neutral', 'neutral', 'neutral', 'friend', 'friend', 'ally', 'ally']);
  });

  it('buys as a test: free at the price, a stretch one level under, impossible two under; Cold and Ally move the price', () => {
    const c = { ...fresh(), wealth: 3 as const };
    assert.equal(canBuy(c, 3), 'free');
    assert.equal(canBuy(c, 4), 'stretch');
    assert.equal(canBuy(c, 5), 'no');
    assert.equal(buy(c, 3)!.wealth, 3);
    assert.equal(buy(c, 4)!.wealth, 2);
    assert.equal(buy(c, 5), null);
    assert.equal(priceFor(4, -3), 5);
    assert.equal(priceFor(4, 7), 3);
    assert.equal(priceFor(4, 0), 4);
  });

  it('shows a fortune inside the level\'s band, rounded, that moves a little by season and is the same for the same seed', () => {
    for (let w = 0; w <= 6; w++) {
      const c = { ...fresh(), wealth: w as CampaignState['wealth'] };
      const f = fortune(c);
      const [lo, hi] = FORTUNE_BANDS[w];
      assert.ok(f >= lo && f <= hi, `${w}: ${f}`);
      assert.equal(fortune({ ...c }), f, 'deterministic');
      if (w > 0) {
        const step = Math.pow(10, Math.floor(Math.log10(hi)) - 2);
        assert.equal(f % step, 0, `${w}: ${f} rounded`);
        const later = fortune(passSeason(c).state);
        assert.ok(Math.abs(later - f) <= f * 0.25, `${w}: breathes, ${f} -> ${later}`);
      }
    }
    assert.notEqual(fortune({ ...fresh(1), wealth: 3 }), fortune({ ...fresh(2), wealth: 3 }));
  });

  it('passes the season, turns the year with the holdings\' income and the d20 of luck', () => {
    let c = fresh();
    for (let i = 0; i < 3; i++) c = passSeason(c).state;
    assert.deepEqual(c.time, { year: 1, season: 3 });
    const r = passSeason({ ...c, holdings: ['outpost'], wealth: 3 });
    assert.deepEqual(r.state.time, { year: 2, season: 0 });
    assert.equal(r.holdingsIncome, 1);
    assert.ok(r.state.wealth >= 3 && r.state.wealth <= 5);
    // over many seeds the d20 of luck comes up both ways, and never otherwise
    const seen = new Set<string>();
    for (let seed = 0; seed < 400; seed++) seen.add(String(passSeason({ ...fresh(seed), time: { year: 1, season: 3 } }).luck));
    assert.deepEqual([...seen].sort(), ['ruin', 'undefined', 'windfall']);
  });

  it('brings a mission home: a season passes, reputation moves with whoever gave it, high ranks bring fame and a chance of wealth', () => {
    const c = fresh();
    const done = applyMissionResult(c, { missionId: 'm', rank: 'C', outcome: 'complete', factionId: 'village', line: 'The patrol came home.', lineEs: 'La patrulla volvió.' });
    assert.equal(done.state.factions.village.reputation, 1);
    assert.deepEqual(done.state.time, { year: 1, season: 1 });
    assert.equal(done.fame, 0, 'rank C brings no fame');
    assert.equal(done.state.wealth, 5);
    assert.equal(done.state.chronicle.at(-1)!.lineEs, 'La patrulla volvió.');
    assert.equal(done.state.missions, 1);
    const failed = applyMissionResult(c, { missionId: 'm', rank: 'C', outcome: 'failed', line: '', lineEs: '' });
    assert.equal(failed.state.factions.Mirai.reputation, 3, 'the hero\'s own clan gave it');
    let richer = 0;
    for (let seed = 0; seed < 200; seed++) {
      const r = applyMissionResult({ ...fresh(seed), wealth: 2 }, { missionId: 'm', rank: 'A', outcome: 'complete', line: '', lineEs: '' });
      assert.equal(r.fame, 1);
      if (r.wealth) richer++;
    }
    assert.ok(richer > 60 && richer < 130, `d20 >= 12 about 45 %: ${richer} of 200`);
  });
});
