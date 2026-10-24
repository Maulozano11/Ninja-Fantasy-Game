// The party battle screen: the map drawn on a canvas with the HUD on top. The player picks an
// action and aims it; the engine resolves it and the screen plays the events. AI turns (enemies,
// hydra heads, allies set to the AI) play one action at a time so they can be watched.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, Sun, Moon, CloudRain, ScrollText } from 'lucide-react';
import type { Action, AiOrder, BattleEvent, BattleState, Cell, Intent, Pt, RollInfo, Unit } from '../../battle/types';
import { homeTeam } from '../../battle/types';
import { applyAction } from '../../battle/engine';
import { chargeLanding, handsBlocker, jutsuCost, needsSeals } from '../../battle/engine';
import { aiAction, aiToAct } from '../../battle/ai';
import { current } from '../../battle/turns';
import { AURA_RADIUS, attackPreview, sovereign } from '../../battle/combat';
import { JUTSU, areaOf, enhanced as enhancedSpec, fanDice, fannedBy } from '../../battle/jutsu';
import type { JutsuSpec } from '../../battle/jutsu';
import { cellCenter, cellOf, dist, fullCoverBetween, getMap, gridFor, idx, lineOfSight, sameCell, steamAt, steamBetween, steamHides } from '../../battle/map';
import { canStop, occupancy, pathCost, pathTo, reachable } from '../../battle/nav';
import { foreseen } from '../../battle/intent';
import { MAX_STRUCTURES, STRUCTURE_AC, breakable, jutsuWallAt, ownStructures, structureAt, structureAttack, structureBlocker, structureDist } from '../../battle/structures';
import { auraEntered, commandBlocker, edgeFoe, nodeInSight, nodeUnder, ownNodeAt, ownNodes, submissionBlocker, submissionRefused, swapBlocker, warpBlocker, warpLanding } from '../../battle/clans';
import { KUNAI, KUNAI_LONG, wielded } from '../../battle/units';
import { EARTH_CRIT, IMBUE_COST, IMBUE_DICE, IMBUE_ROUNDS, imbueBlocker, type ImbueElement, unitImbueElements, WATER_REACH, WEAPON_ELEMENT, WIND_PUSH } from '../../battle/imbue';
import { ELEMENT_ES } from '../../game/ruleText';
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
import type { Camera, Overlay, Rect } from './renderer';
import { playSound, startAmbience } from './battleSound';
import { drawDiceLayer } from './diceLayer';
import { preloadDice } from '../dice/diceDraw';
import { getDiceStyle } from '../dice/diceStyle';
import { floatLabel, jutsuName, logLine, structureName, unitName, unitRef } from './battleLog';
import type { LogLine } from './battleLog';
import { DMG_ES, SAVE_EN, SAVE_ES, T } from './battleText';
import type { TKey } from './battleText';
import { ABILITY_ICON, ACTION_ICON, ELEMENT_ICON, LogPanel, PartyFrames, Prompt, RollToast, Tip } from './hud';
import type { ActionButton, ButtonTip } from './hud';
import { JUTSUS_DATA } from '../../data/shinobiData';
import { ActionDock, MiniRing, PartyDock, TopPlaque, plaqueUnit } from './hudKit';
import { Anchor, Piece, kitText, useHudScale } from './kit';
import { appNavigate } from '../../appNav';
import { preloadWorldGroups } from '../world/WorldSpriteView';
import { prepareVfxTints, releaseVfxTints, tintStats } from './vfxTintCache';
import { unitTint, unitTintSheets } from './vfxTintPlan';

type Mode =
  | { k: 'move' }
  | { k: 'attack'; ranged: boolean }
  /** `picked`: Command from level 9, the first of its two targets. */
  | { k: 'jutsu'; id: string; enhanced: boolean; picked?: string }
  | { k: 'item'; item: 'bandage' | 'antidote' | 'tag' | 'tagTrap' }
  | { k: 'shove'; mode: 'push' | 'prone' }
  | { k: 'stone' }
  | { k: 'stabilize' }
  | { k: 'drag'; body: string };

export interface BattleScreenProps {
  initial: { state: BattleState; events: BattleEvent[] };
  title?: string;
  onEnd: (result: PartyBattleResult, state: BattleState) => void;
}

const TIP_KEYS = ['tip_move', 'tip_attack', 'tip_jutsu', 'tip_cover', 'tip_stealth', 'tip_hands', 'tip_hydra', 'tip_mirai', 'tip_koton', 'tip_ryusei', 'tip_northstar', 'tip_foeAura'] as const;
type TipKey = (typeof TIP_KEYS)[number];

/** The camera's zoom steps, closest first: Close 2×, Tactical 1×, then up to three times farther out. */
export const ZOOMS = [2, 1, 2 / 3, 1 / 2, 1 / 3] as const;

/** Canvas pixels per map pixel: whole steps from 1 up (crisp pixel art), the plain fraction below. */
/** How long after the dice (ms) Space and Enter only skip them and never end the turn. */
const DICE_KEY_GRACE = 700;
const camScale = (zoom: number, dpr: number): number => (zoom * dpr >= 1 ? Math.max(1, Math.round(zoom * dpr)) : zoom * dpr);

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

