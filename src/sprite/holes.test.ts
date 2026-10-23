// Tests for the 1-pixel holes (sprite/holes.ts) and the weapons stowed on the back (clipStowed in
// items/accessories.ts): the owner, 2026-10-22, "si arregla el hueco de 1 pixel a todos si haz el cambio en
// espada guardada". npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyCharacter, type EnemyKind } from '../battle/units';
import { COMPANIONS } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import { renderSprite, type SpriteFrame } from './compose';
import { airOf, closePinholes, findNicks, findPinholes, PINHOLE } from './holes';
import { frontOfBack } from './items/accessories';
import { defaultAppearance, dojutsuToEye, getAppearance } from './legacy';
import { GRID, partIndex } from './raster';
import { frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type EyeSpecial, type SpriteAppearance, type SpritePose } from './types';

const N = GRID * GRID;
const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;
const bit = (m: Uint8Array | undefined, i: number) => !!m && !!(m[i >> 3] & (1 << (i & 7)));
const at = (i: number) => `${i % GRID},${Math.floor(i / GRID)}`;

/** The owner's Roman set on our male (roman-owner-reference.jpg). */
function roman(): SpriteAppearance {
  const l = defaultAppearance();
  l.slots.armor = { id: 'armor_bronze', colors: [] };
  l.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes: 'on' } };
  l.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
  l.slots.feet = { id: 'feet_gladiator_sandals', colors: [], parts: { paint: 'roman' } };
  delete l.slots.top;
  delete l.slots.bottom;
  delete l.slots.cape;
  delete l.slots.held;
  return l;
}

type Look = { id: string; look: SpriteAppearance; eye: EyeSpecial };
const of = (c: ShinobiCharacter): Look => ({ id: c.id, look: getAppearance(c), eye: dojutsuToEye(c.dojutsu) });
// Hana, Kenji, every legend preset, one of each enemy and the Roman set.
const LOOKS: Look[] = [
  ...COMPANIONS.map(of),
  ...(['rogue', 'hunter', 'jonin', 'raider'] as EnemyKind[]).flatMap((k) => [0, 1].map((n) => of({ ...enemyCharacter(k, n), id: `${k}${n}` }))),
  { id: 'roman', look: roman(), eye: 'none' },
];

/** The sizes of the pieces of a frame apart from the figure (8-connected), but effects (a piece with an fx pixel). */
function loose(fr: SpriteFrame): number[] {
  const seen = new Uint8Array(N);
  const pieces: { n: number; fx: boolean }[] = [];
  for (let i = 0; i < N; i++) {
    if (!opaque(fr.rgba, i) || seen[i]) continue;
    const p = { n: 0, fx: false };
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      p.n++;
      if (bit(fr.fx, j)) p.fx = true;
      const x = j % GRID;
      for (let dy = -GRID; dy <= GRID; dy += GRID)
        for (let dx = -1; dx <= 1; dx++) {
          const k = j + dy + dx;
          if (k < 0 || k >= N || x + dx < 0 || x + dx >= GRID || seen[k] || !opaque(fr.rgba, k)) continue;
          seen[k] = 1;
          stack.push(k);
        }
    }
    pieces.push(p);
  }
  const main = pieces.reduce((m, p) => (p.n > m.n ? p : m), pieces[0]);
  return pieces.filter((p) => p !== main && !p.fx).map((p) => p.n);
}

/** A small RGBA frame painted from rows of characters (`.` transparent), at the top left of the grid. */
function paint(rows: string[], colors: Record<string, [number, number, number]>, depth: Record<string, number> = {}) {
  const rgba = new Uint8ClampedArray(N * 4);
  const part = new Uint8Array(N);
  const top = new Int16Array(N).fill(-1);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const i = (y + 4) * GRID + x + 4;
      rgba.set([...colors[ch], 255], i * 4);
      top[i] = depth[ch] ?? 1;
      part[i] = 1;
    }),
  );
  const px = (x: number, y: number) => ((y + 4) * GRID + x + 4) * 4;
  return { rgba, part, top, px };
}

const LINE: [number, number, number] = [7, 6, 11];
const SKIN: [number, number, number] = [230, 160, 120];
const CLOTH: [number, number, number] = [60, 80, 160];

