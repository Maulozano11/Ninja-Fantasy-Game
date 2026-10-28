// Casa: the hero at home between missions (docs/WORLD_DESIGN.md, step 1 of section 13), laid out
// after the owner's picture (docs/reference/casa-screen-owner-reference.png, 2026-10-28): a painted
// hall at night behind ornate black-and-gold panels; left, a hanging banner with the hero's name,
// clan and the season; then Riqueza (the fortune figure big, the level, a gold bar), Reputación
// (one row per faction: emblem, name, gold bar, an arrow and the level), the Crónica as a
// headline over a picture, and En casa with the portrait and two buttons: the red "Salir de
// misión" and the gold "Pasar la estación".
//
// The painted backdrop and the Chronicle picture are his HD-2D art when he paints them
// (src/assets/scenes/casa/backdrop.png, chronicle-*.png; tools/refs/template/TARJETA_DE_PROMPT.md 8):
// until then the panels sit on a dark gradient.

import React from 'react';
import { Coins, Compass, Scroll, Swords, Flag, Home as HomeIcon, Triangle, Diamond } from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import { fortune, reputationLevel, type CampaignState, type ReputationLevel } from '../../campaign/state';
import { SHINOBI_FACTIONS } from '../../settings/shinobi/factions';
import { originDef } from '../../settings/shinobi/origins';
import { CURRENCY, REPUTATION_NAMES, SEASON_NAMES, WEALTH_MEANS, WEALTH_NAMES } from '../../settings/shinobi/words';
import { clanName } from '../../data/shinobiData';
import { pick, strings, useLang } from '../../i18n';
import { LangToggle } from '../../i18n/LangToggle';
import { serif } from '../creator/stage';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { soundManager } from '../../utils/audio';

const T = strings({
  home: { en: 'Home', es: 'Casa' },
  season: { en: 'Season {n}', es: 'Temporada {n}' },
  yearSeason: { en: 'Year {year} · {season}', es: 'Año {year} · {season}' },
  wealth: { en: 'Wealth', es: 'Riqueza' },
  reputation: { en: 'Reputation', es: 'Reputación' },
  fame: { en: 'Fame', es: 'Fama' },
  household: { en: 'At home', es: 'En casa' },
  nobody: { en: 'Nobody lives with you yet.', es: 'Nadie vive contigo todavía.' },
  base: { en: 'Base tier {tier}', es: 'Base de nivel {tier}' },
  chronicle: { en: 'Chronicle', es: 'Crónica' },
  goMission: { en: 'Set out on a mission', es: 'Salir de misión' },
  goMissionSub: { en: 'A new chance', es: 'Nueva oportunidad' },
  passSeason: { en: 'Let the season pass', es: 'Pasar la estación' },
  passSeasonSub: { en: 'Clan business at home', es: 'Gestión del clan' },
  origin: { en: 'Origin', es: 'Origen' },
  noPast: { en: 'No past', es: 'Sin pasado' },
  level: { en: 'Lv. {n}', es: 'Nv. {n}' },
});

