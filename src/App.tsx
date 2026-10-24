import React, { useEffect, useState } from 'react';
import { ShinobiCharacter, WeatherType } from './types/shinobi';
import { LEGENDARY_PRESETS } from './data/shinobiData';
import { CharacterCreator } from './components/CharacterCreator';
import { BattleDemo } from './components/battle/BattleDemo';
import type { EncounterId } from './battle/encounters';
import { CampaignMode } from './components/CampaignMode';
import { ArenaSandbox } from './components/ArenaSandbox';
import { MissionMode } from './components/mission/MissionMode';
import { TitleScreen } from './components/TitleScreen';
import { strings, useLang } from './i18n';
import { soundManager } from './utils/audio';
import { setAppNavigate } from './appNav';
import type { AppView } from './appNav';
import { loadHero, saveHero } from './game/saves';
import { getAppearance, withRomanHead } from './sprite/legacy';
import { saveRun } from './game/missionRun';
import { Menu } from 'lucide-react';

const T = strings({
  mainMenu: { en: 'Main menu', es: 'Menú principal' },
});

const founderPreset = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_founder')?.character ?? LEGENDARY_PRESETS[0].character;

/**
 * A new game's ninja: the creator's starting sheet under an id of its own (so it never overwrites a saved
 * one), with the owner's Roman head, his neck and hair (2026-10-23, "1 si"); the Solen preset keeps his.
 */
const freshNinja = (): ShinobiCharacter => ({ ...founderPreset, id: `ninja_${Date.now().toString(36)}`, appearance: withRomanHead(getAppearance(founderPreset)) });

/** The new party battle that matches an old encounter type (the arena and campaign still use them). */
function encounterFor(type?: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat'): EncounterId | undefined {
  if (!type) return undefined;
  return type === 'skirmish' ? 'cedar_rogues' : type === 'rogue_squad' ? 'river_patrol' : type === 'giant_beast' ? 'hydra' : 'night_raid';
}

export default function App() {
  useLang();
  // The game opens on its title screen; a #creator, #missions or #combat link opens straight onto
  // that screen (for testing).
  const [activeView, setActiveView] = useState<AppView>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    return hash === '#creator' ? 'creator' : hash === '#missions' ? 'mission' : hash === '#combat' ? 'combat' : 'title';
  });
  // A battle fills the screen; its menu changes screen through this. Leaving a battle for the
  // screen it was opened from starts that screen afresh.
  const [visit, setVisit] = useState(0);
  const go = (v: AppView) => {
    setActiveView(v);
    setVisit((n) => n + 1);
  };
  useEffect(() => {
    setAppNavigate((v) => {
      soundManager.playSelect();
      go(v);
    });
    return () => setAppNavigate(null);
  }, []);
  // The ninja you play: the one saved on this device, else the creator's starting sheet.
  const [saved, setSaved] = useState<ShinobiCharacter | null>(() => loadHero());
  const [character, setCharacter] = useState<ShinobiCharacter>(() => saved ?? founderPreset);
  /** The creator was opened for a new game: finishing the ninja replaces the mission under way. */
  const [newGame, setNewGame] = useState(false);
  const keep = (c: ShinobiCharacter) => {
    setCharacter(c);
    setSaved(c);
    saveHero(c);
  };
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

  if (activeView === 'title') {
    return (
      <TitleScreen
        hero={saved}
        onStart={() => go('mission')}
        onNewGame={() => {
          setNewGame(true);
          setCharacter(freshNinja());
          go('creator');
        }}
        onPickNinja={(c, edit) => {
          keep(c);
          setNewGame(false);
          go(edit ? 'creator' : 'mission');
        }}
        onPractice={(v) => go(v)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* No web navigation: every screen goes back to the title screen from here (a battle covers it
          and has its own menu). The creator has its own way back. */}
      {activeView !== 'creator' && (
        <button
          type="button"
          onClick={() => {
            soundManager.playSelect();
            go('title');
          }}
          className="fixed left-3 top-3 z-40 inline-flex items-center gap-1.5 rounded-sm border border-[#8a6a3a] bg-[#0e0a07]/90 px-3 py-1.5 text-xs font-semibold text-[#efe3c4] shadow-lg shadow-black hover:text-[#f2c46d]"
        >
          <Menu className="w-3.5 h-3.5" />
          {T('mainMenu')}
        </button>
      )}

      <main className="flex-1 flex flex-col">
        {activeView === 'creator' && (
          <CharacterCreator
            key={`${character.id}:${visit}`}
            initialCharacter={character}
            onCancel={() => {
              soundManager.playSelect();
              setNewGame(false);
              setCharacter(saved ?? founderPreset);
              go('title');
            }}
            onSave={(updatedChar) => {
              keep(updatedChar);
              if (newGame) saveRun(null);
              setNewGame(false);
              go('mission');
            }}
          />
        )}

        {activeView === 'campaign' && (
          <CampaignMode
            key={visit}
            playerCharacter={character}
            onLaunchBattle={(enc) => handleLaunchCombat(enc)}
            onBackToCreator={() => go('creator')}
          />
        )}

        {activeView === 'mission' && (
          <MissionMode
            key={visit}
            hero={character}
            // Only what a mission leaves for good comes home; edits made in the creator meanwhile stay.
            onHeroReturn={(back) => back && character.id === back.id && keep({ ...character, scars: back.scars, traits: back.traits })}
          />
        )}

        {activeView === 'combat' && <BattleDemo key={`${activeEncounter?.title ?? 'practice'}:${visit}`} character={character} start={encounterFor(activeEncounter?.enemyType)} />}

        {activeView === 'arena' && (
          <ArenaSandbox
            playerCharacter={character}
            onLaunchBattle={(enc) => handleLaunchCombat(enc)}
            onBackToCreator={() => go('creator')}
          />
        )}
      </main>
    </div>
  );
}
