// The Gale Dragon Ray, Wind's second rank S, made for Aurelia (the owner, 2026-10-24: "a aurelia le
// daremos un jutsu de viento rango S que aun no tengo de una linea de 2 metros de ancho por todo lo
// que mida el mapa observable"): a 2 m line that runs as far as the camera's farthest view goes and
// harms only what that view shows ("la cuento desde donde el jugador pueda hacer la camara lo mas
// lejos tiene que ver con la camara no con aurelia"; "que el rayo se detenga donde el jugador ya no
// puede ver con la vista mas alejada"), that no height, wall or reaction stops ("el jutsu ignora
// alturas no puede ser bloqueado"). Its numbers are our proposal, waiting for his word.
// npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import { JUTSU, areaOf, edgeLength, enhanced } from './jutsu';
import { applyAction, createBattle } from './engine';
import { FAR_SCREEN, FAR_ZOOM, farViewSize, fitView, lineToView, viewAround } from './farView';
import { aiView, areaValue } from './intent';
import { aiAction } from './ai';
import { getMap, levelAtPt } from './map';
import type { MapDef } from './map';
import type { BattleState, ViewRect } from './types';
import { jutsuChoices } from '../rules/jutsuNature';
import { logLine } from '../components/battle/battleLog';
import { WIND_S_LINE_REF } from '../../tools/world-sprites/vfx-wind-s-line-refdata';
import { tintVfx } from '../sprite/vfxTint';

const RAY = 'wind_dragon_ray_s';
const WHOLE: ViewRect = { x0: 0, z0: 0, x1: 60.6, z1: 20 };

/**
 * Aki (wind) at x 5 on the bridge's row (z 8), aiming right along it; rogues on the row at x 12 (on
 * the ground), x 25 (the middle of the map) and x 50 (the far end, up on the hill), with 999 HP so
 * they stand through it. Its turn, with the ray and 30 chakra.
 */
function line(): BattleState {
  const b = createBattle({
    seed: 5, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal',
    party: [{ character: { ...DEFAULT_CHARACTER, id: 'a', name: 'Aki', effects: [] }, pos: { x: 5, z: 8 } }],
    enemies: [{ kind: 'rogue', pos: { x: 12, z: 8 } }, { kind: 'rogue', pos: { x: 25, z: 8 } }, { kind: 'rogue', pos: { x: 50, z: 8 } }], stealth: false,
    supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 },
  }).state;
  const t = structuredClone(b);
  t.turn = t.order.indexOf('a');
  const a = t.units.a;
  a.pos = { x: 5, z: 8 };
  a.turn = { move: a.speed, action: true, bonus: true, reaction: true, moved: 0 };
  a.jutsus = [RAY];
  a.chakra = 30;
  for (const [id, x] of [['rogue_0', 12], ['rogue_1', 25], ['rogue_2', 50]] as const) {
    t.units[id].pos = { x, z: 8 };
    t.units[id].hp = t.units[id].maxHp = 999;
  }
  return t;
}

const cast = (t: BattleState, view?: ViewRect, enh = false) => applyAction(t, { type: 'jutsu', unit: 'a', jutsu: RAY, at: { x: 10, z: 8 }, ...(view ? { view } : {}), ...(enh ? { enhanced: true } : {}) });
const saved = (out: ReturnType<typeof cast>) => out.events.filter((e) => e.t === 'save').map((e) => (e.t === 'save' ? e.unit : '')).sort();

