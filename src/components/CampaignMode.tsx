import React, { useState } from 'react';
import { ShinobiCharacter, WeatherType } from '../types/shinobi';
import { soundManager } from '../utils/audio';
import { Compass, Shield, Flame, BookOpen, Skull, ChevronRight, Swords, Sparkles } from 'lucide-react';

interface CampaignModeProps {
  playerCharacter: ShinobiCharacter;
  onLaunchBattle: (encounter: {
    title: string;
    description: string;
    enemyType: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat';
    weather: WeatherType;
  }) => void;
  onBackToCreator: () => void;
}

interface CampaignNode {
  id: string;
  arcTitle: string;
  chapterTitle: string;
  imageKey: 'forest' | 'titan' | 'creator';
  narrativeText: string;
  choices: {
    label: string;
    consequenceText: string;
    bonusEffect?: string;
    weather: WeatherType;
    enemyType: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat';
    encounterTitle: string;
  }[];
}

const CAMPAIGN_STORY_NODES: CampaignNode[] = [
  {
    id: 'arc1_forest',
    arcTitle: 'Campaign Arc I: The Chunin Trials',
    chapterTitle: 'The Primeval Forest of Death',
    imageKey: 'forest',
    narrativeText: `The canopy above shuts out the sun as your squad steps onto the damp moss of the 44th Training Ground. Giant leeches crawl along twisted roots, and the scent of gunpowder hangs heavy in the humid air. 

Through the dense mist, you spot a rival squad stationed around an elevated wooden watchtower guarding a Heaven Scroll. Hidden explosive tags line the stone lanterns, and a storm is brewing overhead. How will your clan approach the ambush?`,
    choices: [
      {
        label: 'A. Unleash Fire Jutsu to Burn Down the Watchtower',
        consequenceText: 'Your flame technique incinerates their wooden stronghold! The enemy is forced into the open, but dense smoke blankets the battlefield.',
        bonusEffect: '+2 to Initiative rolls; wooden houses on map start as charred ruins.',
        weather: 'Clear',
        enemyType: 'skirmish',
        encounterTitle: 'Forest of Death: Watchtower Firefight',
      },
      {
        label: 'B. Use Wind Blade to Cleave a Flanking Pathway',
        consequenceText: 'A high-pressure wind scythe shears through the tangled forest, bypassing their explosive traps and flanking the rogue genin from behind.',
        bonusEffect: 'You start behind half-cover with advantage on your first strike.',
        weather: 'Downpour',
        enemyType: 'skirmish',
        encounterTitle: 'Forest of Death: Ambush from the Mist',
      },
      {
        label: 'C. Channel Sharingan / Byakugan Dojutsu for Precision Infiltration',
        consequenceText: 'Your clan visual prowess identifies every hidden seal in the dirt. You lure their point guard into a counter-trap!',
        bonusEffect: 'Enemy accuracy reduced; you detect all ground traps.',
        weather: 'Clear',
        enemyType: 'rogue_squad',
        encounterTitle: 'Forest of Death: Dojutsu Clash',
      },
    ],
  },
  {
    id: 'arc2_fortress',
    arcTitle: 'Campaign Arc II: The Rogue Stronghold',
    chapterTitle: 'Infiltration of the Iron Bastion',
    imageKey: 'forest',
    narrativeText: `Deep within the borderlands lies the fortified outpost of a rogue ninja splinter cell. Ancient forbidden scroll chambers are protected behind reinforced mud barricades and patrol dogs. 

An impending sandstorm is sweeping across the valley, limiting projectile range and obscuring lines of sight. Elite jonin and summoned hydra beasts guard the inner courtyard.`,
    choices: [
      {
        label: 'A. Erect an Earth Wall (Doryuheki) Forward Siege Line',
        consequenceText: 'You slam your palms down to summon stone ramparts, advancing methodically behind three-quarters cover while repelling shuriken barrages.',
        bonusEffect: 'Permanent +2 AC cover bonus on first 2 rounds.',
        weather: 'Sandstorm',
        enemyType: 'rogue_squad',
        encounterTitle: 'Fortress Breach: Earthen Ramparts',
      },
      {
        label: 'B. Cast Genjutsu: Temple of Nirvana into the Guard Quarters',
        consequenceText: 'Ethereal white feathers drift into their ranks, confusing their sensory networks and sowing psychic disorientation.',
        bonusEffect: 'Enemy takes psychic trauma and cannot take reactions on round 1.',
        weather: 'Clear',
        enemyType: 'giant_beast',
        encounterTitle: 'Fortress Depths: The Orochi Hydra Awakes',
      },
      {
        label: 'C. Seize the Forbidden Clan Scroll in Secret',
        consequenceText: 'You bypass the perimeter guards and unlock an ancestral cache, supercharging your cellular chakra reserves before the hydra awakens!',
        bonusEffect: 'Your starting Chakra is increased by +10.',
        weather: 'Scorching Drought',
        enemyType: 'giant_beast',
        encounterTitle: 'Secret Cache: Hydra of the Dunes',
      },
    ],
  },
  {
    id: 'arc3_titan',
    arcTitle: 'Campaign Arc III: Clash of Titans',
    chapterTitle: 'Wrath of the Rampaging Tailed Beast',
    imageKey: 'titan',
    narrativeText: `The earth shudders violently as a colossal 50-foot Tailed Beast Avatar manifests in the village crater! Lightning forks across the blood-red sky, and entire stone fortifications shatter under its titanic sweeping tails.

This is a cataclysmic S-Rank emergency. You must coordinate elemental terrain advantages, construct earth walls to absorb tectonic shockwaves, and unleash your ultimate signature jutsu to seal the titan!`,
    choices: [
      {
        label: 'A. Mobilize Full Earth Defense: Construct Massive Barricades',
        consequenceText: 'You focus all chakra into fortifying perimeter earth walls, dampening the titan’s sweeping tail impacts.',
        bonusEffect: 'All earth structures on the grid start with doubled hit points.',
        weather: 'Downpour',
        enemyType: 'titanic_threat',
        encounterTitle: 'Titanic Siege: Barrier Defense',
      },
      {
        label: 'B. Unleash Ultimate S-Rank Jutsu: Full Force Decisive Strike',
        consequenceText: 'Gathering all available chakra into an overwhelming S-rank vortex, you leap into the crater for a direct clash of titans!',
        bonusEffect: 'Your Ultimate Jutsu cost is reduced by 2 Chakra.',
        weather: 'Scorching Drought',
        enemyType: 'titanic_threat',
        encounterTitle: 'Titanic Clash: Kurama Avatar Decisive Duel',
      },
      {
        label: 'C. Channel Clan Fuinjutsu: Adamantine Sealing Formation',
        consequenceText: 'Summoning ancestral chakra chains and binding seals to pin the colossal beast in place for a joint sealing strike!',
        bonusEffect: 'The Titan’s movement is slowed and its DC saves have disadvantage.',
        weather: 'Clear',
        enemyType: 'titanic_threat',
        encounterTitle: 'Titanic Cataclysm: The Grand Sealing Array',
      },
    ],
  },
];

