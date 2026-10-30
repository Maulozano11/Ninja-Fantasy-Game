// Tests for cover and height (the owner, 2026-10-28: "ya tenemos algo puesto en el juego, solo hay
// que trabajar mejor las coberturas medias y altas"; docs/GAMEPLAY_DESIGN.md "Cover"): from high
// ground a low cover counts for nothing and a tall one a step less, from low ground any cover is
// three-quarters, and cover adds to DEX saves against blasts and areas. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { createBattle } from './engine';
import type { BattleSetup } from './engine';
import { attackPreview, saveCover } from './combat';
import { cellBlocked, cellCenter, cellOf, coverBetween, getMap, gridFor, idx, levelAtPt, propRules, waterAtPt } from './map';
import { explode } from './hazards';
import { canStop } from './nav';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    ...over,
  };
}

function place(s: BattleState, id: string, p: Pt): void {
  const u = s.units[id];
  for (let r = 0; r < 4; r += 0.5) {
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + r * Math.cos((a * Math.PI) / 8), z: p.z + r * Math.sin((a * Math.PI) / 8) };
      const c = cellOf(q);
      if (cellBlocked(s, c) || waterAtPt(s, cellCenter(c)) || !canStop(s, u, c)) continue;
      u.pos = cellCenter(c);
      return;
    }
  }
  throw new Error('no free cell');
}

/** A high cell and a low cell of the map 3 to 5 m apart, both free, with flat ground between them for a block. */
function ledge(s: BattleState): { high: Pt; low: Pt } {
  const g = gridFor(s.mapId);
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) {
      const i = idx(g, { c, r });
      if (!g.inside[i] || g.level[i] < 0.9 || g.water[i] || cellBlocked(s, { c, r })) continue;
      const high = cellCenter({ c, r });
      for (const [dc, dr] of [[8, 0], [-8, 0], [0, 8], [0, -8], [6, 6], [-6, 6], [6, -6], [-6, -6]]) {
        const lc = { c: c + dc, r: r + dr };
        const j = idx(g, lc);
        if (lc.c < 0 || lc.r < 0 || lc.c >= g.cols || lc.r >= g.rows || !g.inside[j] || g.level[j] > 0.1 || g.water[j] || cellBlocked(s, lc)) continue;
        return { high, low: cellCenter(lc) };
      }
    }
  throw new Error('no ledge on the map');
}

describe('cover and height', () => {
  it('from above, a low cover (a metal block) counts for nothing; from below, it is three-quarters; on the flat, half', () => {
    const s = createBattle(setup()).state;
    const { high, low } = ledge(s);
    assert.ok(levelAtPt(s, high) - levelAtPt(s, low) >= 0.9);
    // a Kōton block halfway between them
    const mid = { x: (high.x + low.x) / 2, z: (high.z + low.z) / 2 };
    s.walls.push({ id: 'b1', kind: 'metalBlock', a: mid, b: mid, hp: 20 });
    assert.equal(coverBetween(s, high, low, [], true), 2, 'flat: half cover');
    assert.equal(coverBetween(s, high, low), 0, 'from above: nothing');
    assert.equal(coverBetween(s, low, high), 5, 'from below: three-quarters');
    // the attack preview says why
    place(s, 'a', high);
    place(s, 'rogue_0', low);
    s.units.a.pos = high;
    s.units.rogue_0.pos = low;
    const down = attackPreview(s, s.units.a, s.units.rogue_0, 'ranged');
    assert.equal(down.cover, 0);
    assert.ok(down.reasons.includes('overCover'), down.reasons.join());
    const up = attackPreview(s, s.units.rogue_0, s.units.a, 'ranged');
    assert.equal(up.cover, 5);
    assert.ok(up.reasons.includes('ledgeCover'), up.reasons.join());
  });

  it('a tall cover (a tree) still covers from above, a step less: a three-quarters one gives half', () => {
    const s = createBattle(setup()).state;
    const { high, low } = ledge(s);
    const map = getMap(s.mapId);
    // the map's props stay; a tree is stood in by hand through a tall wall-less check: the rules say so
    const oak = map.props.find((p) => p.group === 'trees' && p.name === 'oak')!;
    assert.equal(propRules(oak).tall, true);
    assert.equal(propRules(oak).cover, 2);
    const boulder = map.props.find((p) => p.group === 'landmarks' && p.name === 'boulder');
    if (boulder) assert.deepEqual([propRules(boulder).cover, propRules(boulder).tall], [5, true]);
    const bush = map.props.find((p) => p.group === 'plants' && p.name === 'bush_round')!;
    assert.ok(!propRules(bush).tall);
    // an earth wall (tall) covers from above as on the flat
    const mid = { x: (high.x + low.x) / 2, z: (high.z + low.z) / 2 };
    const dx = low.x - high.x;
    const dz = low.z - high.z;
    const n = Math.hypot(dx, dz) || 1;
    s.walls.push({ id: 'w1', kind: 'earth', a: { x: mid.x - (dz / n) * 1.5, z: mid.z + (dx / n) * 1.5 }, b: { x: mid.x + (dz / n) * 1.5, z: mid.z - (dx / n) * 1.5 }, hp: 20 });
    assert.equal(coverBetween(s, high, low), 5);
  });

  it('cover adds to a DEX save against a blast from behind it: +2 behind a crate, +5 behind stacked crates; nothing right by the blast', () => {
    const s = createBattle(setup()).state;
    const map = getMap(s.mapId);
    const crate = map.props.findIndex((p) => p.group === 'camp' && p.name === 'crate');
    const stack = map.props.findIndex((p) => p.group === 'camp' && p.name === 'crate_stack');
    assert.ok(crate >= 0 && stack >= 0);
    for (const [i, want] of [[crate, 2], [stack, 5]] as const) {
      const p = map.props[i];
      const r = propRules(p).radius + 0.9;
      // the ninja right behind the prop (east), the blast on the other side (west)
      const t = structuredClone(s);
      place(t, 'a', { x: p.x + r, z: p.z });
      const at = { x: p.x - r - 0.5, z: p.z };
      assert.equal(coverBetween(t, at, t.units.a.pos, ['a']), want, `${p.name}: cover on the line`);
      assert.equal(saveCover(t, t.units.a, 'dex', at), want);
      const ev: BattleEvent[] = [];
      explode(t, at, 6, '3d6', 13, 'test', ev);
      const save = ev.find((e): e is Extract<BattleEvent, { t: 'save' }> => e.t === 'save' && e.unit === 'a');
      assert.ok(save, 'the blast reached her');
      assert.equal(save.cover, want);
      // the +cover is in the roll's modifier
      assert.equal(saveCover(t, t.units.a, 'dex', t.units.a.pos), 0, 'a blast on top of her: no cover');
    }
    // not for a CON or WIS save
    assert.equal(saveCover(s, s.units.a, 'con', { x: 0, z: 0 }), 0);
  });
});
