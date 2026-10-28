// Tests for the owner's plate boots on his Aiden (docs/reference/aiden-owner-reference.jpg), his Roman
// sandals (roman-owner-reference.jpg), the ankle rules they share (items/ankle.ts) and our closed boots over
// the bare foot (items/feet.ts boot): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALL_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { legDepth, type DrawCtx, type Side } from './ctx';
import { footTurn, shinCarried, shinTurn } from './items/ankle';
import { defaultAppearance, getAppearance } from './legacy';
import { GRID, partIndex, RES } from './raster';
import { renSitFrame } from './renSit';
import { drawRig, frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const aiden = ALL_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character;
const look = (body: BodyType): SpriteAppearance => ({ ...structuredClone(getAppearance(aiden)), body });

/** The owner's Roman set on our bodies (as src/sprite/holes.test.ts on fix/holes-stowed-sword wears it). */
function roman(body: BodyType): SpriteAppearance {
  const l = { ...defaultAppearance(), body };
  l.slots = { ...l.slots };
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
const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const BODIES: BodyType[] = ['male', 'female', 'bulky'];

/**
 * The 8-connected patches of a leg below the knee (its shin and foot parts) in a frame that shows only that
 * leg's boot and plate: how many pixels each holds, and whether it holds any of the foot or the shin.
 */
function lowerLegPatches(l: SpriteAppearance, pose: SpritePose, f: number, s: Side): { n: number; foot: boolean; shin: boolean }[] {
  const fr = renderSprite(l, pose, f, 'none', { depths: new Set([legDepth(s, 'feet'), legDepth(s, 'armor')]) });
  const foot = partIndex(`foot${s}`);
  const shin = partIndex(`shin${s}`);
  const ofLeg = (i: number) => fr.rgba[i * 4 + 3] > 0 && (fr.part[i] === foot || fr.part[i] === shin);
  const seen = new Uint8Array(GRID * GRID);
  const out: { n: number; foot: boolean; shin: boolean }[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (seen[i] || !ofLeg(i)) continue;
    const p = { n: 0, foot: false, shin: false };
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      p.n++;
      if (fr.part[j] === foot) p.foot = true;
      else p.shin = true;
      const x = j % GRID;
      const y = Math.floor(j / GRID);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const k = (y + dy) * GRID + x + dx;
          if (x + dx < 0 || x + dx >= GRID || y + dy < 0 || y + dy >= GRID || seen[k] || !ofLeg(k)) continue;
          seen[k] = 1;
          stack.push(k);
        }
    }
    out.push(p);
  }
  return out;
}

/** Every pose and frame on the three bodies where a leg below the knee is not one piece holding its foot and its shin. */
function looseBoots(dress: (body: BodyType) => SpriteAppearance): string[] {
  const loose: string[] = [];
  for (const body of BODIES) {
    const l = dress(body);
    for (const pose of POSES) {
      const rp = rigPoseFor(pose, l.cast?.style, l.slots.held?.id);
      for (let f = 0; f < frameCount(rp); f++)
        for (const s of ['N', 'F'] as Side[]) {
          const patches = lowerLegPatches(l, pose, f, s);
          if (patches.length !== 1 || !patches[0].foot || !patches[0].shin) loose.push(`${body} ${pose} ${f} ${s}: ${patches.map((p) => `${p.n}${p.foot ? 'f' : ''}${p.shin ? 's' : ''}`).join(' ')}`);
        }
    }
  }
  return loose;
}

describe("the owner's Crimson Sabatons", () => {
  it('keep each boot one piece with its shin in every pose and frame, on the three bodies', () => {
    // "arregla las botas de ren y aiden": the sabaton hung apart from the greave when the shin turned
    // (the pierce, the run, the kneel, the crouched step).
    assert.deepEqual(looseBoots(look), []);
  });
});

describe("the owner's Roman sandals", () => {
  it('keep each sandal one piece with its laced shin in every pose and frame, on the three bodies', () => {
    // The sandal stood flat while the shin kicked out, and floated apart from it (the train's kick, the combo,
    // the run's back leg).
    assert.deepEqual(looseBoots(roman), []);
  });
});

