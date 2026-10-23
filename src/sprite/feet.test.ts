// Every foot stays on its shin, for every character: the owner, 2026-10-22, "arregla las botas en donde
// combo 5/8 por ejemplo y tenemos ese error de las botas en muchos diseños corrigelo en todos los
// personajes agrega una prueba para que no pase este error nunca mas". In the kicks and raised legs the
// boot or foot stood flat under the ankle while the shin turned, and hung off the leg or stuck out
// sideways. In the camp lean ("apoyado") the foot stays flat as it stood before, his choice the same day:
// "en apoyado antes es lo correcto".
//
// For every feet item in the catalogue (each option of its parts), our bare foot, and every preset,
// companion and enemy look and the owner's Trunks 2 and 3, on the male, female and bulky bodies, in
// every pose, each leg below the knee (its shin and its boot or foot, in a frame showing that leg's
// layers alone) must be
//   (a) one piece with its foot: the foot and the shin joined to the rest of the leg;
//   (b) its foot reaching no further down the shin, past the ankle, than at rest (FOOT_TOL px), and
//   (c) no pixel of its foot further out to either side of the shin than at rest (FOOT_TOL px):
// the foot sits on the shin as it does at rest, turned with it (items/ankle.ts footTurn turns it up to 20
// degrees less than the shin, which FOOT_TOL allows). Measured from our rig's ankle, or from the end of
// the shin as drawn (footwear the owner drew standing apart from our leg). A kneeling shin (lying back
// with its ankle on the ground, as the crouch's back leg) may instead keep its foot flat on the ground:
// then (b) and (c) are measured down the screen and across it, against rest. In the lean, instead of (b)
// and (c), the foot must be drawn flat as at rest (no more than LEAN_TOL of it unlike its foot at rest; a
// foot turned with the shin there is over 80% unlike it).
//
// Sampled: in each pose, for each leg, every frame where its shin turns past 20 degrees from rest (where
// its foot turns), the frame where it turns furthest and the one where its ankle is lifted highest, each
// leg's stance once (framesOf); looks whose legs draw the same as one already checked, at rest and in the
// side kick, are checked once. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyCharacter, type EnemyKind } from '../battle/units';
import { COMPANIONS } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import { ALL_ITEMS, getItem } from './catalog';
import { PAINTED_SKIN } from './items/trunksKit';
import { renderSprite } from './compose';
import { legDepth, legJoints, type Depth, type DrawCtx, type Side } from './ctx';
import { ankleLift, shinTurn } from './items/ankle';
import { defaultAppearance, dojutsuToEye, getAppearance } from './legacy';
import { GRID, partIndex, RES } from './raster';
import { drawRig, frameCount, rigPoseFor, type Rig } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type EyeSpecial, type SlotId, type SpriteAppearance, type SpritePose } from './types';

const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
// (the slender body is leaving the game)
const BODIES: BodyType[] = ['male', 'female', 'bulky'];
const SIDES: Side[] = ['N', 'F'];
/** How far (fine pixels) a foot may reach past where it sits on its shin at rest. */
const FOOT_TOL = 5;
/** A shin turned no further than this from rest (degrees) keeps its foot flat (items/ankle.ts). */
const FOOT_FLAT = 20;
/** How unlike its foot at rest (unlike()) the lean's foot may be drawn. */
const LEAN_TOL = 0.3;
/** A shin turned past this (degrees) with its ankle lifted no more than KNEEL_LIFT fine pixels: a kneel (as items/ankle.ts). */
const KNEEL_TURN = 52;
const KNEEL_LIFT = 3;
const legDepths = (s: Side) => new Set<Depth>((['body', 'cloth', 'feet', 'armor'] as const).map((k) => legDepth(s, k)));
const LEG = { N: legDepths('N'), F: legDepths('F') };
const BOTH = new Set<Depth>([...LEG.N, ...LEG.F]);

type Look = { id: string; look: SpriteAppearance; eye: EyeSpecial };

