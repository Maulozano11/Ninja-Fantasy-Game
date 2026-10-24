// Words for the battle's events: full lines for the log and short labels that float over the
// units, in the current language.

import type { BattleEvent, BattleState, RollInfo, Unit, Wall } from '../../battle/types';
import { homeTeam } from '../../battle/types';
import { JUTSU } from '../../battle/jutsu';
import { breakable } from '../../battle/structures';
import { WATER_REACH } from '../../battle/imbue';
import { EFFECTS } from '../../rules/effects';
import { pick } from '../../i18n';
import { isFemaleBody } from '../../sprite/types';
import type { Lang } from '../../i18n';
import { DMG_ES, T } from './battleText';
import type { TKey } from './battleText';

/** A unit's name in the language ("Renegado 1" on the Spanish screens), for cards and labels. */
export const unitName = (u: Unit | undefined, lang: Lang): string => (u ? pick(u.name, u.nameEs, lang) : '');
/**
 * A unit's name as a sentence uses it: in Spanish a generic enemy name takes its article ("el
 * Asaltante", "el Renegado 1", "la Sombra"); the party's proper names (and Kagero) never do. `T`
 * then contracts "de el"/"a el" and capitalizes an article that opens a sentence.
 */
export const unitRef = (u: Unit | undefined, lang: Lang): string => {
  const name = unitName(u, lang);
  return lang === 'es' && u?.articleEs ? `${u.articleEs} ${name}` : name;
};
const nameOf = (s: BattleState, id: string, lang: Lang): string => (s.units[id] ? unitRef(s.units[id], lang) : id);
/**
 * The ending a Spanish participle takes for a unit ("desprevenid{o}"): a generic name agrees with its
 * noun ("la Sombra" → a), a proper name with the ninja (a woman's body → a).
 */
export const genderO = (u: Unit | undefined): 'o' | 'a' => {
  if (!u) return 'o';
  if (u.articleEs) return u.articleEs === 'la' ? 'a' : 'o';
  const body = u.look?.body ?? u.character?.appearance?.body;
  return body && isFemaleBody(body) ? 'a' : 'o';
};

/** A note's names (the engine writes the units' own names) in the language. */
export function localParams(p: Record<string, string | number> | undefined, s: BattleState, lang: Lang): Record<string, string | number> | undefined {
  if (!p) return p;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(p)) {
    const u = typeof v === 'string' ? Object.values(s.units).find((x) => x.name === v) : undefined;
    out[k] = u ? unitRef(u, lang) : v;
    // The one the note is about: the ending its participles take in Spanish.
    if (u && k === 'name') out.o = genderO(u);
    if (u && k === 'other') out.o2 = genderO(u);
  }
  return out;
}
/** A jutsu's or clan ability's name in the language; enhanced, its own name when it has one ("Gran bola de fuego"). */
export const jutsuName = (id: string, lang: Lang, enhanced = false): string => {
  const spec = JUTSU[id];
  if (!spec) return id;
  return enhanced && spec.nameEnh ? pick(spec.nameEnh, spec.nameEnhEs, lang) : pick(spec.name, spec.nameEs, lang);
};
/** What a structure is called ("metal wall"), for the log. */
export const structureName = (w: Wall | undefined, lang: Lang): string => T(w?.kind === 'metalBlock' ? 'structure_metalBlock' : 'structure_metal', undefined, lang);
const effectName = (id: string, lang: Lang): string => {
  const e = EFFECTS[id as keyof typeof EFFECTS];
  return e ? pick(e.name, e.nameEs, lang) : id.replace(/_/g, ' ');
};
/** A roll for the log: the die kept and the total, and both dice when two were rolled. */
export const rollText = (r: RollInfo, lang: Lang): string =>
  r.adv && r.rolls.length > 1
    ? T('rollTwo', { how: T(r.adv === 'advantage' ? 'adv' : 'disadv', undefined, lang).toLowerCase(), a: r.rolls[0], b: r.rolls[1], k: r.d20, t: r.total }, lang)
    : `${r.d20}→${r.total}`;

export interface LogLine {
  text: string;
  tone?: string;
}