describe('the ankle rules shared by his boots and sandals', () => {
  const ctx = (body: BodyType, pose: Parameters<typeof drawRig>[1], f: number) => ({ rig: drawRig(body, pose, f) }) as unknown as DrawCtx;

  it('leave a foot as it stands at rest: no turn, the offset exactly as he drew it', () => {
    for (const body of BODIES)
      for (const s of ['N', 'F'] as Side[]) {
        const g = ctx(body, 'idle', 0);
        assert.equal(shinTurn(g, s), 0);
        assert.equal(footTurn(g, s, true), 0);
        const o = shinCarried(g, s, -4, 1);
        assert.deepEqual([o.x, o.y], [-4 / RES, 1 / RES]);
      }
  });

  it("carry the offset round with the shin, and turn the foot once the shin is far from rest", () => {
    // The run's near leg (frame 3): the shin far back, the foot well off the ground.
    const g = ctx('male', 'run', 3);
    const d = shinTurn(g, 'N');
    assert.ok(d > 45, `turn ${d}`);
    assert.equal(footTurn(g, 'N'), d);
    const o = shinCarried(g, 'N', 0, 5);
    assert.ok(Math.abs(Math.hypot(o.x, o.y) * RES - 5) < 1e-9);
    assert.ok(o.x * RES < -4, 'turned clockwise, the offset down the shin swings back');
    // The kneel's far leg: on the ground, so only a boot that asks for it (onGround) turns.
    const k = ctx('male', 'crouch', 0);
    assert.equal(footTurn(k, 'F'), 0);
    assert.equal(footTurn(k, 'F', true), shinTurn(k, 'F'));
  });
});

/**
 * The pixels of these parts whose colour comes from the skin, in a frame drawn in a pure green skin (no
 * item of these looks is green): green-led pixels are skin, his painted skin retinted into the green too.
 */
function skinOn(l: SpriteAppearance, pose: SpritePose, f: number, parts: number[]): string[] {
  const fr = renderSprite({ ...l, skin: '#00ff00' }, pose, f, 'none');
  const hits: string[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const [r, g, b, a] = fr.rgba.subarray(i * 4, i * 4 + 4);
    if (a && parts.includes(fr.part[i]) && g > r + 40 && g > b + 40) hits.push(`${i % GRID},${Math.floor(i / GRID)}`);
  }
  return hits;
}
const LEG_PARTS = (['thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF'] as const).map(partIndex);
const BELOW_KNEE = (['shinN', 'footN', 'shinF', 'footF'] as const).map(partIndex);
const FEET = (['footN', 'footF'] as const).map(partIndex);

describe('closed boots', () => {
  it('see the skin (the check itself): our bare foot is skin', () => {
    const l = { ...defaultAppearance(), body: 'male' as BodyType };
    delete l.slots.feet;
    assert.ok(skinOn(l, 'idle', 0, BELOW_KNEE).length > 20);
  });

  // The owner on Ren (2026-10-23): "verifica los pies de ren en todas sus poses porque se le esta saliendo
  // piel del zapato". Our bare foot, longer at the toe than the boot's own foot, poked out past its toe.
  it("show no skin on Ren's legs in any pose and frame, on the three bodies", () => {
    const ren = ALL_PRESETS.find((p) => p.character.id === 'preset_night')!.character;
    const bad: string[] = [];
    for (const body of BODIES) {
      const l: SpriteAppearance = { ...structuredClone(getAppearance(ren)), body };
      // (the female body does not wear his trousers, his rule for female clothes, so her legs are bare down to his
      // boots: there only the feet, whose toes are what poked out past the boot; renBoots.test.ts checks her shins
      // below the boot's top)
      const parts = body === 'female' ? FEET : LEG_PARTS;
      for (const pose of POSES) {
        const n = frameCount(rigPoseFor(pose, l.cast?.style, l.slots.held?.id));
        for (let f = 0; f < n; f++) {
          // Seated on the male body he is the owner's own repaint, every pixel his ("ren sentado aprovado"; renSit.ts,
          // checked pixel for pixel in ren.test.ts): his boots' browns are in his skin's palette there, so they follow
          // the skin.
          if (renSitFrame(l, pose, f, 'none')) continue;
          const hits = skinOn(l, pose, f, parts);
          if (hits.length) bad.push(`${body} ${pose}#${f}: ${hits.length} at ${hits.slice(0, 3).join(' ')}`);
        }
      }
    }
    assert.deepEqual(bad, []);
  });

  it('take our bare foot away under them: no skin below the knee on the male bodies, at rest, seated and reading', () => {
    const bad: string[] = [];
    for (const id of ['feet_leather', 'feet_cowboy', 'feet_greaves']) {
      for (const body of ['male', 'bulky'] as BodyType[]) {
        const l = { ...defaultAppearance(), body };
        l.slots = { ...l.slots, feet: { id, colors: [] } };
        for (const pose of ['idle', 'sit', 'read'] as SpritePose[]) {
          const n = frameCount(rigPoseFor(pose, l.cast?.style, l.slots.held?.id));
          for (let f = 0; f < n; f++) {
            const hits = skinOn(l, pose, f, BELOW_KNEE);
            if (hits.length) bad.push(`${id} ${body} ${pose}#${f}: ${hits.length} at ${hits.slice(0, 3).join(' ')}`);
          }
        }
      }
    }
    assert.deepEqual(bad, []);
  });
});