/** Every feet item in the catalogue, with each option of each of its parts, and no feet item (our bare foot). */
function feetLooks(): Look[] {
  const bare = defaultAppearance();
  delete bare.slots.feet;
  const out: Look[] = [{ id: 'bare', look: bare, eye: 'none' }];
  for (const def of ALL_ITEMS.filter((d) => d.slot === 'feet' && !d.id.endsWith('_none'))) {
    let variants: Record<string, string>[] = [{}];
    for (const p of def.parts ?? []) variants = variants.flatMap((v) => p.options.map((o) => ({ ...v, [p.key]: o.id })));
    for (const parts of variants) {
      const l = defaultAppearance();
      l.slots = { ...l.slots, feet: { id: def.id, colors: def.colors.map((c) => c.default), parts } };
      out.push({ id: [def.id, ...Object.values(parts)].join(' '), look: l, eye: 'none' });
    }
  }
  return out;
}

const of = (c: ShinobiCharacter): Look => ({ id: c.id, look: getAppearance(c), eye: dojutsuToEye(c.dojutsu) });

/** The owner's Trunks 2 and Trunks 3 (trunks.test.ts), as he painted them over: Solen's skin, the crystal greatsword in hand. */
function trunksLooks(): Look[] {
  const dress = (id: string, items: Partial<Record<SlotId, string>>): Look => {
    const l = defaultAppearance();
    l.skin = PAINTED_SKIN;
    l.slots = {};
    for (const [slot, item] of Object.entries({ ...items, held: 'held_crystal' })) l.slots[slot as SlotId] = { id: item!, colors: getItem(item!)!.colors.map((c) => c.default) };
    return { id, look: l, eye: 'none' };
  };
  return [
    dress('Trunks 2', { cape: 'cape_traveler', top: 'top_highcollar', bottom: 'bottom_cargo', feet: 'feet_leather', waist: 'waist_belt', hands: 'hands_traveler_gloves', hair: 'hair_drifter' }),
    dress('Trunks 3', { top: 'top_bomber', bottom: 'bottom_leggings', feet: 'feet_cowboy', hair: 'hair_surge' }),
  ];
}

/** Every preset and companion (COMPANIONS holds the presets), each of every enemy's looks, and the owner's Trunks. */
function characterLooks(): Look[] {
  const out = [...COMPANIONS.map(of), ...trunksLooks()];
  const seen = new Set<string>();
  for (const k of ['rogue', 'hunter', 'jonin', 'raider'] as EnemyKind[])
    for (let n = 0; n < 8; n++) {
      const l = of({ ...enemyCharacter(k, n), id: `${k}_${n}` });
      const key = JSON.stringify(l.look);
      if (!seen.has(key)) out.push(l);
      seen.add(key);
    }
  return out;
}

/** A pixel and its colour (0xRRGGBB). */
type Px = { x: number; y: number; c: number };
/** A leg in a frame showing its layers alone: its foot's pixels, the rest of it (shin, trousers, thigh), and which piece each pixel is in. */
type Leg = { foot: Px[]; rest: Px[]; shin: number[]; piece: Int32Array; rig: Rig };

/** One leg in a frame showing that leg's layers alone, its pixels in 8-connected pieces. */
function legOf(l: Look, body: BodyType, pose: SpritePose, f: number, s: Side): Leg {
  const fr = renderSprite({ ...l.look, body }, pose, f, l.eye, { depths: LEG[s] });
  const foot = partIndex(`foot${s}`);
  const shin = partIndex(`shin${s}`);
  const leg: Leg = { foot: [], rest: [], shin: [], piece: new Int32Array(GRID * GRID).fill(-1), rig: fr.rig };
  const opaque = (i: number) => fr.rgba[i * 4 + 3] > 0;
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (!opaque(i)) continue;
    (fr.part[i] === foot ? leg.foot : leg.rest).push({ x: i % GRID, y: Math.floor(i / GRID), c: (fr.rgba[i * 4] << 16) | (fr.rgba[i * 4 + 1] << 8) | fr.rgba[i * 4 + 2] });
    if (fr.part[i] === shin) leg.shin.push(i);
    if (leg.piece[i] >= 0) continue;
    const stack = [i];
    leg.piece[i] = n;
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % GRID;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const k = j + dy * GRID + dx;
          if (x + dx < 0 || x + dx >= GRID || k < 0 || k >= GRID * GRID || leg.piece[k] >= 0 || !opaque(k)) continue;
          leg.piece[k] = n;
          stack.push(k);
        }
    }
    n++;
  }
  return leg;
}

/** How many pieces the leg's foot and shin lie in (1: the foot is joined to the leg, and the shin is one with it). */
function pieces(leg: Leg): number {
  return new Set([...leg.foot.map((p) => p.y * GRID + p.x), ...leg.shin].map((i) => leg.piece[i])).size;
}

