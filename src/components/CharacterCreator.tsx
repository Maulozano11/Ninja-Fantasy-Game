import React, { useState } from 'react';
import {
  ShinobiCharacter,
  ClanType,
  DojutsuType,
  HairstyleType,
  ArmorStyleType,
  HeadbandPositionType,
  WeaponStyleType,
  CapeStyleType,
  ShinobiClassType,
  AbilityScores,
} from '../types/shinobi';
import {
  CLANS_DATA,
  SHINOBI_CLASSES,
  SHINOBI_FEATS,
  JUTSUS_DATA,
  HAIRSTYLES,
  ARMOR_STYLES,
  COLOR_PALETTES,
  WEAPON_STYLES,
  CAPE_STYLES,
  LEGENDARY_PRESETS,
  DEFAULT_CHARACTER,
} from '../data/shinobiData';
import { ShinobiSpriteCanvas } from './ShinobiSpriteCanvas';
import { soundManager } from '../utils/audio';
import { Sparkles, Dice5, Download, Upload, Shield, Zap, Eye, Swords, BookOpen, UserCheck } from 'lucide-react';

interface CharacterCreatorProps {
  initialCharacter?: ShinobiCharacter;
  onSave: (char: ShinobiCharacter) => void;
  onCancel?: () => void;
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  initialCharacter = DEFAULT_CHARACTER,
  onSave,
  onCancel,
}) => {
  const [character, setCharacter] = useState<ShinobiCharacter>(initialCharacter);
  const [activeTab, setActiveTab] = useState<'identity' | 'appearance' | 'stats' | 'jutsus'>('identity');
  const [previewStance, setPreviewStance] = useState<'idle' | 'handsigns' | 'attack' | 'cast' | 'hurt' | 'victory'>('idle');
  const [previewZoom, setPreviewZoom] = useState<number>(256);
  const [renderEngine, setRenderEngine] = useState<'pixel' | 'jrpg_16bit'>('jrpg_16bit');
  const [previewEnhanced, setPreviewEnhanced] = useState<boolean>(false);
  const [importExportModal, setImportExportModal] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');

  // Recompute derived stats whenever stats, clan, class or armor change
  const calculateDerived = (
    stats: AbilityScores,
    clan: ClanType,
    cls: ShinobiClassType,
    armor: ArmorStyleType,
    feats: string[]
  ) => {
    const classInfo = SHINOBI_CLASSES[cls];
    const castStatMod = Math.floor((stats[classInfo.castingStat] - 10) / 2);
    const conMod = Math.floor((stats.con - 10) / 2);
    const dexMod = Math.floor((stats.dex - 10) / 2);
    const profBonus = 2; // Level 3 standard proficiency

    // Armor AC
    const selectedArmor = ARMOR_STYLES.find((a) => a.id === armor);
    const armorAC = selectedArmor ? selectedArmor.acBonus : 2;
    const ironSkinBonus = feats.includes('iron_skin') ? 1 : 0;
    const baseAC = 10 + dexMod + armorAC + ironSkinBonus;

    // HP calculation
    let maxHp = classInfo.hitDie + conMod + (character.level - 1) * (Math.floor(classInfo.hitDie / 2) + 1 + conMod);
    if (clan === 'Senju') maxHp += 6;

    // Chakra calculation
    const hasChakraProdigy = feats.includes('chakra_prodigy');
    let maxChakra = character.level * (Math.floor(classInfo.chakraDie / 2) + 2) + Math.max(1, conMod);
    if (clan === 'Uzumaki') maxChakra = Math.floor(maxChakra * 1.25);
    if (hasChakraProdigy) maxChakra += 4;

    const jutsuSaveDC = 8 + profBonus + castStatMod;
    const jutsuAttackBonus = profBonus + castStatMod;

    return {
      maxHp: Math.max(15, maxHp),
      currentHp: Math.max(15, maxHp),
      maxChakra: Math.max(12, maxChakra),
      currentChakra: Math.max(12, maxChakra),
      armorClass: Math.max(10, baseAC),
      speed: armor === 'Ronin Wanderer Cloak' ? 7 : 6,
      jutsuSaveDC,
      jutsuAttackBonus,
    };
  };

  const handleClanChange = (newClan: ClanType) => {
    soundManager.playSelect();
    const clanInfo = CLANS_DATA[newClan];
    const newDojutsu = clanInfo.availableDojutsu[0];
    const newAura = clanInfo.recommendedChakraColor;
    const newJutsus = { ...character.selectedJutsus, slot4Clan: clanInfo.signatureJutsuId };

    const derived = calculateDerived(
      character.stats,
      newClan,
      character.shinobiClass,
      character.armorStyle,
      character.selectedFeats
    );

    setCharacter({
      ...character,
      clan: newClan,
      dojutsu: newDojutsu,
      palette: {
        ...character.palette,
        chakraAuraColor: newAura,
        eyeColor: newDojutsu.includes('Sharingan') ? '#ef4444' : newDojutsu.includes('Byakugan') ? '#e0e7ff' : character.palette.eyeColor,
      },
      selectedJutsus: newJutsus,
      ...derived,
    });
  };

  const handleClassChange = (newClass: ShinobiClassType) => {
    soundManager.playSelect();
    const derived = calculateDerived(
      character.stats,
      character.clan,
      newClass,
      character.armorStyle,
      character.selectedFeats
    );
    setCharacter({
      ...character,
      shinobiClass: newClass,
      ...derived,
    });
  };

  const handleStatChange = (stat: keyof AbilityScores, delta: number) => {
    soundManager.playSelect();
    const currentVal = character.stats[stat];
    const newVal = Math.min(18, Math.max(8, currentVal + delta));
    const newStats = { ...character.stats, [stat]: newVal };

    const derived = calculateDerived(
      newStats,
      character.clan,
      character.shinobiClass,
      character.armorStyle,
      character.selectedFeats
    );

    setCharacter({
      ...character,
      stats: newStats,
      ...derived,
    });
  };

  const handleFeatToggle = (featId: string) => {
    soundManager.playSelect();
    let newFeats: string[];
    if (character.selectedFeats.includes(featId)) {
      newFeats = character.selectedFeats.filter((f) => f !== featId);
    } else {
      if (character.selectedFeats.length >= 3) return; // max 3 feats
      newFeats = [...character.selectedFeats, featId];
    }

    const derived = calculateDerived(
      character.stats,
      character.clan,
      character.shinobiClass,
      character.armorStyle,
      newFeats
    );

    setCharacter({
      ...character,
      selectedFeats: newFeats,
      ...derived,
    });
  };

  const handleRandomize = () => {
    soundManager.playSelect();
    const clans: ClanType[] = ['Uchiha', 'Senju', 'Uzumaki', 'Hyuga'];
    const randomClan = clans[Math.floor(Math.random() * clans.length)];
    const clanInfo = CLANS_DATA[randomClan];

    const randomClass = (Object.keys(SHINOBI_CLASSES) as ShinobiClassType[])[
      Math.floor(Math.random() * Object.keys(SHINOBI_CLASSES).length)
    ];

    const randomHair = HAIRSTYLES[Math.floor(Math.random() * HAIRSTYLES.length)];
    const randomArmor = ARMOR_STYLES[Math.floor(Math.random() * ARMOR_STYLES.length)].id;
    const randomDojutsu = clanInfo.availableDojutsu[Math.floor(Math.random() * clanInfo.availableDojutsu.length)];

    const randomSkin = COLOR_PALETTES.skinTones[Math.floor(Math.random() * COLOR_PALETTES.skinTones.length)].value;
    const randomHairColor = COLOR_PALETTES.hairColors[Math.floor(Math.random() * COLOR_PALETTES.hairColors.length)].value;
    const randomArmorCol = COLOR_PALETTES.armorColors[Math.floor(Math.random() * COLOR_PALETTES.armorColors.length)].value;

    const randomizedStats: AbilityScores = {
      str: 10 + Math.floor(Math.random() * 6),
      dex: 12 + Math.floor(Math.random() * 6),
      con: 12 + Math.floor(Math.random() * 5),
      int: 10 + Math.floor(Math.random() * 6),
      wis: 10 + Math.floor(Math.random() * 5),
      cha: 10 + Math.floor(Math.random() * 5),
    };

    const derived = calculateDerived(
      randomizedStats,
      randomClan,
      randomClass,
      randomArmor,
      ['chakra_prodigy', 'iron_skin']
    );

    setCharacter({
      ...character,
      name: ['Kaito', 'Ren', 'Sasori', 'Ayame', 'Shino', 'Hana', 'Raijin', 'Kuro'][Math.floor(Math.random() * 8)],
      clan: randomClan,
      shinobiClass: randomClass,
      hairstyle: randomHair,
      armorStyle: randomArmor,
      dojutsu: randomDojutsu,
      stats: randomizedStats,
      palette: {
        ...character.palette,
        skinTone: randomSkin,
        hairColor: randomHairColor,
        armorPrimary: randomArmorCol,
        chakraAuraColor: clanInfo.recommendedChakraColor,
      },
      ...derived,
    });
  };

  const handleExport = () => {
    const jsonStr = JSON.stringify(character, null, 2);
    setImportJsonText(jsonStr);
    setImportExportModal(true);
  };

  const handleImportApply = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed.clan && parsed.stats) {
        setCharacter(parsed);
        setImportExportModal(false);
        soundManager.playSelect();
      }
    } catch {
      // ignore parse error
    }
  };

  // Filtered Jutsus
  const utilityJutsus = JUTSUS_DATA.filter((j) => j.category === 'Utility');
  const elementalJutsus = JUTSUS_DATA.filter((j) => j.category === 'Elemental');
  const clanJutsus = JUTSUS_DATA.filter((j) => j.category === 'Clan' && (!j.requiredClan || j.requiredClan === character.clan));
  const ultimateJutsus = JUTSUS_DATA.filter((j) => j.category === 'Ultimate');

  return (
    <div className="relative min-w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner Bar */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-cyan-400">Shinobi 5e Forge</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Custom Shinobi Character Creation</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Dice5 className="w-3.5 h-3.5 text-amber-400" />
            Randomize Shinobi
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export / Import JSON
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundManager.playCriticalHit();
              onSave(character);
            }}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-950 transition active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            Enter Battlefield
          </button>
        </div>
      </div>

      {/* Main Workspace: Left 2D Sprite Showcase, Right Editor Tabs */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN: 2D SPRITE VISUALIZER & LIVE COMBAT STAT CARD */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Sprite Stage Card */}
          <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 flex flex-col items-center justify-center overflow-hidden shadow-xl">
            {/* Ambient clan lighting */}
            <div
              className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: character.palette.chakraAuraColor }}
            />

            {/* Header controls: Engine selector, Zoom buttons, Chakra Burst */}
            <div className="w-full flex flex-wrap items-center justify-between mb-3 gap-2">
              {/* Style Engine Selector */}
              <div className="flex items-center gap-1 bg-slate-950/90 rounded-lg p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRenderEngine('jrpg_16bit')}
                  className={`text-xs px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                    renderEngine === 'jrpg_16bit'
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-950/50 ring-1 ring-cyan-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  16-Bit JRPG Pro (64px)
                </button>
                <button
                  type="button"
                  onClick={() => setRenderEngine('pixel')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                    renderEngine === 'pixel'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md ring-1 ring-emerald-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Classic Retro (128px)
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom buttons */}
                <div className="flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700 text-[10px] font-mono">
                  {([128, 256, 384, 512] as const).map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setPreviewZoom(z)}
                      className={`px-1.5 py-0.5 rounded transition ${
                        previewZoom === z
                          ? 'bg-cyan-500 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {z === 128 ? '1x' : z === 256 ? '2x' : z === 384 ? '3x' : '4x'}
                    </button>
                  ))}
                </div>

                {/* Chakra Burst Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playChakraSurge();
                    setPreviewEnhanced(!previewEnhanced);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md font-mono border transition ${
                    previewEnhanced
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Chakra: {previewEnhanced ? 'BURST' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Interactive 2D Sprite Showcase with dynamic crisp scaling */}
            <div className="relative my-2 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl flex items-center justify-center min-h-[300px]">
              {/* Isometric Perspective Indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                  Angle: South-East (26.5° 3/4)
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900/80 text-cyan-400 border border-slate-800">
                  {renderEngine === 'jrpg_16bit'
                    ? 'Proportion: 16-Bit JRPG Pro (4.5–5 Head)'
                    : 'Proportion: 2.5–3 Head Chibi'}
                </span>
              </div>

              <ShinobiSpriteCanvas
                character={character}
                stance={previewStance}
                size={previewZoom}
                isEnhanced={previewEnhanced}
                showAura={true}
                renderEngine={renderEngine}
              />
            </div>

            {/* Stance Selector - Full 6 Animation Stances */}
            <div className="w-full mt-1 mb-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 text-center mb-1.5 font-medium">
                Sprite Animation Stances
              </div>
              <div className="grid grid-cols-6 gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
                {(['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory'] as const).map((stance) => (
                  <button
                    key={stance}
                    type="button"
                    onClick={() => {
                      soundManager.playSelect();
                      setPreviewStance(stance);
                    }}
                    className={`py-1 text-[10px] font-medium rounded-md capitalize transition ${
                      previewStance === stance
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {stance}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick-Pick Legendary Shinobi Presets */}
            <div className="w-full pt-3 border-t border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Legendary Shinobi Presets
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LEGENDARY_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      soundManager.playCriticalHit();
                      setCharacter(preset.character);
                    }}
                    className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 text-left transition"
                  >
                    <div className="text-xs font-bold text-white truncate">{preset.name}</div>
                    <div className="text-[10px] text-cyan-400 font-mono truncate">{preset.tag}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Naruto 5e Combat Sheet Summary Card */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{character.name || 'Unnamed Shinobi'}</h2>
                <div className="text-xs text-slate-400">
                  {character.clan} Clan · {character.shinobiClass} · Level {character.level}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs px-2 py-0.5 rounded-sm bg-slate-800 text-amber-300 font-mono border border-slate-700">
                  AC {character.armorClass}
                </span>
              </div>
            </div>

            {/* Health & Chakra Pools */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[10px] uppercase tracking-wider text-rose-400 font-bold mb-0.5">
                  Hit Points (HP)
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {character.maxHp} <span className="text-xs text-slate-500 font-normal">/ {character.maxHp}</span>
                </div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-0.5">
                  Chakra Capacity
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {character.maxChakra}{' '}
                  <span className="text-xs text-slate-500 font-normal">/ {character.maxChakra}</span>
                </div>
              </div>
            </div>

            {/* 5e Combat Attributes */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Jutsu DC</div>
                <div className="font-bold text-cyan-400 text-base font-mono">{character.jutsuSaveDC}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Atk Bonus</div>
                <div className="font-bold text-amber-400 text-base font-mono">+{character.jutsuAttackBonus}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Speed</div>
                <div className="font-bold text-emerald-400 text-base font-mono">{character.speed} tiles</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Dojutsu</div>
                <div className="font-bold text-rose-400 text-[11px] truncate">{character.dojutsu}</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: EDITOR TABS */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1">
            {[
              { id: 'identity', label: '1. Clan & Identity', icon: Eye },
              { id: 'appearance', label: '2. Sprite & Colors', icon: Shield },
              { id: 'stats', label: '3. Stats & Class', icon: Swords },
              { id: 'jutsus', label: '4. Jutsu Loadout (5 Slots)', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundManager.playSelect();
                    setActiveTab(tab.id as typeof activeTab);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 p-6 overflow-y-auto max-h-[720px] space-y-6">
            {/* TAB 1: CLAN & IDENTITY */}
            {activeTab === 'identity' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Shinobi Name
                  </label>
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-hidden focus:border-cyan-500 font-medium"
                    placeholder="e.g. Renjiro, Sasori, Hanabi..."
                  />
                </div>

                {/* Clan Picker */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                    Noble Clan Heritage
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(CLANS_DATA) as ClanType[]).map((clanKey) => {
                      const clan = CLANS_DATA[clanKey];
                      const isSelected = character.clan === clanKey;
                      return (
                        <div
                          key={clanKey}
                          onClick={() => handleClanChange(clanKey)}
                          className={`cursor-pointer rounded-xl p-4 border transition ${
                            isSelected
                              ? 'bg-cyan-950/30 border-cyan-500 ring-1 ring-cyan-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-base">{clan.name}</span>
                            <span className="text-xs font-mono text-slate-400">{clan.japaneseName}</span>
                          </div>
                          <p className="text-xs text-slate-300 mb-2 leading-relaxed">{clan.description}</p>
                          <div className="text-[11px] text-cyan-400 font-mono bg-slate-900/80 p-2 rounded-md border border-slate-800">
                            {clan.lineageTraits}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dojutsu Selection */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                    Dojutsu / Visual Prowess
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CLANS_DATA[character.clan].availableDojutsu.map((doj) => (
                      <button
                        key={doj}
                        type="button"
                        onClick={() => {
                          soundManager.playSelect();
                          setCharacter({
                            ...character,
                            dojutsu: doj,
                            palette: {
                              ...character.palette,
                              eyeColor: doj.includes('Sharingan')
                                ? '#ef4444'
                                : doj.includes('Byakugan')
                                ? '#e0e7ff'
                                : character.palette.eyeColor,
                            },
                          });
                        }}
                        className={`p-2.5 text-xs text-left rounded-lg border transition ${
                          character.dojutsu === doj
                            ? 'bg-rose-950/40 border-rose-500 text-rose-200 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {doj}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headband Placement */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                    Forehead Protector Placement
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(['Forehead', 'Neck', 'Arm', 'Waist', 'Rogue Scratched'] as HeadbandPositionType[]).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          soundManager.playSelect();
                          setCharacter({ ...character, headbandPosition: pos });
                        }}
                        className={`py-2 px-2 text-xs text-center rounded-lg border transition ${
                          character.headbandPosition === pos
                            ? 'bg-cyan-600 text-white font-semibold border-cyan-500'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE & PALETTE */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                {/* Hairstyle Selection */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                    Hairstyle (Naruto & Final Fantasy Inspirations)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HAIRSTYLES.map((hair) => (
                      <button
                        key={hair}
                        type="button"
                        onClick={() => {
                          soundManager.playSelect();
                          setCharacter({ ...character, hairstyle: hair });
                        }}
                        className={`p-2 text-xs text-left rounded-lg border transition truncate ${
                          character.hairstyle === hair
                            ? 'bg-cyan-600 text-white font-semibold border-cyan-500'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {hair}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Armor Styles */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                    Shinobi Armor & Ancient Warrior Plate
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ARMOR_STYLES.map((arm) => (
                      <button
                        key={arm.id}
                        type="button"
                        onClick={() => {
                          soundManager.playSelect();
                          const derived = calculateDerived(
                            character.stats,
                            character.clan,
                            character.shinobiClass,
                            arm.id,
                            character.selectedFeats
                          );
                          setCharacter({
                            ...character,
                            armorStyle: arm.id,
                            ...derived,
                          });
                        }}
                        className={`p-3 text-left rounded-xl border transition ${
                          character.armorStyle === arm.id
                            ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white text-xs mb-0.5">{arm.label}</div>
                        <div className="text-[11px] text-slate-400">{arm.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hand-Held Technique / Weapon (Rasengan, Chidori, Katana, Kunai) */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                    Active Hand-Held Technique & Combat Weapon
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {WEAPON_STYLES.map((wep) => (
                      <button
                        key={wep.id}
                        type="button"
                        onClick={() => {
                          soundManager.playSelect();
                          setCharacter({ ...character, weaponStyle: wep.id });
                        }}
                        className={`p-3 text-left rounded-xl border transition ${
                          character.weaponStyle === wep.id
                            ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white text-xs mb-0.5">{wep.label}</div>
                        <div className="text-[11px] text-slate-400">{wep.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cape / Mantle / Shimenawa Rope Belt */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                    Mantle, Cape & Shimenawa Rope Belt
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CAPE_STYLES.map((cape) => (
                      <button
                        key={cape.id}
                        type="button"
                        onClick={() => {
                          soundManager.playSelect();
                          setCharacter({ ...character, capeStyle: cape.id });
                        }}
                        className={`p-3 text-left rounded-xl border transition ${
                          character.capeStyle === cape.id
                            ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white text-xs mb-0.5">{cape.label}</div>
                        <div className="text-[11px] text-slate-400">{cape.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Palettes Grid */}
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Color Customization</h3>

                  {/* Skin Tone */}
                  <div>
                    <div className="text-xs text-slate-300 mb-1.5">Skin Tone</div>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTES.skinTones.map((skin) => (
                        <button
                          key={skin.value}
                          type="button"
                          onClick={() => setCharacter({ ...character, palette: { ...character.palette, skinTone: skin.value } })}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            character.palette.skinTone === skin.value ? 'scale-110 border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: skin.value }}
                          title={skin.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hair Color */}
                  <div>
                    <div className="text-xs text-slate-300 mb-1.5">Hair Color</div>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTES.hairColors.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => setCharacter({ ...character, palette: { ...character.palette, hairColor: col.value } })}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            character.palette.hairColor === col.value ? 'scale-110 border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Chakra Aura Color */}
                  <div>
                    <div className="text-xs text-slate-300 mb-1.5">Chakra Flame Aura</div>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTES.chakraColors.map((aura) => (
                        <button
                          key={aura.value}
                          type="button"
                          onClick={() => setCharacter({ ...character, palette: { ...character.palette, chakraAuraColor: aura.value } })}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            character.palette.chakraAuraColor === aura.value ? 'scale-110 border-white shadow-lg' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: aura.value }}
                          title={aura.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Armor Primary Color */}
                  <div>
                    <div className="text-xs text-slate-300 mb-1.5">Armor Primary Color</div>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTES.armorColors.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => setCharacter({ ...character, palette: { ...character.palette, armorPrimary: col.value } })}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            character.palette.armorPrimary === col.value ? 'scale-110 border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Pants / Cloth Color */}
                  <div>
                    <div className="text-xs text-slate-300 mb-1.5">Cloth & Under-Tunic Color</div>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTES.clothingColors.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => setCharacter({ ...character, palette: { ...character.palette, clothColor: col.value } })}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            character.palette.clothColor === col.value ? 'scale-110 border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Cape / Mantle Color (Like the Crimson Cape in reference!) */}
                  <div>
                    <div className="text-xs text-slate-300 mb-1.5">Cape & Mantle Color</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Deep Crimson (From Image)', value: '#881337' },
                        { label: 'Blood Red', value: '#dc2626' },
                        { label: 'Royal Midnight Navy', value: '#1e1b4b' },
                        { label: 'Obsidian Black', value: '#09090b' },
                        { label: 'Imperial Gold', value: '#b45309' },
                        { label: 'Emerald Forest', value: '#065f46' },
                        { label: 'Storm Slate', value: '#475569' },
                        { label: 'Snow White', value: '#f8fafc' },
                        { label: 'Royal Purple', value: '#581c87' },
                      ].map((capeCol) => (
                        <button
                          key={capeCol.value}
                          type="button"
                          onClick={() => setCharacter({ ...character, palette: { ...character.palette, capeColor: capeCol.value } })}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            (character.palette.capeColor || '#881337') === capeCol.value ? 'scale-110 border-white shadow-md' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: capeCol.value }}
                          title={capeCol.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STATS & CLASS & FEATS */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* Shinobi Class */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                    Shinobi Class Archetype (Naruto 5e Playbook)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(SHINOBI_CLASSES) as ShinobiClassType[]).map((clsKey) => {
                      const cls = SHINOBI_CLASSES[clsKey];
                      const isSelected = character.shinobiClass === clsKey;
                      return (
                        <div
                          key={clsKey}
                          onClick={() => handleClassChange(clsKey)}
                          className={`cursor-pointer rounded-xl p-3.5 border transition ${
                            isSelected
                              ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-xs">{cls.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-slate-800 text-cyan-300">
                              Cast: {cls.castingStat.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{cls.description}</p>
                          <div className="text-[10px] text-amber-300 font-mono bg-slate-900 p-1.5 rounded-md border border-slate-800">
                            {cls.classFeatures}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5e Ability Scores Allocation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Ability Scores (D&D 5e Standard Array / Point Buy)
                    </label>
                    <span className="text-xs text-slate-400 font-mono">Modifiers calculated live</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as (keyof AbilityScores)[]).map((stat) => {
                      const val = character.stats[stat];
                      const mod = Math.floor((val - 10) / 2);
                      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                      return (
                        <div
                          key={stat}
                          className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-[11px] uppercase font-mono text-slate-400 font-semibold">{stat}</div>
                            <div className="text-lg font-bold text-white font-mono">{val}</div>
                            <div className="text-[10px] text-cyan-400 font-mono font-medium">Mod: {modStr}</div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatChange(stat, 1)}
                              className="w-7 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatChange(stat, -1)}
                              className="w-7 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition"
                            >
                              -
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Feats Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Shinobi Feats & Talents (Select up to 3)
                    </label>
                    <span className="text-xs text-slate-400 font-mono">
                      {character.selectedFeats.length} / 3 Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SHINOBI_FEATS.map((feat) => {
                      const isSelected = character.selectedFeats.includes(feat.id);
                      return (
                        <div
                          key={feat.id}
                          onClick={() => handleFeatToggle(feat.id)}
                          className={`cursor-pointer p-3 rounded-xl border transition ${
                            isSelected
                              ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-white text-xs">{feat.name}</span>
                            {isSelected && <span className="text-[10px] text-cyan-400 font-mono font-bold">ACTIVE</span>}
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{feat.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: JUTSU LOADOUT (5 SLOTS) */}
            {activeTab === 'jutsus' && (
              <div className="space-y-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" /> 5-Slot Tactical Jutsu System
                  </div>
                  Your loadout includes <strong className="text-white">1 Utility Technique</strong>,{' '}
                  <strong className="text-white">2 Elemental Core Techniques</strong> (Fire, Water, Earth, Wind, Lightning, Taijutsu, Genjutsu),{' '}
                  <strong className="text-white">1 Clan Signature Secret</strong>, and{' '}
                  <strong className="text-white">1 S-Rank Ultimate Finisher</strong>. All techniques can be empowered during combat using Jutsu Enhancement!
                </div>

                {/* SLOT 1: UTILITY */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                    <span>Slot 1: Utility Jutsu</span>
                    <span className="text-[10px] text-slate-400 font-normal">Clones, Teleportation, Traps, Medical</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {utilityJutsus.map((jutsu) => {
                      const isSelected = character.selectedJutsus.slot1Utility === jutsu.id;
                      return (
                        <div
                          key={jutsu.id}
                          onClick={() => {
                            soundManager.playSelect();
                            setCharacter({
                              ...character,
                              selectedJutsus: { ...character.selectedJutsus, slot1Utility: jutsu.id },
                            });
                          }}
                          className={`cursor-pointer p-3 rounded-xl border transition ${
                            isSelected
                              ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-white text-xs">{jutsu.name}</span>
                            <span className="text-[10px] font-mono text-cyan-400">{jutsu.chakraCost} Chakra</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mb-1">{jutsu.japaneseName}</div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{jutsu.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SLOT 2 & 3: ELEMENTAL CORE */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                    <span>Slots 2 & 3: Elemental / Core Jutsus (Ranks D to A)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Interactive & Destructible Environment Powers</span>
                  </div>

                  {/* Slot 2 selector */}
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Elemental Technique A:</label>
                    <select
                      value={character.selectedJutsus.slot2Elemental}
                      onChange={(e) => {
                        soundManager.playSelect();
                        setCharacter({
                          ...character,
                          selectedJutsus: { ...character.selectedJutsus, slot2Elemental: e.target.value },
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    >
                      {elementalJutsus.map((j) => (
                        <option key={j.id} value={j.id}>
                          [{j.nature} · Rank {j.rank}] {j.name} ({j.chakraCost} Chakra · {j.damageDice || 'Barrier'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Slot 3 selector */}
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Elemental Technique B:</label>
                    <select
                      value={character.selectedJutsus.slot3Elemental}
                      onChange={(e) => {
                        soundManager.playSelect();
                        setCharacter({
                          ...character,
                          selectedJutsus: { ...character.selectedJutsus, slot3Elemental: e.target.value },
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    >
                      {elementalJutsus.map((j) => (
                        <option key={j.id} value={j.id}>
                          [{j.nature} · Rank {j.rank}] {j.name} ({j.chakraCost} Chakra · {j.damageDice || 'Barrier'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SLOT 4: CLAN SIGNATURE */}
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between">
                    <span>Slot 4: Clan Heritage Secret</span>
                    <span className="text-[10px] text-slate-400 font-normal">{character.clan} Lineage Arts</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {clanJutsus.map((jutsu) => (
                      <div
                        key={jutsu.id}
                        className="p-3 rounded-xl border bg-rose-950/20 border-rose-500/60 text-xs text-slate-200"
                      >
                        <div className="flex items-center justify-between font-bold text-white mb-0.5">
                          <span>{jutsu.name}</span>
                          <span className="text-cyan-400 font-mono">{jutsu.chakraCost} Chakra</span>
                        </div>
                        <div className="text-[10px] font-mono text-rose-300 mb-1">{jutsu.japaneseName}</div>
                        <p className="text-[11px] text-slate-300">{jutsu.description}</p>
                        <div className="mt-2 text-[10px] font-mono text-amber-300 bg-black/40 p-1.5 rounded-sm">
                          ⚡ Enhancement: {jutsu.enhancementEffect}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SLOT 5: ULTIMATE S-RANK */}
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
                    <span>Slot 5: Ultimate S-Rank Finisher</span>
                    <span className="text-[10px] text-slate-400 font-normal">Titanic Devastation (8 Chakra)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ultimateJutsus.map((jutsu) => {
                      const isSelected = character.selectedJutsus.slot5Ultimate === jutsu.id;
                      return (
                        <div
                          key={jutsu.id}
                          onClick={() => {
                            soundManager.playSelect();
                            setCharacter({
                              ...character,
                              selectedJutsus: { ...character.selectedJutsus, slot5Ultimate: jutsu.id },
                            });
                          }}
                          className={`cursor-pointer p-3 rounded-xl border transition ${
                            isSelected
                              ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-white text-xs">{jutsu.name}</span>
                            <span className="text-[10px] font-mono text-purple-300">Rank S</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mb-1">{jutsu.japaneseName}</div>
                          <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{jutsu.description}</p>
                          <div className="text-[10px] font-mono text-amber-300 bg-slate-900 p-1.5 rounded-md border border-slate-800">
                            Dice: {jutsu.damageDice} · {jutsu.damageType}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JSON Import/Export Modal */}
      {importExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Export / Import Shinobi Data</h3>
            <p className="text-xs text-slate-400">
              Copy this JSON to share your character build, or paste another character sheet and click Apply.
            </p>
            <textarea
              rows={12}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-hidden"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setImportExportModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleImportApply}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Apply Imported Character
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
