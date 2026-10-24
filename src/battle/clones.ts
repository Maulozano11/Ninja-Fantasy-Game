// The clone jutsu's clones (the jutsu with special 'clone'; docs/GAMEPLAY_DESIGN.md, "Shadow Clone",
// the owner's answers of 2026-10-23): copies of the ninja standing on the map beside it. A clone is a
// unit of its own (so it is drawn, struck, moved and aimed at like one). It flanks the foes it stands
// next to (+2 to melee attacks against them), joins its summoner's blows and taijutsu in a combo,
// takes the blow aimed at its summoner, lasts 3 of the summoner's turns or one blow, and can cast a
// little of the summoner's jutsu with the summoner's chakra.
//
// It is played one of two ways (his second answer): it FOLLOWS its summoner (it keeps to its side,
// takes no turn of its own and casts in its summoner's turn), or it is CONTROLLED like a ninja of the
// party: its own turn in the initiative, right ABOVE its summoner's, to walk, strike and cast. A
// player's clones come out controlled and act FIRST: their summoner's turn waits while they play
// theirs (in the stealth phase too, to send one at an alarm, a trap or the guards' eyes). Pure
// rules: no dice here (the engine rolls them).

import type { BattleEvent, BattleState, CloneMode, Pt, Unit } from './types';
import { dist, fullCoverBetween, levelAtPt, steamAt } from './map';
import { freeSpot } from './nav';
import { JUTSU } from './jutsu';
import type { JutsuSpec } from './jutsu';
import { wielded } from './units';
import { rngFor } from '../rules/rng';

/**
 * The clones' numbers. The counts, the 3 turns and the jutsu they may cast are the owner's; the rest
 * are the builder's proposals, waiting for his look (docs/GAMEPLAY_DESIGN.md).
 */
export const CLONE = {
  /** Clones a cast makes: plain 1, enhanced 2 (the owner). */
  count: { plain: 1, enhanced: 2 },
  /** Its summoner's turns a clone lasts, the one it is summoned in counted (the owner: "dura 3 turnos"). */
  turns: 3,
  /** Melee attacks against a foe a clone stands next to: +2 (the owner's yes to the proposal). */
  flank: 2,
  /** How near (m) a clone stands to a foe to flank it or join a blow at it: next to it. */
  reach: 1.6,
  /** Where a clone stands beside its summoner (m): apart enough to be told apart, near enough to stay "beside". */
  near: 0.9,
  far: 1.6,
  /** A clone's blow joining its summoner's weapon blow that lands (proposal): 1d6, no modifier. */
  comboDice: '1d6',
  /** The jutsu the clones may cast together, in points (the owner): plain 1 rank D; enhanced 1 rank C or 2 rank D. */
  points: { plain: 1, enhanced: 2 },
  /** Foes fooled: a plan at a ninja with n clones goes at a clone n times in n + `fooled` (proposal: 1 in 3, 1 in 2). */
  fooled: 2,
  /** What a jutsu of each rank takes of those points. */
  rankCost: { D: 1, C: 2 } as Record<string, number>,
  /** Clans whose eyes see through the shuffle with advantage (proposal: the Mirai's Eye of Tomorrow). */
  keenClans: ['Mirai'] as string[],
  /** How near (m) a keen-eyed foe must stand to the real one to try to uncover it on its turn (proposal). */
  keenReach: 1.6,
  /** A clone's thrown weapon (a kunai, a shuriken, a senbon: the owner's "si podrian lanzar"): 1d4, no modifier, no ammo (proposal). */
  throwDice: '1d4',
};

/** How a clone is played: following its summoner (and saved before the choice existed), or controlled. */
export const cloneMode = (u: Unit): CloneMode => u.clone?.mode ?? 'follow';

/** How a new clone comes out (the owner: "cuando aparecen que salgan para controlarlos"): a player's controlled, the AI's following. */
export const newCloneMode = (owner: Unit): CloneMode => (owner.controller === 'player' ? 'control' : 'follow');

