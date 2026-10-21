// Fuzz: random player actions (all clan abilities) against the AI, with invariants after every accepted action.
import { DEFAULT_CHARACTER, LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import type { ShinobiCharacter } from '/home/user/Ninja-Fantasy-Game/src/types/shinobi';
import type { Action, BattleState } from '/home/user/Ninja-Fantasy-Game/src/battle/types';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import type { EnemySetup } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { cellBlocked, cellOf, gridFor, idx, cellCenter, fullCoverBetween } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
import { reachable, canStop } from '/home/user/Ninja-Fantasy-Game/src/battle/nav';

let seedR = 12345;
const rnd = () => ((seedR = (seedR * 1103515245 + 12345) % 2147483648) / 2147483648);
const pickOne = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const shiori = LEGENDARY_PRESETS.find((p) => p.character.name === 'Shiori')!.character;

const errors: Record<string, string> = {};
const anomalies: Record<string, number> = {};
const sample: Record<string, string> = {};
const note = (k: string, d: string) => { anomalies[k] = (anomalies[k] ?? 0) + 1; sample[k] ??= d; };
let accepted = 0;
let crashes = 0;
const used: Record<string, number> = {};

function invariants(prev: BattleState, s: BattleState, a: Action) {
  const g = gridFor(s.mapId);
  const seen = new Map<number, string>();
  for (const u of Object.values(s.units)) {
    if (u.chakra < 0) note('negativeChakra', `${u.id} ${u.chakra} after ${JSON.stringify(a)}`);
    if (u.kind !== 'ninja' || u.down === 'dead' || u.down === 'fled' || u.down === 'ko') continue;
    const c = cellOf(u.pos);
    if (cellBlocked({ ...s, walls: s.walls.filter((w) => w.kind === 'metal' || w.kind === 'metalBlock') }, c) && !cellBlocked({ ...s, walls: [] }, c)) note('unitInsideMetal', `${u.id} ${JSON.stringify(u.pos)} after ${JSON.stringify(a)}`);
    const i = idx(g, c);
    if (seen.has(i)) { note('twoUnitsOneCell', `${u.id}/${seen.get(i)} after ${JSON.stringify(a)}`); const o = s.units[seen.get(i)!]; console.log('TWO', u.id, u.pos, u.down, o.id, o.pos, o.down, 'prev', prev.units[u.id].pos, prev.units[o.id].pos, prev.units[o.id].down, 'act', JSON.stringify(a)); }
    seen.set(i, u.id);
    const p = prev.units[u.id];
    if (p && (p.pos.x !== u.pos.x || p.pos.z !== u.pos.z) && fullCoverBetween(s, p.pos, u.pos) && a.type !== 'jutsu' && a.type !== 'move') note(`crossedMetalWall:${a.type}`, `${u.id} ${JSON.stringify(p.pos)}->${JSON.stringify(u.pos)} via ${JSON.stringify(a)}`);
  }
}

function randomAction(s: BattleState): Action {
  const u = current(s)!;
  const units = Object.values(s.units).filter((x) => !x.down);
  const other = pickOne(units);
  const r = rnd();
  const pt = { x: u.pos.x + (rnd() - 0.5) * 14, z: u.pos.z + (rnd() - 0.5) * 14 };
  if (r < 0.2) {
    const reach = reachable(s, u, u.turn.move);
    const cells = [...reach.cost.keys()];
    const i = cells.length ? pickOne(cells) : idx(gridFor(s.mapId), cellOf(u.pos));
    const g = gridFor(s.mapId);
    return { type: 'move', unit: u.id, to: { c: i % g.cols, r: Math.floor(i / g.cols) } };
  }
  if (r < 0.32) return { type: 'attack', unit: u.id, target: other.id, ranged: rnd() < 0.5 };
  if (r < 0.37 && s.walls.length) return { type: 'attack', unit: u.id, target: `wall:${pickOne(s.walls).id}`, ranged: rnd() < 0.5 };
  if (r < 0.75 && u.jutsus.length) {
    const j = pickOne(u.jutsus);
    const node = s.nodes.length && rnd() < 0.7 ? pickOne(s.nodes).pos : undefined;
    return { type: 'jutsu', unit: u.id, jutsu: j, at: node ?? (rnd() < 0.5 ? { ...other.pos } : pt), target: rnd() < 0.7 ? other.id : undefined, target2: rnd() < 0.2 ? pickOne(units).id : undefined };
  }
  if (r < 0.82) return { type: 'shove', unit: u.id, target: other.id, mode: rnd() < 0.5 ? 'push' : 'prone' };
  if (r < 0.86) return { type: 'dash', unit: u.id };
  return { type: 'endTurn', unit: u.id };
}

const ENEMIES: EnemySetup[][] = [
  [{ kind: 'raider', pos: { x: 14, z: 9 } }, { kind: 'hunter', pos: { x: 16, z: 12 } }, { kind: 'rogue', pos: { x: 17, z: 7 } }],
  [{ kind: 'jonin', pos: { x: 15, z: 10 } }, { kind: 'raider', pos: { x: 13, z: 12 } }, { kind: 'hunter', pos: { x: 14, z: 8 } }],
  [{ kind: 'hydra', pos: { x: 18, z: 9 } }],
];
for (let b = 0; b < 150; b++) {
  seedR = 1000 + b * 7919;
  const party = [
    { character: hero({ id: 'k', name: 'Kai', clan: 'Koton' }), pos: { x: 8, z: 10 } },
    { character: hero({ id: 'r', name: 'Ren', clan: 'Ryusei' }), pos: { x: 8, z: 12 } },
    { character: { ...shiori, id: 'n', level: b % 3 === 0 ? 9 : shiori.level }, pos: { x: 8, z: 8 } },
    { character: hero({ id: 'm', name: 'Mira', clan: 'Mirai' }), pos: { x: 7, z: 10 } },
  ];
  let s: BattleState;
  try {
    s = createBattle({ seed: b + 1, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party, enemies: ENEMIES[b % ENEMIES.length], stealth: false, supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }).state;
  } catch (e) { crashes++; console.log('create', e); continue; }
  for (const u of Object.values(s.units)) if (u.team === 'party') u.chakra = u.maxChakra = 60;
  let last = '';
  let same = 0;
  try {
    for (let step = 0; step < 1500 && s.phase === 'combat'; step++) {
      let a: Action | null;
      if (s.pending) {
        const reactor = s.units[s.pending.reactor];
        a = reactor.controller === 'player' ? { type: 'react', unit: reactor.id, take: rnd() < 0.6 } : null;
        if (!a) { note('pendingForAi', JSON.stringify(s.pending)); break; }
      } else {
        const u = current(s)!;
        if (u.controller === 'ai') a = aiAction(s);
        else a = randomAction(s);
        if (!a) break;
        same = u.id === last ? same + 1 : 0;
        last = u.id;
        if (same > 30) a = { type: 'endTurn', unit: u.id };
      }
      const out = applyAction(s, a);
      if (!out.ok) {
        errors[out.reason ?? '?'] = `${JSON.stringify(a)}`;
        if (!s.pending) {
          const u = current(s)!;
          if (u.controller === 'ai') {
            console.log('REFUSED', JSON.stringify(a), out.reason, JSON.stringify(Object.values(s.units).filter((x) => !x.down && Math.hypot(x.pos.x - 15.25, x.pos.z - 9.25) < 1).map((x) => [x.id, x.pos])));
            note('aiRefused', `${out.reason} ${JSON.stringify(a)} prone=${u.cond.prone} move=${u.turn.move} speed=${u.speed}`);
            s = applyAction(s, { type: 'endTurn', unit: u.id }).state;
          }
        }
        continue;
      }
      accepted++;
      if (a.type === 'jutsu') used[a.jutsu] = (used[a.jutsu] ?? 0) + 1;
      if (a.type === 'move' && a.unit === 'm' && out.state.units.m.pos.x === 9.75 && out.state.units.m.pos.z === 3.25) console.log('EVENTS', JSON.stringify(out.events.map((e) => e.t === 'move' ? { t: e.t, path: e.path } : e)).slice(0, 1500), 'dashed', s.units.m.turn.dashed, 'move', s.units.m.turn.move);
      invariants(s, out.state, a);
      s = out.state;
    }
  } catch (e) {
    crashes++;
    console.log('crash battle', b, (e as Error).stack?.split('\n').slice(0, 6).join('\n'));
  }
}
console.log({ accepted, crashes });
console.log('jutsu accepted', used);
console.log('anomalies', anomalies);
console.log('samples', sample);
console.log('refusal reasons seen', Object.keys(errors).join(', '));
