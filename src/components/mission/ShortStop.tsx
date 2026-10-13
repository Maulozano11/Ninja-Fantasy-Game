import React, { useState } from 'react';
import { Coffee, Dices, HeartPulse, Sparkles } from 'lucide-react';
import type { PartyState } from '../../types/mission';
import type { ActivityId } from '../../data/campActivities';
import { ACTIVITY } from '../../data/campActivities';
import { SHINOBI_CLASSES } from '../../data/shinobiData';
import { effectiveMaxHp } from '../../rules/derived';
import { activityBlocker, healingJutsuOf, StopState } from '../../rules/rest';
import { chakraDiceLeft, hitDiceLeft } from '../../rules/ninja';
import { abilityMod } from '../../rules/checks';
import { effectMods } from '../../rules/effects';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { Bar } from './PartyPanel';

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
  // The most wounded ninja is the default patient.
  const mostHurt = [...party.members].sort((a, b) => a.currentHp / effectiveMaxHp(a) - b.currentHp / effectiveMaxHp(b))[0]?.id ?? '';
  const [targets, setTargets] = useState<Record<string, string>>({});

  return (
    <div className="rounded-2xl border border-amber-900/50 bg-gradient-to-b from-amber-950/30 to-slate-900/60 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Coffee className="w-4 h-4" /> Short stop · 1 hour
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-[65ch]">
            Each ninja can spend Hit Dice (HP) and Chakra Dice, and do one healing activity that spends something. Nothing here restores Tension or Exhaustion,
            and there is no ambush.
          </p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500"
        >
          Back on the road
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {party.members.map((c) => {
          const cls = SHINOBI_CLASSES[c.shinobiClass];
          const max = effectiveMaxHp(c);
          const fever = effectMods(c.effects).noRestHp;
          const hitBlock = hitDiceLeft(c) < 1 ? 'No Hit Dice left' : fever ? 'Fever: no HP back from rests' : c.currentHp >= max ? 'Already at full HP' : null;
          const chakraBlock = chakraDiceLeft(c) < 1 ? 'No Chakra Dice left' : c.currentChakra >= c.maxChakra ? 'Already at full chakra' : null;
          const acted = stop.acted.includes(c.id);
          const target = targets[c.id] ?? mostHurt;
          const jutsu = healingJutsuOf(c);
          const con = abilityMod(c.stats.con);
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
                  title={hitBlock ?? `Heals d${cls.hitDie} ${con >= 0 ? '+' : '−'} ${Math.abs(con)} (CON)`}
                  onClick={() => onHitDie(c.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-800/70 bg-rose-950/40 px-2 py-1.5 text-xs text-rose-200 hover:bg-rose-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Dices className="w-3.5 h-3.5" /> Hit Die d{cls.hitDie} · {hitDiceLeft(c)} left
                </button>
                <button
                  type="button"
                  disabled={!!chakraBlock}
                  title={chakraBlock ?? `Restores d${cls.chakraDie} chakra`}
                  onClick={() => onChakraDie(c.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-800/70 bg-cyan-950/40 px-2 py-1.5 text-xs text-cyan-200 hover:bg-cyan-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Chakra Die d{cls.chakraDie} · {chakraDiceLeft(c)} left
                </button>
              </div>
              {acted ? (
                <div className="text-[11px] text-emerald-300">Healing activity done at this stop.</div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <HeartPulse className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={target}
                    onChange={(e) => setTargets({ ...targets, [c.id]: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-200"
                    aria-label={`Who ${c.name} treats`}
                  >
                    {party.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === c.id ? `${m.name} (self)` : m.name} · {m.currentHp}/{effectiveMaxHp(m)} HP
                      </option>
                    ))}
                  </select>
                  {STOP_ACTIVITIES.map((id) => {
                    const act = ACTIVITY[id];
                    const block = activityBlocker(party, null, c.id, act, { target });
                    if (id === 'heal_jutsu' && !jutsu) return null;
                    const cost = id === 'bandage' ? '1 bandage' : `${jutsu?.chakraCost ?? 0} chakra`;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!!block}
                        title={block ?? `${act.description} Costs ${cost}.`}
                        onClick={() => onActivity(c.id, id, target)}
                        className="rounded-lg border border-emerald-800/70 bg-emerald-950/40 px-2 py-1 text-emerald-200 hover:bg-emerald-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {id === 'heal_jutsu' ? jutsu?.name ?? act.name : act.name} <span className="opacity-70">({cost})</span>
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
