// Tests for the owner's boots on his Ren ("arregla las botas de ren y aiden , la de ren se le sale la piel de
// la bota o zapato"): each boot one piece with its shin, his trousers tucked into it, and no skin beside,
// under or through it, in every pose and frame. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite, type SpriteFrame } from './compose';
import { legDepth, type DrawCtx, type Depth, type Side } from './ctx';
import { footTurn } from './items/ankle';
import { NIGHT_LEG_SHIFT } from './items/nightTrousersArt';
import { getAppearance } from './legacy';
import { GRID, partIndex, RES } from './raster';
import { drawRig, frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const REN = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_night')!.character;
const look = (body: BodyType): SpriteAppearance => ({ ...structuredClone(getAppearance(REN)), body });
const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const SIDES: Side[] = ['N', 'F'];
const N = GRID * GRID;
const opaque = (f: SpriteFrame, i: number) => f.rgba[i * 4 + 3] > 0;
const rgb = (f: SpriteFrame, i: number) => (f.rgba[i * 4] << 16) | (f.rgba[i * 4 + 1] << 8) | f.rgba[i * 4 + 2];
const luma = (c: number) => 0.299 * (c >> 16) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

/** Every pose and frame of a body. */
function* frames(l: SpriteAppearance): Generator<[SpritePose, number]> {
  for (const pose of POSES) {
    const rp = rigPoseFor(pose, l.cast?.style, l.slots.held?.id);
    for (let f = 0; f < frameCount(rp); f++) yield [pose, f];
  }
}

/** A frame showing only these layers. */
const only = (l: SpriteAppearance, pose: SpritePose, f: number, depths: Depth[]) => renderSprite(l, pose, f, 'none', { depths: new Set(depths) });

/** The 8-connected patches of a leg below the knee (its shin and foot parts): their sizes and what each holds. */
function patches(fr: SpriteFrame, s: Side): string[] {
  const foot = partIndex(`foot${s}`);
  const shin = partIndex(`shin${s}`);
  const ofLeg = (i: number) => opaque(fr, i) && (fr.part[i] === foot || fr.part[i] === shin);
  const seen = new Uint8Array(N);
  const out: string[] = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || !ofLeg(i)) continue;
    let n = 0;
    let hasFoot = false;
    let hasShin = false;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      n++;
      if (fr.part[j] === foot) hasFoot = true;
      else hasShin = true;
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
    out.push(`${n}${hasFoot ? 'f' : ''}${hasShin ? 's' : ''}`);
  }
  return out;
}

/** The colours of a body's bare skin (its legs in a few poses, no clothes), its outline left out. */
function skinOf(l: SpriteAppearance): Set<number> {
  const bare = { ...l, slots: {}, accessories: [] };
  const skin = new Set<number>();
  const legs = new Set(['thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF'].map((p) => partIndex(p as never)));
  for (const pose of ['idle', 'run', 'combo', 'sit', 'crouch'] as SpritePose[])
    for (let f = 0; f < 2; f++) {
      const fr = renderSprite(bare, pose, f);
      for (let i = 0; i < N; i++) if (opaque(fr, i) && legs.has(fr.part[i]) && luma(rgb(fr, i)) >= 70) skin.add(rgb(fr, i));
    }
  return skin;
}

