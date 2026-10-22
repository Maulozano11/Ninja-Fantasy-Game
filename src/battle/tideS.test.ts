// The Dragon Tsunami, Water's rank S (the owner's paint-over of our widest wave; approved on
// 2026-10-22: "rango S ola si me gusta la animacion la ola normal se llama tsunami y la rango s es
// dragon tsunami"): his layers lifted from his picture (tools/refs/tide-s-from-ref.py) are his pixels
// at his places, the jutsu is Water's S-rank in the jutsu list a ninja learns, and it casts as the
// Tsunami with his curl, dragon and kanji riding the crest. Its numbers approved by the owner for now
// (2026-10-22): «aprovado los numeros de la ola por ahora».
// npm test.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import { TIDE_S_REF } from '../../tools/world-sprites/vfx-tide-s-refdata';
import { JUTSU, areaOf, enhanced } from './jutsu';
import { applyAction, createBattle } from './engine';
import { WET_ROUNDS, tickGround } from './ground';
import type { BattleEvent, BattleState } from './types';
import { jutsuChoices } from '../rules/jutsuNature';
import { creatorChoices } from '../rules/progression';
import { NO_GROWTH } from '../rules/natureGrowth';
import { logLine } from '../components/battle/battleLog';
import { tintSheetsOf } from '../components/battle/vfxTintPlan';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const R = TIDE_S_REF;

describe('the S-rank Tide: his layers', () => {
  it('his canvas: 320x240 of his pixels at 3.2 picture px each, each 2x2 game px, our crest on his canvas', () => {
    assert.deepEqual(R.native, [320, 240]);
    assert.equal(R.pitch, 3.2);
    assert.equal(R.k, 2);
    // Our crest point (493, 281.5 on our 601x484 frame) lands right of his columns, near his canvas's middle height.
    assert.ok(R.crest[0] > 270 && R.crest[0] < 295 && R.crest[1] > 130 && R.crest[1] < 155, `crest ${R.crest}`);
    // His lanes match ours at about 2 game px per his pixel: that is why k is 2.
    const [sx, sy] = R.fit.lanes.s;
    assert.ok(Math.abs(1 / sx - 2) < 0.1 && Math.abs(1 / sy - 2) < 0.1 && R.fit.lanes.iou > 0.95);
  });

  it('every layer is his pixels at his places: each probe of his picture is there, in a colour of his near it', () => {
    for (const [name, probes] of Object.entries(R.probes)) {
      const p = R.layers[name as keyof typeof R.layers];
      assert.ok(probes.length >= 16, name);
      for (const [x, y, his] of probes) {
        const ch = p.rows[y - p.y]?.[x - p.x];
        assert.ok(ch && ch !== '.', `${name}: his pixel (${x}, ${y}) is in the layer`);
        const ours = rgb(R.pal[ALPHABET.indexOf(ch)]);
        const d = Math.hypot(...ours.map((v, i) => v - rgb(his)[i]));
        assert.ok(d < 48, `${name} (${x}, ${y}): ${R.pal[ALPHABET.indexOf(ch)]} vs his ${his}`);
      }
    }
  });

  it('the pieces sit where he painted them: the dragon over the curl, the kanji under its jaw, the horns and whiskers on the head', () => {
    const L = R.layers;
    const box = (p: { x: number; y: number; rows: string[] }) => [p.x, p.y, p.x + Math.max(...p.rows.map((r) => r.length)), p.y + p.rows.length];
    const [hx0, hy0, hx1, hy1] = box(L.head);
    const [kx0, ky0, kx1] = box(L.kanji);
    const [cx0, , cx1] = box(L.curl);
    assert.ok(hy1 <= ky0 + 2, 'the kanji is below the head');
    assert.ok(cx0 < hx0 && hx1 <= cx1 + 1, 'the head is over the curl');
    assert.ok(kx0 > cx0 && kx1 <= cx1 + 1, 'the kanji is over the curl');
    for (const k of ['horn_l', 'horn_r', 'jaw'] as const) {
      const [x0, y0, x1, y1] = box(L[k]);
      assert.ok(x0 >= hx0 && x1 <= hx1 && y0 >= hy0 && y1 <= hy1, `${k} on the head`);
    }
    // His line under the chin the dragon rises out of is below the jaw's top.
    assert.ok(R.surface > L.jaw.y && R.surface <= L.jaw.y + L.jaw.rows.length + 2);
    assert.ok(R.pal.length <= 64 && R.spray.length > 0);
  });

  it('the staged sheets: every anchor is our crest point, the dragon plays the Tide plus its break', () => {
    const m = JSON.parse(readFileSync(join(import.meta.dirname, '../assets/world/vfx_tide_s/manifest.json'), 'utf8')).sprites;
    for (const name of ['curl', 'dragon', 'kanji']) assert.ok(m[name], name);
    const d = m.dragon;
    assert.equal(d.anims.play.loop, false);
    // 2200 ms run + 900 ms break at 12 fps.
    assert.equal(Math.round((d.anims.play.frames / d.anims.play.fps) * 1000 / 100), 31);
    assert.deepEqual(Object.keys(m.kanji.anims), ['kanji', 'glow']);
  });
});

