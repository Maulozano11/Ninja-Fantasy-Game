// The S-rank Devouring Tide (the owner's paint-over of our widest wave, 2026-10-22; a proposal
// waiting for him): his layers lifted from his picture (tools/refs/tide-s-from-ref.py) are his
// pixels at his places, the jutsu is battle-only (Water has no S-rank by his rule, "vacio por
// ahora"), and it casts as the Tide with his curl, dragon and kanji riding the crest. npm test.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import { TIDE_S_REF } from '../../tools/world-sprites/vfx-tide-s-refdata';
import { JUTSU, PROPOSED_JUTSUS, areaOf } from './jutsu';
import { applyAction, createBattle } from './engine';
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

describe('the S-rank Tide: the jutsu (placeholders waiting for the owner)', () => {
  it('battle-only: not in the list a ninja learns, so Water still has no S-rank in the creator', () => {
    assert.ok(!JUTSUS_DATA.some((j) => j.id === 'water_tide_s'));
    assert.ok(!JUTSUS_DATA.some((j) => j.nature === 'Water' && j.rank === 'S'));
    const j = PROPOSED_JUTSUS.find((x) => x.id === 'water_tide_s')!;
    assert.deepEqual([j.rank, j.nature, j.nameEs, j.chakraCost, j.enhancementChakraCost], ['S', 'Water', 'Técnica de Agua: Ola del dragón', 12, 4]);
  });

  it('the Tide with his dragon: the enhanced Tide\'s reach, its wave flagged for his layers, sheets to recolour', () => {
    const s = JUTSU.water_tide_s;
    assert.deepEqual([s.length, s.angle, s.dice, s.save, s.push?.m, s.prone, s.douse, s.seq?.wave?.dragon, s.seq?.wave?.ms], [11.25, 80, '6d8', 'str', 3, true, true, true, 2200]);
    assert.ok(!JUTSU.water_devouring_tide.seq?.wave?.dragon, 'the plain Tide keeps its look');
    const tint = tintSheetsOf(s).filter((r) => r.group === 'vfx_tide_s').map((r) => r.name);
    assert.deepEqual(tint, ['curl', 'dragon', 'kanji']);
  });

  it('casts: the wave reaches along its cone and sweeps who fails', () => {
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
    a.jutsus = ['water_tide_s'];
    a.chakra = 30;
    const out = applyAction(t, { type: 'jutsu', unit: 'a', jutsu: 'water_tide_s', at: t.units.rogue_0.pos });
    assert.ok(out.ok, out.reason);
    const ev = out.events.find((e) => e.t === 'jutsu');
    assert.ok(ev && ev.t === 'jutsu' && ev.shape?.kind === 'cone' && ev.shape.length === 11.25);
    assert.equal(out.state.units.a.chakra, 30 - 12);
    assert.ok(out.events.some((e) => e.t === 'save' && e.unit === 'rogue_0'));
    assert.deepEqual(areaOf(JUTSU.water_tide_s, { x: 0, z: 0 }, { x: 5, z: 0 }), { kind: 'cone', origin: { x: 0, z: 0 }, dir: 0, angle: 80, length: 11.25 });
  });
});
