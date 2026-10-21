// Tests for the owner's Solen (docs/reference/solen-owner-reference.jpg, 2026-10-21): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { migrateCharacter } from '../rules/ninja';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import * as cape from './items/founderCapeArt';
import * as cowl from './items/founderCowlArt';
import * as cuirass from './items/founderCuirassArt';
import * as hair from './items/founderHairArt';
import * as sandals from './items/founderSandalsArt';
import * as skirt from './items/founderSkirtArt';
import * as trousers from './items/founderTrousersArt';
import * as tunic from './items/founderTunicArt';
import * as reach from './items/founderReachArt';
import * as sword from './items/iceSwordArt';
import * as bracers from './items/steelBracersArt';
import { dojutsuToEye, getAppearance } from './legacy';
import { continuedTo, limbOnly, type PaintedPiece } from './painted';
import { GRID, MaterialTable, partIndex, RES } from './raster';
import type { DrawCtx } from './ctx';
import { founderFarOut, founderFarReach, founderLegOut } from './items/founderOut';
import { buildRig, frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const solen = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_founder')!.character;
const look = (body: BodyType = 'male'): SpriteAppearance => ({ ...structuredClone(getAppearance(solen)), body });
const render = (l: SpriteAppearance, pose: SpritePose, f: number) => renderSprite(l, pose, f, dojutsuToEye(solen.dojutsu));

const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/** How many of a piece's cells the idle frame shows in his colour where the script says it lands. */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number]): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      n++;
      const p = (rest[1] + j) * GRID + rest[0] + i;
      if (opaque(rgba, p) && hex(rgba, p) === piece.colors[row[i]]) hit++;
    }
  });
  return hit / n;
}

/** Distance from p to the segment a-b. */
function toSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