/** A clone still standing on the map (one that took its blow or ran out is gone: down 'fled'). */
export const standingClone = (u: Unit | undefined): u is Unit => !!u?.clone && !u.down;

/** A ninja's clones still standing, oldest first. */
export function clonesOf(s: BattleState, id: string): Unit[] {
  return Object.values(s.units).filter((c) => standingClone(c) && c.clone!.of === id);
}

/** The ninja a clone is a copy of. */
export const summonerOf = (s: BattleState, u: Unit): Unit | undefined => (u.clone ? s.units[u.clone.of] : undefined);

/** What a jutsu takes of the clones' points (null: a clone can't cast it). */
export const cloneRankCost = (spec: JutsuSpec | undefined): number | null => (spec ? CLONE.rankCost[spec.rank] ?? null : null);

/**
 * The jutsu of its summoner's a clone may cast: its own list's rank D ones (and rank C, enhanced), but
 * no clan ability, reaction, charged hand, nor the clone jutsu itself.
 */
export function cloneJutsuOf(owner: Unit, enhanced: boolean): string[] {
  return owner.jutsus.filter((id) => {
    const j = JUTSU[id];
    if (!j || j.ability || j.cast === 'reaction' || j.handCharge || j.special === 'clone') return false;
    return j.rank === 'D' || (enhanced && j.rank === 'C');
  });
}

/** Why a clone can't cast this jutsu now (its rank, the points its summoner's clones have left), or null. */
export function cloneJutsuBlocker(s: BattleState, c: Unit, spec: JutsuSpec): string | null {
  const owner = summonerOf(s, c);
  if (!owner || owner.down) return 'cantAct';
  const cost = cloneRankCost(spec);
  if (cost === null || !c.jutsus.includes(spec.id)) return 'cloneRank';
  if ((owner.clonePoints ?? 0) < cost) return 'cloneSpent';
  return null;
}

/** The foes a ninja is in melee with: standing, within its weapon's reach (and no metal wall between). */
function engaged(s: BattleState, owner: Unit, at: Pt = owner.pos): Unit[] {
  return Object.values(s.units).filter(
    (f) => f.team !== owner.team && !f.down && !f.clone && f.kind !== 'hydra_body' && !f.head?.severed && dist(at, f.pos) <= wielded(owner).reach + 0.1 + (f.bulk ?? 0) && !fullCoverBetween(s, at, f.pos),
  );
}

/** A clone at `p` stands next to `f` (to flank it, or join a blow at it). */
export const besideFoe = (s: BattleState, p: Pt, f: Unit): boolean => dist(p, f.pos) <= CLONE.reach + (f.bulk ?? 0) + (f.kind === 'hydra_head' ? 2.5 : 0) && !fullCoverBetween(s, p, f.pos);

/**
 * Where a clone stands beside its summoner (the builder's proposal: the clones keep to their
 * summoner's side and follow it; the player doesn't walk them). A free cell 0.9–1.6 m from the
 * summoner, on its level, out of the steam: best one next to a foe the summoner is in melee with,
 * on the far side of that foe (a flank); otherwise the nearest to where the clone stood (or, for a
 * new clone, toward the nearest foe). Null if no cell is free.
 */