/** Where a foot reaches: down past the end of its shin (`down`) and out to each side of it (`lo`, `hi`). */
type Reach = { down: number; lo: number; hi: number };

/** How a foot's reach is measured: from the ankle along and across the shin, from the shin's drawn end along and across it, or from the ankle down and across the screen. */
type Measure = 'ankle' | 'shinEnd' | 'flat';

/**
 * A foot's reach. 'ankle': along the shin past our rig's ankle, and across the shin from it. 'shinEnd':
 * along the shin past the end of the shin as drawn (a boot's shaft, a sandal's laced shin), and across it
 * from that end's middle (for footwear standing where the owner drew it rather than on our ankle, as his
 * Solen's sandals at rest); none when no shin shows. 'flat': down the screen and across it from the ankle,
 * for a foot kept flat on the ground.
 */
function reach(leg: Leg, s: Side, m: Measure): Reach | undefined {
  const { knee, ankle } = legJoints(leg.rig, s);
  let [ux, uy] = [0, 1];
  if (m !== 'flat') {
    const n = Math.hypot(ankle.x - knee.x, ankle.y - knee.y) || 1;
    [ux, uy] = [(ankle.x - knee.x) / n, (ankle.y - knee.y) / n];
  }
  // A figure laid on the ground (downed) is the upright one mirrored across the diagonal: its sides swap.
  const side = leg.rig.lay ? -1 : 1;
  const along = (p: Px) => (p.x + 0.5 - ankle.x * RES) * ux + (p.y + 0.5 - ankle.y * RES) * uy;
  const across = (p: Px) => side * ((p.y + 0.5 - ankle.y * RES) * ux - (p.x + 0.5 - ankle.x * RES) * uy);
  let end = 0;
  let mid = 0;
  if (m === 'shinEnd') {
    const shin = leg.shin.map((i) => ({ x: i % GRID, y: Math.floor(i / GRID), c: 0 }));
    if (!shin.length) return undefined;
    end = Math.max(...shin.map(along));
    const tip = shin.filter((p) => along(p) > end - 4).map(across);
    mid = tip.reduce((a, b) => a + b, 0) / tip.length;
  }
  const r = { down: -Infinity, lo: Infinity, hi: -Infinity };
  for (const p of leg.foot) {
    r.down = Math.max(r.down, along(p) - end);
    r.lo = Math.min(r.lo, across(p) - mid);
    r.hi = Math.max(r.hi, across(p) - mid);
  }
  return r;
}

const show = (r?: Reach) => !r ? 'no shin' : `down ${r.down.toFixed(1)}, sides ${r.lo.toFixed(1)} to ${r.hi.toFixed(1)}`;

/** How far a reach goes past another (fine pixels): further down, or further out to either side. */
const past = (r?: Reach, rest?: Reach) => (!r || !rest ? Infinity : Math.max(r.down - rest.down, rest.lo - r.lo, r.hi - rest.hi));

/**
 * How unlike its foot at rest a foot is drawn: the share of its pixels that its foot at rest, moved to
 * where it matches the most of them, does not match in colour. A foot drawn flat as at rest (only covered a little
 * differently by the shin or the trousers) is all covered; one turned with its shin is not.
 */
function unlike(leg: Leg, rest: Leg): number {
  const shifts = new Map<number, number>();
  for (const p of leg.foot)
    for (const q of rest.foot) {
      if (p.c !== q.c) continue;
      const k = (p.y - q.y) * 1024 + (p.x - q.x);
      shifts.set(k, (shifts.get(k) ?? 0) + 1);
    }
  return 1 - Math.max(0, ...shifts.values()) / leg.foot.length;
}

/**
 * The frames of a pose checked for a leg: every frame where its shin turns past FOOT_FLAT degrees from rest
 * (where a foot turns with it: the kicks, combo 5/8 among them), the frame where it turns furthest and the
 * one where its ankle is lifted highest; a frame whose hip, knee and ankle stand where an earlier one's do
 * (a breath, a page turned) is not checked again.
 */
