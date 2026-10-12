import React, { useState } from 'react';
import { ShinobiCharacter, WeatherType } from '../types/shinobi';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { ShinobiSpriteCanvas } from './ShinobiSpriteCanvas';
import { soundManager } from '../utils/audio';
import { Swords, Users, Shield, Zap, Skull, CloudRain, Sun, Compass } from 'lucide-react';

interface ArenaSandboxProps {
  playerCharacter: ShinobiCharacter;
  onLaunchBattle: (encounter: {
    title: string;
    description: string;
    enemyType: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat';
    weather: WeatherType;
  }) => void;
  onBackToCreator: () => void;
}

export const ArenaSandbox: React.FC<ArenaSandboxProps> = ({
  playerCharacter,
  onLaunchBattle,
  onBackToCreator,
}) => {
  const [mode, setMode] = useState<'pve' | 'pvp'>('pve');
  const [selectedEnemyType, setSelectedEnemyType] = useState<
    'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat'
  >('giant_beast');
  const [weather, setWeather] = useState<WeatherType>('Clear');

  const enemyPresets = [
    {
      id: 'skirmish',
      title: 'Genin Rival Skirmish',
      desc: 'Fast-paced tactical duel against rival Leaf & Sand genin squads.',
      tier: 'Level 1-2 Skirmish',
      threat: 'Standard Shinobi',
    },
    {
      id: 'rogue_squad',
      title: 'Rogue Jonin Infiltration Squad',
      desc: 'Battle seasoned rogue jonin equipped with Sharingan and heavy Mist vests.',
      tier: 'Level 3-5 Elite Squad',
      threat: 'Chunin / Jonin',
    },
    {
      id: 'giant_beast',
      title: 'Orochi Hydra (Giant Summoned Beast)',
      desc: 'Colossal 2x2 multi-tile serpent with 95 HP, sweeping venom strikes and high armor class.',
      tier: 'Giant Summon Boss',
      threat: 'Colossal Creature',
    },
    {
      id: 'titanic_threat',
      title: 'Kurama Avatar (Titanic Tailed Beast)',
      desc: 'Titanic 3x3 footprint mountain-shaking colossus with 160 HP, tectonic tail slams and S-rank chakra roars!',
      tier: 'Cataclysmic Titan',
      threat: 'Titanic Threat',
    },
  ];

  const handleLaunch = () => {
    soundManager.playCriticalHit();
    const preset = enemyPresets.find((p) => p.id === selectedEnemyType);
    onLaunchBattle({
      title: mode === 'pvp' ? 'Local 2P Shinobi Tactical PvP Duel' : preset?.title || 'Arena Skirmish',
      description:
        mode === 'pvp'
          ? 'Pass-and-play duel between two custom shinobi masters on an interactive destructible battlefield.'
          : preset?.desc || 'Battlefield skirmish testing jutsu synergies.',
      enemyType: mode === 'pvp' ? 'rogue_squad' : selectedEnemyType,
      weather,
    });
  };

  return (
    <div className="min-w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-cyan-400">Battle Simulation Lab</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Arena Skirmish & Multiplayer PvP</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToCreator}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Character Forge
          </button>
        </div>
      </div>

      {/* Main Selection Area */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-6">
        {/* Active Combatant Preview Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="relative p-1.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
              <ShinobiSpriteCanvas
                character={playerCharacter}
                stance="idle"
                size={96}
                showAura={true}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">{playerCharacter.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                  South-East Chibi (128x128)
                </span>
              </div>
              <div className="text-xs text-cyan-400 font-mono mt-0.5">
                {playerCharacter.clan} Clan • Level {playerCharacter.level} {playerCharacter.shinobiClass}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                <span>HP: <strong className="text-emerald-400">{playerCharacter.currentHp}/{playerCharacter.maxHp}</strong></span>
                <span>Chakra: <strong className="text-cyan-400">{playerCharacter.currentChakra}/{playerCharacter.maxChakra}</strong></span>
                <span>AC: <strong className="text-amber-400">{playerCharacter.armorClass}</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToCreator}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Customize in Forge
          </button>
        </div>

        {/* Mode Selector (PvE Boss vs 2-Player Local PvP) */}
        <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundManager.playSelect();
              setMode('pve');
            }}
            className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
              mode === 'pve'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Skull className="w-4 h-4" />
            <span>Shinobi Skirmish & Giant Beasts (Solo / PvE)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playSelect();
              setMode('pvp');
            }}
            className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
              mode === 'pvp'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2-Player Pass & Play Duel (Local PvP / Co-op)</span>
          </button>
        </div>

        {/* Threat Scale Selector */}
        {mode === 'pve' ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Threat Scale (Shinobi to Titanic Behemoths)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {enemyPresets.map((preset) => {
                const isSelected = selectedEnemyType === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      soundManager.playSelect();
                      setSelectedEnemyType(preset.id as typeof selectedEnemyType);
                    }}
                    className={`cursor-pointer rounded-2xl p-4 border transition ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/50 shadow-lg'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">{preset.title}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-sm bg-slate-800 text-amber-400 border border-slate-700">
                        {preset.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">{preset.desc}</p>
                    <div className="text-[10px] font-mono text-cyan-400">Threat: {preset.threat}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-purple-950/20 border border-purple-500/40 p-5 space-y-2">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              2-Player Shinobi Tactical Pass & Play
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Take turns using your device! Player 1 commands your customized shinobi ({playerCharacter.name}), and Player 2 takes command of the rival elite operative on the same tactical destructible grid. Both players roll d20 dice for jutsu accuracy and saves.
            </p>
          </div>
        )}

        {/* Battlefield Weather Conditions */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Battlefield Weather & Atmospheric Conditions
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'Clear', label: 'Clear Sky', desc: 'Standard visibility and jutsu damage.' },
              { id: 'Downpour', label: 'Downpour Rain', desc: 'Buffs Water & Lightning +4; reduces Fire -4.' },
              { id: 'Scorching Drought', label: 'Scorching Drought', desc: 'Buffs Fire +5; wooden houses burn faster.' },
              { id: 'Sandstorm', label: 'Sandstorm', desc: 'Disadvantage on ranged jutsu > 3 tiles.' },
            ].map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  soundManager.playSelect();
                  setWeather(w.id as WeatherType);
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  weather === w.id
                    ? 'bg-amber-950/40 border-amber-500 font-semibold text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">{w.label}</div>
                <div className="text-[10px] text-slate-400 leading-snug">{w.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Launch Button */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLaunch}
            className="w-full py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-xl shadow-cyan-900/40 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Swords className="w-5 h-5" />
            <span>Launch Tactical Battlefield Encounter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