export function cloneSpot(s: BattleState, owner: Unit, c: Unit, taken: Pt[] = []): Pt | null {
  const foes = engaged(s, owner);
  const nearest = Object.values(s.units)
    .filter((f) => f.team !== owner.team && !f.down && !f.clone && f.kind !== 'hydra_body')
    .sort((a, b) => dist(a.pos, owner.pos) - dist(b.pos, owner.pos))[0];
  const fresh = dist(c.pos, owner.pos) < 0.1;
  const lvl = levelAtPt(s, owner.pos);
  // Nobody else within CLONE.near of where it stands, so it is never drawn over another unit.
  const others = Object.values(s.units).filter((o) => o.id !== c.id && o.id !== owner.id && o.down !== 'fled' && o.down !== 'dead' && o.kind !== 'hydra_head' && !o.bulk);
  const score = (p: Pt): number => {
    if (taken.some((q) => dist(q, p) < CLONE.near) || others.some((o) => dist(o.pos, p) < CLONE.near)) return -Infinity;
    let v = -Math.abs(levelAtPt(s, p) - lvl) * 4 - (steamAt(s, p) ? 6 : 0);
    // Side by side rather than one behind the other: a figure straight in front of another (the
    // same x, a little deeper) would be drawn over it.
    for (const q of [owner.pos, ...taken]) if (Math.abs(q.x - p.x) < 0.75) v -= 3;
    let flank = 0;
    for (const f of foes) {
      if (!besideFoe(s, p, f)) continue;
      // The far side of the foe from the summoner flanks best (the angle between them, 0..π).
      const a1 = Math.atan2(owner.pos.z - f.pos.z, owner.pos.x - f.pos.x);
      const a2 = Math.atan2(p.z - f.pos.z, p.x - f.pos.x);
      let d = Math.abs(a1 - a2);
      if (d > Math.PI) d = 2 * Math.PI - d;
      flank = Math.max(flank, 10 + d);
    }
    v += flank;
    v -= fresh ? (nearest ? dist(p, nearest.pos) * 0.3 : 0) : dist(p, c.pos) * 0.5;
    return v;
  };
  const p = freeSpot(s, c, owner.pos, CLONE.near, CLONE.far, score);
  return p === owner.pos || score(p) === -Infinity ? null : p;
}

/** A clone of `owner`: the same look, sheet and numbers; 1 HP, no chakra of its own, no turns. */
export function makeClone(s: BattleState, owner: Unit, n: number, enhanced: boolean, mode: CloneMode = 'follow'): Unit {
  const c: Unit = structuredClone(owner);
  c.id = `${owner.id}_clone${s.tick}_${n}`;
  c.name = `${owner.name}'s clone`;
  c.nameEs = owner.articleEs ? `Clon ${owner.articleEs === 'la' ? 'de la' : 'del'} ${owner.nameEs ?? owner.name}` : `Clon de ${owner.nameEs ?? owner.name}`;
  c.articleEs = 'el';
  c.clone = { of: owner.id, turns: CLONE.turns, enhanced, mode };
  c.clonePoints = undefined;
  c.disguise = undefined;
  // The element on the summoner's weapon stays on his (a copy's blow is the owner's plain 1d6).
  c.imbued = undefined;
  c.hp = 1;
  c.maxHp = 1;
  c.tempHp = 0;
  c.chakra = 0;
  c.maxChakra = 0;
  c.jutsus = cloneJutsuOf(owner, enhanced);
  c.effects = [];
  c.cond = {};
  c.down = undefined;
  c.deathSaves = { ok: 0, bad: 0 };
  // Sneaking, it moves in this stealth turn like the party (in a fight its own turn gives it a budget).
  c.turn = { move: s.phase === 'stealth' ? c.speed : 0, action: true, bonus: true, reaction: false, moved: 0 };
  c.intent = undefined;
  c.guard = undefined;
  c.charged = undefined;
  c.commanded = undefined;
  c.joined = undefined;
  c.tripleNature = undefined;
  c.lastNature = undefined;
  c.stats2 = { critsTaken: 0, critsLanded: 0, pills: 0, fell: false, fellToCrit: false, tension: 0, jutsuCast: 0 };
  return c;
}

/** Where a cast's clones would stand (as many as there are free cells for, up to the count). */
export function summonSpots(s: BattleState, owner: Unit, enhanced: boolean): Pt[] {
  const n = enhanced ? CLONE.count.enhanced : CLONE.count.plain;
  // Its standing clones go as the new ones come: their cells are free for them.
  const without: BattleState = { ...s, units: Object.fromEntries(Object.entries(s.units).filter(([, u]) => !(standingClone(u) && u.clone!.of === owner.id))) };
  const probe = { ...owner, id: `${owner.id}_probe`, pos: { ...owner.pos } };
  const spots: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = cloneSpot(without, owner, probe, spots);
    if (!p) break;
    spots.push(p);
  }
  return spots;
}