describe('the Gale Dragon Ray: the jutsu', () => {
  it('Wind\'s second S-rank, with its names and our proposed numbers; a Wind ninja\'s S-rank slot offers it', () => {
    const j = JUTSUS_DATA.find((x) => x.id === RAY)!;
    assert.deepEqual(
      [j.name, j.nameEs, j.rank, j.category, j.nature, j.chakraCost, j.enhancementChakraCost, j.damageDice, j.damageType, j.savingThrow, j.saveEffect, j.areaOfEffect],
      ['Wind Technique: Gale Dragon Ray', 'Técnica de Viento: Rayo del Dragón Vendaval', 'S', 'Ultimate', 'Wind', 12, 4, '8d8', 'Slashing', 'DEX', 'Half Damage', 'Line'],
    );
    assert.deepEqual(JUTSUS_DATA.filter((x) => x.nature === 'Wind' && x.rank === 'S').map((x) => x.id), ['rasenshuriken_wind', RAY]);
    assert.ok(jutsuChoices('slot5Ultimate', 'Wind', 'Mirai').some((x) => x.id === RAY));
    assert.ok(!jutsuChoices('slot5Ultimate', 'Fire', 'Mirai').some((x) => x.id === RAY), 'only Wind');
  });

  it('a line 2 m wide, to the map\'s edge before the view stops it; enhanced, two more dice and the same 2 m', () => {
    const s = JUTSU[RAY];
    assert.deepEqual([s.shape, s.width, s.toEdge, s.dice, s.save, s.saveHalf, s.push?.m, s.cost, s.enhCost], ['line', 2, true, '8d8', 'dex', true, 3, 12, 4]);
    const map = getMap('river_forest');
    const right = areaOf(s, { x: 5, z: 8 }, { x: 10, z: 8 }, map);
    assert.ok(right?.kind === 'line' && Math.abs(right.length - (map.widthM - 5)) < 1e-9 && right.width === 2);
    const down = areaOf(s, { x: 5, z: 8 }, { x: 5, z: 9 }, map);
    assert.ok(down?.kind === 'line' && Math.abs(down.length - 12) < 1e-9, 'into the depth: to the map\'s near edge');
    assert.equal(edgeLength({ x: 10, z: 10 }, 180, 60, 20), 10);
    const e = enhanced(s);
    assert.deepEqual([e.dice, e.width, e.length], ['10d8', 2, s.length]);
  });

  it('the farthest view: the camera\'s last zoom step on a Full HD screen, in meters', () => {
    assert.equal(FAR_ZOOM, 1 / 3);
    assert.deepEqual(FAR_SCREEN, { w: 1920, h: 1080 });
    const v = farViewSize(getMap('river_forest'));
    assert.ok(Math.abs(v.w - 1920 * 3 / 57) < 1e-9 && Math.abs(v.d - 1080 * 3 / 38) < 1e-9);
  });

  it('in the view: everyone on the line is struck, up on the hill too, behind a metal wall too, and a clone or Kawarimi stops nothing', () => {
    const t = line();
    assert.ok(levelAtPt(t, t.units.rogue_2.pos) >= 1, 'rogue_2 stands higher');
    // A Kōton metal wall across the line, a clone on the first rogue, Kawarimi on the second.
    t.walls.push({ id: 'w1', kind: 'metal', a: { x: 9, z: 6 }, b: { x: 9, z: 10 }, hp: 20, maxHp: 20 });
    t.units.rogue_0.cond.clone = true;
    t.units.rogue_1.jutsus.push('substitution_kawarimi');
    t.units.rogue_1.chakra = 20;
    const out = cast(t, WHOLE);
    assert.ok(out.ok, out.reason);
    assert.deepEqual(saved(out), ['rogue_0', 'rogue_1', 'rogue_2']);
    assert.equal(out.state.pending, undefined, 'no reaction is offered');
    assert.ok(out.state.units.rogue_0.cond.clone, 'the clone took nothing');
    // Each is hurt, unless its natural 20 shrugged it off (the owner's rule A3); no Kawarimi swap.
    for (const id of ['rogue_0', 'rogue_1', 'rogue_2']) {
      const nat20 = out.events.some((e) => e.t === 'save' && e.unit === id && e.roll.crit);
      assert.ok(out.state.units[id].hp < 999 || nat20, `${id} is hurt`);
    }
    assert.ok(!out.events.some((e) => e.t === 'kawarimi' || e.t === 'clone'));
    assert.equal(out.state.units.a.chakra, 30 - 12);
    const ev = out.events.find((e) => e.t === 'jutsu');
    assert.ok(ev && ev.t === 'jutsu' && ev.view && ev.shape?.kind === 'line');
    assert.match(logLine(ev!, out.state, 'es')!.text, /Técnica de Viento: Rayo del Dragón Vendaval/);
    assert.match(logLine(ev!, out.state, 'en')!.text, /Wind Technique: Gale Dragon Ray/);
  });

  it('out of the view: on the line in the middle of the map or at its far end, no save, no damage, no push; the ray stops at the view\'s edge', () => {
    const t = line();
    const near: ViewRect = { x0: 0, z0: 0, x1: 18, z1: 20 };
    const out = cast(t, near);
    assert.ok(out.ok, out.reason);
    assert.deepEqual(saved(out), ['rogue_0']);
    for (const id of ['rogue_1', 'rogue_2']) {
      assert.equal(out.state.units[id].hp, 999, `${id} untouched`);
      assert.deepEqual(out.state.units[id].pos, t.units[id].pos, `${id} not pushed`);
    }
    const ev = out.events.find((e) => e.t === 'jutsu');
    assert.ok(ev && ev.t === 'jutsu' && ev.shape?.kind === 'line' && Math.abs(ev.shape.length - 13) < 1e-9, 'drawn from Aki to x 18, where the view ends');
    // The view where the player has the camera, not around the caster: only the far rogue.
    const far = cast(line(), { x0: 40, z0: 0, x1: 60.6, z1: 20 });
    assert.deepEqual(saved(far), ['rogue_2']);
    // A view the line never crosses: nothing at all.
    const miss = cast(line(), { x0: 20, z0: 14, x1: 40, z1: 20 });
    assert.ok(miss.ok);
    assert.deepEqual(saved(miss), []);
    // With no view sent, the farthest view around the caster (here the whole map).
    assert.deepEqual(saved(cast(line())), ['rogue_0', 'rogue_1', 'rogue_2']);
  });

  it('a view bigger than the farthest one shrinks around its middle, and stays on the map like the camera', () => {
    const big = { widthM: 400, depthM: 300, px: { perM: 57, perMDepth: 38 } } as unknown as MapDef;
    const max = farViewSize(big);
    const v = fitView(big, { x0: 0, z0: 0, x1: 400, z1: 300 });
    assert.ok(Math.abs(v.x1 - v.x0 - max.w) < 1e-9 && Math.abs(v.z1 - v.z0 - max.d) < 1e-9, 'no bigger than the farthest view');
    assert.ok(Math.abs((v.x0 + v.x1) / 2 - 200) < 1e-9, 'around its middle');
    const edge = fitView(big, { x0: -50, z0: -50, x1: 10, z1: 10 });
    assert.ok(edge.x0 === 0 && edge.z0 === 0, 'kept on the map');
    // The AI has no camera: the same size around its target.
    const ai = viewAround(big, { x: 200, z: 150 });
    assert.ok(Math.abs(ai.x1 - ai.x0 - max.w) < 1e-9 && Math.abs((ai.x0 + ai.x1) / 2 - 200) < 1e-9);
    // On a map smaller than the view, the view holds the map in its middle.
    const rf = getMap('river_forest');
    const whole = fitView(rf, { x0: 0, z0: 0, x1: 500, z1: 500 });
    assert.ok(whole.x0 < 0 && whole.x1 > rf.widthM && Math.abs(whole.x0 + whole.x1 - rf.widthM) < 1e-9);
    // A line stops where it leaves a view, and has no length if it misses it.
    const l = lineToView({ kind: 'line', origin: { x: 5, z: 8 }, dir: 0, length: 50, width: 2 }, { x0: 0, z0: 0, x1: 30, z1: 20 });
    assert.ok(l.kind === 'line' && l.length === 25);
  });

  it('the AI casts it at two foes or more in its line, with a view around its target, and not at one', () => {
    const t = line();
    // Turn it around: Aki's line seen from rogue_0, the AI, aiming at Aki and a second party member.
    const ai = t.units.rogue_0;
    ai.jutsus = [RAY];
    ai.chakra = 30;
    const map = getMap(t.mapId);
    const v = aiView(t, t.units.a.pos);
    assert.deepEqual(v, viewAround(map, t.units.a.pos));
    assert.equal(areaValue(t, ai, JUTSU[RAY], t.units.a), 0, 'one foe in the line: not worth it');
    const two = structuredClone(t);
    two.units.b = { ...structuredClone(two.units.a), id: 'b', name: 'Bo', pos: { x: 3, z: 8 } };
    assert.ok(areaValue(two, two.units.rogue_0, JUTSU[RAY], two.units.a) >= 2, 'two foes: worth it');
    // Its turn: it casts with a view.
    two.turn = two.order.indexOf('rogue_0');
    two.order.push('b');
    const r = two.units.rogue_0;
    r.turn = { move: r.speed, action: true, bonus: true, reaction: true, moved: 0 };
    r.hp = 999;
    const act = aiAction(two);
    if (act?.type === 'jutsu' && act.jutsu === RAY) assert.ok(act.view, 'the action carries its view');
  });
});