/**
 * A log line for an event, or null for events the log skips. `wallOf` finds a wall that may already
 * be gone from the state (broken by an event that hasn't played yet).
 */
export function logLine(ev: BattleEvent, s: BattleState, lang: Lang, wallOf = (id: string): Wall | undefined => s.walls.find((w) => w.id === id)): LogLine | null {
  const t = (k: TKey, p?: Record<string, string | number>) => T(k, p, lang);
  switch (ev.t) {
    case 'turn':
      return { text: t('l_turn', { name: nameOf(s, ev.unit, lang) }), tone: 'text-slate-500' };
    case 'round':
      return { text: `— ${t('l_round', { n: ev.round })} —`, tone: 'text-slate-400 font-semibold' };
    case 'attack': {
      if (JUTSU[ev.what] && ev.roll.success) return null;
      if (ev.target.startsWith('wall:')) {
        const w = { a: nameOf(s, ev.unit, lang), what: structureName(wallOf(ev.target.slice(5)), lang), roll: rollText(ev.roll, lang), ac: ev.roll.dc };
        return ev.roll.success ? { text: t('l_hitWall', w) } : { text: t('l_missWall', w), tone: 'text-slate-400' };
      }
      const target = ev.target.startsWith('prop:') ? '🛢' : nameOf(s, ev.target, lang);
      const p = { a: nameOf(s, ev.unit, lang), t: target, roll: rollText(ev.roll, lang), ac: ev.roll.dc };
      if (!ev.roll.success) return { text: t('l_attackMiss', p), tone: 'text-slate-400' };
      return ev.roll.crit ? { text: t('l_attackCrit', p), tone: 'text-yellow-300' } : { text: t('l_attackHit', p) };
    }
    case 'damage': {
      // A critical always does maximum damage (the owner's rule): the line says so.
      const p = { t: nameOf(s, ev.unit, lang), n: ev.amount, type: lang === 'es' ? DMG_ES[ev.dmgType] ?? ev.dmgType : ev.dmgType.toLowerCase() };
      return ev.crit ? { text: t('l_damageCrit', p), tone: 'text-yellow-300 font-semibold' } : { text: t('l_damage', p), tone: 'text-rose-300' };
    }
    case 'heal':
      return { text: t('l_heal', { t: nameOf(s, ev.unit, lang), n: ev.amount }), tone: 'text-emerald-300' };
    case 'save': {
      const k: TKey = ev.roll.crit ? 'l_saveCrit' : ev.roll.fumble ? 'l_saveFumble' : ev.roll.success ? 'l_saveOk' : 'l_saveFail';
      return { text: t(k, { t: nameOf(s, ev.unit, lang), roll: rollText(ev.roll, lang), dc: ev.roll.dc }), tone: ev.roll.crit || ev.roll.fumble ? 'text-yellow-300' : 'text-indigo-300' };
    }
    case 'jutsu':
      // A charged hand's blow going off by itself (the activated Chidori).
      if (ev.released) return { text: t('l_released', { a: nameOf(s, ev.unit, lang), j: jutsuName(ev.jutsu, lang, ev.enhanced) }), tone: 'text-orange-300' };
      // An enhanced cast with a name of its own says it by name ("lanza Gran bola de fuego").
      return { text: t(ev.enhanced && !JUTSU[ev.jutsu]?.nameEnh ? 'l_jutsuEnh' : 'l_jutsu', { a: nameOf(s, ev.unit, lang), j: jutsuName(ev.jutsu, lang, ev.enhanced) }), tone: 'text-orange-300' };
    case 'down': {
      const k: TKey = ev.state === 'dead' ? 'l_dead' : ev.state === 'ko' ? 'l_ko' : ev.state === 'stable' ? 'l_stable' : ev.state === 'fled' ? 'l_fled' : 'l_down';
      return { text: t(k, { t: nameOf(s, ev.unit, lang) }), tone: 'text-amber-300' };
    }
    case 'deathSave':
      return { text: t('l_deathSave', { t: nameOf(s, ev.unit, lang), ok: ev.ok, bad: ev.bad }), tone: 'text-amber-200' };
    case 'kawarimi':
      return { text: t('l_kawarimi', { t: nameOf(s, ev.unit, lang) }), tone: 'text-amber-200' };
    case 'evade': {
      // Good news when it is one of the party who steps aside. From a jutsu (a failed save), the
      // line names it: no attack roll was made.
      const u = s.units[ev.unit];
      const tone = u && homeTeam(u) === 'party' ? 'text-emerald-300' : 'text-red-300';
      return ev.what && JUTSU[ev.what] ? { text: t('l_evadeFrom', { t: nameOf(s, ev.unit, lang), j: jutsuName(ev.what, lang) }), tone } : { text: t('l_evade', { t: nameOf(s, ev.unit, lang) }), tone };
    }
    case 'node':
      // A Weapon Node lands, or the Ryusei's oldest fades for a fourth.
      return { text: t(ev.on ? 'l_node' : 'l_nodeGone', { t: nameOf(s, ev.node.owner, lang) }), tone: 'text-cyan-300' };
    case 'clone':
      return ev.on ? null : { text: t('l_clone') };
    case 'sever':
      return { text: t('l_sever'), tone: 'text-rose-300 font-semibold' };
    case 'seal':
      return { text: t(`l_seal_${ev.how}` as TKey), tone: 'text-orange-300' };
    case 'regrow':
      return { text: t('l_regrow'), tone: 'text-emerald-300 font-semibold' };
    case 'combatStart': {
      const names = ev.surprised.map((id) => nameOf(s, id, lang)).join(', ');
      return { text: t('l_combatStart') + (names ? ` ${t('l_surprised', { names })}` : ''), tone: 'text-red-300 font-semibold' };
    }
    case 'alert':
      return { text: t('l_alert', { g: nameOf(s, ev.guard, lang) }), tone: 'text-red-300' };
    case 'investigate':
      return { text: t('l_investigate', { g: nameOf(s, ev.guard, lang) }), tone: 'text-yellow-200' };
    case 'noise':
      return ev.source === 'bells' ? { text: '🔔 ' + t('l_noise'), tone: 'text-yellow-200' } : null;
    case 'body':
      return { text: t(ev.hidden ? 'l_bodyHidden' : 'l_body'), tone: 'text-slate-400' };
    case 'explode':
      return { text: t('l_explode'), tone: 'text-orange-300' };
    case 'electrified':
      return { text: t('l_electrified'), tone: 'text-sky-300' };
    case 'trap':
      return ev.on ? { text: t('l_trapSet') } : { text: t('l_trap'), tone: 'text-orange-300' };
    case 'wall':
      if (!breakable(ev.wall)) return ev.on ? { text: t('l_wall') } : null;
      if (ev.on) return { text: t('l_structureUp', { what: structureName(ev.wall, lang) }) };
      // Broken at 0 HP, or the oldest of a Kōton's structures crumbling for a new one.
      return { text: t(ev.wall.hp > 0 ? 'l_wallCrumbled' : 'l_wallBroken', { what: structureName(ev.wall, lang) }), tone: 'text-amber-300' };
    case 'wallHit':
      return { text: t('l_wallHit', { n: ev.amount, what: structureName(wallOf(ev.wall), lang) }), tone: 'text-slate-300' };
    case 'fled':
      return { text: t('l_fled', { t: nameOf(s, ev.unit, lang) }) };
    case 'command':
      return ev.on ? { text: t('l_command', { t: nameOf(s, ev.unit, lang), a: nameOf(s, ev.by, lang) }), tone: 'text-violet-300' } : { text: t('l_commandEnd', { t: nameOf(s, ev.unit, lang) }), tone: 'text-slate-400' };
    case 'joined':
      return { text: t('l_joined', { t: nameOf(s, ev.unit, lang) }), tone: 'text-violet-300' };
    case 'slowed':
      return { text: t('l_slowed', { t: nameOf(s, ev.unit, lang) }), tone: 'text-violet-300' };
    case 'effect':
      return { text: t(ev.on ? 'l_effect' : 'l_effectOff', { t: nameOf(s, ev.unit, lang), e: effectName(ev.effect, lang) }), tone: 'text-fuchsia-300' };
    case 'weapon':
      return { text: t(ev.armed ? 'l_weaponOn' : 'l_weaponOff', { t: nameOf(s, ev.unit, lang) }), tone: 'text-slate-400' };
    case 'coat':
      return { text: t(ev.on ? 'l_coat' : 'l_coatSpent', { t: nameOf(s, ev.unit, lang), n: ev.hits ?? 0 }), tone: 'text-lime-300' };
    case 'healSenbon':
      return { text: t(ev.antidote ? 'l_antidoteSenbon' : 'l_healSenbon', { a: nameOf(s, ev.unit, lang), t: nameOf(s, ev.target, lang) }), tone: 'text-emerald-300' };
    case 'firstAid':
      return { text: t('l_firstAid', { a: nameOf(s, ev.unit, lang), t: nameOf(s, ev.target, lang) }), tone: 'text-emerald-300' };
    case 'pushed':
      // Swept away by a jutsu (the Devouring Tide), dragged in by one (the Whirlwind Tower), or shoved.
      if (ev.what && JUTSU[ev.what]) return { text: t(JUTSU[ev.what].push?.toward ? 'l_dragged' : 'l_swept', { t: nameOf(s, ev.unit, lang), o: genderO(s.units[ev.unit]), j: jutsuName(ev.what, lang) }) };
      return { text: t('l_pushed', { t: nameOf(s, ev.unit, lang), o: genderO(s.units[ev.unit]) }) };
    case 'zone':
      return { text: t(ev.on ? 'l_zone' : 'l_zoneEnd'), tone: 'text-emerald-300' };
    case 'charged': {
      // A hand charged (the activated Chidori), and why the charge ended (its blow says itself).
      const p = { a: nameOf(s, ev.unit, lang), j: jutsuName(ev.jutsu, lang) };
      if (ev.on) return { text: t(ev.enhanced ? 'l_chargedEnh' : 'l_charged', p), tone: 'text-orange-300' };
      const k: TKey | null = ev.end === 'expired' ? 'l_chargeExpired' : ev.end === 'down' ? 'l_chargeDown' : ev.end === 'sealed' ? 'l_chargeSealed' : ev.end === 'released' ? 'l_chargeReleased' : null;
      return k ? { text: t(k, p), tone: 'text-slate-400' } : null;
    }
    case 'imbue': {
      // The element goes onto the weapon (Weapon Element Enhancement), or leaves it.
      const p = { a: nameOf(s, ev.unit, lang), m: WATER_REACH };
      if (ev.on) return { text: t(`l_imbue_${ev.element}` as TKey, p), tone: 'text-orange-300' };
      return { text: t(ev.end === 'sealed' ? 'l_imbueSealed' : (`l_imbueEnd_${ev.element}` as TKey), p), tone: 'text-slate-400' };
    }
    case 'cracks':
      // Said once, as the ground first cracks under a charged ninja this turn (its mending is seen).
      return ev.on && ev.first ? { text: t('l_cracks', { a: nameOf(s, ev.unit, lang) }), tone: 'text-stone-300' } : null;
    case 'ground':
      // Steam rising has its own note (n_steamRises); the wet that turned to steam says nothing.
      if (ev.kind === 'wet') return ev.on ? { text: t('l_wet'), tone: 'text-sky-300' } : ev.by ? null : { text: t('l_dry'), tone: 'text-slate-400' };
      return ev.on || ev.by !== undefined ? null : { text: t('l_steamEnd'), tone: 'text-slate-400' };
    case 'conduct':
      return { text: t('l_conduct'), tone: 'text-sky-300' };
    case 'end':
      return { text: t(`l_end_${ev.outcome}` as TKey), tone: ev.outcome === 'victory' ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold' };
    case 'prop':
      return ev.state === 'exploded' ? { text: t('l_prop_exploded'), tone: 'text-orange-300' } : ev.state === 'burnt' ? { text: t('l_prop_burnt'), tone: 'text-orange-300' } : null;
    case 'note': {
      const k = `n_${ev.key}` as TKey;
      return T.has(k) ? { text: t(k, localParams(ev.params, s, lang)), tone: 'text-slate-300' } : null;
    }
    case 'check':
      // Only the naturals get a line (the owner's rule C3); the note after it says the extra.
      if (ev.roll.crit) return { text: t('l_checkNat20', { t: nameOf(s, ev.unit, lang), roll: rollText(ev.roll, lang) }), tone: 'text-yellow-300' };
      if (ev.roll.fumble) return { text: t('l_checkNat1', { t: nameOf(s, ev.unit, lang), roll: rollText(ev.roll, lang) }), tone: 'text-slate-400' };
      return null;
    default:
      return null;
  }
}

const COND_LABEL: Partial<Record<string, TKey>> = {
  dodging: 'act_dodge',
  disengaged: 'act_disengage',
  focusing: 'act_focus',
  crouched: 'crouched',
  hidden: 'hidden',
  ninjaJump: 'act_jump',
};

/** A short word floating over a unit, or null. */
export function floatLabel(ev: BattleEvent, s: BattleState, lang: Lang): string | null {
  const t = (k: TKey, p?: Record<string, string | number>) => T(k, p, lang);
  switch (ev.t) {
    case 'attack':
      return ev.roll.success ? null : lang === 'es' ? 'Falla' : 'Miss';
    case 'save':
      if (ev.roll.crit) return lang === 'es' ? '¡Resiste por completo!' : 'Perfect save!';
      if (ev.roll.fumble) return lang === 'es' ? '¡Fallo crítico!' : 'Critical failure!';
      return ev.roll.success ? (lang === 'es' ? 'Resiste' : 'Saved') : null;
    case 'down':
      return ev.state === 'dead' ? t('dead') : ev.state === 'ko' ? t('ko') : ev.state === 'downed' ? t('downed') : null;
    case 'condition': {
      if (!ev.on) return null;
      const k = COND_LABEL[ev.cond];
      return k ? t(k) : null;
    }
    case 'effect':
      return ev.on ? effectName(ev.effect, lang) : null;
    case 'deathSave':
      return ev.roll.success ? '✓' : '✗';
    case 'kawarimi':
      return 'Kawarimi!';
    case 'coat':
      return ev.on ? t('f_coat') : null;
    case 'evade':
      return t('evaded');
    case 'command':
      return t(ev.on ? 'commanded' : 'freed');
    case 'joined':
      return t('joins');
    case 'slowed':
      return t('slowed');
    case 'clone':
      return ev.on ? null : lang === 'es' ? '¡Clon!' : 'Clone!';
    case 'sever':
      return t('severed');
    case 'seal':
      return t('sealed');
    case 'regrow':
      return lang === 'es' ? '¡Crece!' : 'Grows back!';
    case 'round':
      return t('l_round', { n: ev.round });
    case 'combatStart':
      return t('l_combatStart');
    case 'end':
      return ev.outcome === 'victory' ? t('victory') : ev.outcome === 'fled' ? t('retreat') : t('defeat');
    case 'jutsu':
      return jutsuName(ev.jutsu, lang, ev.enhanced);
    case 'charged':
      return ev.on ? t('f_charged') : null;
    case 'imbue':
      return ev.on ? t(`f_imbue_${ev.element}` as TKey) : null;
    case 'wall':
      return !ev.on && breakable(ev.wall) ? t(ev.wall.hp > 0 ? 'crumbled' : 'broken') : null;
    case 'note': {
      // A swap is seen (the smoke at both ends); a word floats only where the log line is long.
      if (ev.key === 'swapped') return null;
      const k = (T.has(`f_${ev.key}`) ? `f_${ev.key}` : `n_${ev.key}`) as TKey;
      return T.has(k) ? t(k, localParams(ev.params, s, lang)) : null;
    }
    case 'act':
      return ev.act === 'item' || ev.act === 'stone' ? null : ev.act === 'stand' ? t('act_stand') : t(`act_${ev.act}` as TKey);
    default:
      return null;
  }
}
