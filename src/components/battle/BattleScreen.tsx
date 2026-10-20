// The party battle screen: the map drawn on a canvas with the HUD on top. The player picks an
// action and aims it; the engine resolves it and the screen plays the events. AI turns (enemies,
// hydra heads, allies set to the AI) play one action at a time so they can be watched.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, Volume2, VolumeX, Sun, Moon, CloudRain } from 'lucide-react';
import type { Action, AiOrder, BattleEvent, BattleState, Cell, Pt, Unit } from '../../battle/types';
import { homeTeam } from '../../battle/types';
import { applyAction } from '../../battle/engine';
import { jutsuCost, needsSeals } from '../../battle/engine';
import { aiAction, aiToAct } from '../../battle/ai';
import { current } from '../../battle/turns';
import { attackPreview } from '../../battle/combat';
import { JUTSU, areaOf, enhanced as enhancedSpec } from '../../battle/jutsu';
import type { JutsuSpec } from '../../battle/jutsu';
import { cellCenter, cellOf, dist, getMap, gridFor, idx, lineOfSight, sameCell } from '../../battle/map';
import { canStop, occupancy, pathCost, pathTo, reachable } from '../../battle/nav';
import { foreseen } from '../../battle/intent';
import { MAX_STRUCTURES, STRUCTURE_AC, breakable, ownStructures, structureAt, structureAttack, structureBlocker, structureDist } from '../../battle/structures';
import { commandBlocker, edgeFoe, nodeInSight, nodeUnder, ownNodeAt, ownNodes, submissionBlocker, submissionRefused, swapBlocker, warpBlocker, warpLanding } from '../../battle/clans';
import { KUNAI, KUNAI_LONG, handsFree, wielded } from '../../battle/units';
import { STONE_RANGE } from '../../battle/stealth';
import { TAG } from '../../battle/hazards';
import { battleResult } from '../../battle/result';
import type { PartyBattleResult } from '../../battle/result';
import { useLang } from '../../i18n';
import { LangToggle } from '../../i18n/LangToggle';
import { soundManager } from '../../utils/audio';
import { MAP_ART } from './mapArt';
import { Playback } from './playback';
import { drawBattle, image, pickGround, pickStructure, pickUnit, project, screenToWorld } from './renderer';
import type { Camera, Overlay } from './renderer';
import { playSound, startAmbience } from './battleSound';
import { floatLabel, jutsuName, logLine, structureName } from './battleLog';
import type { LogLine } from './battleLog';
import { SAVE_EN, SAVE_ES, T } from './battleText';
import type { TKey } from './battleText';
import { ABILITY_ICON, ACTION_ICON, ActionBar, ELEMENT_ICON, InitiativeBar, LogPanel, PartyFrames, Prompt, RollToast, Tip, UnitCard } from './hud';
import type { ActionButton } from './hud';
import { preloadWorldGroups } from '../world/WorldSpriteView';

type Mode =
  | { k: 'move' }
  | { k: 'attack'; ranged: boolean }
  /** `picked`: Command from level 9, the first of its two targets. */
  | { k: 'jutsu'; id: string; enhanced: boolean; picked?: string }
  | { k: 'item'; item: 'bandage' | 'antidote' | 'tag' }
  | { k: 'shove'; mode: 'push' | 'prone' }
  | { k: 'stone' }
  | { k: 'stabilize' }
  | { k: 'drag'; body: string };

export interface BattleScreenProps {
  initial: { state: BattleState; events: BattleEvent[] };
  title?: string;
  /** CSS height of the screen (it fills the page under the app header by default). */
  height?: string;
  onEnd: (result: PartyBattleResult, state: BattleState) => void;
}

const TIP_KEYS = ['tip_move', 'tip_attack', 'tip_jutsu', 'tip_cover', 'tip_stealth', 'tip_hands', 'tip_hydra', 'tip_mirai', 'tip_koton', 'tip_ryusei', 'tip_northstar'] as const;
type TipKey = (typeof TIP_KEYS)[number];

function tipSeen(k: string): boolean {
  try {
    return localStorage.getItem('shinobi.tips.off') === '1' || localStorage.getItem(`shinobi.${k}`) === '1';
  } catch {
    return false;
  }
}
function markTip(k: string): void {
  try {
    localStorage.setItem(`shinobi.${k}`, '1');
  } catch {
    // not remembered
  }
}