describe('the 1-pixel holes', () => {
  it('closes a pinhole inside a piece with its colour, and one between two pieces with their line', () => {
    // a: one piece of skin with a hole in it; b: two outlined pieces (different depths) with a hole between their lines
    const f = paint(['kkkkkk', 'kssssk', 'kss.sk', 'kssssk', 'kkkkkk', '......', 'kkkLLL', 'kck.CL', 'kkkLLL'], { k: LINE, s: SKIN, c: CLOTH, L: LINE, C: CLOTH }, { L: 2, C: 2 });
    const filled = closePinholes(f.rgba, f.part, f.top, () => false, () => 0x07060b);
    assert.equal(filled.length, 2);
    assert.deepEqual([...f.rgba.slice(f.px(3, 2), f.px(3, 2) + 4)], [...SKIN, 255]);
    assert.deepEqual([...f.rgba.slice(f.px(3, 7), f.px(3, 7) + 4)], [...LINE, 255]);
  });

  it('closes a nick where the line is missing, and keeps a notch his line goes round', () => {
    // the first notch has skin beside it (its line is gone); the second is lined all round (drawn so)
    const f = paint(['kkk.kkk..kkk.kkk', 'ksssssk..kkkkkkk', 'kkkkkkk..ksssssk', '.........kkkkkkk'], { k: LINE, s: SKIN });
    assert.deepEqual(findNicks(f.rgba, () => false, airOf(f.rgba)).map(at), ['7,4']);
    closePinholes(f.rgba, f.part, f.top, () => false, () => 0x07060b);
    assert.deepEqual([...f.rgba.slice(f.px(3, 0), f.px(3, 0) + 4)], [...LINE, 255]);
    assert.equal(f.rgba[f.px(12, 0) + 3], 0, 'the lined notch stays open');
  });

  it('leaves real gaps: a hole bigger than a pinhole, a gap open to the air, and what an effect walls in', () => {
    const f = paint(['kkkkkk', 'k....k', 'k....k', 'kkkkkk', '......', 'kk.kk.', 'kk.kk.', 'kk.kk.', '......', 'eee...', 'e.e...', 'eee...'], { k: LINE, e: SKIN }, { e: 9 });
    const fx = (i: number) => f.top[i] === 9;
    assert.ok(PINHOLE < 8);
    assert.deepEqual(closePinholes(f.rgba, f.part, f.top, fx, () => 0x07060b), []);
  });

  it('leaves no pinhole, nick or loose speck in any pose of any look and body, and idle as drawn', () => {
    // Every pose of every look on one body each (taking the bodies and frames in turn), plus idle.
    const bad: string[] = [];
    LOOKS.forEach((L, li) => {
      POSES.forEach((pose, pi) => {
        const body = BODIES[(li + pi) % BODIES.length];
        const l = { ...structuredClone(L.look), body };
        const fc = frameCount(rigPoseFor(pose, l.cast?.style, l.slots.held?.id));
        const f = (li * 3 + pi) % fc;
        const fr = renderSprite(l, pose, f, L.eye);
        const fx = (i: number) => bit(fr.fx, i);
        const where = `${L.id} ${body} ${pose} ${f}`;
        const specks = loose(fr);
        if (specks.length) bad.push(`${where}: ${specks.join(', ')} px apart from the figure`);
        // Idle is the owner's pictures, left exactly as drawn (sprite/compose.ts).
        if (pose === 'idle') return;
        const air = airOf(fr.rgba);
        const holes = findPinholes(fr.rgba, fx, air);
        const nicks = findNicks(fr.rgba, fx, air);
        if (holes.length || nicks.length) bad.push(`${where}: pinholes ${holes.map((h) => at(h[0])).join(' ')} nicks ${nicks.map(at).join(' ')}`);
      });
    });
    assert.deepEqual(bad, []);
  });
});