describe("the owner's Night Boots on his Ren", () => {
  it('are each one piece with their shin in every pose and frame, on the four bodies', () => {
    const loose: string[] = [];
    for (const body of ['male', 'female', 'bulky'] as BodyType[]) {
      const l = look(body);
      for (const [pose, f] of frames(l))
        for (const s of SIDES) {
          const p = patches(only(l, pose, f, [legDepth(s, 'feet')]), s);
          if (p.length !== 1 || !p[0].includes('f') || !p[0].includes('s')) loose.push(`${body} ${pose} ${f} ${s}: ${p.join(' ')}`);
        }
    }
    assert.deepEqual(loose, []);
  });

  it('take his trouser leg tucked into them: the leg below the knee is one piece with the boot', () => {
    const loose: string[] = [];
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const l = look(body);
      for (const [pose, f] of frames(l))
        for (const s of SIDES) {
          const p = patches(only(l, pose, f, [legDepth(s, 'body'), legDepth(s, 'cloth'), legDepth(s, 'feet')]), s);
          if (p.length !== 1 || !p[0].includes('f') || !p[0].includes('s')) loose.push(`${body} ${pose} ${f} ${s}: ${p.join(' ')}`);
        }
    }
    assert.deepEqual(loose, []);
  });

  it('show no skin within 3 px of a boot, in his trousers (male and bulky)', () => {
    const R = 3;
    const bare: string[] = [];
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const l = look(body);
      const skin = skinOf(l);
      for (const [pose, f] of frames(l)) {
        const full = renderSprite(l, pose, f);
        const boots = only(l, pose, f, [legDepth('N', 'feet'), legDepth('F', 'feet')]);
        const near = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
          if (!opaque(boots, i)) continue;
          const x = i % GRID;
          const y = Math.floor(i / GRID);
          for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (x + dx >= 0 && x + dx < GRID && y + dy >= 0 && y + dy < GRID) near[(y + dy) * GRID + x + dx] = 1;
        }
        const hits: string[] = [];
        for (let i = 0; i < N; i++) if (near[i] && opaque(full, i) && skin.has(rgb(full, i))) hits.push(`${i % GRID},${Math.floor(i / GRID)}`);
        if (hits.length) bare.push(`${body} ${pose} ${f}: ${hits.slice(0, 6).join(' ')}`);
      }
    }
    assert.deepEqual(bare, []);
  });

  it('show no skin of the leg below the top of the boot (the women, whose legs are bare above it)', () => {
    const bare: string[] = [];
    for (const body of ['female'] as BodyType[]) {
      const l = look(body);
      const skin = skinOf(l);
      for (const [pose, f] of frames(l)) {
        const full = renderSprite(l, pose, f);
        if (full.rig.lay) continue;
        for (const s of SIDES) {
          const kn = s === 'N' ? full.rig.kneeN : full.rig.kneeF;
          const an = s === 'N' ? full.rig.ankleN : full.rig.ankleF;
          const len = Math.hypot(an.x - kn.x, an.y - kn.y);
          // How far down the shin a pixel lies, from the knee (rig units).
          const down = (i: number) => (((i % GRID) + 0.5) / RES - kn.x) * ((an.x - kn.x) / len) + ((Math.floor(i / GRID) + 0.5) / RES - kn.y) * ((an.y - kn.y) / len);
          const boot = only(l, pose, f, [legDepth(s, 'feet')]);
          let top = Infinity;
          for (let i = 0; i < N; i++) if (opaque(boot, i) && boot.part[i] === partIndex(`shin${s}`)) top = Math.min(top, down(i));
          const ids = new Set([partIndex(`shin${s}`), partIndex(`foot${s}`)]);
          let n = 0;
          for (let i = 0; i < N; i++) if (opaque(full, i) && ids.has(full.part[i]) && skin.has(rgb(full, i)) && down(i) > top + 1.5 / RES) n++;
          if (n) bare.push(`${body} ${pose} ${f} ${s}: ${n} px`);
        }
      }
    }
    assert.deepEqual(bare, []);
  });

  it('turn the foot with the shaft once the leg swings it off the ground, and leave it flat standing', () => {
    const g = (body: BodyType, pose: Parameters<typeof drawRig>[1], f: number) => ({ rig: drawRig(body, pose, f) }) as unknown as DrawCtx;
    for (const body of ['male', 'bulky'] as BodyType[]) {
      assert.equal(footTurn(g(body, 'idle', 0), 'N'), 0);
      assert.equal(footTurn(g(body, 'walk', 0), 'N'), 0);
      // The combo's high kick and the run's back leg.
      assert.ok(Math.abs(footTurn(g(body, 'combo', 4), 'N')) > 45);
      assert.ok(Math.abs(footTurn(g(body, 'run', 3), 'N')) > 45);
    }
  });

  it('keep a lifted foot under its shaft as at rest: it reaches as far past the ankle, down the shin', () => {
    // Held flat under a shin kicked out, the boot's foot stood out beside the shaft (the combo's kicks, the
    // run's back leg, the lean's crossed leg): the boot came apart at the ankle.
    const off: string[] = [];
    for (const body of ['male', 'female', 'bulky'] as BodyType[]) {
      const l = look(body);
      const dressed = l.slots.bottom?.id === 'bottom_night_trousers' && ['male', 'bulky'].includes(body);
      const reach = (pose: SpritePose, f: number, s: Side): number => {
        const fr = only(l, pose, f, [legDepth(s, 'feet')]);
        const [dx, dy] = dressed ? NIGHT_LEG_SHIFT[s] : [0, 0];
        const kn = s === 'N' ? fr.rig.kneeN : fr.rig.kneeF;
        const an = s === 'N' ? fr.rig.ankleN : fr.rig.ankleF;
        const len = Math.hypot(an.x - kn.x, an.y - kn.y);
        let most = -Infinity;
        for (let i = 0; i < N; i++) {
          if (!opaque(fr, i) || fr.part[i] !== partIndex(`foot${s}`)) continue;
          const x = ((i % GRID) + 0.5 - dx) / RES - an.x;
          const y = (Math.floor(i / GRID) + 0.5 - dy) / RES - an.y;
          most = Math.max(most, ((x * (an.x - kn.x) + y * (an.y - kn.y)) / len) * RES);
        }
        return most;
      };
      for (const s of SIDES) {
        const rest = reach('idle', 0, s);
        for (const [pose, f] of frames(l)) {
          const rp = rigPoseFor(pose, l.cast?.style, l.slots.held?.id);
          if (!footTurn({ rig: drawRig(body, rp, f) } as unknown as DrawCtx, s)) continue;
          const r = reach(pose, f, s);
          if (Math.abs(r - rest) > 1.5) off.push(`${body} ${pose} ${f} ${s}: ${r.toFixed(1)} px, at rest ${rest.toFixed(1)}`);
        }
      }
    }
    assert.deepEqual(off, []);
  });
});
