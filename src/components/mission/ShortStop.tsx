import React, { useState } from 'react';
import { Coffee, Dices, HeartPulse, Sparkles } from 'lucide-react';
import type { PartyState } from '../../types/mission';
import type { ActivityId } from '../../data/campActivities';
import { ACTIVITY } from '../../data/campActivities';
import { SHINOBI_CLASSES } from '../../data/shinobiData';
import { effectiveMaxHp } from '../../rules/derived';
import { activityBlocker, healingJutsuOf, StopState } from '../../rules/rest';
import { chakraDiceLeft, hitDiceLeft } from '../../rules/ninja';
import { abilityMod, abilityScores } from '../../rules/checks';
import { effectMods } from '../../rules/effects';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { ruleText } from '../../game/ruleText';
import { pick, useLang } from '../../i18n';
import { Bar } from './PartyPanel';
import { T } from './stopText';

const STOP_ACTIVITIES: ActivityId[] = ['bandage', 'heal_jutsu'];

/** A short stop between zones: Hit and Chakra Dice, and one healing activity per ninja. */
export function ShortStop({
  party,
  stop,
  onHitDie,
  onChakraDie,
  onActivity,
  onLeave,
}: {
  party: PartyState;
  stop: StopState;
  onHitDie: (who: string) => void;
  onChakraDie: (who: string) => void;
  onActivity: (who: string, activity: ActivityId, target: string) => void;
  onLeave: () => void;
}) {
  useLang();
  // The most wounded ninja is the default patient.
  const mostHurt = [...party.members].sort((a, b) => a.currentHp / effectiveMaxHp(a) - b.currentHp / effectiveMaxHp(b))[0]?.id ?? '';
  const [targets, setTargets] = useState<Record<string, string>>({});

  return (
    <div className="rounded-2xl border border-amber-900/50 bg-gradient-to-b from-amber-950/30 to-slate-900/60 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Coffee className="w-4 h-4" /> {T('header')}
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-[65ch]">{T('intro')}</p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500"
        >
          {T('backOnRoad')}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {party.members.map((c) => {
          const cls = SHINOBI_CLASSES[c.shinobiClass];
          const max = effectiveMaxHp(c);
          const fever = effectMods(c.effects).noRestHp;
          const hitBlock = hitDiceLeft(c) < 1 ? T('noHitDice') : fever ? T('fever') : c.currentHp >= max ? T('fullHp') : null;
          const chakraBlock = chakraDiceLeft(c) < 1 ? T('noChakraDice') : c.currentChakra >= c.maxChakra ? T('fullChakra') : null;
          const acted = stop.acted.includes(c.id);
          const target = targets[c.id] ?? mostHurt;
          const jutsu = healingJutsuOf(c);
          const con = abilityMod(abilityScores(c).con);
          return (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
              <div className="flex gap-2">
                <ShinobiSpriteCanvas character={c} size={56} showAura={false} />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-bold text-sm text-white">{c.name}</div>
                  <Bar value={c.currentHp} max={max} tone="hp" />
                  <Bar value={c.currentChakra} max={c.maxChakra} tone="chakra" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!!hitBlock}
                  title={hitBlock ?? T('hitTitle', { die: cls.hitDie, sign: con >= 0 ? '+' : '−', con: Math.abs(con) })}
                  onClick={() => onHitDie(c.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-800/70 bg-rose-950/40 px-2 py-1.5 text-xs text-rose-200 hover:bg-rose-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Dices className="w-3.5 h-3.5" /> {T('hitDie', { die: cls.hitDie, n: hitDiceLeft(c) })}
                </button>
                <button
                  type="button"
                  disabled={!!chakraBlock}
                  title={chakraBlock ?? T('chakraTitle', { die: cls.chakraDie })}
                  onClick={() => onChakraDie(c.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-800/70 bg-cyan-950/40 px-2 py-1.5 text-xs text-cyan-200 hover:bg-cyan-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {T('chakraDie', { die: cls.chakraDie, n: chakraDiceLeft(c) })}
                </button>
              </div>
              {acted ? (
                <div className="text-[11px] text-emerald-300">{T('acted')}</div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <HeartPulse className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={target}
                    onChange={(e) => setTargets({ ...targets, [c.id]: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-200"
                    aria-label={T('whoTreats', { name: c.name })}
                  >
                    {party.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {T('patient', { name: m.id === c.id ? T('self', { name: m.name }) : m.name, hp: m.currentHp, max: effectiveMaxHp(m) })}
                      </option>
                    ))}
                  </select>
                  {STOP_ACTIVITIES.map((id) => {
                    const act = ACTIVITY[id];
                    const blocker = activityBlocker(party, null, c.id, act, { target });
                    const block = blocker && ruleText(blocker);
                    if (id === 'heal_jutsu' && !jutsu) return null;
                    const cost = id === 'bandage' ? T('costBandage') : T('costChakra', { n: jutsu?.chakraCost ?? 0 });
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!!block}
                        title={block ?? T('costs', { description: pick(act.description, act.descriptionEs), cost })}
                        onClick={() => onActivity(c.id, id, target)}
                        className="rounded-lg border border-emerald-800/70 bg-emerald-950/40 px-2 py-1 text-emerald-200 hover:bg-emerald-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {id === 'heal_jutsu' ? jutsu?.name ?? pick(act.name, act.nameEs) : pick(act.name, act.nameEs)} <span className="opacity-70">({cost})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