describe('a weapon stowed on the back', () => {
  const crystal = (): SpriteAppearance => ({ ...defaultAppearance(), slots: { ...defaultAppearance().slots, held: { id: 'held_crystal', colors: [] } } });
  const find = (id: string) => LOOKS.find((l) => l.id === id)!;
  // His ice sword (Solen), his flame sword (Aiden), the naginata (Raiga), the crystal greatsword; and the
  // weapons stowed at the belt (Akira's katana, a rogue's kunai).
  const BACK: Look[] = [find('preset_founder'), find('preset_reference_aiden'), find('preset_warlord'), { id: 'crystal', look: crystal(), eye: 'none' }];
  const BELT: Look[] = [find('preset_ember'), find('rogue1')];
  const held = partIndex('held');

  it('stays behind the body: none of it in front of the back below the shoulders, no sliver of it loose', () => {
    // Stowed in every pose (as the battle draws a ninja with its weapon put away), one body each in turn.
    const bad: string[] = [];
    BACK.forEach((L, li) =>
      POSES.forEach((pose, pi) => {
        const body = BODIES[(li + pi) % BODIES.length];
        const l: SpriteAppearance = { ...structuredClone(L.look), body, stowed: true };
        const fc = frameCount(rigPoseFor(pose, l.cast?.style));
        for (let f = 0; f < fc; f++) {
          if (pose !== 'tackle' && pose !== 'combo' && f !== (li + pi) % fc) continue;
          const fr = renderSprite(l, pose, f, L.eye);
          const front = frontOfBack(fr.rig);
          // the throw's kunai from the pouch is in the hand, not stowed; reading, the book in the hands is 'held' too
          const hand = (i: number) => pose === 'read' || (pose === 'throw' && Math.hypot((i % GRID) / 2 - fr.rig.handN.x, Math.floor(i / GRID) / 2 - fr.rig.handN.y) < 9);
          const ahead: number[] = [];
          for (let i = 0; i < N; i++) if (opaque(fr.rgba, i) && fr.part[i] === held && !hand(i) && front(i)) ahead.push(i);
          if (ahead.length) bad.push(`${L.id} ${body} ${pose} ${f}: in front at ${ahead.slice(0, 4).map(at).join(' ')}`);
          const specks = loose(fr);
          if (specks.length) bad.push(`${L.id} ${body} ${pose} ${f}: ${specks.join(', ')} px apart from the figure`);
        }
      }),
    );
    assert.deepEqual(bad, []);
  });

  it('is drawn whole at the belt (nothing apart from the figure)', () => {
    const bad: string[] = [];
    BELT.forEach((L, li) =>
      POSES.forEach((pose, pi) => {
        const body = BODIES[(li + pi) % BODIES.length];
        const l: SpriteAppearance = { ...structuredClone(L.look), body, stowed: true };
        const f = (li + pi) % frameCount(rigPoseFor(pose, l.cast?.style));
        const specks = loose(renderSprite(l, pose, f, L.eye));
        if (specks.length) bad.push(`${L.id} ${body} ${pose} ${f}: ${specks.join(', ')} px apart from the figure`);
      }),
    );
    assert.deepEqual(bad, []);
  });

  it('turns with the torso: its line across the back is the same leaning as standing', () => {
    // The direction of the stowed blade in the torso's frame (the main axis of what shows of it) in the
    // combo and the tackle is the one it has standing for hand signs.
    const axis = (fr: SpriteFrame): number => {
      const r = fr.rig;
      const pts: [number, number][] = [];
      for (let i = 0; i < N; i++) {
        if (!opaque(fr.rgba, i) || fr.part[i] !== held) continue;
        const dx = (i % GRID) / 2 - r.pelvis.x;
        const dy = Math.floor(i / GRID) / 2 - r.pelvis.y;
        pts.push([dx * r.right.x + dy * r.right.y, dx * r.up.x + dy * r.up.y]);
      }
      const mx = pts.reduce((t, p) => t + p[0], 0) / pts.length;
      const my = pts.reduce((t, p) => t + p[1], 0) / pts.length;
      let sxx = 0;
      let sxy = 0;
      let syy = 0;
      for (const [x, y] of pts) [sxx, sxy, syy] = [sxx + (x - mx) ** 2, sxy + (x - mx) * (y - my), syy + (y - my) ** 2];
      return (Math.atan2(2 * sxy, sxx - syy) * 90) / Math.PI;
    };
    const solen = find('preset_founder');
    const l = { ...structuredClone(solen.look), stowed: true };
    const standing = axis(renderSprite(l, 'handsigns', 0, solen.eye));
    for (const [pose, f] of [['combo', 4], ['tackle', 3]] as [SpritePose, number][]) {
      const a = axis(renderSprite(l, pose, f, solen.eye));
      assert.ok(Math.abs(a - standing) < 8, `${pose} ${f}: ${a.toFixed(1)} degrees, standing ${standing.toFixed(1)}`);
    }
  });
});
