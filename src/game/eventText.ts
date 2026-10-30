// Rule events told as log lines for the mission screens (the Chronicle will grow from these).
// Each line is written in English and Spanish when it happens, so the log follows the language toggle.

import type { RuleEvent, SupplyId } from '../types/mission';
import { EFFECTS } from '../rules/effects';
import { Entry, getLang, Lang, Params, pick } from '../i18n';
import { ruleText } from './ruleText';

export type Tone = 'good' | 'bad' | 'roll' | 'info' | 'title';

export interface LogLine {
  id: number;
  /** English. */
  text: string;
  /** Spanish (lines saved before the language toggle have none). */
  es?: string;
  tone: Tone;
}

/** A log heading: plain English, or both languages. */
export type LogText = string | Entry;

/** One string-table key in both languages, for a log heading. `pEs` gives Spanish params (data names). */
export const both = <K extends string>(T: (key: K, p?: Params, lang?: Lang) => string, key: K, p?: Params, pEs?: Params): Entry => ({
  en: T(key, p, 'en'),
  es: T(key, pEs ?? p, 'es'),
});

/** A log line in the given language. */
export const lineText = (l: LogLine, lang: Lang = getLang()): string => pick(l.text, l.es, lang);

export const SUPPLY_LABEL: Record<SupplyId, string> = {
  rations: 'Rations',
  campKits: 'Camp kits',
  bandages: 'Bandages',
  antidotes: 'Antidotes',
  soldierPills: 'Soldier pills',
  explosiveTags: 'Explosive tags',
  wireRolls: 'Wire rolls',
};

export const SUPPLY_LABEL_ES: Record<SupplyId, string> = {
  rations: 'Raciones',
  campKits: 'Equipos de campamento',
  bandages: 'Vendas',
  antidotes: 'Antídotos',
  soldierPills: 'Píldoras de soldado',
  explosiveTags: 'Sellos explosivos',
  wireRolls: 'Rollos de alambre',
};

export const BREAKDOWN_LABEL: Record<string, string> = {
  panic: 'Panic',
  paranoia: 'Paranoia',
  blind_rage: 'Blind rage',
  despair: 'Despair',
};

export const BREAKDOWN_LABEL_ES: Record<string, string> = {
  panic: 'Pánico',
  paranoia: 'Paranoia',
  blind_rage: 'Furia ciega',
  despair: 'Desesperación',
};

export const supplyLabel = (id: SupplyId, lang: Lang = getLang()): string => pick(SUPPLY_LABEL[id], SUPPLY_LABEL_ES[id], lang);
export const breakdownLabel = (kind: string, lang: Lang = getLang()): string => pick(BREAKDOWN_LABEL[kind] ?? kind, BREAKDOWN_LABEL_ES[kind], lang);

const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function describeEvent(e: RuleEvent, name: (id: string) => string, lang: Lang = 'en'): { text: string; tone: Tone } {
  return lang === 'es' ? describeEs(e, name) : describeEn(e, name);
}