/** His painted hall and Chronicle pictures, when they exist. */
const ART = import.meta.glob('../../assets/scenes/casa/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const art = (name: string): string | undefined => Object.entries(ART).find(([k]) => k.endsWith(`/${name}.png`))?.[1];

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

/** An ornate panel: black over the painting, a thin gold line, a gold-lettered title with its icon. */
function Panel({ title, icon, children, className = '' }: { title?: React.ReactNode; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative border border-[#b8903f] bg-[#07060b]/85 shadow-[0_8px_30px_rgba(0,0,0,0.8)] ${className}`}>
      <div className="pointer-events-none absolute inset-[3px] border border-[#5a4320]" />
      {title && (
        <header className="relative flex items-center gap-2 px-4 pt-3 pb-1">
          <span className="text-[#f2c46d]">{icon}</span>
          <h2 style={serif} className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#f2c46d]">
            {title}
          </h2>
        </header>
      )}
      <div className="relative px-4 pb-4">{children}</div>
    </section>
  );
}

function GoldBar({ fraction }: { fraction: number }) {
  return (
    <div className="h-2.5 w-full border border-[#8a6a3a] bg-[#14110c]">
      <div className="h-full bg-[linear-gradient(180deg,#ffe08a,#c99a4b)]" style={{ width: `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` }} />
    </div>
  );
}

const TONE: Record<ReputationLevel, string> = { hostile: '#e0463c', cold: '#7a8ba3', neutral: '#b9a98a', friend: '#5ad06a', ally: '#4aa8ff' };

/** His arrows: up and green for Friend, up and blue for Ally, a grey diamond for Neutral, down and red below. */
function LevelMark({ level }: { level: ReputationLevel }) {
  const color = TONE[level];
  if (level === 'neutral') return <Diamond className="h-3.5 w-3.5" style={{ color }} fill={color} />;
  const down = level === 'hostile' || level === 'cold';
  return <Triangle className={`h-3.5 w-3.5 ${down ? 'rotate-180' : ''}`} style={{ color }} fill={color} />;
}

/** A faction's emblem: its initial in a gold ring until the owner draws the emblems. */
function Emblem({ letter, own }: { letter: string; own: boolean }) {
  return (
    <span style={serif} className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${own ? 'border-[#f2c46d] bg-[#5a4320] text-[#ffe08a]' : 'border-[#8a6a3a] bg-[#1a140c] text-[#d9b46a]'}`}>
      {letter}
    </span>
  );
}

export function HomeScreen({ hero, campaign, onMission, onPassSeason }: { hero: ShinobiCharacter; campaign: CampaignState; onMission: () => void; onPassSeason: () => void }) {
  useLang();
  const origin = originDef(campaign.originId);
  const season = SEASON_NAMES[campaign.time.season];
  const seasonNo = (campaign.time.year - 1) * 4 + campaign.time.season + 1;
  const [latest, ...older] = [...campaign.chronicle].reverse();
  const backdrop = art('backdrop');
  const chroniclePicture = art(`chronicle-${latest?.year ?? 1}-${latest?.season ?? 0}`) ?? art('chronicle');
  return (
    <div
      className="relative min-h-screen bg-[#0b0810] bg-cover bg-center"
      style={backdrop ? { backgroundImage: `url(${backdrop})` } : { backgroundImage: 'radial-gradient(ellipse at 50% 20%, #3a1a14 0%, #15100f 45%, #07060b 100%)' }}
    >
      <div className="absolute right-3 top-3 z-10">
        <LangToggle />
      </div>
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 pt-14 pb-8 md:px-6 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)_260px]">
        {/* the hanging banner */}
        <div className="relative mx-auto w-[170px] lg:mx-0">
          <div className="relative border-x-4 border-t-4 border-[#f2c46d] bg-[linear-gradient(180deg,#8a1a1a,#5a0f10)] px-3 pt-6 pb-10 text-center shadow-[0_12px_30px_rgba(0,0,0,0.8)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%)' }}>
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#f2c46d]/70 text-[#f2c46d]">
              <HomeIcon className="h-9 w-9" />
            </div>
            <div style={serif} className="text-2xl font-extrabold text-[#f2c46d] [text-shadow:0_2px_0_#000]">
              {hero.name}
            </div>
            <div style={serif} className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#ffe9b8]">
              {clanName(hero.clan)}
            </div>
            <div className="mx-auto mt-3 inline-block border border-[#f2c46d] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#f2c46d]">
              {T('season', { n: seasonNo })}
            </div>
          </div>
          <div className="mt-3 text-center text-[11px] text-[#d9c9a8]">
            {T('yearSeason', { year: campaign.time.year, season: pick(season.en, season.es) })}
            <br />
            {T('base', { tier: campaign.base.tier })} · {T('origin')}: {origin ? pick(origin.name, origin.nameEs) : T('noPast')}
          </div>
        </div>

        {/* wealth and reputation */}
        <div className="space-y-4">
          <Panel title={T('wealth')} icon={<Coins className="h-4 w-4" />}>
            <div style={serif} className="text-[30px] font-extrabold leading-none text-[#fff5dc] [text-shadow:0_2px_0_#000]">
              {fmt(fortune(campaign))} <span className="text-[18px] text-[#d9b46a]">{pick(CURRENCY.en, CURRENCY.es)}</span>
            </div>
            <div style={serif} className="mt-1 text-[15px] font-bold text-[#f2c46d]">
              {pick(WEALTH_NAMES[campaign.wealth].en, WEALTH_NAMES[campaign.wealth].es)}
            </div>
            <div className="mt-2">
              <GoldBar fraction={(campaign.wealth + 1) / 7} />
            </div>
            <div className="mt-1 text-[11px] text-[#b9a98a]">{pick(WEALTH_MEANS[campaign.wealth].en, WEALTH_MEANS[campaign.wealth].es)}</div>
          </Panel>

          <Panel title={T('reputation')} icon={<Flag className="h-4 w-4" />}>
            <ul className="space-y-2">
              {SHINOBI_FACTIONS.map((f) => {
                const n = campaign.factions[f.id]?.reputation ?? 0;
                const level = reputationLevel(n);
                return (
                  <li key={f.id} className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1.1fr)_16px_72px] items-center gap-2 text-[12px]">
                    <Emblem letter={pick(f.name, f.nameEs).replace(/^(Clan |The |La |Los |El )/, '')[0]} own={f.id === campaign.factionId} />
                    <span className={`truncate ${f.id === campaign.factionId ? 'text-[#f2c46d]' : 'text-[#efe3c4]'}`}>{pick(f.name, f.nameEs)}</span>
                    <GoldBar fraction={(n + 10) / 20} />
                    <LevelMark level={level} />
                    <span className="truncate" style={{ color: TONE[level] }}>
                      {pick(REPUTATION_NAMES[level].en, REPUTATION_NAMES[level].es)} {n > 0 ? `+${n}` : n}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center gap-2 border-t border-[#5a4320] pt-2 text-[12px] text-[#efe3c4]">
              <span>{T('fame')}</span>
              <div className="w-32">
                <GoldBar fraction={campaign.fame / 10} />
              </div>
              <span className="text-[#b9a98a]">{campaign.fame}/10</span>
            </div>
          </Panel>
        </div>

        {/* the Chronicle */}
        <Panel title={T('chronicle')} icon={<Scroll className="h-4 w-4" />} className="min-h-[360px]">
          <div
            className="mb-3 h-44 w-full border border-[#5a4320] bg-cover bg-center"
            style={chroniclePicture ? { backgroundImage: `url(${chroniclePicture})` } : { backgroundImage: 'linear-gradient(180deg,#1a1230,#3a1a14)' }}
          />
          {latest && (
            <p style={serif} className="text-[15px] font-bold leading-snug text-[#fff5dc]">
              {pick(latest.line, latest.lineEs)}
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {older.slice(0, 4).map((e, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-[#b9a98a]">
                <span className="shrink-0 font-mono text-[10px] text-[#8a7a5a]">
                  {e.year}·{pick(SEASON_NAMES[e.season].en, SEASON_NAMES[e.season].es)}
                </span>
                <span>{pick(e.line, e.lineEs)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* at home and the two ways on */}
        <div className="space-y-4">
          <Panel title={T('household')} icon={<Compass className="h-4 w-4" />}>
            <div className="flex items-center gap-3">
              <div className="border border-[#b8903f] bg-[#14110c]">
                <ShinobiSpriteCanvas character={hero} size={88} showAura={false} />
              </div>
              <div>
                <div style={serif} className="text-[16px] font-bold text-[#fff5dc]">
                  {hero.name}
                </div>
                <div className="text-[12px] text-[#d9b46a]">{T('level', { n: hero.level })}</div>
              </div>
            </div>
            {campaign.family.length ? (
              <ul className="mt-3 space-y-1 border-t border-[#5a4320] pt-2">
                {campaign.family.map((p) => (
                  <li key={p.id} className="text-[12px] text-[#efe3c4]">
                    {pick(p.name, p.nameEs)} <span className="text-[#8a7a5a]">· {pick(p.role, p.roleEs)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-[#5a4320] pt-2 text-[12px] text-[#b9a98a]">{T('nobody')}</p>
            )}
          </Panel>

          <button
            type="button"
            onClick={() => {
              soundManager.playCriticalHit();
              onMission();
            }}
            className="flex w-full items-center gap-3 border border-[#f2c46d] bg-[linear-gradient(180deg,#9a1f1f,#5a0f10)] px-4 py-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.8)] hover:brightness-110"
          >
            <Swords className="h-7 w-7 text-[#ffe08a]" />
            <span>
              <span style={serif} className="block text-[17px] font-extrabold text-[#fff5dc] [text-shadow:0_2px_0_#000]">
                {T('goMission')}
              </span>
              <span className="block text-[11px] text-[#ffd9b0]">{T('goMissionSub')}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playSelect();
              onPassSeason();
            }}
            className="flex w-full items-center gap-3 border border-[#b8903f] bg-[#07060b]/85 px-4 py-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.8)] hover:border-[#f2c46d]"
          >
            <Compass className="h-7 w-7 text-[#f2c46d]" />
            <span>
              <span style={serif} className="block text-[17px] font-extrabold text-[#fff5dc] [text-shadow:0_2px_0_#000]">
                {T('passSeason')}
              </span>
              <span className="block text-[11px] text-[#d9b46a]">{T('passSeasonSub')}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