export const BattleScreen: React.FC<BattleScreenProps> = ({ initial, title, onEnd }) => {
  const lang = useLang();
  const [state, setState] = useState<BattleState>(initial.state);
  const stateRef = useRef(state);
  stateRef.current = state;
  const map = useMemo(() => getMap(state.mapId), [state.mapId]);
  const art = MAP_ART[state.mapId];

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniRef = useRef<HTMLCanvasElement | null>(null);
  /** The columns of HTML panels over the map: floating words keep clear of what they hold. */
  const panelsRef = useRef<(HTMLDivElement | null)[]>([]);
  const cam = useRef({ x: 0, y: 0, zoom: 1, tx: 0, ty: 0, follow: true });
  const size = useRef({ w: 1280, h: 720, dpr: 1 });
  const shake = useRef({ power: 0, until: 0 });
  const keys = useRef(new Set<string>());
  const mouse = useRef({ x: 0, y: 0, down: false, dragging: false, sx: 0, sy: 0, camX: 0, camY: 0 });

  const [mode, setMode] = useState<Mode>({ k: 'move' });
  const [selected, setSelected] = useState<string | undefined>();
  const [hover, setHover] = useState<{ unit?: string; wall?: string; pt?: Pt; sx: number; sy: number } | null>(null);
  const [, setHoverBtn] = useState<ActionButton | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const zoomStep = useCallback((dir: 1 | -1) => {
    setZoom((z) => {
      const i = ZOOMS.findIndex((q) => Math.abs(q - z) < 1e-6);
      return ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 1 : i) + (dir > 0 ? -1 : 1)))];
    });
  }, []);
  const [, setUi] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [toast, setToast] = useState<{ text: string; sub?: string; note?: string; die?: number; ok?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(soundManager.getMuted());
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const [partyPanel, setPartyPanel] = useState(false);
  /** The map pixels the round minimap shows (its square around the camera). */
  const miniView = useRef({ x: 0, y: 0, w: 1 });
  const hudK = useHudScale(wrapRef);
  const hudKRef = useRef(hudK);
  hudKRef.current = hudK;
  /** Dice are in the air: the skip button shows. */
  const [diceRolling, setDiceRolling] = useState(false);
  const diceRollingRef = useRef(false);
  /** When dice were last rolling or skipped (screen time): a late Space must not end the turn. */
  const diceSeenRef = useRef(0);
  useEffect(() => preloadDice(getDiceStyle()), []);
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
        const name = (id: string) => unitName(s.units[id], lg);
        const vs = T('vs', undefined, lg);
        // Green when it went the party's way: its own roll succeeding, or a foe's failing.
        const good = (id: string, success: boolean) => (s.units[id] ? homeTeam(s.units[id]) === 'party' : true) === success;
        if (ev.t === 'attack') {
          const tgt = ev.target.startsWith('prop:') ? '' : ev.target.startsWith('wall:') ? structureName(pbRef.current?.wallOf(ev.target.slice(5), s), lg) : name(ev.target);
          setToast({
            text: `${name(ev.unit)} → ${tgt}`,
            sub: `d20 ${ev.roll.d20} ${ev.roll.mod >= 0 ? '+' : '−'} ${Math.abs(ev.roll.mod)} = ${ev.roll.total} ${vs} ${T('ac', { n: ev.roll.dc }, lg)}`,
            note: twoDice(ev.roll, ev.reasons, lg),
            die: ev.roll.d20,
            ok: good(ev.unit, ev.roll.success),
          });
        } else if (ev.t === 'save') {
          // Which save, and for what ("salvación de SAB · Command").
          const save = ev.ab ? T('saveOf', { save: (lg === 'es' ? SAVE_ES : SAVE_EN)[ev.ab] ?? ev.ab }, lg) : '';
          const what = JUTSU[ev.what] ? jutsuName(ev.what, lg) : '';
          setToast({ text: [name(ev.unit), save, what].filter(Boolean).join(' · '), sub: `d20 ${ev.roll.d20} → ${ev.roll.total} ${vs} ${lg === 'es' ? 'CD' : 'DC'} ${ev.roll.dc}`, note: twoDice(ev.roll, undefined, lg), die: ev.roll.d20, ok: good(ev.unit, ev.roll.success) });
        } else if (ev.t === 'deathSave') {
          setToast({ text: name(ev.unit), sub: `d20 ${ev.roll.d20} → ${ev.roll.total} ${vs} ${lg === 'es' ? 'CD' : 'DC'} ${ev.roll.dc}`, die: ev.roll.d20, ok: good(ev.unit, ev.roll.success) });
        } else if (ev.t === 'check') {
          const what = T.has(`check_${ev.what}`) ? T(`check_${ev.what}` as TKey, undefined, lg) : ev.what;
          setToast({ text: `${name(ev.unit)} · ${what}`, sub: `d20 ${ev.roll.d20} → ${ev.roll.total}`, die: ev.roll.d20, ok: good(ev.unit, ev.roll.success) });
        } else if (ev.t === 'evade' || ev.t === 'kawarimi' || ev.t === 'clone') {
          // The blow that seemed to land was stepped away from (or struck a log, or a clone).
          const word = floatLabel(ev, s, lg) ?? '';
          setToast((t) => (t ? { ...t, note: [word, t.note].filter(Boolean).join(' · '), ok: good(ev.unit, true) } : t));
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
      // A view bigger than the map (zoomed far out) holds the map in its middle.
      return { x: vw >= map.px.width ? (map.px.width - vw) / 2 : Math.max(0, Math.min(maxX, x)), y: vh >= map.px.height - minY ? minY - (vh - (map.px.height - minY)) / 2 : Math.max(minY, Math.min(maxY, y)) };
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

  // The battle covers the whole screen (the web navigation hides behind it): the page doesn't scroll.
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, []);

  // The jutsu effects' sheets load now, so the first cast already plays from its sheet. The
  // elemental ones its ninjas can cast are recoloured in their chakra colours in the background
  // (vfxTintCache.ts), and let go when the battle ends.
  useEffect(() => {
    preloadWorldGroups('vfx_');
    return releaseVfxTints;
  }, []);
  // What to recolour: each ninja's colour and jutsu, so one who joins later (or whose colour
  // changes) is prepared too. It starts a moment after the battle opens, when its own art is up.
  const tintKey = Object.values(state.units)
    .map((u) => `${u.id}:${unitTint(u) ?? ''}:${u.jutsus.join(',')}`)
    .join('|');
  const openedAt = useRef(performance.now());
  useEffect(() => {
    const go = () => prepareVfxTints(Object.values(stateRef.current.units).flatMap((u) => unitTintSheets(u, (id) => JUTSU[id])));
    const t = window.setTimeout(go, Math.max(0, 800 - (performance.now() - openedAt.current)));
    return () => window.clearTimeout(t);
  }, [tintKey]);

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
    // Keep the middle of the view where it was.
    const vwOld = size.current.w / cam.current.zoom;
    const vhOld = size.current.h / cam.current.zoom;
    cam.current.zoom = zoom;
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
      /** How the jutsu frames in chakra colours were made (vfxTintCache.ts). */
      tints: () => ({ ...tintStats }),
      /** Where a unit is drawn right now (it trails the state while its walk plays). */
      shownAt: (id: string) => pbRef.current?.posOf(id, performance.now()),
      /** After a check edits the state in place: the screen takes it up and the views snap to it. */
      sync: () => {
        const s = { ...stateRef.current };
        stateRef.current = s;
        setState(s);
        pbRef.current?.sync(s, performance.now());
      },
      centerOn: (x: number, z: number) => centerOn({ x, z }, true),
      /** What an action would do, without doing it (a check can look for the seed of a natural 20). */
      dryRun: (a: Action) => applyAction(structuredClone(stateRef.current), a),
      skipDice: () => pbRef.current?.skipDice(performance.now()),
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

  // What the Eye of Tomorrow reads (the ground marks, and the plan of an enemy under the cursor).
  const foreseenNow = useMemo(() => foreseen(state), [state]);

  const preview = useMemo(() => {
    const o: Overlay = {};
    let label: string | null = null;
    let sub: string | null = null;
    if (!actor) return { o, label, sub };
    const s = state;
    const hu = hover?.unit ? s.units[hover.unit] : undefined;
    // What the Eye of Tomorrow reads of the enemy under the cursor ("Próximo: … → …").
    const plan = hu ? foreseenNow[hu.id] : undefined;
    const planLine = plan ? intentText(plan, s, lang) : null;
    if (mode.k === 'move') {
      if (reach) o.reach = { cells: reach.cells, tone: 'move' };
      if (hu && hu.team !== actor.team) {
        // A stowed blade is drawn for free for the blow: preview the blade, not the fists.
        const striker = drawsFree(actor);
        const pv = attackPreview(s, striker, hu, 'melee');
        if (pv.inRange) {
          o.targets = [hu.id];
          label = pv.blocked ? reasonLine(pv.blocked === 'noSight' ? sightWhy(s, striker.pos, hu.pos) : pv.blocked) : T('aimChance', { p: Math.round(pv.chance * 100), dice: wielded(striker).dice });
          sub = pv.blocked ? null : reasonsText(pv, lang);
        } else label = planLine;
        if (pv.inRange && planLine) sub = sub ? `${sub} · ${planLine}` : planLine;
      } else if (hover?.pt && reach) {
        const c = cellOf(hover.pt);
        const path = pathTo(s, reach.r, c);
        if (path && path.length) {
          const cost = pathCost(s, actor, path);
          o.path = { pts: [actor.pos, ...path.map(cellCenter)], ok: canStop(s, actor, c) };
          label = T('aimMove', { m: cost.toFixed(1) });
          // A dash into a Northstar's aura is cut short there (D17).
          if (actor.turn.dashed) {
            const pts = [actor.pos, ...path.map(cellCenter)];
            if (pts.some((p, i) => i > 0 && auraEntered(s, { ...actor, pos: p }, pts[i - 1]))) sub = T('aimAuraDash');
          }
        }
      }
    } else if (mode.k === 'attack') {
      const range = mode.ranged ? KUNAI.reach : wielded(drawsFree(actor)).reach;
      o.range = { at: actor.pos, radius: range };
      const hw = !hu && hover?.wall ? s.walls.find((w) => w.id === hover.wall) : undefined;
      if (hu && hu.team !== actor.team) {
        const striker = mode.ranged ? actor : drawsFree(actor);
        const pv = attackPreview(s, striker, hu, mode.ranged ? 'ranged' : 'melee');
        o.targets = [hu.id];
        // The engine's refusals first: out of reach, out of sight or walled off, hands busy.
        const busyHands = mode.ranged && actor.armed && actor.weapon.twoHanded && actor.turn.interacted;
        label = !pv.inRange ? T('aimNoReach') : pv.blocked ? reasonLine(pv.blocked === 'noSight' ? sightWhy(s, striker.pos, hu.pos) : pv.blocked) : busyHands ? reasonLine('handsBusy') : T('aimChance', { p: Math.round(pv.chance * 100), dice: mode.ranged ? KUNAI.dice : wielded(striker).dice });
        sub = pv.inRange && !pv.blocked && !busyHands ? reasonsText(pv, lang) : null;
        if (planLine) sub = sub ? `${sub} · ${planLine}` : planLine;
      } else if (hw) {
        // A Kōton structure: AC 10, like a crate.
        const pv = structureAttack(s, actor, hw, mode.ranged);
        o.point = { at: pv.at, ok: pv.inRange && pv.sight };
        label = pv.inRange && pv.sight ? T('aimChance', { p: Math.round(pv.chance * 100), dice: mode.ranged ? KUNAI.dice : wielded(actor).dice }) : T('aimNoReach');
        const adv = pv.adv === 'none' ? [] : [T(pv.adv === 'advantage' ? 'adv' : 'disadv'), ...pv.reasons.map((r) => T(`reason_${r}` as TKey))];
        sub = [structureName(hw, lang), T('ac', { n: STRUCTURE_AC }), ...adv].join(' · ');
      }
    } else if (mode.k === 'jutsu' && spec && spec.shape === 'node') {
      // Shooting-Star Thrust: the Nodes it can jump to light up; the one under the cursor shows where it lands.
      o.range = { at: actor.pos, radius: spec.range };
      o.nodes = { valid: ownNodes(s, actor).filter((n) => !warpBlocker(s, actor, n)).map((n) => n.id) };
      const n = (hu && ownNodeAt(s, actor, hu.pos)) || (hover?.pt && ownNodeAt(s, actor, hover.pt)) || undefined;
      if (n) {
        const why = warpBlocker(s, actor, n);
        const land = why ? null : warpLanding(s, actor, n);
        const foe = land ? edgeFoe(s, actor, land) : undefined;
        o.nodes.hover = n.id;
        o.point = { at: land ?? n.pos, ok: !!land };
        label = why ? reasonLine(why) : foe ? T('aimWarpEdge', { name: unitRef(foe, lang) }) : T('aimMove', { m: dist(actor.pos, land!).toFixed(1) });
        if (land) {
          // Into a Northstar's aura: half the movement left goes, and a foe's aura cancels the edge (D17).
          const slowed = actor.turn.move > 0 && !!auraEntered(s, { ...actor, pos: land }, actor.pos);
          const hostile = Object.values(s.units).some((x) => x.team !== actor.team && sovereign(x) && dist(x.pos, land) <= AURA_RADIUS + 0.05);
          sub = [slowed ? T('aimAuraSlow') : '', foe && hostile ? T('aimAuraEdge') : ''].filter(Boolean).join(' · ') || null;
        }
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
      } else if (!o.targets.length) label = T('r_noneOnNode');
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
        if (area && spec.special === 'galeZone') {
          // The Gale Curtain hurts nobody: where the gale will turn, and what it does.
          o.area = { shape: area, tone: 'heal' };
          label = jutsuName(spec.id, lang);
          sub = T('aimGale');
        } else if (area) {
          o.area = { shape: area, tone: spec.special === 'heal' ? 'heal' : 'enemy' };
          // As the engine reaches them: nobody behind a metal wall from where it bursts (D13).
          const origin = spec.shape === 'selfCircle' || spec.shape === 'cone' || spec.shape === 'line' ? actor.pos : at;
          const hit = Object.values(s.units).filter((u) => !u.down && (u.id !== actor.id || spec.shape === 'circle') && inAreaLoose(area, u) && !fullCoverBetween(s, origin, u.pos));
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
        // A fire aimed through a gale on the ground burns harder (the Gale Curtain).
        if (fannedBy(spec, actor.pos, at, s.zones ?? [])) {
          const fan = T(fanDice(spec) > 1 ? 'aimFanned2' : 'aimFanned');
          sub = sub ? `${sub} · ${fan}` : fan;
        }
        if (!self && dist(actor.pos, at) > spec.range + 0.1 + (hu?.bulk ?? 0) + (hu?.kind === 'hydra_head' ? 2.5 : 0)) label = T('aimNoReach');
        // Then sight, as the engine refuses it: a jutsu at one target needs to see it (a strike, no
        // metal wall between); an area or a point needs to see where it goes.
        else if (spec.shape === 'single' && hu && (spec.melee ? fullCoverBetween(s, actor.pos, hu.pos) || (!!spec.charge && !chargeLanding(s, actor, hu)) : !lineOfSight(s, actor.pos, hu.pos))) label = reasonLine(spec.melee ? 'blocked' : sightWhy(s, actor.pos, hu.pos));
        else if ((spec.shape === 'circle' || spec.shape === 'point' || spec.shape === 'wall') && !lineOfSight(s, actor.pos, at, { into: true })) label = reasonLine(sightWhy(s, actor.pos, at, true));
        if (spec.shape === 'point' || spec.shape === 'wall') o.point = { at, ok: dist(actor.pos, at) <= spec.range + 0.1 };
        if (spec.special === 'metalBlock' || spec.special === 'metalWall' || spec.special === 'earthWall' || spec.special === 'waterWall') {
          // A wall or a Kōton structure: where it would stand and why it can't (never over anyone);
          // for a Kōton, how many already stand.
          const koton = spec.special === 'metalBlock' || spec.special === 'metalWall';
          const w = koton ? structureAt(spec, actor.pos, at, actor.id, 'preview') : jutsuWallAt(spec, actor.pos, at, 'preview');
          const why = dist(actor.pos, at) > spec.range + 0.1 ? 'outOfRange' : !lineOfSight(s, actor.pos, at, { into: true }) ? sightWhy(s, actor.pos, at, true) : structureBlocker(s, w);
          const n = ownStructures(s, actor.id).length;
          o.point = undefined;
          o.footprint = { wall: w, ok: !why };
          label = why ? reasonLine(why) : koton ? T('aimStructures', { n }) : jutsuName(spec.id, lang);
          // Refused, nothing crumbles: no warning about the oldest one then.
          if (koton && n >= MAX_STRUCTURES && !why) sub = T('aimOldest');
        }
      }
    } else if (mode.k === 'item' && mode.item === 'tag') {
      o.range = { at: actor.pos, radius: TAG.range };
      if (hover?.pt) o.area = { shape: { kind: 'circle', center: hover.pt, radius: TAG.radius }, tone: 'enemy' };
    } else if (mode.k === 'item' && mode.item === 'tagTrap') {
      // Hidden on the ground nearby: where it goes and the blast it waits with.
      o.range = { at: actor.pos, radius: TAG.plant };
      if (hover?.pt) {
        const ok = dist(actor.pos, hover.pt) <= TAG.plant + 0.1;
        o.point = { at: hover.pt, ok };
        o.area = { shape: { kind: 'circle', center: hover.pt, radius: TAG.radius }, tone: 'enemy' };
        label = ok ? (lineOfSight(s, actor.pos, hover.pt, { into: true }) ? T('aimTagTrap') : reasonLine(sightWhy(s, actor.pos, hover.pt, true))) : T('aimNoReach');
      }
    } else if (mode.k === 'stone') {
      o.range = { at: actor.pos, radius: STONE_RANGE };
      if (hover?.pt) o.point = { at: hover.pt, ok: dist(actor.pos, hover.pt) <= STONE_RANGE };
    } else if (mode.k === 'shove' || mode.k === 'stabilize' || (mode.k === 'item' && mode.item !== 'tag' && mode.item !== 'tagTrap')) {
      o.range = { at: actor.pos, radius: 1.5 };
      if (hu) o.targets = [hu.id];
    } else if (mode.k === 'drag') {
      if (hover?.pt) o.point = { at: hover.pt, ok: true };
    }
    return { o, label, sub };
  }, [actor, hover, mode, reach, spec, state, lang, foreseenNow]);

  // --- render loop ------------------------------------------------------------------------

  const overlayRef = useRef(preview.o);
  overlayRef.current = preview.o;
  const hoverRef = useRef<string | undefined>(undefined);
  hoverRef.current = hover?.unit;
  const selectedRef = useRef<string | undefined>(undefined);
  selectedRef.current = selected;
  const foreseenRef = useRef(foreseenNow);
  foreseenRef.current = foreseenNow;
  // The acting ninja stands in steam: the foes outside it vanish from its sight (the owner:
  // "que los enemigos desaparezcan de la visión de ese personaje"), drawn as a hidden foe is.
  const unseen = useMemo(() => {
    if (!actor || !steamAt(state, actor.pos)) return undefined;
    return new Set(Object.values(state.units).filter((u) => u.team !== actor.team && steamHides(state, actor.pos, u.pos)).map((u) => u.id));
  }, [actor, state]);
  const unseenRef = useRef(unseen);
  unseenRef.current = unseen;

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
      // The views snap to the state only once everything has played out (the last walk too).
      if (p.step(now, s)) {
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
      const kk = camScale(c.zoom, dpr);
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
        lang: langRef.current,
        avoid: panelRects(canvas, dpr),
        unseen: unseenRef.current,
      });
      // The dice over the fight: the quick d20s, the big window, a critical's impact.
      drawDiceLayer(ctx, {
        pb: p,
        state: s,
        map,
        cam: camera,
        now,
        W: canvas.width,
        H: canvas.height,
        s: Math.max(1, Math.round(2 * hudKRef.current * dpr)),
        lang: langRef.current,
        style: getDiceStyle(),
      });
      const rolling = p.diceRolling(now);
      if (rolling) diceSeenRef.current = now;
      if (rolling !== diceRollingRef.current) {
        diceRollingRef.current = rolling;
        setDiceRolling(rolling);
      }
      void w;
      void h;
      drawMinimap(now);
    };
    /**
     * The HTML panels over the canvas, in its device pixels: each column's panels as one block (the
     * cards and party frames, the turn order, the map and switches, the action bar), so a floating
     * word is never squeezed into the gap between two of them.
     */
    const panelRects = (canvas: HTMLCanvasElement, dpr: number): Rect[] => {
      const base = canvas.getBoundingClientRect();
      const out: Rect[] = [];
      for (const col of panelsRef.current) {
        let box: { l: number; t: number; r: number; b: number } | null = null;
        for (const el of Array.from(col?.children ?? [])) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          box = box ? { l: Math.min(box.l, r.left), t: Math.min(box.t, r.top), r: Math.max(box.r, r.right), b: Math.max(box.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom };
        }
        if (box) out.push({ x: (box.l - base.left) * dpr, y: (box.t - base.top) * dpr, w: (box.r - box.l) * dpr, h: (box.b - box.t) * dpr });
      }
      return out;
    };
    let lastMini = 0;
    const drawMinimap = (now: number) => {
      if (now - lastMini < 200) return;
      lastMini = now;
      const mc = miniRef.current;
      const g = mc?.getContext('2d');
      if (!mc || !g) return;
      const s = stateRef.current;
      const c = cam.current;
      // A square of the map around the middle of the view, the map's whole height when it fits.
      const side = Math.min(map.px.width, Math.max(map.px.height - Math.max(0, art.backdropTop), (size.current.w / c.zoom) * 1.15));
      const mx = Math.max(0, Math.min(map.px.width - side, c.x + size.current.w / c.zoom / 2 - side / 2));
      const my = side >= map.px.height ? (map.px.height - side) / 2 : Math.max(0, Math.min(map.px.height - side, c.y + size.current.h / c.zoom / 2 - side / 2));
      miniView.current = { x: mx, y: my, w: side };
      const sc = mc.width / side;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#0b1513';
      g.fillRect(0, 0, mc.width, mc.height);
      g.setTransform(sc, 0, 0, sc, -mx * sc, -my * sc);
      const gr = image(art.ground);
      if (gr.complete && gr.naturalWidth) g.drawImage(gr, 0, 0);
      for (const u of Object.values(s.units)) {
        if (u.down === 'dead' || u.down === 'fled' || u.kind === 'hydra_head') continue;
        if (u.team === 'enemy' && (u.cond.hidden !== undefined || unseenRef.current?.has(u.id))) continue;
        const p = project(map, pbRef.current!.posOf(u.id, now));
        g.fillStyle = homeTeam(u) === 'party' ? '#38bdf8' : '#f87171';
        g.beginPath();
        g.arc(p.X, p.Y - 30, (u.kind === 'hydra_body' ? 10 : 6) / sc, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 2 / sc;
      g.strokeRect(c.x, c.y, size.current.w / c.zoom, size.current.h / c.zoom);
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
    const kk = camScale(cam.current.zoom, size.current.dpr);
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
        if (mode.item === 'tag' || mode.item === 'tagTrap') {
          if (pt) act({ type: 'item', unit: actor.id, item: mode.item, at: pt });
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
    // A button that is off says why in its help line (hovering it still shows the help).
    const add = (x: ActionButton & { why?: string | null }) => {
      const { why, ...btn } = x;
      // The pop-up over the slot: its own tip, or the button's name and help line.
      const tip: ButtonTip = btn.tip ?? { title: btn.label, text: btn.help };
      b.push({ ...(btn.disabled && why && btn.help ? { ...btn, help: `${btn.help} — ${why}` } : btn), tip: { ...tip, why: btn.disabled && why ? why : undefined } });
    };
    const can = { action: u.turn.action, bonus: u.turn.bonus };
    const noAction = can.action ? null : t('r_noAction');
    // A Liquid Body puddle (battle/puddle.ts): it creeps, rises, or rises to strike; anything out of
    // the puddle costs the bonus action (the owner: "hagas lo que hagas").
    if (u.cond.puddle) {
      const out = !can.bonus ? t('r_noBonus') : noAction;
      add({ id: 'attack', label: t('act_attack'), icon: ACTION_ICON.attack, disabled: !can.action || !can.bonus, why: out, active: mode.k === 'attack' && !mode.ranged, help: `${t('help_attack')} ${t('help_rise')}` });
      add({ id: 'throw', label: t('act_throw'), icon: ACTION_ICON.throw, disabled: !can.action || !can.bonus, why: out, active: mode.k === 'attack' && mode.ranged, help: `${t('help_throw')} ${t('help_rise')}` });
      add({ id: 'rise', label: t('act_rise'), icon: ACTION_ICON.crouch, disabled: !can.bonus, why: t('r_noBonus'), help: t('help_rise') });
      add({ id: 'dash', label: t('act_dash'), icon: ACTION_ICON.dash, disabled: !can.action, why: noAction, help: t('help_dash') });
      add({ id: 'end', label: stealth ? t('done') : t('act_end'), icon: ACTION_ICON.end, tone: 'end', help: t('help_end') });
      b.forEach((x, i) => {
        x.hotkey = String(i + 1);
      });
      return b;
    }
    if (!more) {
      add({ id: 'attack', label: t('act_attack'), icon: ACTION_ICON.attack, disabled: !can.action, why: noAction, active: mode.k === 'attack' && !mode.ranged, help: t('help_attack') });
      add({ id: 'throw', label: t('act_throw'), icon: ACTION_ICON.throw, disabled: !can.action, why: noAction, active: mode.k === 'attack' && mode.ranged, help: t('help_throw') });
      for (const id of u.jutsus) {
        const sp = JUTSU[id];
        if (!sp) continue;
        const name = jutsuName(id, lang);
        const helpKey = `help_${id}`;
        if (sp.cast === 'reaction') {
          // A clan reaction (Premonitory Evasion) is shown for what it is: not pressed, offered when
          // the blow comes; lit while the reaction and the chakra for it are there.
          if (!sp.ability || !T.has(helpKey)) continue;
          const ready = u.turn.reaction && u.chakra >= sp.cost;
          add({
            id: `passive:${id}`,
            label: jutsuShort(id, lang),
            icon: ABILITY_ICON[id] ?? ACTION_ICON.focus,
            badge: sp.cost,
            tone: 'jutsu',
            passive: true,
            disabled: !ready,
            why: !u.turn.reaction ? t('why_reaction') : t('r_noChakra'),
            help: `${name} · ${T(helpKey, helpParams(id), lang)}`,
            tip: jutsuTip(sp, sp.cost, lang),
          });
          continue;
        }
        const cost = jutsuCost(u, sp, false);
        const busyHands = handsBlocker(u, sp);
        // Weapon Element Enhancement: a button for each element the ninja can put on its weapon (its chakra
        // type's, and its second element once unlocked), in that element's colour.
        const choices: (ImbueElement | undefined)[] = id === WEAPON_ELEMENT ? unitImbueElements(u) : [undefined];
        for (const choice of choices.length ? choices : [undefined]) {
          const el = choice ? (choice.toLowerCase() as JutsuSpec['element']) : sp.element;
          // Clan abilities with nothing to work on: Command, Submission and Swap before the fighting,
          // Warp and Swap with no Node down, Submission with no beast or summon on the field.
          // Weapon Element Enhancement: already on the weapon, or no weapon to put it on.
          const imbueWhy = sp.special === 'imbue' ? imbueBlocker(u, choice) : null;
          const idle = imbueWhy
            ? t(`r_${imbueWhy}` as TKey)
            : stealth && (sp.special === 'command' || sp.special === 'submission' || sp.special === 'swap')
              ? t('r_combatOnly')
              : (sp.special === 'warp' || sp.special === 'swap') && !ownNodes(state, u).length
                ? t('why_noNodes')
                : sp.special === 'submission' && Object.values(state.units).every((x) => submissionRefused(state, u, x))
                  ? t('why_noBeast')
                  : null;
          const spent = sp.cast === 'bonus' ? (can.bonus ? null : t('r_noBonus')) : noAction;
          const why = idle ?? spent ?? (u.chakra < cost ? t('r_noChakra') : busyHands ? t(`r_${busyHands}` as TKey) : null);
          // With two elements each button names its own.
          const two = choices.length > 1 && choice;
          add({
            id: two ? `jutsu:${id}@${choice}` : `jutsu:${id}`,
            label: two ? `${jutsuShort(id, lang)} · ${lang === 'es' ? ELEMENT_ES[choice] : choice}` : jutsuShort(id, lang),
            icon: ABILITY_ICON[id] ?? ELEMENT_ICON[el] ?? ACTION_ICON.focus,
            badge: cost,
            tone: 'jutsu',
            element: el,
            disabled: !!why,
            why,
            active: mode.k === 'jutsu' && mode.id === id,
            tip: jutsuTip(sp, cost, lang),
            // Aimed enhanced, the Fireball is the Great Fireball, with its own icon.
            iconId: mode.k === 'jutsu' && mode.id === id && mode.enhanced && id === 'fireball_goukakyu' ? 'great_fireball' : undefined,
            // A clan ability explains itself; a jutsu shows its rank, reach, dice and save.
            help: T.has(helpKey)
              ? `${name} · ${T(helpKey, helpParams(id), lang)}`
              : `${name} · ${sp.rank} · ${sp.range} m${sp.dice ? ` · ${sp.dice}` : ''}${sp.save ? ` · ${(lang === 'es' ? SAVE_ES : SAVE_EN)[sp.save]}` : ''}`,
          });
        }
      }
      add({ id: 'dash', label: t('act_dash'), icon: ACTION_ICON.dash, disabled: !can.action, why: noAction, help: t('help_dash') });
      add({ id: 'dodge', label: t('act_dodge'), icon: ACTION_ICON.dodge, disabled: !can.action || stealth, why: noAction ?? t('r_combatOnly'), help: t('help_dodge') });
      add({ id: 'hide', label: t('act_hide'), icon: ACTION_ICON.hide, disabled: !can.action, why: noAction, help: t('help_hide') });
      if (u.weapon.held) add({ id: 'draw', label: t(u.armed ? 'act_stow' : 'act_draw'), iconId: u.armed ? 'weapon_stow' : 'weapon_draw', icon: ACTION_ICON.draw, disabled: !!u.turn.interacted && !can.bonus, why: t('r_noBonus'), help: t('help_draw') });
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
      if (!stealth) add({ id: 'search', label: t('act_search'), icon: ACTION_ICON.hide, disabled: !can.action, help: t('help_search') });
      add({ id: 'pill', label: t('act_pill'), icon: ACTION_ICON.pill, badge: s.supplies.soldierPills, disabled: !can.bonus || s.supplies.soldierPills < 1 || u.chakra >= u.maxChakra, help: t('help_pill') });
      add({ id: 'bandage', label: t('act_bandage'), icon: ACTION_ICON.bandage, badge: s.supplies.bandages, disabled: !can.action || s.supplies.bandages < 1, active: mode.k === 'item' && mode.item === 'bandage', help: t('help_bandage') });
      add({ id: 'antidote', label: t('act_antidote'), icon: ACTION_ICON.antidote, badge: s.supplies.antidotes, disabled: !can.action || s.supplies.antidotes < 1, active: mode.k === 'item' && mode.item === 'antidote', help: t('help_antidote') });
      add({ id: 'tag', label: t('act_tag'), icon: ACTION_ICON.tag, badge: s.supplies.explosiveTags, disabled: !can.action || s.supplies.explosiveTags < 1, active: mode.k === 'item' && mode.item === 'tag', help: t('help_tag') });
      // The same tags, hidden on the ground: the explosive tag's old jutsu, now a use of the item.
      add({ id: 'tagTrap', label: t('act_tagTrap'), icon: ACTION_ICON.tagTrap, badge: s.supplies.explosiveTags, disabled: !can.action || s.supplies.explosiveTags < 1, active: mode.k === 'item' && mode.item === 'tagTrap', help: t('help_tagTrap') });
      if (downedAlly) add({ id: 'stabilize', label: t('act_stabilize'), icon: ACTION_ICON.stabilize, disabled: !can.action, active: mode.k === 'stabilize', help: t('help_stabilize') });
      if (stealth) add({ id: 'stone', label: t('act_stone'), icon: ACTION_ICON.stone, disabled: !can.action, active: mode.k === 'stone', help: t('help_stone') });
      // Its id carries the body; its painted icon is the owner's drag (sheet 19).
      if (stealth && body) add({ id: `drag:${body.unit}`, label: t('act_drag'), iconId: 'drag', icon: ACTION_ICON.shove, active: mode.k === 'drag' });
      if (edge) add({ id: 'flee', label: t('act_flee'), icon: ACTION_ICON.flee, disabled: s.phase === 'combat' && !can.action, help: t('help_flee') });
      add({ id: 'more', label: '←', icon: ACTION_ICON.items, active: true });
    }
    // Number keys: attack, kunai, dash and dodge first (wherever they sit), then the rest in order
    // (a reaction shown for what it is gets none: it isn't pressed).
    const core = ['attack', 'throw', 'dash', 'dodge'];
    [...b.filter((x) => core.includes(x.id)), ...b.filter((x) => !core.includes(x.id) && !x.passive)].slice(0, 9).forEach((x, i) => {
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
      if (id.startsWith('passive:')) return;
      if (id.startsWith('jutsu:')) {
        // (Weapon Element Enhancement with two elements: `jutsu:weapon_element@Fire`, the element chosen)
        const [jid, element] = id.slice(6).split('@') as [string, ImbueElement | undefined];
        const sp = JUTSU[jid];
        if (!sp) return;
        if (!tipSeen('tip_jutsu')) setTip('tip_jutsu');
        if (sp.shape === 'self') {
          act({ type: 'jutsu', unit: u.id, jutsu: jid, at: u.pos, ...(element ? { element } : {}) });
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
        case 'rise':
        case 'search':
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
        case 'tagTrap':
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
      const s = stateRef.current;
      // A reaction prompt: S (Sí) or Y, or Enter, takes it; N or Esc lets it go. While it is up,
      // S answers rather than panning the camera.
      if (s.pending && !pb.busy) {
        const reactor = s.units[s.pending.reactor];
        const yes = key === 'y' || key === 'Enter' || (key === 's' && langRef.current === 'es');
        if (reactor?.controller === 'player' && (yes || key === 'n' || key === 'Escape')) {
          e.preventDefault();
          act({ type: 'react', unit: reactor.id, take: yes });
          return;
        }
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(key)) {
        keys.current.add(key);
        cam.current.follow = false;
        e.preventDefault();
        return;
      }
      // Space or Enter while the dice roll: they land at once (the skip button's key).
      if ((key === ' ' || key === 'Enter') && pb.diceRolling(performance.now())) {
        e.preventDefault();
        pb.skipDice(performance.now());
        diceSeenRef.current = performance.now();
        return;
      }
      // Space is also End turn: a press meant for the dice that comes a moment late (they had just
      // landed), or a held key repeating, must not end the turn too.
      if ((key === ' ' || key === 'Enter') && (e.repeat || performance.now() - diceSeenRef.current < DICE_KEY_GRACE)) {
        e.preventDefault();
        return;
      }
      if (key === 'Escape') setMode({ k: 'move' });
      else if (key === 'z') setZoom((z) => (z === 2 ? 1 : 2));
      else if (key === '-' || key === '_') zoomStep(-1);
      else if (key === '+' || key === '=') zoomStep(1);
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
  }, [act, actor, buttons, centerOn, mode, pb, press, stealthParty, zoomStep]);

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
              : actor && s.phase === 'combat' && Object.values(s.units).some((u) => homeTeam(u) === 'enemy' && u.team === 'enemy' && sovereign(u) && u.cond.hidden === undefined) && !tipSeen('tip_foeAura')
                ? 'tip_foeAura'
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
  // The HUD: who the target plaque shows, and whose medallion and bars the action dock carries.
  const plaque = plaqueUnit(state, hover?.unit, pb.turnUnit);
  const dockUnit = actor ?? (cardUnit && homeTeam(cardUnit) === 'party' ? cardUnit : undefined);

  const promptText = (): { title: string; text: string } | null => {
    if (!pending || !reactor) return null;
    if (pending.kind === 'opportunity') {
      const mover = state.units[pending.mover];
      // An opportunity attack is struck with what is in hand (nothing is drawn for it).
      const pv = attackPreview(state, reactor, mover, 'melee');
      return { title: T('oaTitle'), text: T('oaAsk', { mover: unitRef(mover, lang), reactor: unitRef(reactor, lang), p: Math.round(pv.chance * 100) }) };
    }
    if (pending.kind === 'evasion') {
      const by = pending.hit.source ? unitRef(state.units[pending.hit.source], lang) : '';
      return { title: T('evadeTitle'), text: T('evadeAsk', { name: unitRef(reactor, lang), dmg: pending.hit.amount, by }) };
    }
    return { title: T('kawaTitle'), text: T('kawaAsk', { name: unitRef(reactor, lang), dmg: pending.hit.amount, c: JUTSU.substitution_kawarimi.cost }) };
  };
  const prompt = askPlayer ? promptText() : null;

  const helpLine = (mode.k === 'jutsu' && spec ? `${jutsuName(spec.id, lang, mode.k === 'jutsu' && mode.enhanced)}${spec.enhCost ? ` · ${T('enhancedToggle', { n: spec.enhCost })} (E)` : ''}` : null);
  // The lower plaque's line: an error first, then the help for what is aimed or hovered.
  const dockLine: { text: string; tone: 'error' | 'help' | 'quiet' } = error
    ? { text: error, tone: 'error' }
    : helpLine && actor
      ? { text: helpLine, tone: 'help' }
      : !actor && !ended && state.phase === 'combat'
        ? { text: T('waiting'), tone: 'quiet' }
        : { text: T('keysHelp'), tone: 'quiet' };
  const banners = pb.banners;
  const nowMs = performance.now();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0b1513] select-none" ref={wrapRef}>
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
            zoomStep(e.deltaY < 0 ? 1 : -1);
            return;
          }
          const c = clampCam(cam.current.tx + (e.deltaX + e.deltaY) / cam.current.zoom, cam.current.ty);
          cam.current.tx = c.x;
          cam.current.follow = false;
        }}
      />

      {/* The HUD from the owner's kit (kit.tsx, hudKit.tsx), scaled as one: the menu at the top left,
          the target plaque, round and turn row at the top, the round map at the top right, the party
          at the bottom left and the action bar at the bottom. */}
      <Anchor at="top-left" k={hudK} innerRef={(el) => void (panelsRef.current[0] = el)}>
        <button type="button" onClick={() => setMenu((m) => !m)} aria-label={T('menu')} title={T('menu')} style={{ position: 'absolute', left: 16, top: 12, width: 40, height: 40 }}>
          <Piece p="menu_button" x={0} y={0} />
        </button>
        {menu && (
          <div className="absolute w-[300px] rounded-lg border border-[#8a6a3a] bg-[#16120c]/95 p-3 text-[12px] text-[#efe6cf] shadow-2xl shadow-black/60 flex flex-col gap-2.5" style={{ left: 16, top: 58 }}>
            {title && <div className="font-bold text-[13px] text-[#f5d9a8]">{title}</div>}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#a8a08c]">{T('menuView')}</span>
              <div className="flex flex-wrap gap-1">
                {ZOOMS.map((z) => (
                  <button key={z} type="button" onClick={() => setZoom(z)} className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${Math.abs(zoom - z) < 1e-6 ? 'bg-[#f5d9a8] text-[#16120c] border-[#f5d9a8]' : 'border-[#5c4a2e] hover:bg-[#2a2116]'}`}>
                    {z === 2 ? T('close') : z === 1 ? T('tactical') : T('zoomOut', { n: String(1 / z).replace('.', lang === 'es' ? ',' : '.') })}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-[#a8a08c]">{T('menuSpeed')}</span>
              {([1, 2, 3] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setSpeed(v);
                    try {
                      localStorage.setItem('shinobi.battleSpeed', String(v));
                    } catch {
                      // not remembered
                    }
                  }}
                  className={`px-2 py-0.5 rounded border text-[11px] font-bold tabular-nums ${speed === v ? 'bg-[#f5d9a8] text-[#16120c] border-[#f5d9a8]' : 'border-[#5c4a2e] hover:bg-[#2a2116]'}`}
                >
                  {v}×
                </button>
              ))}
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#d9cba8]">
                {state.weather === 'Downpour' ? <CloudRain size={12} /> : state.time === 'night' ? <Moon size={12} /> : <Sun size={12} />}
                {T(state.time === 'night' ? 'night' : 'day')}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-[#a8a08c]">{T('menuLang')}</span>
              <LangToggle />
              <button
                type="button"
                onClick={() => {
                  const m = !muted;
                  soundManager.setMuted(m);
                  setMuted(m);
                }}
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#5c4a2e] hover:bg-[#2a2116] text-[11px]"
              >
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />} {T('sound')}
              </button>
              <button type="button" onClick={() => setShowLog((v) => !v)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] ${showLog ? 'bg-[#f5d9a8] text-[#16120c] border-[#f5d9a8]' : 'border-[#5c4a2e] hover:bg-[#2a2116]'}`}>
                <ScrollText size={13} /> {T('log')}
              </button>
            </div>
            <div className="text-[11px] text-[#c8d3dc]">{T('supplies', { p: state.supplies.soldierPills, b: state.supplies.bandages, a: state.supplies.antidotes, t: state.supplies.explosiveTags })}</div>
            <div className="border-t border-[#3a2f1f] pt-2 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#a8a08c]">{T('menuLeave')}</span>
              <div className="flex flex-wrap gap-1">
                {(['title', 'mission', 'combat', 'creator', 'campaign'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => appNavigate(v)} className="px-2 py-0.5 rounded border border-[#5c4a2e] hover:bg-[#2a2116] text-[11px]">
                    {T(`nav_${v}` as TKey)}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[#a8a08c]">{T('menuLeaveNote')}</span>
            </div>
          </div>
        )}
      </Anchor>

      <Anchor at="top" k={hudK} innerRef={(el) => void (panelsRef.current[1] = el)}>
        <TopPlaque
          state={state}
          turnUnit={pb.turnUnit}
          round={pb.round || state.round}
          target={plaque}
          targetHp={plaque ? pb.views.get(plaque.id)?.hp : undefined}
          lang={lang}
          onPick={(id) => centerOn(state.units[id].pos)}
          row={
            state.phase === 'stealth' ? (
              <div className="bg-[#16120c]/90 border border-[#8a6a3a] rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg whitespace-nowrap">
                <span className="text-amber-200 text-sm font-bold">{T('stealthPhase', { n: state.stealthTurn + 1 })}</span>
                <button type="button" disabled={busy} onClick={() => act({ type: 'endStealthTurn' })} className="text-xs px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-40">
                  {T('endStealthTurn')}
                </button>
              </div>
            ) : undefined
          }
        />
        {tip && (
          <div style={{ position: 'absolute', left: -190, top: 152 }}>
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
          </div>
        )}
      </Anchor>

      <Anchor at="top-right" k={hudK} innerRef={(el) => void (panelsRef.current[2] = el)}>
        <MiniRing>
          <canvas
            ref={miniRef}
            width={304}
            height={304}
            className="block cursor-pointer"
            style={{ width: 152, height: 152 }}
            onClick={(e) => {
              const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
              const m = miniView.current;
              const X = m.x + ((e.clientX - r.left) / r.width) * m.w;
              const Y = m.y + ((e.clientY - r.top) / r.height) * m.w;
              const c = clampCam(X - size.current.w / cam.current.zoom / 2, Y - size.current.h / cam.current.zoom / 2);
              cam.current.tx = c.x;
              cam.current.ty = c.y;
              cam.current.follow = false;
            }}
          />
        </MiniRing>
        {([1, -1] as const).map((d, i) => (
          <button key={d} type="button" onClick={() => zoomStep(d)} aria-label={d > 0 ? '+' : '−'} style={{ position: 'absolute', left: -132 + i * 30, top: 198, width: 24, height: 24 }}>
            <Piece p="button_small" x={0} y={0} />
            <span style={{ position: 'absolute', inset: 0, textAlign: 'center', ...kitText, fontSize: 14, lineHeight: '23px' }}>{d > 0 ? '+' : '−'}</span>
          </button>
        ))}
        <span style={{ position: 'absolute', left: -72, top: 202, ...kitText, fontSize: 10, color: '#d9cba8' }}>{zoom >= 1 ? `${zoom}×` : `÷${String(1 / zoom).replace('.', lang === 'es' ? ',' : '.')}`}</span>
        <div className="flex flex-col items-end gap-2" style={{ position: 'absolute', right: 12, top: 232, width: 340 }}>
          {/* The last roll and the log. */}
          {toast && <RollToast text={toast.text} sub={toast.sub} note={toast.note} die={toast.die} ok={toast.ok} />}
          {showLog && <LogPanel lines={log} onClose={() => setShowLog(false)} lang={lang} />}
        </div>
      </Anchor>

      <Anchor at="bottom-left" k={hudK} innerRef={(el) => void (panelsRef.current[3] = el)}>
        <PartyDock
          party={party}
          views={pb.views}
          selected={actor?.id}
          lang={lang}
          onSelect={(id) => {
            if (state.phase === 'stealth' && stealthParty.some((u) => u.id === id)) setSelected(id);
            centerOn(state.units[id].pos);
          }}
          onPanel={() => setPartyPanel((v) => !v)}
        />
        {partyPanel && (
          <div className="flex flex-col gap-1.5" style={{ position: 'absolute', left: 10, bottom: 128 }}>
            <div className="text-[11px] font-semibold text-[#f5d9a8] pl-1" style={kitText}>{T('partyPanel')}</div>
            <PartyFrames
              party={party}
              views={pb.views}
              selected={actor?.id}
              lang={lang}
              onSelect={(id) => centerOn(state.units[id].pos)}
              onController={(id, controller, order?: AiOrder) => act({ type: 'setController', unit: id, controller, order })}
            />
          </div>
        )}
      </Anchor>

      <Anchor at="bottom" k={hudK} innerRef={(el) => void (panelsRef.current[4] = el)}>
        <ActionDock
          u={dockUnit}
          hp={dockUnit ? pb.views.get(dockUnit.id)?.hp ?? dockUnit.hp : 0}
          chakra={dockUnit ? pb.views.get(dockUnit.id)?.chakra ?? dockUnit.chakra : 0}
          move={dockUnit?.turn.move ?? 0}
          buttons={actor ? buttons : []}
          lang={lang}
          dense={hudK * (size.current.dpr || 1) >= 1.5}
          line={dockLine.text}
          lineTone={dockLine.tone}
          room={size.current.w / hudK / 2}
          clearLeft={10 + party.length * 64}
          onPress={press}
          onHover={setHoverBtn}
        />
      </Anchor>

      {/* Aim label next to the cursor. */}
      {hover && preview.label && actor && !busy && (
        <div className="absolute pointer-events-none px-2 py-1 rounded-md bg-slate-950/90 border border-slate-500/50 text-[11px] text-white whitespace-nowrap" style={{ left: hover.sx + 16, top: hover.sy + 12 }}>
          <div className="font-semibold">{preview.label}</div>
          {preview.sub && <div className="text-[10px] text-slate-300">{preview.sub}</div>}
        </div>
      )}

      {/* The dice are rolling: a button (or Space) lands them at once. */}
      {diceRolling && !ended && (
        <button
          type="button"
          onClick={() => pb.skipDice(performance.now())}
          className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-sm border text-[12px] font-bold"
          style={{ ...kitText, bottom: Math.round(250 * hudK), background: 'rgba(22,18,12,0.88)', borderColor: '#8a6a3a', color: '#f5d9a8', zIndex: 30 }}
          title={T('diceSkipTip')}
        >
          {T('diceSkip')} ▸▸
        </button>
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
        <Prompt title={prompt.title} text={prompt.text} yes={T('yes')} no={T('no')} yesKey={lang === 'es' ? 'S' : 'Y'} onYes={() => act({ type: 'react', unit: reactor.id, take: true })} onNo={() => act({ type: 'react', unit: reactor.id, take: false })} />
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
  body_flicker: ['Vanish', 'Desvanecer'],
  mystical_palm: ['Heal palm', 'Palma'],
  substitution_kawarimi: ['Kawarimi', 'Kawarimi'],
  fireball_goukakyu: ['Fireball', 'Bola de fuego'],
  dragon_fire_stream: ['Dragon fire', 'Fuego del dragón'],
  water_dragon_suiryuudan: ['Water dragon', 'Dragón de agua'],
  water_shield_suijinheki: ['Water wall', 'Muro de agua'],
  earth_wall_doryuheki: ['Earth wall', 'Muro de tierra'],
  earth_spear_doryuudan: ['Earth bullets', 'Balas de tierra'],
  wind_blade_daitoppa: ['Wind blade', 'Ráfaga cortante'],
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
  rasenshuriken_wind: ['Hurricane star', 'Estrella Huracán'],
  great_fire_annihilation: ['Annihilation', 'Aniquilación'],
  wood_golem_titan: ['Golem', 'Gólem'],
  night_guy_dragon: ['Night dragon', 'Dragón noche'],
  katon_pursuing_flame: ['Pursuing', 'Persigue'],
  koton_block: ['Block', 'Bloque'],
  koton_wall: ['Metal wall', 'Muro metal'],
  ryusei_warp: ['Star thrust', 'Estocada Fugaz'],
  ryusei_swap: ['Swap', 'Cambio'],
  northstar_command: ['Command', 'Comando'],
  northstar_submission: ['Submit', 'Sumisión'],
  mirai_evasion: ['Evasion', 'Evasión'],
  weapon_element: ['Element blade', 'Arma elemental'],
  fire_three_embers: ['Embers', 'Brasas'],
  wind_whirl: ['Whirl', 'Remolino'],
  wind_breeze_mantle: ['Mantle', 'Manto'],
  lightning_jolt: ['Jolt', 'Calambre'],
  lightning_spark_fan: ['Spark fan', 'Abanico'],
  earth_pebble_shot: ['Pebbles', 'Guijarros'],
  earth_spike_crown: ['Spike crown', 'Corona'],
  water_healing_dew: ['Dew', 'Rocío'],
  water_liquid_body: ['Liquid body', 'Cuerpo líquido'],
  water_geyser: ['Geyser', 'Géiser'],
  genjutsu_mirage: ['Mind twist', 'Mente retorcida'],
  kenjutsu_bleeding_cut: ['Bleeding cut', 'Tajo'],
  taijutsu_rush: ['Rush', 'Embestida'],
  water_devouring_tide: ['Tsunami', 'Tsunami'],
  water_tide_s: ['Dragon Tsunami', 'Dragón Tsunami'],
  wind_whirlwind_tower: ['Whirlwind tower', 'Torre'],
  wind_gale_curtain: ['Gale curtain', 'Cortina'],
  lightning_thunder_beam: ['Thunder beam', 'Haz de trueno'],
  earth_rubble_gust: ['Rubble gust', 'Polvareda'],
};

const fmtM = (m: number, lang: ReturnType<typeof useLang>): string => (Math.round(m * 10) / 10).toString().replace('.', lang === 'es' ? ',' : '.');

/** A jutsu's dice, area and save in a short line ("3d8 de fuego · área de 2 m · salvación de DES: mitad"). */
function jutsuEffect(sp: JutsuSpec, lang: ReturnType<typeof useLang>): string {
  const es = lang === 'es';
  const m = (n: number) => fmtM(n, lang);
  const dmg = sp.special === 'heal' && sp.dice ? (es ? `cura ${sp.dice}` : `heals ${sp.dice}`) : sp.dice ? `${sp.dice}${sp.dmgType ? (es ? ` de ${DMG_ES[sp.dmgType] ?? sp.dmgType}` : ` ${sp.dmgType.toLowerCase()}`) : ''}` : '';
  const area =
    (sp.shape === 'circle' || sp.shape === 'selfCircle') && sp.radius
      ? es ? `área de ${m(sp.radius)} m` : `${m(sp.radius)} m radius`
      : sp.shape === 'line' && sp.length
        ? es ? `línea de ${m(sp.length)} m` : `${m(sp.length)} m line`
        : sp.shape === 'cone' && sp.length
          ? es ? `cono de ${m(sp.length)} m` : `${m(sp.length)} m cone`
          : sp.shape === 'wall' && sp.length
            ? es ? `muro de ${m(sp.length)} m` : `${m(sp.length)} m wall`
            : '';
  const adv = sp.saveAdv === 'disadvantage' ? (es ? ' con desventaja' : ' with disadvantage') : '';
  const save = sp.save ? (es ? `salvación de ${SAVE_ES[sp.save]}${adv}${sp.saveHalf ? ': mitad' : ''}` : `${SAVE_EN[sp.save]} save${adv}${sp.saveHalf ? ' for half' : ''}`) : '';
  return [dmg, area, save].filter(Boolean).join(' · ');
}

/** The pop-up of a jutsu's slot: its full name, rank, how it is cast, what it does, its description, and enhanced. */
/** The numbers a help line names (Weapon Element Enhancement's come from battle/imbue.ts). */
function helpParams(id: string): Record<string, string | number> | undefined {
  if (id !== WEAPON_ELEMENT) return undefined;
  return { c: IMBUE_COST, r: IMBUE_ROUNDS, d: IMBUE_DICE, p: WIND_PUSH, m: WATER_REACH, k: EARTH_CRIT };
}

function jutsuTip(sp: JutsuSpec, cost: number, lang: ReturnType<typeof useLang>): ButtonTip {
  const es = lang === 'es';
  const cast = T(sp.cast === 'bonus' ? 'bonus' : sp.cast === 'reaction' ? 'reaction' : 'action', undefined, lang);
  const reach = sp.shape === 'self' || sp.shape === 'selfCircle' ? (es ? 'en ti' : 'on yourself') : sp.melee || sp.range <= 1.5 ? (es ? 'cuerpo a cuerpo' : 'melee') : `${fmtM(sp.range, lang)} m`;
  const meta = [sp.rank ? (es ? `Rango ${sp.rank}` : `Rank ${sp.rank}`) : '', cast, `${cost} chakra`, reach].filter(Boolean).join(' · ');
  const data = JUTSUS_DATA.find((j) => j.id === sp.id);
  const helpKey = `help_${sp.id}`;
  const text = T.has(helpKey) ? T(helpKey as TKey, helpParams(sp.id), lang) : es ? data?.descriptionEs ?? data?.description : data?.description;
  let enh: string | undefined;
  if (sp.enhCost) {
    const e = enhancedSpec(sp);
    const own = es ? sp.nameEnhEs : sp.nameEnh;
    enh = `${es ? 'Potenciado' : 'Enhanced'} (E, +${sp.enhCost} chakra)${own ? ` · ${own.replace(/^[^:]*: /, '')}` : ''}: ${jutsuEffect(e, lang)}`;
  }
  return { title: jutsuName(sp.id, lang), meta, effect: jutsuEffect(sp, lang) || undefined, text, enh };
}

/** A jutsu's short name for its button. */
function jutsuShort(id: string, lang: ReturnType<typeof useLang>): string {
  const s = SHORT[id];
  return s ? s[lang === 'es' ? 1 : 0] : jutsuName(id, lang).split(/[\s:(]/)[0];
}

/** Why there is no line of sight: the steam named when it is what hides the target (it "nubla la visión"). */
function sightWhy(s: BattleState, a: Pt, b: Pt, into = false): string {
  return steamBetween(s, a, b, into) ? 'noSightSteam' : 'noSight';
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
  // Reasons on both sides with no edge left: say they cancel ("por la espalda · aura de soberanía").
  else if (pv.reasons.length > 1) parts.push(T('advCancel', undefined, lang));
  for (const r of pv.reasons) {
    const k = `reason_${r}` as TKey;
    if (T.has(k)) parts.push(T(k, undefined, lang));
  }
  if (pv.cover) parts.push(T(pv.cover === 5 ? 'cover5' : 'cover2', undefined, lang));
  if (pv.height > 0) parts.push(T('heightUp', undefined, lang));
  if (pv.height < 0) parts.push(T('heightDown', undefined, lang));
  return parts.join(' · ');
}

/** Two dice rolled: which way, both of them, the one kept, and why ("Desventaja: 13 y 12, queda el 12 · aura de soberanía"). */
function twoDice(r: RollInfo, reasons: string[] | undefined, lang: ReturnType<typeof useLang>): string | undefined {
  if (!r.adv || r.rolls.length < 2) return undefined;
  const why = (reasons ?? []).map((x) => `reason_${x}`).filter((k): k is TKey => T.has(k)).map((k) => T(k, undefined, lang));
  return [T('rollKept', { how: T(r.adv === 'advantage' ? 'adv' : 'disadv', undefined, lang), a: r.rolls[0], b: r.rolls[1], k: r.d20 }, lang), ...why].join(' · ');
}

/** An enemy's next move as the Eye of Tomorrow reads it: "Próximo: Gran Bola de Fuego → Solen". */
function intentText(it: Intent, s: BattleState, lang: ReturnType<typeof useLang>): string {
  const named = it.kind === 'jutsu' || it.kind === 'spit' || it.kind === 'roar' || it.kind === 'command';
  const what = named && JUTSU[it.what] ? jutsuName(it.what, lang) : T(`intent_${it.kind}` as TKey, undefined, lang);
  const target = it.target && it.kind !== 'defend' ? unitName(s.units[it.target], lang) : '';
  return target ? T('intent', { what, target }, lang) : T('intentNoTarget', { what }, lang);
}

/** The unit as it strikes a blow: a stowed blade is drawn for free first (once a turn), as the engine does. */
const drawsFree = (u: Unit): Unit => (u.weapon.held && !u.armed && !u.turn.interacted ? { ...u, armed: true } : u);

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