function describeEn(e: RuleEvent, name: (id: string) => string): { text: string; tone: Tone } {
  switch (e.type) {
    case 'hp':
      return e.delta > 0
        ? { text: `${name(e.who)} recovers ${e.delta} HP (${e.reason}) → ${e.hp}`, tone: 'good' }
        : { text: `${name(e.who)} loses ${-e.delta} HP (${e.reason}) → ${e.hp}`, tone: 'bad' };
    case 'chakra':
      return e.delta > 0
        ? { text: `${name(e.who)} recovers ${e.delta} chakra (${e.reason}) → ${e.chakra}`, tone: 'good' }
        : { text: `${name(e.who)} uses ${-e.delta} chakra (${e.reason}) → ${e.chakra}`, tone: 'info' };
    case 'tension':
      return { text: `${name(e.who)}: Tension ${signed(e.delta)} (${e.reason}) → ${e.tension}/10`, tone: e.delta > 0 ? 'bad' : 'good' };
    case 'exhaustion':
      return { text: `${name(e.who)}: Exhaustion ${signed(e.delta)} (${e.reason}) → level ${e.exhaustion}`, tone: e.delta > 0 ? 'bad' : 'good' };
    case 'effect': {
      const def = EFFECTS[e.effect];
      const buff = def?.kind === 'buff';
      const label = def?.name ?? e.effect;
      if (e.change === 'added') return { text: `${name(e.who)} gains ${label} (${e.reason})`, tone: buff ? 'good' : 'bad' };
      if (e.change === 'refreshed') return { text: `${name(e.who)}: ${label} renewed (${e.reason})`, tone: buff ? 'good' : 'bad' };
      if (e.change === 'removed') return { text: `${name(e.who)} loses ${label} (${e.reason})`, tone: buff ? 'info' : 'good' };
      return { text: `${name(e.who)}: ${label} wore off (${e.reason})`, tone: 'info' };
    }
    case 'check': {
      const o = e.outcome;
      const dice = o.rolls.length > 1 ? `d20 ${o.d20} (${o.rolls.join(' / ')})` : `d20 ${o.d20}`;
      const pct = Math.round(o.chance * 100);
      return {
        text: `${name(e.who)} · ${e.what}: ${dice} ${o.modifier >= 0 ? '+' : '−'} ${Math.abs(o.modifier)} = ${o.total} vs DC ${o.dc} → ${o.natural20 ? 'natural 20, automatic success!' : o.natural1 ? 'natural 1, automatic failure' : o.success ? 'success' : 'failure'} (${pct} % chance)`,
        tone: 'roll',
      };
    }
    case 'breakdown':
      return { text: `${name(e.who)} breaks down: ${BREAKDOWN_LABEL[e.kind] ?? e.kind}`, tone: 'bad' };
    case 'awakening':
      return { text: `${name(e.who)} awakens: Will of Fire!`, tone: 'good' };
    case 'unconscious':
      return { text: `${name(e.who)} collapses from exhaustion`, tone: 'bad' };
    case 'dice': {
      const die = e.kind === 'hit' ? 'Hit' : 'Chakra';
      return e.delta < 0
        ? { text: `${name(e.who)} spends a ${die} Die (${e.left} left)`, tone: 'info' }
        : { text: `${name(e.who)} gets back ${e.delta} ${die} ${e.delta === 1 ? 'Die' : 'Dice'} (${e.left} left)`, tone: 'good' };
    }
    case 'supplies':
      return { text: `${SUPPLY_LABEL[e.item]} ${signed(e.delta)} (${e.reason}) → ${e.left}`, tone: e.delta > 0 ? 'good' : 'info' };
    case 'ambush':
      return e.happened
        ? { text: `The moon showed ${e.chance} %: ambush!`, tone: 'bad' }
        : { text: `The moon showed ${e.chance} %: the night passes quietly.`, tone: 'good' };
    case 'death_saves': {
      const result = e.result === 'dead' ? 'dies' : e.result === 'revived' ? 'gets up with 1 HP' : 'is stable';
      return { text: `${name(e.who)} rolls death saves: ${e.rolls.join(', ')} → ${result}`, tone: e.result === 'dead' ? 'bad' : 'roll' };
    }
    case 'died':
      return { text: `${name(e.who)} has died.`, tone: 'bad' };
    case 'note':
      return { text: e.text, tone: 'info' };
  }
}