describe('the Gale Dragon Ray: his layers (his paint-over, waiting for his yes)', () => {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const L = WIND_S_LINE_REF;

  it('his canvas: 480x267 of his pixels, one per game px; the hand, the ground and a stretch that repeats', () => {
    assert.deepEqual([L.native, L.k], [[480, 267], 1]);
    assert.ok(L.hand[0] > 110 && L.hand[0] < 130 && L.hand[1] > 145 && L.hand[1] < 170, `hand ${L.hand}`);
    assert.ok(L.tile[1] % 8 === 0 && L.tile[0] > L.hand[0] && L.tile[0] + L.tile[1] < 330, `tile ${L.tile}`);
    assert.ok(L.pal.length <= 64 && L.pal.slice(0, L.opaque).every((c) => c.endsWith('ff')));
  });

  it('every layer is his pixels at his places: each probe of his picture is there, in a colour of his near it', () => {
    for (const [name, probes] of Object.entries(L.probes)) {
      const p = L.layers[name as keyof typeof L.layers];
      assert.ok(probes.length >= 16, name);
      for (const [x, y, his] of probes) {
        const ch = p.rows[y - p.y]?.[x - p.x];
        assert.ok(ch && ch !== '.', `${name}: his pixel (${x}, ${y}) is in the layer`);
        const c = L.pal[A.indexOf(ch)];
        if (!c.endsWith('ff')) continue; // his glow: his colour over his night, unmixed
        const d = Math.hypot(...rgb(c).map((v, i) => v - rgb(his)[i]));
        assert.ok(d < 48, `${name} (${x}, ${y}): ${c} vs his ${his}`);
      }
    }
  });

  it('the dragon at the front, the kanji above the beam, the dust at the feet and under the dragon', () => {
    const box = (p: { x: number; y: number; rows: string[] }) => [p.x, p.y, p.x + Math.max(...p.rows.map((r) => r.length)), p.y + p.rows.length];
    const [bx0, by0, bx1] = box(L.layers.beam);
    const [dx0, , dx1] = box(L.layers.dragon);
    const [kx0, ky0, kx1, ky1] = box(L.layers.kanji);
    const [lx0, , lx1] = box(L.layers.dust_l);
    const [rx0, , rx1] = box(L.layers.dust_r);
    assert.ok(dx1 > bx1 && dx0 > L.hand[0] + 150, 'the dragon leads the beam');
    assert.ok(kx0 > bx0 && kx1 < dx1 && ky1 < L.hand[1] && ky0 < by0 + 20, 'the kanji above the beam');
    assert.ok(lx0 < L.hand[0] && lx1 < rx0 && rx1 > dx0, 'the dust at both ends');
  });
});