function framesOf(body: BodyType, look: SpriteAppearance, pose: SpritePose, s: Side): number[] {
  const rp = rigPoseFor(pose, look.cast?.style, look.slots.held?.id);
  const ctx = Array.from({ length: frameCount(rp) }, (_, f) => ({ rig: drawRig(body, rp, f) }) as DrawCtx);
  const turn = ctx.map((g) => Math.abs(shinTurn(g, s)));
  const lift = ctx.map((g) => ankleLift(g, s));
  const pick = new Set([turn.indexOf(Math.max(...turn)), lift.indexOf(Math.max(...lift))]);
  turn.forEach((t, f) => t > FOOT_FLAT && pick.add(f));
  const seen = new Set<string>();
  return [...pick]
    .sort((a, b) => a - b)
    .filter((f) => {
      const j = legJoints(ctx[f].rig, s);
      const key = [j.hip, j.knee, j.ankle].map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
      return !seen.has(key) && !!seen.add(key);
    });
}

/** A shin lying back along the ground (a kneel): its foot may stay flat on the ground. */
function kneeling(body: BodyType, look: SpriteAppearance, pose: SpritePose, f: number, s: Side): boolean {
  const g = { rig: drawRig(body, rigPoseFor(pose, look.cast?.style, look.slots.held?.id), f) } as DrawCtx;
  return Math.abs(shinTurn(g, s)) > KNEEL_TURN && ankleLift(g, s) <= KNEEL_LIFT;
}

/** Every leg below the knee checked that is not one piece holding its foot and shin, or whose foot leaves its shin. */
function feetOffShins(looks: Look[], seen: Set<string>): string[] {
  const bad: string[] = [];
  for (const l of looks)
    for (const body of BODIES) {
      const look = { ...l.look, body };
      // Legs drawn the same at rest and in the side kick (combo 5/8) as a look's already checked are its legs.
      const key = [['idle', 0], ['combo', 4]].map(([p, f]) => Buffer.from(renderSprite(look, p as SpritePose, f as number, l.eye, { depths: BOTH }).rgba).toString('base64')).join() + body;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const s of SIDES) {
        const rest = legOf(l, body, 'idle', 0, s);
        const atRest = { ankle: reach(rest, s, 'ankle'), shinEnd: reach(rest, s, 'shinEnd'), flat: reach(rest, s, 'flat') };
        for (const pose of POSES)
          for (const f of framesOf(body, look, pose, s)) {
            const leg = legOf(l, body, pose, f, s);
            const at = `${l.id} ${body} ${pose} ${f} ${s}`;
            // A foot under a long garment (hidden) is no foot off its shin.
            if (!leg.foot.length) continue;
            const n = pieces(leg);
            if (n !== 1) bad.push(`${at}: ${n} pieces`);
            if (pose === 'lean') {
              // The owner's lean: the foot flat as it stands at rest, not turned (items/ankle.ts flatPose).
              const turned = unlike(leg, rest);
              if (turned > LEAN_TOL) bad.push(`${at}: the lean's foot not flat as at rest (${(turned * 100).toFixed(0)}% of it differs)`);
              continue;
            }
            // On its shin as at rest, measured from our ankle or from the shin's drawn end; or, kneeling, flat as at rest.
            const now = reach(leg, s, 'ankle');
            const off = Math.min(past(now, atRest.ankle), past(reach(leg, s, 'shinEnd'), atRest.shinEnd));
            const offFlat = kneeling(body, look, pose, f, s) ? past(reach(leg, s, 'flat'), atRest.flat) : Infinity;
            if (Math.min(off, offFlat) > FOOT_TOL) bad.push(`${at}: foot ${off.toFixed(1)} px off its shin (from the ankle ${show(now)}; at rest ${show(atRest.ankle)})`);
          }
      }
    }
  if (process.env.FEET_DEBUG) console.log(`DEBUG ${bad.length}\n` + bad.join('\n'));
  return bad;
}

describe('every foot on its shin', () => {
  const seen = new Set<string>();
  it('every feet item and our bare foot, in every pose, on the male, female and bulky bodies', () => {
    assert.deepEqual(feetOffShins(feetLooks(), seen), []);
  });
  it('every preset, companion and enemy and the owner\'s Trunks, in every pose, on the male, female and bulky bodies', () => {
    assert.deepEqual(feetOffShins(characterLooks(), seen), []);
  });
  it('covers every feet item in the catalogue', () => {
    const ids = new Set(feetLooks().map((l) => l.look.slots.feet?.id));
    for (const d of ALL_ITEMS) if (d.slot === 'feet' && !d.id.endsWith('_none')) assert.ok(ids.has(d.id), d.id);
  });
});