describe("the owner's Solen", () => {
  it('lands every piece on his pixels at rest, where his scripts placed it (his far arm and legs where he drew them)', () => {
    const f = render(look(), 'idle', 0);
    // What each piece shows of his pixels in our idle (the rest lies under pieces in front of it: the
    // cape under the body, the trousers under the skirt and the blade, the sword's grip under the fist).
    const least: [string, PaintedPiece, [number, number], number][] = [
      ['chest', cuirass.FOUNDER_CHEST, cuirass.FOUNDER_CUIRASS_REST.FOUNDER_CHEST, 0.9],
      ['cowl', cowl.FOUNDER_COWL_NECK, cowl.FOUNDER_COWL_REST.FOUNDER_COWL_NECK, 0.95],
      ['cowl over the near shoulder', cowl.FOUNDER_COWL_NEAR, cowl.FOUNDER_COWL_REST.FOUNDER_COWL_NEAR, 0.95],
      ['shoulder stud', cowl.FOUNDER_COWL_STUD_F, cowl.FOUNDER_COWL_REST.FOUNDER_COWL_STUD_F, 0.95],
      ['cape', cape.FOUNDER_CAPE, cape.FOUNDER_CAPE_REST.FOUNDER_CAPE, 0.3],
      ['near sleeve', tunic.FOUNDER_SLEEVE_N, tunic.FOUNDER_TUNIC_REST.FOUNDER_SLEEVE_N, 0.85],
      ['near arm', tunic.FOUNDER_ARM_N, tunic.FOUNDER_TUNIC_REST.FOUNDER_ARM_N, 0.75],
      ['far arm', tunic.FOUNDER_ARM_F, tunic.FOUNDER_TUNIC_REST.FOUNDER_ARM_F, 0.6],
      ['near fist', tunic.FOUNDER_HAND_N, tunic.FOUNDER_TUNIC_REST.FOUNDER_HAND_N, 0.85],
      ['far fist', tunic.FOUNDER_HAND_F, tunic.FOUNDER_TUNIC_REST.FOUNDER_HAND_F, 0.95],
      ['near bracer', bracers.STEEL_BRACER_N, bracers.STEEL_BRACER_REST.STEEL_BRACER_N, 0.95],
      ['far bracer', bracers.STEEL_BRACER_F, bracers.STEEL_BRACER_REST.STEEL_BRACER_F, 0.6],
      ['skirt', skirt.FOUNDER_SKIRT, skirt.FOUNDER_SKIRT_REST.FOUNDER_SKIRT, 0.7],
      ['near trouser leg', trousers.FOUNDER_THIGH_N, trousers.FOUNDER_TROUSERS_REST.FOUNDER_THIGH_N, 0.65],
      ['far trouser leg', trousers.FOUNDER_THIGH_F, trousers.FOUNDER_TROUSERS_REST.FOUNDER_THIGH_F, 0.35],
      ['near shin', sandals.FOUNDER_SANDAL_SHIN_N, sandals.FOUNDER_SANDAL_REST.FOUNDER_SANDAL_SHIN_N, 0.9],
      ['near sandal', sandals.FOUNDER_SANDAL_FOOT_N, sandals.FOUNDER_SANDAL_REST.FOUNDER_SANDAL_FOOT_N, 0.95],
      ['far shin', sandals.FOUNDER_SANDAL_SHIN_F, sandals.FOUNDER_SANDAL_REST.FOUNDER_SANDAL_SHIN_F, 0.6],
      ['far sandal', sandals.FOUNDER_SANDAL_FOOT_F, sandals.FOUNDER_SANDAL_REST.FOUNDER_SANDAL_FOOT_F, 0.95],
      ['sword', sword.ICE_SWORD, sword.ICE_SWORD_REST.ICE_SWORD, 0.9],
    ];
    const short = least.map(([name, piece, rest, min]) => [name, atRest(f.rgba, piece, rest), min] as const).filter(([, got, min]) => got < min);
    assert.deepEqual(
      short.map(([name, got]) => `${name}: ${(got * 100).toFixed(0)}% of his pixels in place`),
      [],
    );
  });

  it('wears his hair, his face and his colours', () => {
    const l = look();
    assert.equal(l.slots.hair?.id, 'hair_founder_spikes');
    assert.equal(l.faceShape, 'founder');
    assert.equal(l.slots.held?.id, 'held_ice_crystal');
    assert.equal(l.slots.feet?.id, 'feet_gladiator_sandals');
    // His hair's colours in the frame, round the face anchor.
    const f = render(l, 'idle', 0);
    const his = new Set(Object.values(hair.FOUNDER_HAIR_FRONT.colors));
    let n = 0;
    for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i) && his.has(hex(f.rgba, i))) n++;
    assert.ok(n > 250, `${n} pixels of his hair`);
  });

  it('draws every pose on the male, bulky, slender and female bodies, the bracers on the forearms', () => {
    for (const body of ['male', 'bulky', 'slender', 'female'] as BodyType[]) {
      const l = look(body);
      for (const pose of POSES) {
        const f = render(l, pose, 1);
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i)) n++;
        assert.ok(n > 1500, `${body} ${pose}: ${n} pixels`);
        // His bracers' steel lies on (or beside) a forearm, wherever the arm is.
        const r = buildRig(body, rigPoseFor(pose, l.cast?.style, l.slots.held?.id), 1);
        const segs = [
          [r.elbowN, r.wristN],
          [r.elbowF, r.wristF],
        ].map(([a, b]) => [{ x: a.x * RES, y: a.y * RES }, { x: b.x * RES, y: b.y * RES }]);
        const steel = new Set(Object.values(bracers.STEEL_BRACER_N.colors).concat(Object.values(bracers.STEEL_BRACER_F.colors)).filter((h) => bracers.STEEL_BRACER_KIND[h] !== 'line'));
        let off = 0;
        let all = 0;
        for (let i = 0; i < GRID * GRID; i++) {
          if (!opaque(f.rgba, i) || !steel.has(hex(f.rgba, i))) continue;
          all++;
          if (Math.min(...segs.map(([a, b]) => toSegment({ x: (i % GRID) + 0.5, y: Math.floor(i / GRID) + 0.5 }, a, b))) > 8) off++;
        }
        assert.ok(off <= all * 0.25 + 4, `${body} ${pose}: ${off} of ${all} bracer pixels off the forearms`);
      }
    }
  });

  it('stands his legs where he drew them at rest, on our legs as soon as they move, and his far arm where he drew it while it hangs', () => {
    const l = look();
    const ctx = (pose: SpritePose, f: number) => ({ rig: buildRig('male', rigPoseFor(pose, l.cast?.style, l.slots.held?.id), f), has: (slot: string, id?: string) => (l.slots as Record<string, { id: string }>)[slot]?.id === id }) as unknown as DrawCtx;
    for (let f = 0; f < 4; f++) for (const s of ['N', 'F'] as const) assert.equal(founderLegOut(ctx('idle', f), s).w, 1, `idle ${f} ${s}`);
    for (const pose of ['walk', 'run', 'attack', 'throw', 'pierce', 'combo', 'crouch', 'sneak', 'sit', 'train'] as SpritePose[]) {
      for (let f = 0; f < frameCount(rigPoseFor(pose, l.cast?.style, l.slots.held?.id)); f++) {
        // Both legs together, never one: no frame of a kick or a step slides a leg by itself.
        assert.equal(founderLegOut(ctx(pose, f), 'N').w, founderLegOut(ctx(pose, f), 'F').w, `${pose} ${f}`);
        if (pose !== 'combo') assert.equal(founderLegOut(ctx(pose, f), 'N').w, 0, `${pose} ${f}`);
      }
    }
    for (let f = 0; f < 4; f++) assert.equal(founderFarOut(ctx('idle', f)).w, 1);
    // Reaching out (a throw, a cast), our far arm's own joints.
    for (const [pose, f] of [['throw', 1], ['throw', 3], ['cast', 0], ['handsigns', 0]] as [SpritePose, number][]) assert.equal(founderFarOut(ctx(pose, f)).w, 0, `${pose} ${f}`);
  });

  it('draws the colours saved with the ice crystal sword and the sandals before his repaint as his', () => {
    const his = render(look(), 'idle', 0);
    const old = look();
    old.slots.held = { id: 'held_ice_crystal', colors: ['#74aac4', '#3e5f7f'] };
    old.slots.feet = { id: 'feet_gladiator_sandals', colors: ['#2c2224'] };
    const a = render(old, 'idle', 0);
    let diff = 0;
    for (let i = 0; i < GRID * GRID * 4; i++) if (a.rgba[i] !== his.rgba[i]) diff++;
    assert.equal(diff, 0);
  });

  it('keeps the preset id, every item it wears exists, and a saved Solen loads', () => {
    const l = getAppearance(solen);
    for (const [slot, c] of Object.entries(l.slots)) assert.ok(c && getItem(c.id), `${slot}: ${c?.id}`);
    for (const c of l.accessories) assert.ok(getItem(c.id), c.id);
    // A Solen saved before his repaint (his old items, the crystal greatsword) still loads and draws.
    const saved = JSON.parse(JSON.stringify(solen));
    saved.appearance.slots.held = { id: 'held_crystal', colors: [] };
    saved.appearance.slots.hair = { id: 'hair_midnight', colors: ['#2f3c54'] };
    const back = migrateCharacter(saved);
    assert.equal(back.id, 'preset_founder');
    const f = renderSprite(getAppearance(back), 'idle', 0);
    let n = 0;
    for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i)) n++;
    assert.ok(n > 1500);
  });

  it('draws his arms and legs in every pose and frame, never ours beside or instead of them', () => {
    const l = look();
    // Our arm's skin and our trouser leg, as the body and the trousers under his pieces would show them.
    const mats = new MaterialTable();
    const ramp = (h: string, kind: 'skin' | 'cloth') => mats.ramps[mats.get(h, kind)].slice(1).map((c) => c.toLowerCase());
    const ours = new Set([...ramp(l.skin, 'skin'), ...ramp(trousers.FOUNDER_TROUSERS, 'cloth')]);
    const limbs = (['upperArmN', 'upperArmF', 'forearmN', 'forearmF', 'thighN', 'thighF', 'shinN', 'shinF'] as const).map((p) => partIndex(p));
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const lb = { ...l, body };
      for (const pose of POSES) {
        const rp = rigPoseFor(pose, lb.cast?.style, lb.slots.held?.id);
        for (let f = 0; f < frameCount(rp); f++) {
          const fr = render(lb, pose, f);
          const r = buildRig(body, rp, f);
          // His fist closes every hand but a pointing one and one cradling a book (our hand pictures).
          const his = (s: 'N' | 'F') => !['point', 'cradle'].includes((s === 'N' ? r.shapeN : r.shapeF) ?? '');
          const mine = new Set([...limbs, ...(his('N') ? [partIndex('handN')] : []), ...(his('F') ? [partIndex('handF')] : [])]);
          let n = 0;
          for (let i = 0; i < GRID * GRID; i++) if (opaque(fr.rgba, i) && mine.has(fr.part[i]) && ours.has(hex(fr.rgba, i))) n++;
          assert.equal(n, 0, `${body} ${pose} ${f}: ${n} pixels of our arm or trouser leg`);
        }
      }
    }
  });

  it('closes his fists where our hands meet in the hand signs', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (let f = 0; f < frameCount('handsigns'); f++) {
        const fr = render(look(body), 'handsigns', f);
        const at = (p: number) => [...fr.part.keys()].filter((i) => fr.part[i] === p && opaque(fr.rgba, i)).map((i) => [i % GRID, Math.floor(i / GRID)]);
        const near = at(partIndex('handN'));
        const far = at(partIndex('handF'));
        // (the far fist mostly behind the near one)
        assert.ok(near.length > 20 && far.length > 0, `${body} ${f}: both fists drawn`);
        // They touch: at most his black line between them.
        const gap = Math.min(...near.map(([x, y]) => Math.min(...far.map(([u, w]) => Math.hypot(x - u, y - w)))));
        assert.ok(gap < 3, `${body} ${f}: fists ${gap.toFixed(1)} px apart`);
      }
    }
  });

  it('takes only the limb along as it moves, his far arm continued up to the shoulder', () => {
    const line = (h: string) => tunic.FOUNDER_TUNIC_KIND[h] === 'line';
    // His far upper arm was lifted with the skirt's red beside it.
    const arm = limbOnly(tunic.FOUNDER_ARM_F, line);
    const red = Object.keys(tunic.FOUNDER_ARM_F.colors).filter((ch) => tunic.FOUNDER_TUNIC_KIND[tunic.FOUNDER_ARM_F.colors[ch]] === 'red');
    assert.ok(red.length > 0 && arm.rows.every((row) => red.every((ch) => !row.includes(ch))));
    // Every cell kept is his, where he put it.
    arm.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && assert.equal(ch, tunic.FOUNDER_ARM_F.rows[y][x])));
    // Continued up to the shoulder (the pivot), closed there by his line; below the row it continues, his rows.
    const up = continuedTo(arm, tunic.FOUNDER_ARM_F.pivot[1], 2, line, (h) => tunic.FOUNDER_TUNIC_KIND[h] === 'skin');
    assert.equal(up.pivot[1], 0);
    assert.ok([...up.rows[0]].every((ch) => ch === '.' || line(up.colors[ch])));
    assert.deepEqual(up.rows.slice(-4), arm.rows.slice(-4).map((r) => '.'.repeat(up.pivot[0] - arm.pivot[0]) + r));
  });

  it('reaches out with his near arm mirrored, every cell his: the far arm he drew is too thin to read stretched out', () => {
    // Each piece is his near one with its rows reversed, its joint and angle mirrored with them, in his colours.
    const pairs: [PaintedPiece, PaintedPiece][] = [
      [reach.FOUNDER_REACH_SLEEVE_F, tunic.FOUNDER_SLEEVE_N],
      [reach.FOUNDER_REACH_ARM_F, tunic.FOUNDER_ARM_N],
      [reach.FOUNDER_REACH_BRACER_F, bracers.STEEL_BRACER_N],
      [reach.FOUNDER_REACH_HAND_F, tunic.FOUNDER_HAND_N],
    ];
    for (const [m, his] of pairs) {
      const w = Math.max(...his.rows.map((r) => r.length));
      assert.deepEqual(m.rows.map((r) => [...r].reverse().map((ch) => (ch === '.' ? '.' : m.colors[ch]))), his.rows.map((r) => [...r.padEnd(w, '.')].map((ch) => (ch === '.' ? '.' : his.colors[ch]))));
      assert.deepEqual(m.pivot, [w - 1 - his.pivot[0], his.pivot[1]]);
      assert.ok(Math.abs(m.angle - (180 - his.angle)) < 0.01);
    }
    // The far arm reaches out when it is held out straight and near level: the cast at the runes, the throw's
    // pointing arm, the combo's cross, and held out over the fire at camp.
    const has = (slot: string, id?: string) => slot === 'top' && id === 'top_founder';
    for (const body of ['male', 'bulky', 'slender', 'female'] as BodyType[]) {
      const hits: string[] = [];
      for (const pose of POSES) {
        const rp = rigPoseFor(pose, 'runes', 'held_ice_crystal');
        for (let f = 0; f < frameCount(rp); f++) if (founderFarReach({ rig: buildRig(body, rp, f), has } as unknown as DrawCtx)) hits.push(`${pose} ${f}`);
      }
      assert.deepEqual(hits.sort(), ['cast 0', 'cast 1', 'combo 2', 'sit 0', 'sit 1', 'sit 2', 'sit 3', 'throw 0', 'throw 1'], body);
    }
    // Reaching out, the far forearm is as thick as his near bracer (it was his far one, a third as much).
    const bracer = limbOnly(bracers.STEEL_BRACER_N, (h) => bracers.STEEL_BRACER_KIND[h] === 'line');
    const cells = bracer.rows.join('').replace(/\./g, '').length;
    for (const body of ['male', 'bulky'] as BodyType[])
      for (const [pose, f] of [['cast', 0], ['cast', 1], ['throw', 0], ['throw', 1], ['combo', 2]] as [SpritePose, number][]) {
        const fr = render(look(body), pose, f);
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) if (opaque(fr.rgba, i) && fr.part[i] === partIndex('forearmF')) n++;
        assert.ok(n >= 0.85 * cells, `${body} ${pose} ${f}: far forearm ${n} px, his near bracer ${cells}`);
      }
  });
});
