// Battle practice: pick one of the river forest's battles and fight it with your ninja and three
// companions (you control all four, any of them can be handed to the AI). Replaces the old
// one-fighter combat screen.

import React, { useMemo, useState } from 'react';
import { Swords, Moon, Eye, Skull, RotateCcw } from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { Difficulty } from '../../types/mission';
import { createBattle } from '../../battle/engine';
import { encounterSetup } from '../../battle/encounters';
import type { EncounterId } from '../../battle/encounters';
import type { PartyBattleResult } from '../../battle/result';
import { COMPANIONS } from '../../data/missions';
import { strings, useLang } from '../../i18n';
import { BattleScreen } from './BattleScreen';
import { Portrait } from './hud';
import { unitFrom } from '../../battle/units';
import { withPouches } from '../../rules/pouch';
import { natureOf } from '../../rules/ninja';

/**
 * Water's rank S, the Dragon Tsunami (the owner, 2026-10-22), castable in practice by every water
 * ninja so it can be tried: a ninja learns it only at level 10 (Hana has it in her S-rank slot).
 */
const PRACTICE_PREVIEW = 'water_tide_s';

const S = strings({
  title: { en: 'Battle practice', es: 'Práctica de batalla' },
  intro: { en: 'Fight on the river forest map with your ninja and three companions. You control all four; switch any of them to the AI from the party frames.', es: 'Pelea en el mapa del bosque del río con tu ninja y tres compañeros. Controlas a los cuatro; puedes pasar cualquiera a la IA desde sus recuadros.' },
  party: { en: 'Your party', es: 'Tu grupo' },
  difficulty: { en: 'Difficulty', es: 'Dificultad' },
  story: { en: 'Story', es: 'Historia' },
  normal: { en: 'Normal', es: 'Normal' },
  legend: { en: 'Legend', es: 'Leyenda' },
  start: { en: 'Fight', es: 'Pelear' },
  again: { en: 'Choose another battle', es: 'Elegir otra batalla' },
  result: { en: 'Result', es: 'Resultado' },
  rounds: { en: '{n} rounds', es: '{n} rondas' },
  river_patrol: { en: 'Patrol at the crossing', es: 'Patrulla en el cruce' },
  river_patrol_d: { en: 'Stealth: slip past or silently take down the guards at the bridge and the hill camp.', es: 'Sigilo: pasa sin ser visto o elimina en silencio a los guardias del puente y del campamento.' },
  cedar_rogues: { en: 'Rogues in the clearing', es: 'Renegados en el claro' },
  cedar_rogues_d: { en: 'A straight fight against three rogues. Good for learning the basics.', es: 'Una pelea directa contra tres renegados. Ideal para aprender lo básico.' },
  night_raid: { en: 'Night raid on the camp', es: 'Asalto nocturno al campamento' },
  night_raid_d: { en: 'Raiders climb to your camp on the hill, from the river and from the lookout.', es: 'Los asaltantes suben a tu campamento en la colina, desde el río y desde el mirador.' },
  hydra: { en: 'The Hydra', es: 'La Hidra' },
  hydra_d: { en: 'Seven heads. Cut one, then burn, electrify or blow up the stump, or it grows back.', es: 'Siete cabezas. Corta una y luego quema, electrocuta o haz estallar el muñón, o vuelve a crecer.' },
  victory: { en: 'Victory', es: 'Victoria' },
  defeat: { en: 'Defeat', es: 'Derrota' },
  fled: { en: 'Retreat', es: 'Retirada' },
});

const ENCOUNTER_ICON: Record<EncounterId, React.FC<{ size?: number }>> = { river_patrol: Eye, cedar_rogues: Swords, night_raid: Moon, hydra: Skull };

export interface BattleDemoProps {
  character: ShinobiCharacter;
  /** Opens straight onto this battle (from the arena). */
  start?: EncounterId;
}