/**
 * The cast: its clones stand up beside the ninja (the ones still standing from an earlier cast go
 * first), with the points of jutsu they share, and take their places in the initiative right above
 * it (the owner: "aparezcan arriba del jugador que los invoco en la iniativa").
 */
export function summonClones(s: BattleState, owner: Unit, enhanced: boolean, ev: BattleEvent[], mode: CloneMode = newCloneMode(owner)): Unit[] {
  const spots = summonSpots(s, owner, enhanced);
  for (const old of clonesOf(s, owner.id)) popClone(s, old, 'recast', ev);
  owner.clonePoints = enhanced ? CLONE.points.enhanced : CLONE.points.plain;
  const made: Unit[] = [];
  spots.forEach((p, i) => {
    const c = makeClone(s, owner, i, enhanced, mode);
    c.pos = { ...p };
    c.facing = owner.facing;
    s.units[c.id] = c;
    made.push(c);
    ev.push({ t: 'clone', unit: c.id, on: true, by: owner.id, at: { ...p } });
  });
  purgeOrder(s);
  placeInOrder(s, owner, made);
  return made;
}

/**
 * Clones take their places in the initiative order right above (before) their summoner, sharing its
 * roll; whose turn it is stays the same. Nothing before the fighting (no order yet).
 */
export function placeInOrder(s: BattleState, owner: Unit, clones: Unit[]): void {
  const at = s.order.indexOf(owner.id);
  if (at < 0 || !clones.length) return;
  const ids = clones.map((c) => c.id).filter((id) => !s.order.includes(id));
  s.order.splice(at, 0, ...ids);
  if (at <= s.turn) s.turn += ids.length;
  for (const id of ids) s.initiative[id] = s.initiative[owner.id] ?? 0;
}

/**
 * The clones gone (struck, run out, replaced) leave the initiative order. `s.turn` keeps pointing at
 * whose turn it is; if that one left, at the entry after it. True if whose turn it was left.
 */
export function purgeOrder(s: BattleState): boolean {
  const gone = (id: string) => {
    const u = s.units[id];
    return !!u?.clone && !!u.down;
  };
  if (!s.order.some(gone)) return false;
  const was = s.order[s.turn];
  const before = s.order.slice(0, s.turn).filter((id) => !gone(id)).length;
  s.order = s.order.filter((id) => !gone(id));
  for (const id of Object.keys(s.initiative)) if (gone(id)) delete s.initiative[id];
  s.turn = before;
  return was !== undefined && gone(was);
}

/** Why a clone goes. */
export type CloneEnd = 'blow' | 'hit' | 'expired' | 'down' | 'recast';

/**
 * A clone goes up in smoke: it took a blow, ran out of turns, its summoner fell, or a new cast
 * replaced it. It stays in the units as a fled one (the screen fades it out where it stood).
 */
export function popClone(s: BattleState, c: Unit, why: CloneEnd, ev: BattleEvent[], at: Pt = c.pos): void {
  if (!c.clone || c.down) return;
  c.down = 'fled';
  c.cond = {};
  c.hp = 0;
  ev.push({ t: 'clone', unit: c.id, on: false, by: c.clone.of, at: { ...at }, why });
  const owner = s.units[c.clone.of];
  // The last of them gone: their jutsu go with them.
  if (owner && !clonesOf(s, owner.id).length) owner.clonePoints = undefined;
  // No following clone left: nobody to be mistaken for (the owner's C).
  if (owner) endDisguiseIfAlone(s, owner);
}

// --- the Shadow Shuffle (the owner: "Me encanta A+B+C juntas") ------------------------------

