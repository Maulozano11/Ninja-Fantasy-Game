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
import { founderArmAtRest, founderFarOut, founderFarReach, founderLegOut } from './items/founderOut';
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

  it('draws every pose on the male, bulky and female bodies, the bracers on the forearms', () => {
    for (const body of ['male', 'bulky', 'female'] as BodyType[]) {
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
        // The far fist mostly (in frame 1 wholly) behind the near one: where it shows, else its wrist.
        const r = buildRig(body, 'handsigns', f);
        const shown = at(partIndex('handF'));
        const far = shown.length ? shown : [[r.wristF.x * RES, r.wristF.y * RES]];
        assert.ok(near.length > 20, `${body} ${f}: the near fist drawn`);
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
    for (const body of ['male', 'bulky', 'female'] as BodyType[]) {
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

  it("gives the far calf a little more, his own columns repeated, tapering to the ankle", () => {
    // The owner on combo frame 2: "le falta más pantorrilla a la pierna izquierda ponla un poco más gruesa
    // solo un poco" (tools/refs/solen-sandals-from-ref.py CALF_ROWS, CALF_COL).
    const shin = sandals.FOUNDER_SANDAL_SHIN_F;
    const line = (ch: string) => sandals.FOUNDER_SANDAL_KIND[shin.colors[ch]] === 'line';
    const inside = shin.rows.map((row) => [...row].filter((ch) => ch !== '.' && !line(ch)).length);
    // His calf rows (under the strap band, rows 3-7) each with his cell at column 4 drawn twice; the
    // ankle (rows 8-9) as he drew it.
    for (let y = 3; y <= 7; y++) assert.equal(shin.rows[y][3], shin.rows[y][4], `row ${y}: ${shin.rows[y]}`);
    assert.deepEqual(inside, [0, 1, 2, 5, 5, 5, 4, 4, 4, 4]);
    assert.deepEqual(shin.rows.slice(8), ['...dlklqc', '...arstqa']);
    // In the game: the far shin a pixel wider than he drew it (6 across with his line), on male and bulky.
    for (const body of ['male', 'bulky'] as BodyType[])
      for (const [pose, f] of [['combo', 2], ['walk', 4], ['attack', 1]] as [SpritePose, number][]) {
        const fr = render(look(body), pose, f);
        const rows = new Map<number, number>();
        for (let i = 0; i < GRID * GRID; i++) if (opaque(fr.rgba, i) && fr.part[i] === partIndex('shinF')) rows.set(Math.floor(i / GRID), (rows.get(Math.floor(i / GRID)) ?? 0) + 1);
        const across = [...rows.values()].sort((a, b) => a - b);
        assert.ok(across[Math.floor(across.length * 0.75)] >= 7, `${body} ${pose} ${f}: far shin ${across.join(',')}`);
      }
  });

  it('draws one figure in every pose and frame: no speck apart from it, no limb or sandal come loose', () => {
    // Without his chakra and the cast's runes (effects drawn apart from him on purpose).
    const still = (body: BodyType): SpriteAppearance => ({ ...look(body), chakra: { ...look(body).chakra!, onCharge: false, onCast: false, onVictory: false } });
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const l = still(body);
      for (const pose of POSES) {
        const rp = rigPoseFor(pose, l.cast?.style, l.slots.held?.id);
        for (let f = 0; f < frameCount(rp); f++) {
          const fr = render(l, pose, f);
          const lab = new Int32Array(GRID * GRID);
          const sizes: number[] = [0];
          for (let i = 0; i < GRID * GRID; i++) {
            if (!opaque(fr.rgba, i) || lab[i]) continue;
            const id = sizes.length;
            let n = 0;
            const stack = [i];
            lab[i] = id;
            while (stack.length) {
              const j = stack.pop()!;
              n++;
              const x = j % GRID;
              const y = Math.floor(j / GRID);
              for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++) {
                  const k = (y + dy) * GRID + x + dx;
                  if (x + dx >= 0 && x + dx < GRID && y + dy >= 0 && y + dy < GRID && !lab[k] && opaque(fr.rgba, k)) {
                    lab[k] = id;
                    stack.push(k);
                  }
                }
            }
            sizes.push(n);
          }
          const main = sizes.indexOf(Math.max(...sizes));
          const loose = new Map<string, number>();
          for (let i = 0; i < GRID * GRID; i++) {
            if (!lab[i] || lab[i] === main || (pose === 'cast' && fr.part[i] === partIndex('handF'))) continue;
            const p = `${lab[i]}`;
            loose.set(p, (loose.get(p) ?? 0) + 1);
          }
          assert.equal(loose.size, 0, `${body} ${pose} ${f}: ${[...loose.values()].join(', ')} px apart from the figure`);
        }
      }
    }
  });

  it("shows no background and no stray white at his cowl's studs in any pose, frame or body", () => {
    // The owner, 2026-10-22: "aqui tiene unos aun en la hebilla o medallon de la capa". The near end and the
    // white stud ride the shoulders and the cowl round the neck the torso; the seam between them is filled
    // as it opens (fillSeams in sprite/seams.ts), at rest too ("solen rellenar": the bulky body's idle).
    // Round each gold stud (2 px about it): no transparent pixel the figure walls in (within 3 px left,
    // right, above and below), and no near-white pixel that is not one of his own colours (his white stud,
    // his steel's highlights), but a book or the eyes passing by.
    const gold = new Set(Object.entries(cowl.FOUNDER_COWL_KIND).filter(([, k]) => k === 'gold').map(([h]) => h));
    const his = new Set(
      [cowl, cuirass, cape, tunic, reach, sword, bracers, hair, skirt, trousers, sandals].flatMap((m) =>
        Object.entries(m as Record<string, unknown>)
          .filter(([k]) => k.endsWith('_KIND'))
          .flatMap(([, v]) => Object.keys(v as Record<string, string>)),
      ),
    );
    const passing = new Set([partIndex('held'), partIndex('head')]);
    const bad: string[] = [];
    for (const body of ['male', 'female', 'bulky'] as BodyType[]) {
      const l = look(body);
      for (const pose of POSES) {
        const rp = rigPoseFor(pose, l.cast?.style, l.slots.held?.id);
        for (let f = 0; f < frameCount(rp); f++) {
          const fr = render(l, pose, f);
          const on = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && opaque(fr.rgba, y * GRID + x);
          const walled = (x: number, y: number, dx: number, dy: number) => [1, 2, 3].some((k) => on(x + dx * k, y + dy * k));
          // His studs: his gold near the neck and shoulders, in clusters (pixels within 3 px of each other).
          const js = [fr.rig.neck, fr.rig.shoulderN, fr.rig.shoulderF].map((p) => [Math.floor(p.x * RES), Math.floor(p.y * RES)]);
          const near = (x: number, y: number) => js.some(([jx, jy]) => Math.abs(x - jx) <= 10 && Math.abs(y - jy) <= 10);
          const studs: number[][][] = [];
          for (let i = 0; i < GRID * GRID; i++) {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            if (!opaque(fr.rgba, i) || !gold.has(hex(fr.rgba, i)) || !near(x, y)) continue;
            const c = studs.find((s) => s.some(([sx, sy]) => Math.abs(sx - x) <= 3 && Math.abs(sy - y) <= 3));
            if (c) c.push([x, y]);
            else studs.push([[x, y]]);
          }
          const seen = new Set<number>();
          for (const s of studs) {
            const xs = s.map((p) => p[0]);
            const ys = s.map((p) => p[1]);
            for (let y = Math.min(...ys) - 2; y <= Math.max(...ys) + 2; y++)
              for (let x = Math.min(...xs) - 2; x <= Math.max(...xs) + 2; x++) {
                const i = y * GRID + x;
                if (seen.has(i)) continue;
                seen.add(i);
                if (!opaque(fr.rgba, i)) {
                  if (walled(x, y, -1, 0) && walled(x, y, 1, 0) && walled(x, y, 0, -1) && walled(x, y, 0, 1)) bad.push(`${body} ${pose} ${f}: background at ${x},${y}`);
                } else if (Math.min(fr.rgba[i * 4], fr.rgba[i * 4 + 1], fr.rgba[i * 4 + 2]) > 190 && !his.has(hex(fr.rgba, i)) && !passing.has(fr.part[i])) {
                  bad.push(`${body} ${pose} ${f}: ${hex(fr.rgba, i)} at ${x},${y}`);
                }
              }
          }
          if (pose === 'walk' && f === 0 && studs.length < 2) bad.push(`${body} walk 0: ${studs.length} studs found`);
        }
      }
    }
    assert.deepEqual(bad, []);
  });

  it('keeps his black line round his turned legs and fists: none of their colour lies bare against the air', () => {
    const limbs = new Set((['shinN', 'shinF', 'footN', 'footF'] as const).map((p) => partIndex(p)));
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const pose of POSES) {
        const lb = look(body);
        const rp = rigPoseFor(pose, lb.cast?.style, lb.slots.held?.id);
        for (let f = 0; f < frameCount(rp); f++) {
          const fr = render(lb, pose, f);
          const r = buildRig(body, rp, f);
          // His fists as they turn (at rest each lies as he drew it, against what he drew beside it), not a
          // pointing hand or one cradling a book (our hand pictures), and not the cast's runes.
          const g = { rig: r, has: (slot: string, id?: string) => (lb.slots as Record<string, { id: string }>)[slot]?.id === id } as unknown as DrawCtx;
          const fist = (s: 'N' | 'F') => !['point', 'cradle'].includes((s === 'N' ? r.shapeN : r.shapeF) ?? '') && !founderArmAtRest(g, s) && !(s === 'F' && pose === 'cast');
          const fists = new Set([...limbs, ...(fist('N') ? [partIndex('handN')] : []), ...(fist('F') ? [partIndex('handF')] : [])]);
          const air = outside(fr.rgba);
          const bare: string[] = [];
          for (let i = 0; i < GRID * GRID; i++) {
            if (!opaque(fr.rgba, i) || !fists.has(fr.part[i]) || luma(fr.rgba, i) <= 70) continue;
            if ([i - 1, i + 1, i - GRID, i + GRID].some((j) => air[j])) bare.push(`${i % GRID},${Math.floor(i / GRID)}`);
          }
          assert.deepEqual(bare, [], `${body} ${pose} ${f}`);
        }
      }
    }
  });
});

/** Light of a pixel (0-255). */
function luma(rgba: Uint8ClampedArray, i: number): number {
  return 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
}

/** The air round the figure: the transparent pixels reached from the frame's edge (not a hole inside it). */
function outside(rgba: Uint8ClampedArray): Uint8Array {
  const air = new Uint8Array(GRID * GRID);
  const stack: number[] = [];
  for (let k = 0; k < GRID; k++) stack.push(k, (GRID - 1) * GRID + k, k * GRID, k * GRID + GRID - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (air[i] || rgba[i * 4 + 3] > 0) continue;
    air[i] = 1;
    const x = i % GRID;
    if (x > 0) stack.push(i - 1);
    if (x < GRID - 1) stack.push(i + 1);
    if (i >= GRID) stack.push(i - GRID);
    if (i < GRID * (GRID - 1)) stack.push(i + GRID);
  }
  return air;
}

