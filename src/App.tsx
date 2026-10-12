import React, { useState } from 'react';
import { ShinobiCharacter, WeatherType } from './types/shinobi';
import { LEGENDARY_PRESETS } from './data/shinobiData';
import { CharacterCreator } from './components/CharacterCreator';
import { TacticalCombat } from './components/TacticalCombat';
import { CampaignMode } from './components/CampaignMode';
import { ArenaSandbox } from './components/ArenaSandbox';
import { soundManager } from './utils/audio';
import { Swords, User, BookOpen, Compass, Shield, Flame } from 'lucide-react';

type AppView = 'creator' | 'campaign' | 'combat' | 'arena';

const founderPreset = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_founder')?.character;

export default function App() {
  // A #creator link opens straight onto the character creator.
  const [activeView, setActiveView] = useState<AppView>(() =>
    typeof window !== 'undefined' && window.location.hash === '#creator' ? 'creator' : 'combat',
  );
  const [character, setCharacter] = useState<ShinobiCharacter>(founderPreset || LEGENDARY_PRESETS[0].character);
  const [activeEncounter, setActiveEncounter] = useState<{
    title: string;
    description: string;
    enemyType: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat';
    weather: WeatherType;
  } | undefined>({
    title: 'Valley of the End Skirmish',
    description: 'Rogue shinobi have infiltrated the historic river gorge beneath the monumental stone statues. Eliminate the rogue squad before they breach the border.',
    enemyType: 'skirmish',
    weather: 'Downpour',
  });

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
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md">
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

        {/* Zone 2: 4 single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-400">
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
            Character Creator
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
            Campaign Arcs
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
            Tactical Combat
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
            Arena & PvP
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLaunchCombat()}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-950 transition whitespace-nowrap shrink-0 active:scale-98 cursor-pointer flex items-center gap-1.5"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Launch Battle</span>
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
              handleLaunchCombat({
                title: 'Tactical Shinobi Battlefield: Village Ruins',
                description: 'Test your custom build against rival shinobi and giant beasts with destructible terrain!',
                enemyType: 'giant_beast',
                weather: 'Clear',
              });
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

        {activeView === 'combat' && (
          <TacticalCombat
            playerCharacter={character}
            campaignEncounter={activeEncounter}
            onBackToCreator={() => setActiveView('creator')}
            onBattleEnd={(victory) => {
              // Battle completed
            }}
          />
        )}

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
        Shinobi 5e Chronicles · Interactive 2D Tactical Engine with Destructible Environments & D&D Rolls
      </footer>
    </div>
  );
}