/** The figures that look alike: the ninja and its following clones (a controlled one walks apart). */
export const figuresOf = (s: BattleState, owner: Unit): Unit[] => [owner, ...clonesOf(s, owner.id).filter((c) => cloneMode(c) === 'follow')];

/** A ninja in the middle of its Shadow Shuffle (with following clones still to be mistaken for). */
export const disguisedNow = (s: BattleState, owner: Unit | undefined): owner is Unit => !!owner?.disguise && !owner.down && figuresOf(s, owner).length > 1;

/** The ninja a figure may be: itself, or the summoner of a clone. */
export const ownerOfFigure = (s: BattleState, u: Unit): Unit => (u.clone ? s.units[u.clone.of] ?? u : u);

/** Why a ninja can't shuffle now (its clones), or null. The bonus action is the engine's. */
export function shuffleBlocker(s: BattleState, u: Unit): string | null {
  if (u.clone) return 'cloneCantDo';
  if (figuresOf(s, u).length < 2) return 'noClones';
  return null;
}

/**
 * The Shadow Shuffle (the owner's A, "Mezcla de sombras"): the ninja and its following clones swap
 * places in secret, and the clones lose their chakra wash: they look exactly like it. Who stands
 * where comes from the battle's seed and the moment (rngFor), never the battle's dice. Every foe
 * starts the puzzle again (a new `n`): none knows, none has been struck from it yet.
 */
export function shadowShuffle(s: BattleState, u: Unit, ev: BattleEvent[]): void {
  const figs = figuresOf(s, u);
  const n = (u.disguise?.n ?? 0) + 1;
  const spots = figs.map((f) => ({ pos: { ...f.pos }, facing: f.facing }));
  const rng = rngFor(s.seed, 'shadowShuffle', u.id, n, s.tick);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  figs.forEach((f, i) => {
    const to = spots[i];
    if (dist(f.pos, to.pos) > 0.05) ev.push({ t: 'teleport', unit: f.id, from: { ...f.pos }, to: { ...to.pos }, log: false });
    f.pos = { ...to.pos };
    f.facing = to.facing;
  });
  u.disguise = { n, known: [], struck: [] };
  ev.push({ t: 'note', key: 'shadowShuffle', params: { name: u.name } });
}

/**
 * The trick is uncovered for every foe (the owner's C): the real one was hit (it bleeds, a clone goes
 * up in smoke), or did what no clone can (an item, a jutsu of rank B or more, being healed).
 */
export function revealDisguise(s: BattleState, u: Unit | undefined, ev: BattleEvent[]): void {
  if (!u?.disguise) return;
  const was = disguisedNow(s, u);
  u.disguise = undefined;
  if (was) ev.push({ t: 'note', key: 'disguiseRevealed', params: { name: u.name } });
}

/** One foe now knows which figure is the real one (a keen eye beside it on its turn). */
export function learnDisguise(u: Unit, foe: Unit, ev: BattleEvent[]): void {
  if (!u.disguise || u.disguise.known.includes(foe.id)) return;
  u.disguise.known.push(foe.id);
  ev.push({ t: 'note', key: 'disguiseSeen', params: { name: foe.name, other: u.name } });
}

/** No following clone left beside it: the shuffle is over (quietly: there is no one to confuse). */
export function endDisguiseIfAlone(s: BattleState, u: Unit): void {
  if (u.disguise && figuresOf(s, u).length < 2) u.disguise = undefined;
}

/** Every clone of a ninja goes (it fell, fled, or cast them again). */
export function popClonesOf(s: BattleState, id: string, why: CloneEnd, ev: BattleEvent[]): void {
  for (const c of clonesOf(s, id)) popClone(s, c, why, ev);
}

/** The summoner's turn begins: its following clones may cast again (an action and a bonus action each; a controlled one has its own turn). */
export function refreshClones(s: BattleState, owner: Unit): void {
  for (const c of clonesOf(s, owner.id)) if (cloneMode(c) === 'follow') c.turn = { move: 0, action: true, bonus: true, reaction: false, moved: 0 };
}