export const CampaignMode: React.FC<CampaignModeProps> = ({
  playerCharacter,
  onLaunchBattle,
  onBackToCreator,
}) => {
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(0);
  const [chosenOption, setChosenOption] = useState<number | null>(null);

  const currentNode = CAMPAIGN_STORY_NODES[selectedNodeIndex];

  // Image assets based on selection
  const imageMap = {
    forest: '/src/assets/images/shinobi_campaign_forest_backdrop_1791702689788.jpg',
    titan: '/src/assets/images/shinobi_titanic_beast_backdrop_1791702699652.jpg',
    creator: '/src/assets/images/shinobi_character_creator_backdrop_1791702680560.jpg',
  };

  const handleSelectChoice = (idx: number) => {
    soundManager.playSelect();
    setChosenOption(idx);
  };

  const handleProceedToBattle = () => {
    if (chosenOption === null) return;
    const choice = currentNode.choices[chosenOption];
    soundManager.playCriticalHit();

    onLaunchBattle({
      title: choice.encounterTitle,
      description: choice.consequenceText,
      enemyType: choice.enemyType,
      weather: choice.weather,
    });
  };

  return (
    <div className="min-w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-cyan-400">Shinobi D&D 5e Campaign</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Narrative Branching & Quest Arcs</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToCreator}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Edit Character Sheet
          </button>
        </div>
      </div>

      {/* Campaign Arcs Navigator Tabs */}
      <div className="max-w-6xl mx-auto w-full px-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CAMPAIGN_STORY_NODES.map((node, idx) => (
            <button
              key={node.id}
              type="button"
              onClick={() => {
                soundManager.playSelect();
                setSelectedNodeIndex(idx);
                setChosenOption(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition ${
                selectedNodeIndex === idx
                  ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-semibold mb-0.5">
                {node.arcTitle}
              </div>
              <div className="text-sm font-bold text-white truncate">{node.chapterTitle}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Narrative Card with Backdrop Image */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cinematic Image & Lore */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl h-72 sm:h-80 bg-slate-900">
            <img
              src={imageMap[currentNode.imageKey]}
              alt={currentNode.chapterTitle}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded-sm">
                {currentNode.arcTitle}
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1">{currentNode.chapterTitle}</h2>
            </div>
          </div>

          {/* Narrative Prose */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3 leading-relaxed text-sm text-slate-300">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" /> Tactical Briefing
            </div>
            <p className="whitespace-pre-line text-slate-200">{currentNode.narrativeText}</p>
          </div>
        </div>

        {/* Right: Branching Tactical Decisions */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Branching Decision Point
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">Select Your Tactical Approach</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your decision alters battlefield hazards, destructible elements, weather, and enemy encounters.
            </p>
          </div>

          {/* Decision Options */}
          <div className="space-y-3 flex-1">
            {currentNode.choices.map((choice, idx) => {
              const isSelected = chosenOption === idx;
              return (
                <div
                  key={choice.label}
                  onClick={() => handleSelectChoice(idx)}
                  className={`cursor-pointer rounded-xl p-3.5 border transition ${
                    isSelected
                      ? 'bg-cyan-950/50 border-cyan-400 ring-2 ring-cyan-500/50'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-white mb-1 leading-snug">{choice.label}</div>
                  <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{choice.consequenceText}</p>
                  {choice.bonusEffect && (
                    <div className="text-[10px] font-mono text-emerald-300 bg-slate-900/90 p-1.5 rounded-md border border-slate-800">
                      Bonus: {choice.bonusEffect}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Weather: {choice.weather}</span>
                    <span className="text-amber-400 font-semibold">{choice.encounterTitle}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Deploy Action */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={chosenOption === null}
              onClick={handleProceedToBattle}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
                chosenOption !== null
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-900/50 active:scale-98 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Deploy to 2D Sprite Grid</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