function describeEs(e: RuleEvent, name: (id: string) => string): { text: string; tone: Tone } {
  const r = (s: string) => ruleText(s, 'es');
  const left = (n: number) => (n === 1 ? 'queda 1' : `quedan ${n}`);
  switch (e.type) {
    case 'hp':
      return e.delta > 0
        ? { text: `${name(e.who)} recupera ${e.delta} PV (${r(e.reason)}) → ${e.hp}`, tone: 'good' }
        : { text: `${name(e.who)} pierde ${-e.delta} PV (${r(e.reason)}) → ${e.hp}`, tone: 'bad' };
    case 'chakra':
      return e.delta > 0
        ? { text: `${name(e.who)} recupera ${e.delta} de chakra (${r(e.reason)}) → ${e.chakra}`, tone: 'good' }
        : { text: `${name(e.who)} usa ${-e.delta} de chakra (${r(e.reason)}) → ${e.chakra}`, tone: 'info' };
    case 'tension':
      return { text: `${name(e.who)}: Tensión ${signed(e.delta)} (${r(e.reason)}) → ${e.tension}/10`, tone: e.delta > 0 ? 'bad' : 'good' };
    case 'exhaustion':
      return { text: `${name(e.who)}: Agotamiento ${signed(e.delta)} (${r(e.reason)}) → nivel ${e.exhaustion}`, tone: e.delta > 0 ? 'bad' : 'good' };
    case 'effect': {
      const def = EFFECTS[e.effect];
      const buff = def?.kind === 'buff';
      const label = def ? pick(def.name, def.nameEs, 'es') : e.effect;
      if (e.change === 'added') return { text: `${name(e.who)} recibe ${label} (${r(e.reason)})`, tone: buff ? 'good' : 'bad' };
      if (e.change === 'refreshed') return { text: `${name(e.who)}: se renueva ${label} (${r(e.reason)})`, tone: buff ? 'good' : 'bad' };
      if (e.change === 'removed') return { text: `${name(e.who)} pierde ${label} (${r(e.reason)})`, tone: buff ? 'info' : 'good' };
      return { text: `${name(e.who)}: se terminó ${label} (${r(e.reason)})`, tone: 'info' };
    }
    case 'check': {
      const o = e.outcome;
      const dice = o.rolls.length > 1 ? `d20 ${o.d20} (${o.rolls.join(' / ')})` : `d20 ${o.d20}`;
      const pct = Math.round(o.chance * 100);
      return {
        text: `${name(e.who)} · ${r(e.what)}: ${dice} ${o.modifier >= 0 ? '+' : '−'} ${Math.abs(o.modifier)} = ${o.total} contra CD ${o.dc} → ${o.natural20 ? '¡20 natural, éxito automático!' : o.natural1 ? '1 natural, fallo automático' : o.success ? 'éxito' : 'fallo'} (${pct} % de probabilidad)`,
        tone: 'roll',
      };
    }
    case 'breakdown':
      return { text: `${name(e.who)} se quiebra: ${breakdownLabel(e.kind, 'es')}`, tone: 'bad' };
    case 'awakening':
      return { text: `${name(e.who)} despierta: ¡Voluntad de Fuego!`, tone: 'good' };
    case 'unconscious':
      return { text: `${name(e.who)} se desploma de agotamiento`, tone: 'bad' };
    case 'dice': {
      const die = e.kind === 'hit' ? 'golpe' : 'chakra';
      return e.delta < 0
        ? { text: `${name(e.who)} gasta un Dado de ${die} (${left(e.left)})`, tone: 'info' }
        : { text: `${name(e.who)} recupera ${e.delta} ${e.delta === 1 ? 'Dado' : 'Dados'} de ${die} (${left(e.left)})`, tone: 'good' };
    }
    case 'supplies':
      return { text: `${SUPPLY_LABEL_ES[e.item]} ${signed(e.delta)} (${r(e.reason)}) → ${e.left}`, tone: e.delta > 0 ? 'good' : 'info' };
    case 'ambush':
      return e.happened
        ? { text: `La luna marcó ${e.chance} %: ¡emboscada!`, tone: 'bad' }
        : { text: `La luna marcó ${e.chance} %: la noche pasa tranquila.`, tone: 'good' };
    case 'death_saves': {
      const result = e.result === 'dead' ? 'muere' : e.result === 'revived' ? 'se levanta con 1 PV' : 'queda estable';
      return { text: `${name(e.who)} tira salvaciones contra la muerte: ${e.rolls.join(', ')} → ${result}`, tone: e.result === 'dead' ? 'bad' : 'roll' };
    }
    case 'died':
      return { text: `${name(e.who)} ha muerto.`, tone: 'bad' };
    case 'note':
      return { text: r(e.text), tone: 'info' };
  }
}