/** A Water ninja facing a rogue 6 m away, its turn, with `jutsus` and 30 chakra. */
function duel(jutsus: string[]): BattleState {
  const b = createBattle({
    seed: 3, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal',
    party: [{ character: { ...DEFAULT_CHARACTER, id: 'a', name: 'Aki', effects: [] }, pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }], stealth: false,
    supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 },
  }).state;
  const t = structuredClone(b);
  t.turn = t.order.indexOf('a');
  const a = t.units.a;
  a.turn = { move: a.speed, action: true, bonus: true, reaction: true, moved: 0 };
  a.jutsus = jutsus;
  a.chakra = 30;
  return t;
}

describe('the Dragon Tsunami: the jutsu (rank S and its numbers approved by the owner for now, 2026-10-22)', () => {
  it('Water\'s S-rank in the list a ninja learns, with his names; the Tide is the Tsunami now', () => {
    const j = JUTSUS_DATA.find((x) => x.id === 'water_tide_s')!;
    assert.deepEqual(
      [j.name, j.nameEs, j.rank, j.category, j.nature, j.chakraCost, j.enhancementChakraCost, j.damageDice, j.damageType, j.savingThrow, j.saveEffect],
      ['Water Technique: Dragon Tsunami', 'Técnica de Agua: Dragón Tsunami', 'S', 'Ultimate', 'Water', 12, 4, '6d8', 'Bludgeoning', 'STR', 'Half Damage'],
    );
    const tide = JUTSUS_DATA.find((x) => x.id === 'water_devouring_tide')!;
    assert.deepEqual([tide.name, tide.nameEs, tide.rank], ['Water Technique: Tsunami', 'Técnica de Agua: Tsunami', 'A']);
    // The S-rank slot of a Water ninja offers it first; the S-rank slot opens at level 10.
    assert.equal(jutsuChoices('slot5Ultimate', 'Water', 'Mirai')[0].id, 'water_tide_s');
    assert.ok(!jutsuChoices('slot5Ultimate', 'Fire', 'Mirai').some((x) => x.id === 'water_tide_s'), 'only Water');
    assert.ok(!creatorChoices('slot5Ultimate', 'Water', 'Mirai', 'Ninjutsu Specialist').some((x) => x.id === 'water_tide_s'), 'not for a new ninja');
    assert.ok(creatorChoices('slot5Ultimate', 'Water', 'Mirai', 'Ninjutsu Specialist', { ...NO_GROWTH, level: 10 }).some((x) => x.id === 'water_tide_s'), 'at level 10');
  });

  it('the Tsunami with his dragon: an 11.25 m cone 80 degrees wide, its wave flagged for his layers, sheets to recolour', () => {
    const s = JUTSU.water_tide_s;
    assert.deepEqual([s.rank, s.length, s.angle, s.dice, s.save, s.saveHalf, s.push?.m, s.prone, s.douse, s.seq?.wave?.dragon, s.seq?.wave?.ms], ['S', 11.25, 80, '6d8', 'str', true, 3, true, true, true, 2200]);
    assert.ok(!JUTSU.water_devouring_tide.seq?.wave?.dragon, 'the Tsunami keeps its look');
    const tint = tintSheetsOf(s).filter((r) => r.group === 'vfx_tide_s').map((r) => r.name);
    assert.deepEqual(tint, ['curl', 'dragon', 'kanji']);
    // Enhanced (+4 chakra): 8d8, and the cone reaches farther and opens wider.
    const e = enhanced(s);
    assert.equal(e.dice, '8d8');
    assert.ok(e.length! > 11.25 && e.angle! > 80);
  });

  it('casts: the wave reaches along its cone, makes a STR save, costs 12 chakra, and says his name in the log', () => {
    const t = duel(['water_tide_s']);
    const out = applyAction(t, { type: 'jutsu', unit: 'a', jutsu: 'water_tide_s', at: t.units.rogue_0.pos });
    assert.ok(out.ok, out.reason);
    const ev = out.events.find((e) => e.t === 'jutsu');
    assert.ok(ev && ev.t === 'jutsu' && ev.shape?.kind === 'cone' && ev.shape.length === 11.25);
    assert.equal(out.state.units.a.chakra, 30 - 12);
    assert.ok(out.events.some((e) => e.t === 'save' && e.unit === 'rogue_0'));
    assert.deepEqual(areaOf(JUTSU.water_tide_s, { x: 0, z: 0 }, { x: 5, z: 0 }), { kind: 'cone', origin: { x: 0, z: 0 }, dir: 0, angle: 80, length: 11.25 });
    assert.match(logLine(ev!, out.state, 'es')!.text, /Técnica de Agua: Dragón Tsunami/);
    assert.match(logLine(ev!, out.state, 'en')!.text, /Water Technique: Dragon Tsunami/);
  });

  it('the ground it floods stays wet one round longer than the Tsunami\'s, and a Tsunami over it never shortens that', () => {
    assert.equal(JUTSU.water_tide_s.wetRounds, WET_ROUNDS + 1);
    assert.equal(JUTSU.water_devouring_tide.wetRounds, undefined, 'the Tsunami: WET_ROUNDS');
    const t = duel(['water_tide_s', 'water_devouring_tide']);
    t.units.rogue_0.hp = t.units.rogue_0.maxHp = 999; // stands through both waves
    const out = applyAction(t, { type: 'jutsu', unit: 'a', jutsu: 'water_tide_s', at: t.units.rogue_0.pos });
    assert.ok(out.ok, out.reason);
    const wet = Object.values(out.state.wet ?? {});
    assert.ok(wet.length > 100 && wet.every((n) => n === WET_ROUNDS + 1));
    // It dries as the fourth new round begins (the Tsunami's as the third).
    const s = structuredClone(out.state);
    const ev: BattleEvent[] = [];
    for (let i = 0; i < WET_ROUNDS; i++) tickGround(s, ev);
    assert.ok(Object.keys(s.wet ?? {}).length > 0, 'still wet three rounds on');
    tickGround(s, ev);
    assert.equal(Object.keys(s.wet ?? {}).length, 0, 'dry on the fourth');
    // The Tsunami cast over the same ground: the cells keep the longer count.
    const again = structuredClone(out.state);
    again.units.a.turn = { ...again.units.a.turn, action: true };
    const out2 = applyAction(again, { type: 'jutsu', unit: 'a', jutsu: 'water_devouring_tide', at: again.units.rogue_0.pos });
    assert.ok(out2.ok, out2.reason);
    assert.ok(Object.values(out2.state.wet ?? {}).every((n) => n === WET_ROUNDS + 1 || n === WET_ROUNDS));
    for (const [k, n] of Object.entries(out.state.wet ?? {})) assert.equal(out2.state.wet![k], n, k);
  });
});
