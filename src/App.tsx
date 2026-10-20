import React, { useState } from 'react';
import { ShinobiCharacter, WeatherType } from './types/shinobi';
import { LEGENDARY_PRESETS } from './data/shinobiData';
import { CharacterCreator } from './components/CharacterCreator';
import { BattleDemo } from './components/battle/BattleDemo';
import type { EncounterId } from './battle/encounters';
import { CampaignMode } from './components/CampaignMode';
import { ArenaSandbox } from './components/ArenaSandbox';
import { MissionMode } from './components/mission/MissionMode';
import { LangToggle } from './i18n/LangToggle';
import { strings, useLang } from './i18n';
import { soundManager } from './utils/audio';
import { Swords, User, BookOpen, Compass, Shield, Flame } from 'lucide-react';

type AppView = 'creator' | 'campaign' | 'mission' | 'combat' | 'arena';

const T = strings({
  creator: { en: 'Character Creator', es: 'Creador de personajes' },
  campaign: { en: 'Campaign Arcs', es: 'Arcos de campaña' },
  missions: { en: 'Missions', es: 'Misiones' },
  isNew: { en: 'New', es: 'Nuevo' },
  combat: { en: 'Tactical Combat', es: 'Combate táctico' },
  arena: { en: 'Arena & PvP', es: 'Arena y JcJ' },
  launch: { en: 'Launch Battle', es: 'Iniciar batalla' },
  footer: { en: 'Shinobi 5e Chronicles · Interactive 2D Tactical Engine with Destructible Environments & D&D Rolls', es: 'Shinobi 5e Chronicles · Motor táctico 2D interactivo con escenarios destructibles y tiradas de D&D' },
});

const founderPreset = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_founder')?.character;

/** The new party battle that matches an old encounter type (the arena and campaign still use them). */
function encounterFor(type?: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat'): EncounterId | undefined {
  if (!type) return undefined;
  return type === 'skirmish' ? 'cedar_rogues' : type === 'rogue_squad' ? 'river_patrol' : type === 'giant_beast' ? 'hydra' : 'night_raid';
}

export default function App() {
  useLang();
  // A #creator or #missions link opens straight onto that screen.
  const [activeView, setActiveView] = useState<AppView>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    return hash === '#creator' ? 'creator' : hash === '#missions' ? 'mission' : 'combat';
  });
  const [character, setCharacter] = useState<ShinobiCharacter>(founderPreset || LEGENDARY_PRESETS[0].character);
  const [activeEncounter, setActiveEncounter] = useState<{
    title: string;
    description: string;
    enemyType: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat';
    weather: WeatherType;
  } | undefined>(undefined);

  const handleLaunchCombat = (encounter?: {
    title: string;
    description: string;
    enemyType: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat';
    weather: WeatherType;
  }) => {
    soundManager.playSelect();
    setActiveEncounter(encounter);
    setActiveView('combat');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav Links) - Zone 3 (Primary Action) */}
      <header className="flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-3.5 border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => {
            soundManager.playSelect();
            setActiveView('creator');
          }}
          className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 hover:text-cyan-400 transition cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>Shinobi 5e Chronicles</span>
        </button>

        {/* Zone 2: single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-4 xl:gap-7 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => {
              soundManager.playSelect();
              setActiveView('creator');
            }}
            className={`transition whitespace-nowrap shrink-0 pb-0.5 ${
              activeView === 'creator'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-slate-200'
            }`}
          >
            {T('creator')}
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playSelect();
              setActiveView('campaign');
            }}
            className={`transition whitespace-nowrap shrink-0 pb-0.5 ${
              activeView === 'campaign'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-slate-200'
            }`}
          >
            {T('campaign')}
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playSelect();
              setActiveView('mission');
            }}
            className={`transition whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1.5 ${
              activeView === 'mission'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-slate-200'
            }`}
          >
            {T('missions')}
            <span className="rounded bg-amber-400 px-1 text-[9px] font-black uppercase leading-4 text-slate-950">{T('isNew')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playSelect();
              setActiveView('combat');
            }}
            className={`transition whitespace-nowrap shrink-0 pb-0.5 ${
              activeView === 'combat'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-slate-200'
            }`}
          >
            {T('combat')}
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playSelect();
              setActiveView('arena');
            }}
            className={`transition whitespace-nowrap shrink-0 pb-0.5 ${
              activeView === 'arena'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-slate-200'
            }`}
          >
            {T('arena')}
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <LangToggle />
          <button
            type="button"
            onClick={() => handleLaunchCombat()}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-950 transition whitespace-nowrap shrink-0 active:scale-98 cursor-pointer flex items-center gap-1.5"
          >
            <Swords className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{T('launch')}</span>
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col">
        {activeView === 'creator' && (
          <CharacterCreator
            initialCharacter={character}
            onSave={(updatedChar) => {
              setCharacter(updatedChar);
              handleLaunchCombat();
            }}
          />
        )}

        {activeView === 'campaign' && (
          <CampaignMode
            playerCharacter={character}
            onLaunchBattle={(enc) => handleLaunchCombat(enc)}
            onBackToCreator={() => setActiveView('creator')}
          />
        )}

        {activeView === 'mission' && (
          <MissionMode
            hero={character}
            // Only what a mission leaves for good comes home; edits made in the creator meanwhile stay.
            onHeroReturn={(back) => back && setCharacter((c) => (c.id === back.id ? { ...c, scars: back.scars, traits: back.traits } : c))}
          />
        )}

        {activeView === 'combat' && <BattleDemo key={activeEncounter?.title ?? 'practice'} character={character} start={encounterFor(activeEncounter?.enemyType)} />}

        {activeView === 'arena' && (
          <ArenaSandbox
            playerCharacter={character}
            onLaunchBattle={(enc) => handleLaunchCombat(enc)}
            onBackToCreator={() => setActiveView('creator')}
          />
        )}
      </main>

      {/* Quiet Minimalist Editorial Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        {T('footer')}
      </footer>
    </div>
  );
}