export const BattleDemo: React.FC<BattleDemoProps> = ({ character, start }) => {
  const lang = useLang();
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [battle, setBattle] = useState<{ id: EncounterId; seed: number } | null>(start ? { id: start, seed: Date.now() % 100000 } : null);
  const [result, setResult] = useState<PartyBattleResult | null>(null);

  // The player's ninja and three companions (fresh: full HP and chakra).
  const party = useMemo(() => {
    const others = COMPANIONS.filter((c) => c.id !== character.id);
    const fresh = (c: ShinobiCharacter): ShinobiCharacter => ({ ...c, currentHp: c.maxHp, currentChakra: c.maxChakra, effects: [] });
    return [fresh(character), ...others.slice(0, 3).map(fresh)];
  }, [character]);

  const initial = useMemo(() => {
    if (!battle) return null;
    const s = createBattle(
      encounterSetup(
        battle.id,
        party.map((c) => ({ character: c })),
        // The practice backpack, plus the explosive tags in each ninja's own pouch.
        { seed: battle.seed, difficulty, supplies: withPouches({ soldierPills: 2, bandages: 3, antidotes: 1, explosiveTags: 2 }, party) },
      ),
    );
    // Practice only: the water ninjas can try the Dragon Tsunami whatever their level (missions untouched).
    for (const u of Object.values(s.state.units)) if (u.team === 'party' && u.character && natureOf(u.character) === 'Water' && !u.jutsus.includes(PRACTICE_PREVIEW)) u.jutsus.push(PRACTICE_PREVIEW);
    return s;
  }, [battle, party, difficulty]);

  if (battle && initial) {
    return (
      <BattleScreen
        key={battle.seed}
        initial={initial}
        title={S(battle.id)}
        onEnd={(r) => {
          setResult(r);
          setBattle(null);
        }}
      />
    );
  }

  const ids: EncounterId[] = ['cedar_rogues', 'river_patrol', 'night_raid', 'hydra'];
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-white">{S('title')}</h1>
      <p className="mt-1 text-sm text-slate-400 max-w-2xl">{S('intro')}</p>

      {result && (
        <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4 flex items-center gap-4">
          <div className={`text-xl font-black ${result.outcome === 'victory' ? 'text-emerald-300' : result.outcome === 'fled' ? 'text-amber-300' : 'text-rose-300'}`}>{S(result.outcome)}</div>
          <div className="text-sm text-slate-300">{S('rounds', { n: result.rounds })}</div>
          <button type="button" onClick={() => setResult(null)} className="ml-auto inline-flex items-center gap-1.5 text-sm text-sky-300 hover:text-sky-100">
            <RotateCcw size={14} /> {S('again')}
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-slate-400">{S('party')}</span>
        <div className="flex gap-2">
          {party.map((c) => {
            const u = unitFrom(c, { team: 'party', pos: { x: 0, z: 0 } });
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-lg bg-slate-900/70 border border-slate-700 px-2 py-1">
                <Portrait u={u} size={28} />
                <span className="text-xs text-slate-200">{c.name.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
        <span className="ml-auto text-xs uppercase tracking-widest text-slate-400">{S('difficulty')}</span>
        <div className="flex rounded-full bg-slate-900 border border-slate-700 p-0.5">
          {(['story', 'normal', 'legend'] as Difficulty[]).map((d) => (
            <button key={d} type="button" onClick={() => setDifficulty(d)} className={`px-3 py-1 rounded-full text-xs font-semibold ${difficulty === d ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}>
              {S(d)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {ids.map((id) => {
          const Icon = ENCOUNTER_ICON[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setBattle({ id, seed: Math.floor(Math.random() * 1e6) })}
              className="text-left rounded-xl border border-slate-700 bg-slate-900/70 hover:bg-slate-800/80 hover:border-sky-600/60 p-4 transition-colors"
            >
              <div className="flex items-center gap-2 text-white font-bold">
                <Icon size={18} /> {S(id)}
              </div>
              <p className="mt-1 text-sm text-slate-400">{S(`${id}_d` as Parameters<typeof S>[0])}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-300">
                <Swords size={13} /> {S('start')}
              </div>
            </button>
          );
        })}
      </div>
      <span className="sr-only">{lang}</span>
    </div>
  );
};