/** The summoner's turn ends: each clone has one turn fewer, and goes at 0. */
export function tickClones(s: BattleState, owner: Unit, ev: BattleEvent[]): void {
  for (const c of clonesOf(s, owner.id)) {
    c.clone!.turns -= 1;
    if (c.clone!.turns <= 0) popClone(s, c, 'expired', ev);
  }
}

/**
 * The summoner moved (a walk, a flash-in, a warp, Kawarimi, a push): its following clones follow,
 * each to the best cell beside it (cloneSpot), at a run. One already where it should be stays; a
 * controlled one goes its own way.
 */
export function followClones(s: BattleState, owner: Unit, ev: BattleEvent[]): void {
  if (owner.down) return;
  const placed: Pt[] = [];
  for (const c of clonesOf(s, owner.id)) {
    if (cloneMode(c) !== 'follow') continue;
    const p = cloneSpot(s, owner, c, placed);
    if (!p) continue;
    placed.push(p);
    if (dist(p, c.pos) < 0.1) continue;
    if (Math.abs(p.x - c.pos.x) > 0.05) c.facing = p.x > c.pos.x ? 1 : -1;
    c.pos = { ...p };
    ev.push({ t: 'move', unit: c.id, path: [{ ...p }], run: true });
  }
  // They face the way their summoner does once beside it.
  for (const c of clonesOf(s, owner.id)) {
    if (cloneMode(c) !== 'follow') continue;
    const f = engaged(s, owner)[0];
    if (f && Math.abs(f.pos.x - c.pos.x) > 0.05) c.facing = f.pos.x > c.pos.x ? 1 : -1;
  }
}

/** The +2 a melee attack at `t` gets when a clone of the attacker's side stands next to `t` (never twice). */
export function cloneFlank(s: BattleState, a: Unit, t: Unit): number {
  for (const c of Object.values(s.units)) {
    if (!standingClone(c) || c.id === a.id || c.team !== a.team) continue;
    if (besideFoe(s, c.pos, t)) return CLONE.flank;
  }
  return 0;
}

/** The clones of a ninja that stand next to its target: they join its blow in a combo. */
export const comboClones = (s: BattleState, a: Unit, t: Unit): Unit[] => (a.clone ? [] : clonesOf(s, a.id).filter((c) => besideFoe(s, c.pos, t)));

/**
 * The clone that takes a blow aimed at its summoner: the nearest following one (the blow struck a
 * clone; the real ninja stood where that clone was). Only a clone set to follow does it (the owner:
 * "solo cuando estan en seguir cuando un enemigo ataca al jugador invocador pasa eso de que el clon
 * absorbe el ataque y el invocador cambia de lugar con el clon"); a controlled one never does, even
 * standing beside him (it can still be struck itself, and goes at one blow).
 */
export function cloneTakesBlow(s: BattleState, t: Unit): Unit | undefined {
  return clonesOf(s, t.id)
    .filter((c) => cloneMode(c) === 'follow')
    .sort((a, b) => dist(a.pos, t.pos) - dist(b.pos, t.pos))[0];
}

/**
 * A clone the enemy takes for a ninja: a controlled one, walking and fighting on its own (they can't
 * tell it from the real one, so they see, chase and strike it like any foe; the builder's reading of
 * "como señuelo"). A following one stays a shadow at its summoner's side (it only fools them: fooledBy).
 */
export const decoyClone = (u: Unit): boolean => standingClone(u) && cloneMode(u) === 'control';

/** One die of a jutsu's dice ("2d8+3" → "1d8"): a clone's blow in a taijutsu combo (proposal). */
export const oneDieOf = (dice: string | undefined): string => {
  const m = dice?.match(/^\d+d(\d+)/);
  return m ? `1d${m[1]}` : CLONE.comboDice;
};
