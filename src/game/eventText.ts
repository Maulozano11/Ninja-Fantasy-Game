// Rule events told as log lines for the mission screens (the Chronicle will grow from these).

import type { RuleEvent, SupplyId } from '../types/mission';
import { EFFECTS } from '../rules/effects';

export type Tone = 'good' | 'bad' | 'roll' | 'info' | 'title';

export interface LogLine {
  id: number;
  text: string;
  tone: Tone;
}

export const SUPPLY_LABEL: Record<SupplyId, string> = {
  rations: 'Rations',
  campKits: 'Camp kits',
  bandages: 'Bandages',
  antidotes: 'Antidotes',
  soldierPills: 'Soldier pills',
  explosiveTags: 'Explosive tags',
  wireRolls: 'Wire rolls',
};

export const BREAKDOWN_LABEL: Record<string, string> = {
  panic: 'Panic',
  paranoia: 'Paranoia',
  blind_rage: 'Blind rage',
  despair: 'Despair',
};

const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function describeEvent(e: RuleEvent, name: (id: string) => string): { text: string; tone: Tone } {
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
        text: `${name(e.who)} · ${e.what}: ${dice} ${o.modifier >= 0 ? '+' : '−'} ${Math.abs(o.modifier)} = ${o.total} vs DC ${o.dc} → ${o.success ? 'success' : 'failure'} (${pct} % chance)`,
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