describe('the Gale Dragon Ray in a chakra colour (Aurelia: yellow, the owner 2026-10-24)', () => {
  // His opaque colours, one pixel each, as one of the ray's sheets.
  const L = WIND_S_LINE_REF;
  const his = L.pal.slice(0, L.opaque).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const rgba = new Uint8Array(his.length * 4);
  his.forEach((c, i) => rgba.set([...c, 255], i * 4));
  const sheet = { width: his.length, height: 1, sprite: 'tile' };
  const luma = (c: number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

  it('green (Natural for wind) keeps his pixels; yellow keeps his brightness steps, his near-white core and his near-black', () => {
    assert.equal(tintVfx(rgba, 'wind', 'green', sheet), rgba);
    const y = tintVfx(rgba, 'wind', 'yellow', sheet);
    const px = (i: number) => [...y.subarray(i * 4, i * 4 + 3)];
    for (let i = 0; i < his.length; i++) {
      // His values stay his: the same order of brightness, within a few steps of his own.
      assert.ok(Math.abs(luma(px(i)) - luma(his[i])) < 40, `${L.pal[i]}: its brightness`);
      if (i > 0) assert.ok(luma(px(i)) >= luma(px(i - 1)) - 6, `${L.pal[i]}: brighter than the one before`);
    }
    // His core stays nearly white, his darkest stays his.
    assert.ok(Math.min(...px(his.length - 1)) > 215, 'the core');
    assert.deepEqual(px(0), his[0], 'his near-black');
    // His teal middle turns yellow (red and green above blue).
    const mid = px(Math.floor(his.length / 2));
    assert.ok(mid[0] > mid[2] + 40 && mid[1] > mid[2] + 40, `yellow: ${mid}`);
  });
});