export const BattleScreen: React.FC<BattleScreenProps> = ({ initial, title, height, onEnd }) => {
  const lang = useLang();
  const [state, setState] = useState<BattleState>(initial.state);
  const stateRef = useRef(state);
  stateRef.current = state;
  const map = useMemo(() => getMap(state.mapId), [state.mapId]);
  const art = MAP_ART[state.mapId];

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniRef = useRef<HTMLCanvasElement | null>(null);
  const cam = useRef({ x: 0, y: 0, zoom: 1, tx: 0, ty: 0, follow: true });
  const size = useRef({ w: 1280, h: 720, dpr: 1 });
  const shake = useRef({ power: 0, until: 0 });
  const keys = useRef(new Set<string>());
  const mouse = useRef({ x: 0, y: 0, down: false, dragging: false, sx: 0, sy: 0, camX: 0, camY: 0 });

  const [mode, setMode] = useState<Mode>({ k: 'move' });
  const [selected, setSelected] = useState<string | undefined>();
  const [hover, setHover] = useState<{ unit?: string; wall?: string; pt?: Pt; sx: number; sy: number } | null>(null);
  const [hoverBtn, setHoverBtn] = useState<ActionButton | null>(null);
  const [zoom, setZoom] = useState<1 | 2>(1);
  const [, setUi] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [toast, setToast] = useState<{ text: string; sub?: string; ok?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(soundManager.getMuted());
  const [more, setMore] = useState(false);
  const [tip, setTip] = useState<TipKey | null>(null);
  const [speed, setSpeed] = useState<1 | 2 | 3>(() => {
    try {
      const v = Number(localStorage.getItem('shinobi.battleSpeed'));
      return v === 2 || v === 3 ? v : 1;
    } catch {
      return 1;
    }
  });
  const langRef = useRef(lang);
  langRef.current = lang;

  // --- playback ---------------------------------------------------------------------------

  const pbRef = useRef<Playback | null>(null);
  if (!pbRef.current) {
    pbRef.current = new Playback(initial.state, {
      sound: (n, d) => playSound(n, d),
      log: (ev) => {
        const line = logLine(ev, stateRef.current, langRef.current, (id) => pbRef.current?.wallOf(id, stateRef.current));
        if (line) setLog((l) => [...l.slice(-199), line]);
      },
      roll: (ev) => {
        const s = stateRef.current;
        const lg = langRef.current;
        if (ev.t === 'attack') {
          const who = s.units[ev.unit]?.name ?? '';
          const tgt = ev.target.startsWith('prop:')
            ? ''
            : ev.target.startsWith('wall:')
              ? structureName(pbRef.current?.wallOf(ev.target.slice(5), s), lg)
              : s.units[ev.target]?.name ?? '';
          setToast({ text: `${who} → ${tgt}`, sub: `d20 ${ev.roll.d20} ${ev.roll.mod >= 0 ? '+' : '−'} ${Math.abs(ev.roll.mod)} = ${ev.roll.total} vs ${lg === 'es' ? 'CA' : 'AC'} ${ev.roll.dc}`, ok: ev.roll.success });
        } else if (ev.t === 'save' || ev.t === 'deathSave') {
          const who = s.units[ev.unit]?.name ?? '';
          setToast({ text: who, sub: `d20 ${ev.roll.d20} → ${ev.roll.total} vs ${lg === 'es' ? 'CD' : 'DC'} ${ev.roll.dc}`, ok: ev.roll.success });
        } else if (ev.t === 'check') {
          const who = s.units[ev.unit]?.name ?? '';
          setToast({ text: `${who} · ${ev.what}`, sub: `d20 ${ev.roll.d20} → ${ev.roll.total}`, ok: ev.roll.success });
        }
      },
      focus: (id) => focusUnit(id),
      shake: (p) => {
        shake.current = { power: Math.max(shake.current.power, p), until: performance.now() + 260 };
      },
      label: (ev) => floatLabel(ev, stateRef.current, langRef.current),
    });
    pbRef.current.push(initial.events, performance.now());
  }
  const pb = pbRef.current;
  pb.speed = speed;

  // --- camera -----------------------------------------------------------------------------

  const clampCam = useCallback(
    (x: number, y: number) => {
      const vw = size.current.w / cam.current.zoom;
      const vh = size.current.h / cam.current.zoom;
      const minY = art.backdropTop;
      const maxX = Math.max(0, map.px.width - vw);
      const maxY = Math.max(minY, map.px.height - vh);
      return { x: vw >= map.px.width ? (map.px.width - vw) / 2 : Math.max(0, Math.min(maxX, x)), y: vh >= map.px.height - minY ? minY : Math.max(minY, Math.min(maxY, y)) };
    },
    [art, map],
  );

  const centerOn = useCallback(
    (p: Pt, instant = false) => {
      const s = project(map, p);
      const vw = size.current.w / cam.current.zoom;
      const vh = size.current.h / cam.current.zoom;
      const c = clampCam(s.X - vw / 2, s.Y - 60 - vh / 2);
      cam.current.tx = c.x;
      cam.current.ty = c.y;
      if (instant) {
        cam.current.x = c.x;
        cam.current.y = c.y;
      }
    },
    [clampCam, map],
  );

  const focusUnit = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const u = s.units[id];
      if (!u || !cam.current.follow) return;
      const p = pbRef.current?.posOf(id, performance.now()) ?? u.pos;
      // Only move the camera if the unit is near the edge of the view.
      const sp = project(map, p);
      const vw = size.current.w / cam.current.zoom;
      const vh = size.current.h / cam.current.zoom;
      const mx = (sp.X - cam.current.tx) / vw;
      const my = (sp.Y - cam.current.ty) / vh;
      if (mx < 0.2 || mx > 0.8 || my < 0.2 || my > 0.75) centerOn(p);
    },
    [centerOn, map],
  );

  // The jutsu effects' sheets load now, so the first cast already plays from its sheet.
  useEffect(() => preloadWorldGroups('vfx_'), []);

  useEffect(() => {
    // Start centred on the party.
    const party = Object.values(initial.state.units).filter((u) => u.team === 'party');
    if (party.length) {
      const c = { x: party.reduce((a, u) => a + u.pos.x, 0) / party.length, z: party.reduce((a, u) => a + u.pos.z, 0) / party.length };
      centerOn(c, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cam.current.zoom = zoom;
    const vwOld = size.current.w / (zoom === 2 ? 1 : 2);
    const vhOld = size.current.h / (zoom === 2 ? 1 : 2);
    const cx = cam.current.x + vwOld / 2;
    const cy = cam.current.y + vhOld / 2;
    const c = clampCam(cx - size.current.w / zoom / 2, cy - size.current.h / zoom / 2);
    cam.current.x = cam.current.tx = c.x;
    cam.current.y = cam.current.ty = c.y;
  }, [zoom, clampCam]);

  // --- who acts ---------------------------------------------------------------------------

  const busy = pb.busy;
  const playerTurn = !busy && state.phase === 'combat' && !state.pending && current(state)?.controller === 'player' && current(state)?.team === 'party';
  const stealthParty = useMemo(
    () => Object.values(state.units).filter((u) => u.team === 'party' && !u.down && u.controller === 'player' && !state.stealthDone.includes(u.id)),
    [state],
  );
  const actor: Unit | undefined = useMemo(() => {
    if (busy || state.phase === 'ended') return undefined;
    if (state.phase === 'combat') return playerTurn ? current(state) : undefined;
    return stealthParty.find((u) => u.id === selected) ?? stealthParty[0];
  }, [busy, state, playerTurn, stealthParty, selected]);

  useEffect(() => {
    if (actor && actor.id !== selected) setSelected(actor.id);
  }, [actor, selected]);

  // Back to moving whenever the actor changes.
  useEffect(() => {
    setMode({ k: 'move' });
    setMore(false);
  }, [actor?.id, state.phase]);

  // --- applying actions -------------------------------------------------------------------

  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showError = useCallback((reason?: string) => {
    setError(reasonLine(reason));
    if (errTimer.current) clearTimeout(errTimer.current);
    errTimer.current = setTimeout(() => setError(null), 2200);
  }, []);

  const act = useCallback(
    (a: Action): boolean => {
      const s = stateRef.current;
      if (pbRef.current?.busy && a.type !== 'setController') return false;
      const out = applyAction(s, a);
      if (!out.ok) {
        showError(out.reason);
        playSound('miss');
        return false;
      }
      stateRef.current = out.state;
      setState(out.state);
      pbRef.current!.push(out.events, performance.now());
      setMode({ k: 'move' });
      setMore(false);
      setUi((n) => n + 1);
      return true;
    },
    [showError],
  );

  // AI turns: one action at a time, after the screen has caught up.
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (busy || aiTimer.current) return;
    if (!aiToAct(state)) return;
    aiTimer.current = setTimeout(() => {
      aiTimer.current = null;
      const s = stateRef.current;
      if (pbRef.current?.busy || !aiToAct(s)) return;
      const a = aiAction(s);
      if (!a) return;
      const out = applyAction(s, a);
      const u = current(s);
      const done = out.ok ? out : u ? applyAction(s, { type: 'endTurn', unit: u.id }) : out;
      if (!done.ok) return;
      stateRef.current = done.state;
      setState(done.state);
      pbRef.current!.push(done.events, performance.now());
      setUi((n) => n + 1);
    }, 260 / (pbRef.current?.speed ?? 1));
  });
  useEffect(() => () => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
  }, []);

  // Automated checks drive the battle through this handle in development.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __battle?: unknown }).__battle = {
      state: () => stateRef.current,
      act,
      busy: () => pbRef.current?.busy,
      centerOn: (x: number, z: number) => centerOn({ x, z }, true),
      screenOf: (x: number, z: number) => {
        const p = project(map, { x, z });
        return { x: (p.X - cam.current.x) * cam.current.zoom, y: (p.Y - cam.current.y) * cam.current.zoom + (canvasRef.current?.getBoundingClientRect().top ?? 0) };
      },
    };
  }, [act, centerOn, map]);

  // --- previews ---------------------------------------------------------------------------

  const reach = useMemo(() => {
    if (!actor || actor.kind !== 'ninja') return null;
    const budget = actor.cond.prone ? actor.turn.move - actor.speed / 2 : actor.turn.move;
    if (budget <= 0.01) return null;
    const r = reachable(state, actor, budget);
    const occ = occupancy(state);
    const g = gridFor(state.mapId);
    const cells: Cell[] = [];
    for (const i of r.cost.keys()) {
      const c = { c: i % g.cols, r: Math.floor(i / g.cols) };
      if (canStop(state, actor, c, occ)) cells.push(c);
    }
    return { r, cells };
  }, [actor, state]);

  const spec: JutsuSpec | undefined = mode.k === 'jutsu' ? (mode.enhanced ? enhancedSpec(JUTSU[mode.id]) : JUTSU[mode.id]) : undefined;

  const preview = useMemo(() => {
    const o: Overlay = {};
    let label: string | null = null;
    let sub: string | null = null;
    if (!actor) return { o, label, sub };
    const s = state;
    const hu = hover?.unit ? s.units[hover.unit] : undefined;
    if (mode.k === 'move') {
      if (reach) o.reach = { cells: reach.cells, tone: 'move' };
      if (hu && hu.team !== actor.team) {
        const pv = attackPreview(s, actor, hu, 'melee');
        if (pv.inRange) {
          o.targets = [hu.id];
          label = T('aimChance', { p: Math.round(pv.chance * 100), dice: wielded(actor).dice });
          sub = reasonsText(pv, lang);
        }
      } else if (hover?.pt && reach) {
        const c = cellOf(hover.pt);
        const path = pathTo(s, reach.r, c);
        if (path && path.length) {
          const cost = pathCost(s, actor, path);
          o.path = { pts: [actor.pos, ...path.map(cellCenter)], ok: canStop(s, actor, c) };
          label = T('aimMove', { m: cost.toFixed(1) });
        }
      }
    } else if (mode.k === 'attack') {
      const range = mode.ranged ? KUNAI.reach : wielded(actor).reach;
      o.range = { at: actor.pos, radius: range };
      const hw = !hu && hover?.wall ? s.walls.find((w) => w.id === hover.wall) : undefined;
      if (hu && hu.team !== actor.team) {
        const pv = attackPreview(s, actor, hu, mode.ranged ? 'ranged' : 'melee');
        o.targets = [hu.id];
        label = pv.inRange ? T('aimChance', { p: Math.round(pv.chance * 100), dice: mode.ranged ? KUNAI.dice : wielded(actor).dice }) : T('aimNoReach');
        sub = reasonsText(pv, lang);
      } else if (hw) {
        // A Kōton structure: AC 10, like a crate.
        const pv = structureAttack(s, actor, hw, mode.ranged);
        o.point = { at: pv.at, ok: pv.inRange && pv.sight };
        label = pv.inRange && pv.sight ? T('aimChance', { p: Math.round(pv.chance * 100), dice: mode.ranged ? KUNAI.dice : wielded(actor).dice }) : T('aimNoReach');
        const adv = pv.adv === 'none' ? [] : [T(pv.adv === 'advantage' ? 'adv' : 'disadv'), ...pv.reasons.map((r) => T(`reason_${r}` as TKey))];
        sub = [structureName(hw, lang), T('ac', { n: STRUCTURE_AC }), ...adv].join(' · ');
      }
    } else if (mode.k === 'jutsu' && spec && spec.shape === 'node') {
      // Warp Strike: the Nodes it can jump to light up; the one under the cursor shows where it lands.
      o.range = { at: actor.pos, radius: spec.range };
      o.nodes = { valid: ownNodes(s, actor).filter((n) => !warpBlocker(s, actor, n)).map((n) => n.id) };
      const n = (hu && ownNodeAt(s, actor, hu.pos)) || (hover?.pt && ownNodeAt(s, actor, hover.pt)) || undefined;
      if (n) {
        const why = warpBlocker(s, actor, n);
        const land = why ? null : warpLanding(s, actor, n);
        const foe = land ? edgeFoe(s, actor, land) : undefined;
        o.nodes.hover = n.id;
        o.point = { at: land ?? n.pos, ok: !!land };
        label = why ? reasonLine(why) : foe ? T('aimWarpEdge', { name: foe.name }) : T('aimMove', { m: dist(actor.pos, land!).toFixed(1) });
      } else label = T('r_noNode');
    } else if (mode.k === 'jutsu' && spec && spec.shape === 'onNode') {
      // Spatial Swap: whoever stands on a Node it can reach; an enemy gets a STR save.
      o.range = { at: actor.pos, radius: spec.range };
      o.nodes = { valid: ownNodes(s, actor).filter((n) => dist(actor.pos, n.pos) <= spec.range + 0.1 && nodeInSight(s, actor, n)).map((n) => n.id) };
      o.targets = Object.values(s.units).filter((x) => !swapBlocker(s, actor, x)).map((x) => x.id);
      if (hu) {
        const why = swapBlocker(s, actor, hu);
        label = why ? reasonLine(why) : jutsuName(spec.id, lang);
        if (!why) o.nodes.hover = nodeUnder(s, actor, hu)?.id;
        if (!why && hu.team !== actor.team) sub = T('aimSave', { save: (lang === 'es' ? SAVE_ES : SAVE_EN).str, dc: actor.saveDC });
      } else if (!o.targets.length) label = T('r_notOnNode');
    } else if (mode.k === 'jutsu' && spec && (spec.special === 'command' || spec.special === 'submission')) {
      // Command and Natural Submission: every mind it can take now lights up; over a unit, its WIS
      // save, or why it can't be taken.
      const blocker = spec.special === 'command' ? commandBlocker : submissionBlocker;
      o.range = { at: actor.pos, radius: spec.range };
      o.targets = Object.values(s.units).filter((x) => x.id === mode.picked || !blocker(s, actor, x)).map((x) => x.id);
      if (hu && hu.id !== mode.picked) {
        const why = blocker(s, actor, hu);
        label = why ? reasonLine(why) : jutsuName(spec.id, lang);
        if (!why) sub = T('aimSave', { save: (lang === 'es' ? SAVE_ES : SAVE_EN).wis, dc: actor.saveDC });
      } else if (mode.picked) label = T('aimSecond');
    } else if (mode.k === 'jutsu' && spec) {
      const self = spec.shape === 'self' || spec.shape === 'selfCircle';
      if (!self) o.range = { at: actor.pos, radius: spec.range };
      const at = self ? actor.pos : hu ? hu.pos : hover?.pt;
      if (at) {
        const area = areaOf(spec, actor.pos, at);
        if (area) {
          o.area = { shape: area, tone: spec.special === 'heal' ? 'heal' : 'enemy' };
          const hit = Object.values(s.units).filter((u) => !u.down && (u.id !== actor.id || spec.shape === 'circle') && inAreaLoose(area, u));
          o.targets = hit.filter((u) => u.team !== actor.team).map((u) => u.id);
          o.warn = hit.filter((u) => u.team === actor.team).map((u) => u.id);
          label = T('aimHits', { n: hit.length });
          if (o.warn.length) sub = T('aimAllies', { n: o.warn.length });
        } else if (hu) {
          // One target (Pursuing Flame): its name, with the save under it.
          o.targets = [hu.id];
          label = jutsuName(spec.id, lang);
        }
        if (spec.save) {
          const sv = lang === 'es' ? SAVE_ES[spec.save] : SAVE_EN[spec.save];
          const line = T('aimSave', { save: sv, dc: actor.saveDC }) + (spec.saveAdv === 'disadvantage' ? ` · ${T('saveDisadv')}` : '');
          sub = sub ? `${line} · ${sub}` : line;
        }
        if (!self && dist(actor.pos, at) > spec.range + 0.1 + (hu?.bulk ?? 0) + (hu?.kind === 'hydra_head' ? 2.5 : 0)) label = T('aimNoReach');
        if (spec.shape === 'point' || spec.shape === 'wall') o.point = { at, ok: dist(actor.pos, at) <= spec.range + 0.1 };
        if (spec.special === 'metalBlock' || spec.special === 'metalWall') {
          // A Kōton structure: where it would stand, why it can't, and how many already stand.
          const w = structureAt(spec, actor.pos, at, actor.id, 'preview');
          const why = dist(actor.pos, at) > spec.range + 0.1 ? 'outOfRange' : !lineOfSight(s, actor.pos, at) ? 'noSight' : structureBlocker(s, w);
          const n = ownStructures(s, actor.id).length;
          o.point = undefined;
          o.footprint = { wall: w, ok: !why };
          label = why ? reasonLine(why) : T('aimStructures', { n });
          if (n >= MAX_STRUCTURES) sub = T('aimOldest');
        }
      }
    } else if (mode.k === 'item' && mode.item === 'tag') {
      o.range = { at: actor.pos, radius: TAG.range };
      if (hover?.pt) o.area = { shape: { kind: 'circle', center: hover.pt, radius: TAG.radius }, tone: 'enemy' };
    } else if (mode.k === 'stone') {
      o.range = { at: actor.pos, radius: STONE_RANGE };
      if (hover?.pt) o.point = { at: hover.pt, ok: dist(actor.pos, hover.pt) <= STONE_RANGE };
    } else if (mode.k === 'shove' || mode.k === 'stabilize' || (mode.k === 'item' && mode.item !== 'tag')) {
      o.range = { at: actor.pos, radius: 1.5 };
      if (hu) o.targets = [hu.id];
    } else if (mode.k === 'drag') {
      if (hover?.pt) o.point = { at: hover.pt, ok: true };
    }
    return { o, label, sub };
  }, [actor, hover, mode, reach, spec, state, lang]);

  // --- render loop ------------------------------------------------------------------------

  const foreseenNow = useMemo(() => foreseen(state), [state]);
  const overlayRef = useRef(preview.o);
  overlayRef.current = preview.o;
  const hoverRef = useRef<string | undefined>(undefined);
  hoverRef.current = hover?.unit;
  const selectedRef = useRef<string | undefined>(undefined);
  selectedRef.current = selected;
  const foreseenRef = useRef(foreseenNow);
  foreseenRef.current = foreseenNow;

  useEffect(() => {
    let raf = 0;
    let lastUi = 0;
    let hadBanners = false;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const now = performance.now();
      const s = stateRef.current;
      const p = pbRef.current!;
      const wasBusy = p.busy;
      const emptied = p.step(now, s);
      if (emptied || (wasBusy && !p.busy)) {
        p.sync(s, now);
        setUi((n) => n + 1);
      } else if ((p.busy || p.banners.length || hadBanners) && now - lastUi > 140) {
        lastUi = now;
        hadBanners = p.banners.length > 0;
        setUi((n) => n + 1);
      }
      // Camera: keys pan, otherwise ease toward the target.
      const c = cam.current;
      const k = keys.current;
      const pan = 14 / c.zoom;
      let moved = false;
      if (k.has('ArrowLeft') || k.has('a')) (c.tx -= pan), (moved = true);
      if (k.has('ArrowRight') || k.has('d')) (c.tx += pan), (moved = true);
      if (k.has('ArrowUp') || k.has('w')) (c.ty -= pan), (moved = true);
      if (k.has('ArrowDown') || k.has('s')) (c.ty += pan), (moved = true);
      if (moved) {
        const cl = clampCam(c.tx, c.ty);
        c.tx = cl.x;
        c.ty = cl.y;
      }
      c.x += (c.tx - c.x) * 0.18;
      c.y += (c.ty - c.y) * 0.18;
      if (Math.abs(c.tx - c.x) < 0.3) c.x = c.tx;
      if (Math.abs(c.ty - c.y) < 0.3) c.y = c.ty;
      const { w, h, dpr } = size.current;
      const kk = Math.max(1, Math.round(c.zoom * dpr));
      const sh = now < shake.current.until ? shake.current.power : 0;
      const camera: Camera = { x: c.x, y: c.y, k: kk };
      drawBattle(ctx, {
        state: s,
        pb: p,
        map,
        art,
        now,
        cam: camera,
        W: canvas.width,
        H: canvas.height,
        dpr,
        overlay: p.busy ? {} : overlayRef.current,
        selected: selectedRef.current,
        hover: hoverRef.current,
        foreseen: foreseenRef.current,
        shake: { x: sh ? (Math.random() - 0.5) * sh : 0, y: sh ? (Math.random() - 0.5) * sh : 0 },
        team: 'party',
      });
      void w;
      void h;
      drawMinimap(now);
    };
    let lastMini = 0;
    const drawMinimap = (now: number) => {
      if (now - lastMini < 200) return;
      lastMini = now;
      const mc = miniRef.current;
      const g = mc?.getContext('2d');
      if (!mc || !g) return;
      const s = stateRef.current;
      const sc = mc.width / map.px.width;
      g.fillStyle = '#0b1513';
      g.fillRect(0, 0, mc.width, mc.height);
      const gr = image(art.ground);
      if (gr.complete && gr.naturalWidth) g.drawImage(gr, 0, 0, mc.width, map.px.height * sc);
      for (const u of Object.values(s.units)) {
        if (u.down === 'dead' || u.down === 'fled' || u.kind === 'hydra_head') continue;
        if (u.team === 'enemy' && u.cond.hidden !== undefined) continue;
        const p = project(map, pbRef.current!.posOf(u.id, now));
        g.fillStyle = homeTeam(u) === 'party' ? '#38bdf8' : '#f87171';
        g.beginPath();
        g.arc(p.X * sc, (p.Y - 30) * sc, u.kind === 'hydra_body' ? 5 : 3, 0, Math.PI * 2);
        g.fill();
      }
      const c = cam.current;
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 1;
      g.strokeRect(c.x * sc, c.y * sc, (size.current.w / c.zoom) * sc, (size.current.h / c.zoom) * sc);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [art, clampCam, map]);

  // Canvas size follows the screen.
  useEffect(() => {
    const el = wrapRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      size.current = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      const c = clampCam(cam.current.x, cam.current.y);
      cam.current.x = cam.current.tx = c.x;
      cam.current.y = cam.current.ty = c.y;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampCam]);

  // Ambience.
  useEffect(() => {
    if (muted) return;
    return startAmbience(state.time === 'night');
  }, [muted, state.time]);

  // --- input ------------------------------------------------------------------------------

  const worldAt = (clientX: number, clientY: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const sx = (clientX - r.left) * size.current.dpr;
    const sy = (clientY - r.top) * size.current.dpr;
    const kk = Math.max(1, Math.round(cam.current.zoom * size.current.dpr));
    return { ...screenToWorld({ x: cam.current.x, y: cam.current.y, k: kk }, sx, sy), cx: clientX - r.left, cy: clientY - r.top };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const m = mouse.current;
    if (m.down && !m.dragging && Math.hypot(e.clientX - m.sx, e.clientY - m.sy) > 7) m.dragging = true;
    if (m.dragging) {
      const dx = (e.clientX - m.sx) / cam.current.zoom;
      const dy = (e.clientY - m.sy) / cam.current.zoom;
      const c = clampCam(m.camX - dx, m.camY - dy);
      cam.current.x = cam.current.tx = c.x;
      cam.current.y = cam.current.ty = c.y;
      cam.current.follow = false;
      return;
    }
    const w = worldAt(e.clientX, e.clientY);
    const unit = pickUnit({ state: stateRef.current, pb, map, now: performance.now() }, w.X, w.Y);
    const pt = pickGround(map, w.X, w.Y);
    const wall = unit ? undefined : structureUnder(w.X, w.Y, pt);
    setHover((h) => {
      const same = h && h.unit === unit && h.wall === wall && h.pt && pt && sameCell(cellOf(h.pt), cellOf(pt));
      return same ? { ...h!, sx: w.cx, sy: w.cy } : { unit, wall, pt: pt ?? undefined, sx: w.cx, sy: w.cy };
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouse.current = { ...mouse.current, down: true, dragging: false, sx: e.clientX, sy: e.clientY, camX: cam.current.x, camY: cam.current.y };
  };

  const onMouseUp = (e: React.MouseEvent) => {
    const m = mouse.current;
    const wasDrag = m.dragging;
    m.down = false;
    m.dragging = false;
    if (e.button !== 0 || wasDrag) return;
    cam.current.follow = true;
    clickAt(e.clientX, e.clientY);
  };

  /** The breakable structure under the cursor: its drawn face, or its foot within 0.6 m of the ground point. */
  const structureUnder = (X: number, Y: number, pt: Pt | null): string | undefined => {
    const s = stateRef.current;
    const face = pickStructure({ state: s, map }, X, Y);
    if (face || !pt) return face;
    let best: { id: string; d: number } | undefined;
    for (const w of s.walls) {
      const d = breakable(w) ? structureDist(w, pt) : Infinity;
      if (d <= 0.6 && (!best || d < best.d)) best = { id: w.id, d };
    }
    return best?.id;
  };

  const clickAt = (clientX: number, clientY: number) => {
    const s = stateRef.current;
    const w = worldAt(clientX, clientY);
    const unitId = pickUnit({ state: s, pb, map, now: performance.now() }, w.X, w.Y);
    const pt = pickGround(map, w.X, w.Y);
    const u = unitId ? s.units[unitId] : undefined;
    if (!actor) {
      if (u?.team === 'party' && s.phase === 'stealth') setSelected(u.id);
      return;
    }
    switch (mode.k) {
      case 'move':
        if (u && u.team === 'party' && u.id !== actor.id && s.phase === 'stealth' && stealthParty.some((x) => x.id === u.id)) {
          setSelected(u.id);
          return;
        }
        if (u && u.team !== actor.team) {
          act({ type: 'attack', unit: actor.id, target: u.id, knockout: u.team === 'enemy' });
          return;
        }
        if (pt) act({ type: 'move', unit: actor.id, to: cellOf(pt), sneak: s.phase === 'stealth' });
        return;
      case 'attack': {
        if (u && u.team !== actor.team) {
          act({ type: 'attack', unit: actor.id, target: u.id, ranged: mode.ranged, knockout: !mode.ranged && u.team === 'enemy' });
          return;
        }
        // A Kōton structure in the way: the blade or the kunai goes at it.
        const wall = u ? undefined : structureUnder(w.X, w.Y, pt);
        if (wall) act({ type: 'attack', unit: actor.id, target: `wall:${wall}`, ranged: mode.ranged });
        else if (mode.ranged && pt) {
          // A kunai at an explosive barrel.
          const i = s.props.findIndex((p) => !p.destroyed && p.hp !== undefined && dist(p.def, pt) < 0.8);
          if (i >= 0) act({ type: 'attack', unit: actor.id, target: `prop:${i}`, ranged: true });
        }
        return;
      }
      case 'jutsu': {
        const sp = JUTSU[mode.id];
        // Command from level 9: a click picks a first mind, a click on another sends both (on the
        // same one, or Enter, just the first).
        if (sp.special === 'command' && actor.level >= 9) {
          if (!u) return;
          if (!mode.picked && !commandBlocker(s, actor, u)) setMode({ ...mode, picked: u.id });
          else if (mode.picked) act({ type: 'jutsu', unit: actor.id, jutsu: mode.id, at: s.units[mode.picked].pos, target: mode.picked, ...(u.id !== mode.picked ? { target2: u.id } : {}) });
          else act({ type: 'jutsu', unit: actor.id, jutsu: mode.id, at: u.pos, target: u.id });
          return;
        }
        const self = sp.shape === 'self' || sp.shape === 'selfCircle';
        const target = sp.shape === 'single' || sp.shape === 'ally' || sp.shape === 'onNode' ? u?.id : undefined;
        // A warp goes to the Ryusei's own Node nearest the click (or under the unit clicked).
        const node = sp.shape === 'node' ? (u && ownNodeAt(s, actor, u.pos)) || (pt && ownNodeAt(s, actor, pt)) || undefined : undefined;
        const at = self ? actor.pos : node ? node.pos : u ? u.pos : pt;
        if (!at) return;
        act({ type: 'jutsu', unit: actor.id, jutsu: mode.id, at, target, enhanced: mode.enhanced });
        return;
      }
      case 'item':
        if (mode.item === 'tag') {
          if (pt) act({ type: 'item', unit: actor.id, item: 'tag', at: pt });
        } else if (u) act({ type: 'item', unit: actor.id, item: mode.item, target: u.id });
        return;
      case 'shove':
        if (u) act({ type: 'shove', unit: actor.id, target: u.id, mode: mode.mode });
        return;
      case 'stone':
        if (pt) act({ type: 'stone', unit: actor.id, at: pt });
        return;
      case 'stabilize':
        if (u) act({ type: 'stabilize', unit: actor.id, target: u.id });
        return;
      case 'drag':
        if (pt) act({ type: 'drag', unit: actor.id, body: mode.body, to: cellOf(pt) });
        return;
    }
  };

  // --- buttons ----------------------------------------------------------------------------

  const buttons: ActionButton[] = useMemo(() => {
    if (!actor) return [];
    const u = actor;
    const t = (k: TKey) => T(k, undefined, lang);
    const stealth = state.phase === 'stealth';
    const b: ActionButton[] = [];
    const add = (x: ActionButton) => b.push(x);
    const can = { action: u.turn.action, bonus: u.turn.bonus };
    if (!more) {
      add({ id: 'attack', label: t('act_attack'), icon: ACTION_ICON.attack, disabled: !can.action, active: mode.k === 'attack' && !mode.ranged, help: t('help_attack') });
      add({ id: 'throw', label: t('act_throw'), icon: ACTION_ICON.throw, disabled: !can.action, active: mode.k === 'attack' && mode.ranged, help: t('help_throw') });
      for (const id of u.jutsus) {
        const sp = JUTSU[id];
        if (!sp || sp.cast === 'reaction') continue;
        const cost = jutsuCost(u, sp, false);
        const busyHands = needsSeals(u, sp) && !handsFree(u) && !!u.turn.interacted;
        // Clan abilities with nothing to work on: Command, Submission and Swap before the fighting,
        // Warp and Swap with no Node down, Submission with no beast or summon on the field.
        const idle =
          (stealth && (sp.special === 'command' || sp.special === 'submission' || sp.special === 'swap')) ||
          ((sp.special === 'warp' || sp.special === 'swap') && !ownNodes(state, u).length) ||
          (sp.special === 'submission' && Object.values(state.units).every((x) => submissionRefused(state, u, x)));
        const name = jutsuName(id, lang);
        const helpKey = `help_${id}`;
        add({
          id: `jutsu:${id}`,
          label: jutsuShort(id, lang),
          icon: ABILITY_ICON[id] ?? ELEMENT_ICON[sp.element] ?? ACTION_ICON.focus,
          badge: cost,
          tone: 'jutsu',
          element: sp.element,
          disabled: (sp.cast === 'bonus' ? !can.bonus : !can.action) || u.chakra < cost || busyHands || idle,
          active: mode.k === 'jutsu' && mode.id === id,
          // A clan ability explains itself; a jutsu shows its rank, reach, dice and save.
          help: T.has(helpKey)
            ? `${name} · ${T(helpKey, undefined, lang)}`
            : `${name} · ${sp.rank} · ${sp.range} m${sp.dice ? ` · ${sp.dice}` : ''}${sp.save ? ` · ${(lang === 'es' ? SAVE_ES : SAVE_EN)[sp.save]}` : ''}`,
        });
      }
      add({ id: 'dash', label: t('act_dash'), icon: ACTION_ICON.dash, disabled: !can.action, help: t('help_dash') });
      add({ id: 'dodge', label: t('act_dodge'), icon: ACTION_ICON.dodge, disabled: !can.action || stealth, help: t('help_dodge') });
      add({ id: 'hide', label: t('act_hide'), icon: ACTION_ICON.hide, disabled: !can.action, help: t('help_hide') });
      if (u.weapon.held) add({ id: 'draw', label: t(u.armed ? 'act_stow' : 'act_draw'), icon: ACTION_ICON.draw, disabled: !!u.turn.interacted && !can.bonus, help: t('help_draw') });
      add({ id: 'more', label: t('act_more'), icon: ACTION_ICON.items });
      add({ id: 'end', label: stealth ? t('done') : t('act_end'), icon: ACTION_ICON.end, tone: 'end', help: t('help_end') });
    } else {
      const s = state;
      const downedAlly = Object.values(s.units).find((o) => o.team === 'party' && o.down === 'downed' && dist(o.pos, u.pos) <= 1.6);
      const body = s.bodies.find((bd) => dist(bd.pos, u.pos) <= 1.6);
      const edge = (map.exits.left && u.pos.x <= 1.5) || (map.exits.right && u.pos.x >= map.widthM - 1.5);
      add({ id: 'disengage', label: t('act_disengage'), icon: ACTION_ICON.disengage, disabled: !can.action || stealth, help: t('help_disengage') });
      add({ id: 'crouch', label: t(u.cond.crouched ? 'act_stand' : 'act_crouch'), icon: ACTION_ICON.crouch, disabled: !u.cond.crouched && !can.bonus, help: t('help_crouch') });
      add({ id: 'jump', label: t('act_jump'), icon: ACTION_ICON.jump, disabled: !can.bonus, help: t('help_jump') });
      add({ id: 'shove', label: t('act_shove'), icon: ACTION_ICON.shove, disabled: !can.action, active: mode.k === 'shove' && mode.mode === 'push', help: t('help_shove') });
      add({ id: 'trip', label: t('act_trip'), icon: ACTION_ICON.trip, disabled: !can.action, active: mode.k === 'shove' && mode.mode === 'prone', help: t('help_trip') });
      add({ id: 'focus', label: t('act_focus'), icon: ACTION_ICON.focus, disabled: !can.action || stealth, help: t('help_focus') });
      add({ id: 'pill', label: t('act_pill'), icon: ACTION_ICON.pill, badge: s.supplies.soldierPills, disabled: !can.bonus || s.supplies.soldierPills < 1 || u.chakra >= u.maxChakra, help: t('help_pill') });
      add({ id: 'bandage', label: t('act_bandage'), icon: ACTION_ICON.bandage, badge: s.supplies.bandages, disabled: !can.action || s.supplies.bandages < 1, active: mode.k === 'item' && mode.item === 'bandage', help: t('help_bandage') });
      add({ id: 'antidote', label: t('act_antidote'), icon: ACTION_ICON.antidote, badge: s.supplies.antidotes, disabled: !can.action || s.supplies.antidotes < 1, active: mode.k === 'item' && mode.item === 'antidote', help: t('help_antidote') });
      add({ id: 'tag', label: t('act_tag'), icon: ACTION_ICON.tag, badge: s.supplies.explosiveTags, disabled: !can.action || s.supplies.explosiveTags < 1, active: mode.k === 'item' && mode.item === 'tag', help: t('help_tag') });
      if (downedAlly) add({ id: 'stabilize', label: t('act_stabilize'), icon: ACTION_ICON.stabilize, disabled: !can.action, active: mode.k === 'stabilize', help: t('help_stabilize') });
      if (stealth) add({ id: 'stone', label: t('act_stone'), icon: ACTION_ICON.stone, disabled: !can.action, active: mode.k === 'stone', help: t('help_stone') });
      if (stealth && body) add({ id: `drag:${body.unit}`, label: t('act_drag'), icon: ACTION_ICON.shove, active: mode.k === 'drag' });
      if (edge) add({ id: 'flee', label: t('act_flee'), icon: ACTION_ICON.flee, disabled: s.phase === 'combat' && !can.action, help: t('help_flee') });
      add({ id: 'more', label: '←', icon: ACTION_ICON.items, active: true });
    }
    // Number keys: attack, kunai, dash and dodge first (wherever they sit), then the rest in order.
    const core = ['attack', 'throw', 'dash', 'dodge'];
    [...b.filter((x) => core.includes(x.id)), ...b.filter((x) => !core.includes(x.id))].slice(0, 9).forEach((x, i) => {
      x.hotkey = String(i + 1);
    });
    return b;
  }, [actor, more, mode, state, lang, map]);

  const press = useCallback(
    (id: string) => {
      if (!actor) return;
      const u = actor;
      const s = stateRef.current;
      if (id === 'more') {
        setMore((m) => !m);
        return;
      }
      if (id.startsWith('jutsu:')) {
        const jid = id.slice(6);
        const sp = JUTSU[jid];
        if (!sp) return;
        if (!tipSeen('tip_jutsu')) setTip('tip_jutsu');
        if (sp.shape === 'self') {
          act({ type: 'jutsu', unit: u.id, jutsu: jid, at: u.pos });
          return;
        }
        setMode((m) => (m.k === 'jutsu' && m.id === jid ? { k: 'move' } : { k: 'jutsu', id: jid, enhanced: false }));
        return;
      }
      if (id.startsWith('drag:')) {
        setMode({ k: 'drag', body: id.slice(5) });
        return;
      }
      switch (id) {
        case 'attack':
          setMode((m) => (m.k === 'attack' && !m.ranged ? { k: 'move' } : { k: 'attack', ranged: false }));
          return;
        case 'throw':
          setMode((m) => (m.k === 'attack' && m.ranged ? { k: 'move' } : { k: 'attack', ranged: true }));
          return;
        case 'dash':
        case 'disengage':
        case 'dodge':
        case 'hide':
        case 'crouch':
        case 'jump':
        case 'focus':
        case 'draw':
          act({ type: id, unit: u.id });
          return;
        case 'pill':
          act({ type: 'item', unit: u.id, item: 'pill' });
          return;
        case 'bandage':
        case 'antidote':
        case 'tag':
          setMode({ k: 'item', item: id });
          return;
        case 'shove':
          setMode({ k: 'shove', mode: 'push' });
          return;
        case 'trip':
          setMode({ k: 'shove', mode: 'prone' });
          return;
        case 'stabilize':
          setMode({ k: 'stabilize' });
          return;
        case 'stone':
          setMode({ k: 'stone' });
          return;
        case 'flee':
          act({ type: 'flee', unit: u.id });
          return;
        case 'end':
          act({ type: 'endTurn', unit: u.id });
          return;
      }
      void s;
    },
    [actor, act],
  );

  // Keyboard.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(key)) {
        keys.current.add(key);
        cam.current.follow = false;
        e.preventDefault();
        return;
      }
      const s = stateRef.current;
      if (s.pending && !pb.busy) {
        const reactor = s.units[s.pending.reactor];
        if (reactor?.controller === 'player' && (key === 'y' || key === 'n')) {
          act({ type: 'react', unit: reactor.id, take: key === 'y' });
          return;
        }
      }
      if (key === 'Escape') setMode({ k: 'move' });
      else if (key === 'z') setZoom((z) => (z === 1 ? 2 : 1));
      else if (key === 'e' && mode.k === 'jutsu' && JUTSU[mode.id]?.enhCost) setMode({ ...mode, enhanced: !mode.enhanced });
      else if (key === 'Enter' && actor && mode.k === 'jutsu' && mode.picked) {
        // Command from level 9 with one target picked: just that one.
        e.preventDefault();
        act({ type: 'jutsu', unit: actor.id, jutsu: mode.id, at: s.units[mode.picked].pos, target: mode.picked });
      } else if ((key === ' ' || key === 'Enter') && actor) {
        e.preventDefault();
        press('end');
      } else if (/^[1-9]$/.test(key)) {
        const b = buttons.find((x) => x.hotkey === key);
        if (b && !b.disabled) press(b.id);
      } else if (key === 'Tab' && actor) {
        e.preventDefault();
        if (s.phase === 'stealth' && stealthParty.length > 1) {
          const i = stealthParty.findIndex((x) => x.id === actor.id);
          setSelected(stealthParty[(i + 1) % stealthParty.length].id);
        } else centerOn(actor.pos);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [act, actor, buttons, centerOn, mode, pb, press, stealthParty]);

  // --- tips -------------------------------------------------------------------------------

  useEffect(() => {
    if (tip) return;
    const s = state;
    const want: TipKey | null =
      s.phase === 'stealth' && !tipSeen('tip_stealth')
        ? 'tip_stealth'
        : Object.values(s.units).some((u) => u.kind === 'hydra_body') && !tipSeen('tip_hydra')
          ? 'tip_hydra'
          : actor && !tipSeen('tip_move')
            ? 'tip_move'
            : actor && s.round >= 1 && !tipSeen('tip_attack')
              ? 'tip_attack'
              : actor && actor.armed && actor.weapon.held && actor.jutsus.some((j) => JUTSU[j] && needsSeals(actor, JUTSU[j])) && !tipSeen('tip_hands')
                ? 'tip_hands'
                : actor?.character?.clan === 'Mirai' && !tipSeen('tip_mirai')
                  ? 'tip_mirai'
                  : actor?.character?.clan === 'Koton' && !tipSeen('tip_koton')
                    ? 'tip_koton'
                    : actor?.character?.clan === 'Ryusei' && !tipSeen('tip_ryusei')
                      ? 'tip_ryusei'
                      : actor?.character?.clan === 'Northstar' && !tipSeen('tip_northstar')
                        ? 'tip_northstar'
                        : actor && s.round >= 2 && !tipSeen('tip_cover')
                          ? 'tip_cover'
                          : null;
    if (want) setTip(want);
  }, [actor, state, tip]);

  // --- the end ----------------------------------------------------------------------------

  const ended = state.phase === 'ended' && !busy;
  const pending = !busy && state.pending ? state.pending : undefined;
  const reactor = pending ? state.units[pending.reactor] : undefined;
  const askPlayer = pending && reactor?.controller === 'player';

  const turnUnit = pb.turnUnit ? state.units[pb.turnUnit] : undefined;
  const cardUnit = actor ?? turnUnit;
  const cardView = cardUnit ? pb.views.get(cardUnit.id) : undefined;
  // The party's own: an enemy under Command fights alongside it but isn't one of them.
  const party = Object.values(state.units).filter((u) => homeTeam(u) === 'party');

  const promptText = (): { title: string; text: string } | null => {
    if (!pending || !reactor) return null;
    if (pending.kind === 'opportunity') {
      const mover = state.units[pending.mover];
      const pv = attackPreview(state, reactor, mover, 'melee');
      return { title: T('oaTitle'), text: T('oaAsk', { mover: mover.name, reactor: reactor.name, p: Math.round(pv.chance * 100) }) };
    }
    if (pending.kind === 'evasion') {
      const by = pending.hit.source ? state.units[pending.hit.source]?.name ?? '' : '';
      return { title: T('evadeTitle'), text: T('evadeAsk', { name: reactor.name, dmg: pending.hit.amount, by }) };
    }
    return { title: T('kawaTitle'), text: T('kawaAsk', { name: reactor.name, dmg: pending.hit.amount, c: JUTSU.substitution_kawarimi.cost }) };
  };
  const prompt = askPlayer ? promptText() : null;

  const helpLine = hoverBtn?.help ?? (mode.k === 'jutsu' && spec ? `${jutsuName(spec.id, lang)}${spec.enhCost ? ` · ${T('enhancedToggle', { n: spec.enhCost })} (E)` : ''}` : null);
  const banners = pb.banners;
  const nowMs = performance.now();

  return (
    <div className="relative w-full min-h-[520px] overflow-hidden bg-[#0b1513] select-none" style={{ height: height ?? 'calc(100vh - 64px)' }} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated', cursor: mode.k === 'move' ? 'default' : 'crosshair' }}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          mouse.current.down = false;
          mouse.current.dragging = false;
          setHover(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMode({ k: 'move' });
        }}
        onWheel={(e) => {
          if (e.ctrlKey) {
            setZoom(e.deltaY < 0 ? 2 : 1);
            return;
          }
          const c = clampCam(cam.current.tx + (e.deltaX + e.deltaY) / cam.current.zoom, cam.current.ty);
          cam.current.tx = c.x;
          cam.current.follow = false;
        }}
      />

      {/* The top row: the acting ninja and the party on the left, the turn order in the middle and the
          map with the switches on the right, side by side so they never cover one another. */}
      <div className="absolute top-3 inset-x-3 flex flex-wrap md:flex-nowrap items-start justify-between gap-3 pointer-events-none">
      <div className="flex flex-col gap-2 shrink-0">
        {cardUnit && cardUnit.kind === 'ninja' && (
          <div className="pointer-events-auto">
            <UnitCard u={cardUnit} hp={cardView?.hp ?? cardUnit.hp} chakra={cardView?.chakra ?? cardUnit.chakra} lang={lang} />
          </div>
        )}
        {title && <div className="text-[11px] text-slate-300/80 pl-1">{title}</div>}
        <div className="hidden sm:block pointer-events-auto">
          <PartyFrames
            party={party}
            views={pb.views}
            selected={actor?.id}
            lang={lang}
            onSelect={(id) => {
              if (state.phase === 'stealth' && stealthParty.some((u) => u.id === id)) setSelected(id);
              centerOn(state.units[id].pos);
            }}
            onController={(id, controller, order?: AiOrder) => act({ type: 'setController', unit: id, controller, order })}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col items-center gap-2 pointer-events-auto">
        {state.phase === 'stealth' ? (
          <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg">
            <span className="text-amber-200 text-sm font-bold">{T('stealthPhase', { n: state.stealthTurn + 1 })}</span>
            <button type="button" disabled={busy} onClick={() => act({ type: 'endStealthTurn' })} className="text-xs px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-40">
              {T('endStealthTurn')}
            </button>
          </div>
        ) : (
          state.order.length > 0 && <InitiativeBar state={state} turnUnit={pb.turnUnit} round={pb.round || state.round} lang={lang} onPick={(id) => centerOn(state.units[id].pos)} />
        )}
        {tip && (
          <Tip
            text={T(tip)}
            lang={lang}
            onClose={() => {
              markTip(tip);
              setTip(null);
            }}
            onOff={() => {
              try {
                localStorage.setItem('shinobi.tips.off', '1');
              } catch {
                // not remembered
              }
              setTip(null);
            }}
          />
        )}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0 ml-auto pointer-events-auto">
        <div className="bg-slate-950/80 border border-slate-600/50 rounded-xl p-1.5 hidden md:block">
          <canvas
            ref={miniRef}
            width={260}
            height={Math.round((260 * map.px.height) / map.px.width)}
            className="block rounded cursor-pointer w-[220px] xl:w-[260px] h-auto"
            onClick={(e) => {
              const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
              const X = ((e.clientX - r.left) / r.width) * map.px.width;
              const Y = ((e.clientY - r.top) / r.height) * map.px.height;
              const c = clampCam(X - size.current.w / cam.current.zoom / 2, Y - size.current.h / cam.current.zoom / 2);
              cam.current.tx = c.x;
              cam.current.ty = c.y;
              cam.current.follow = false;
            }}
          />
        </div>
        <div className="flex flex-wrap justify-end items-center gap-1.5 max-w-[236px] xl:max-w-none">
          <div className="bg-slate-950/80 border border-slate-600/50 rounded-full p-0.5 flex">
            {([1, 2] as const).map((z) => (
              <button key={z} type="button" onClick={() => setZoom(z)} className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${zoom === z ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}>
                {T(z === 1 ? 'tactical' : 'close')}
              </button>
            ))}
          </div>
          <span className="bg-slate-950/80 border border-slate-600/50 rounded-full px-2 py-1 text-[11px] text-slate-200 inline-flex items-center gap-1">
            {state.weather === 'Downpour' ? <CloudRain size={12} /> : state.time === 'night' ? <Moon size={12} /> : <Sun size={12} />}
            {T(state.time === 'night' ? 'night' : 'day')}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = speed === 1 ? 2 : speed === 2 ? 3 : 1;
              setSpeed(next);
              try {
                localStorage.setItem('shinobi.battleSpeed', String(next));
              } catch {
                // not remembered
              }
            }}
            title={T('skipAnim')}
            className="bg-slate-950/80 border border-slate-600/50 rounded-full px-2 py-1 text-[11px] font-bold text-slate-200 tabular-nums"
          >
            {speed}×
          </button>
          <LangToggle />
          <button
            type="button"
            onClick={() => {
              const m = !muted;
              soundManager.setMuted(m);
              setMuted(m);
            }}
            className="bg-slate-950/80 border border-slate-600/50 rounded-full p-1.5 text-slate-200"
            aria-label={T('sound')}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button type="button" onClick={() => setShowLog((v) => !v)} className="bg-slate-950/80 border border-slate-600/50 rounded-full p-1.5 text-slate-200" aria-label={T('log')}>
            <MapIcon size={14} />
          </button>
        </div>
        <div className="text-[10px] text-slate-300/90 bg-slate-950/60 rounded px-2 py-0.5 text-right">
          {T('supplies', { p: state.supplies.soldierPills, b: state.supplies.bandages, a: state.supplies.antidotes, t: state.supplies.explosiveTags })}
        </div>
        {/* The last roll and the log, under the switches and clear of the action bar. */}
        {toast && <RollToast text={toast.text} sub={toast.sub} ok={toast.ok} />}
        {showLog && <LogPanel lines={log} onClose={() => setShowLog(false)} lang={lang} />}
      </div>
      </div>

      {/* Bottom centre: aiming help and the action bar. */}
      <div className="absolute bottom-3 inset-x-3 flex flex-col items-center gap-2 pointer-events-none [&>*]:pointer-events-auto">
        {error && <div className="px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-700/60 text-rose-100 text-xs">{error}</div>}
        {helpLine && actor && <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-600/50 text-slate-100 text-xs max-w-[560px] text-center">{helpLine}</div>}
        {actor && <ActionBar u={actor} move={actor.turn.move} buttons={buttons} lang={lang} onPress={press} onHover={setHoverBtn} />}
        {!actor && !ended && state.phase === 'combat' && <div className="px-3 py-1.5 rounded-lg bg-slate-950/70 text-slate-300 text-xs">{T('waiting')}</div>}
        <div className="hidden lg:block text-[10px] text-slate-400/80">{T('keysHelp')}</div>
      </div>

      {/* Aim label next to the cursor. */}
      {hover && preview.label && actor && !busy && (
        <div className="absolute pointer-events-none px-2 py-1 rounded-md bg-slate-950/90 border border-slate-500/50 text-[11px] text-white whitespace-nowrap" style={{ left: hover.sx + 16, top: hover.sy + 12 }}>
          <div className="font-semibold">{preview.label}</div>
          {preview.sub && <div className="text-[10px] text-slate-300">{preview.sub}</div>}
        </div>
      )}

      {/* Banners. */}
      {!ended && banners.map((b, i) => {
        const t = (nowMs - b.t0) / b.dur;
        const a = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
        return (
          <div key={i} className="absolute left-1/2 top-[30%] -translate-x-1/2 pointer-events-none" style={{ opacity: Math.max(0, Math.min(1, a)) }}>
            <div className={`px-8 py-3 rounded-2xl text-3xl font-black tracking-wide shadow-2xl ${b.tone === 'alarm' ? 'bg-red-950/85 text-red-100' : b.tone === 'good' ? 'bg-emerald-950/85 text-emerald-100' : b.tone === 'bad' ? 'bg-rose-950/85 text-rose-100' : 'bg-slate-950/80 text-slate-100'}`}>{b.text}</div>
          </div>
        );
      })}

      {prompt && reactor && (
        <Prompt title={prompt.title} text={prompt.text} yes={T('yes')} no={T('no')} onYes={() => act({ type: 'react', unit: reactor.id, take: true })} onNo={() => act({ type: 'react', unit: reactor.id, take: false })} />
      )}

      {ended && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-slate-950/95 border border-slate-600/60 rounded-2xl p-6 w-[min(420px,100%)] text-center shadow-2xl">
            <div className={`text-3xl font-black ${state.outcome === 'victory' ? 'text-emerald-300' : state.outcome === 'fled' ? 'text-amber-300' : 'text-rose-300'}`}>
              {T(state.outcome === 'victory' ? 'victory' : state.outcome === 'fled' ? 'retreat' : 'defeat')}
            </div>
            <div className="mt-2 text-sm text-slate-300">{T(`l_end_${state.outcome ?? 'defeat'}` as TKey)}</div>
            <button type="button" onClick={() => onEnd(battleResult(state), state)} className="mt-5 px-6 py-2 rounded-xl bg-sky-500 text-slate-950 font-bold hover:bg-sky-400">
              {T('continue')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SHORT: Record<string, [string, string]> = {
  shadow_clone: ['Clone', 'Clon'],
  body_flicker: ['Flicker', 'Shunshin'],
  trap_setter_tag: ['Trap tag', 'Trampa'],
  mystical_palm: ['Heal palm', 'Palma'],
  substitution_kawarimi: ['Kawarimi', 'Kawarimi'],
  fireball_goukakyu: ['Fireball', 'Bola fuego'],
  dragon_fire_stream: ['Dragon fire', 'Llama'],
  water_dragon_suiryuudan: ['Water dragon', 'Dragón agua'],
  water_shield_suijinheki: ['Water wall', 'Muro agua'],
  earth_wall_doryuheki: ['Earth wall', 'Muro tierra'],
  earth_spear_doryuudan: ['Earth spear', 'Lanza'],
  wind_blade_daitoppa: ['Wind blade', 'Hoja viento'],
  chidori_lightning_blade: ['Chidori', 'Chidori'],
  lightning_hound_raidon: ['Thunder hound', 'Sabueso'],
  leaf_hurricane_senpuu: ['Hurricane', 'Huracán'],
  crescent_moon_dance: ['Crescent', 'Luna'],
  temple_of_nirvana: ['Nirvana', 'Nirvana'],
  dragon_fire_bomb: ['Dragon bomb', 'Bomba'],
  wood_dragon_jutsu: ['Wood dragon', 'Dragón madera'],
  adamantine_sealing_chains: ['Chains', 'Cadenas'],
  taki_sixtyfour_palms: ['64 palms', '64 palmas'],
  kirin_thunder: ['Kirin', 'Kirin'],
  rasenshuriken_wind: ['Rasenshuriken', 'Rasenshuriken'],
  great_fire_annihilation: ['Annihilation', 'Aniquilación'],
  wood_golem_titan: ['Golem', 'Gólem'],
  yasaka_magatama: ['Magatama', 'Magatama'],
  night_guy_dragon: ['Night dragon', 'Dragón noche'],
  katon_pursuing_flame: ['Pursuing', 'Persigue'],
  koton_block: ['Block', 'Bloque'],
  koton_wall: ['Metal wall', 'Muro metal'],
  ryusei_warp: ['Warp', 'Warp'],
  ryusei_swap: ['Swap', 'Cambio'],
  northstar_command: ['Command', 'Command'],
  northstar_submission: ['Submit', 'Sumisión'],
};

/** A jutsu's short name for its button. */
function jutsuShort(id: string, lang: ReturnType<typeof useLang>): string {
  const s = SHORT[id];
  return s ? s[lang === 'es' ? 1 : 0] : jutsuName(id, lang).split(/[\s:(]/)[0];
}

/** What an engine reason key says (the generic line for a key without text). */
function reasonLine(why: string | undefined): string {
  const k = `r_${why}` as TKey;
  return T.has(k) ? T(k) : T('r_default');
}

/** Why an attack has advantage or disadvantage, and cover and height, in a short line. */
function reasonsText(pv: ReturnType<typeof attackPreview>, lang: ReturnType<typeof useLang>): string {
  const parts: string[] = [];
  if (pv.adv !== 'none') parts.push(T(pv.adv === 'advantage' ? 'adv' : 'disadv', undefined, lang));
  for (const r of pv.reasons) {
    const k = `reason_${r}` as TKey;
    if (T.has(k)) parts.push(T(k, undefined, lang));
  }
  if (pv.cover) parts.push(T(pv.cover === 5 ? 'cover5' : 'cover2', undefined, lang));
  if (pv.height > 0) parts.push(T('heightUp', undefined, lang));
  if (pv.height < 0) parts.push(T('heightDown', undefined, lang));
  return parts.join(' · ');
}

function inAreaLoose(area: ReturnType<typeof areaOf>, u: Unit): boolean {
  if (!area) return false;
  const pad = u.bulk ? u.bulk * 0.7 : 0.25;
  if (area.kind === 'circle') return Math.hypot(u.pos.x - area.center.x, u.pos.z - area.center.z) <= area.radius + pad;
  const dx = u.pos.x - area.origin.x;
  const dz = u.pos.z - area.origin.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.3) return false;
  const a = (area.dir * Math.PI) / 180;
  const along = dx * Math.cos(a) + dz * Math.sin(a);
  const across = -dx * Math.sin(a) + dz * Math.cos(a);
  if (area.kind === 'line') return along >= 0 && along <= area.length + pad && Math.abs(across) <= area.width / 2 + pad;
  if (d > area.length + pad) return false;
  let diff = Math.abs((Math.atan2(dz, dx) * 180) / Math.PI - area.dir) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff <= area.angle / 2 + 8;
}

export { lineOfSight, KUNAI_LONG, idx };
