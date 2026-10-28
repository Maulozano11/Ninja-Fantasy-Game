// Casa: the hero at home between missions (docs/WORLD_DESIGN.md, step 1 of section 13): the season,
// the wealth seal with its fortune, reputation with every faction, fame, who lives with you, the
// Chronicle so far; and the two ways on: out on a mission, or let the season pass at home.

import React from 'react';
import { Home as HomeIcon, Flag, Coins, Hourglass, Scroll, Users } from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import { fortune, reputationLevel, type CampaignState } from '../../campaign/state';
import { SHINOBI_FACTIONS } from '../../settings/shinobi/factions';
import { originDef } from '../../settings/shinobi/origins';
import { CURRENCY, REPUTATION_NAMES, SEASON_NAMES, WEALTH_MEANS, WEALTH_NAMES } from '../../settings/shinobi/words';
import { pick, strings, useLang } from '../../i18n';
import { LangToggle } from '../../i18n/LangToggle';
import { Frame, Heading, Parchment, serif } from '../creator/stage';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { soundManager } from '../../utils/audio';

const T = strings({
  home: { en: 'Home', es: 'Casa' },
  yearSeason: { en: 'Year {year} · {season}', es: 'Año {year} · {season}' },
  wealth: { en: 'Wealth', es: 'Riqueza' },
  fortune: { en: 'Estimated fortune', es: 'Fortuna estimada' },
  reputation: { en: 'Reputation', es: 'Reputación' },
  fame: { en: 'Fame', es: 'Fama' },
  fameSub: { en: 'How much the world talks about you', es: 'Cuánto se habla de ti en el mundo' },
  household: { en: 'At home', es: 'En casa' },
  nobody: { en: 'Nobody lives with you yet.', es: 'Nadie vive contigo todavía.' },
  base: { en: 'Base tier {tier}', es: 'Base de nivel {tier}' },
  chronicle: { en: 'Chronicle', es: 'Crónica' },
  goMission: { en: 'Set out on a mission', es: 'Salir de misión' },
  goMissionSub: { en: 'A season passes on the road', es: 'En el camino pasa una estación' },
  passSeason: { en: 'Let the season pass', es: 'Pasar la estación' },
  passSeasonSub: { en: 'Stay home this season', es: 'Quedarte en casa esta estación' },
  origin: { en: 'Origin', es: 'Origen' },
  noPast: { en: 'No past', es: 'Sin pasado' },
  level: { en: 'Level {n}', es: 'Nivel {n}' },
});

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

/** The 7 wealth levels as a row of seals, the current one lit. */
function WealthSeal({ wealth }: { wealth: CampaignState['wealth'] }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4, 5, 6].map((n) => (
        <span key={n} className={`h-3 w-3 rotate-45 border ${n <= wealth ? 'border-[#f2c46d] bg-[#c99a4b]' : 'border-[#4a3a22] bg-[#1a140c]'}`} />
      ))}
    </div>
  );
}

function ReputationBar({ n }: { n: number }) {
  const level = reputationLevel(n);
  const tone = level === 'hostile' ? '#b4342d' : level === 'cold' ? '#7a8ba3' : level === 'neutral' ? '#8a7a5a' : level === 'friend' ? '#5aa36a' : '#f2c46d';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-28 border border-[#4a3a22] bg-[#1a140c]">
        <div className="absolute top-0 bottom-0 w-px bg-[#6b5434]" style={{ left: '50%' }} />
        <div className="absolute top-0 bottom-0" style={{ left: n < 0 ? `${50 + n * 5}%` : '50%', width: `${Math.abs(n) * 5}%`, background: tone }} />
      </div>
      <span className="w-16 text-[11px]" style={{ color: tone }}>
        {pick(REPUTATION_NAMES[level].en, REPUTATION_NAMES[level].es)}
      </span>
      <span className="text-[10px] font-mono text-[#8a7a5a]">{n > 0 ? `+${n}` : n}</span>
    </div>
  );
}

export function HomeScreen({ hero, campaign, onMission, onPassSeason }: { hero: ShinobiCharacter; campaign: CampaignState; onMission: () => void; onPassSeason: () => void }) {
  useLang();
  const origin = originDef(campaign.originId);
  const season = SEASON_NAMES[campaign.time.season];
  const recent = campaign.chronicle.slice(-6).reverse();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c99a4b] flex items-center gap-1.5">
            <HomeIcon className="w-3.5 h-3.5" /> {T('home')}
          </div>
          <h1 style={serif} className="text-3xl font-extrabold tracking-tight text-[#f2c46d] [text-shadow:0_2px_0_#000]">
            {hero.name}
          </h1>
          <p className="text-sm text-[#b9a98a] mt-1 flex items-center gap-1.5">
            <Hourglass className="w-3.5 h-3.5" /> {T('yearSeason', { year: campaign.time.year, season: pick(season.en, season.es) })}
            <span className="mx-1 text-[#6b5434]">·</span> {T('base', { tier: campaign.base.tier })}
            <span className="mx-1 text-[#6b5434]">·</span> {T('origin')}: {origin ? pick(origin.name, origin.nameEs) : T('noPast')}
          </p>
        </div>
        <LangToggle />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Frame title={T('wealth')} sub={pick(WEALTH_MEANS[campaign.wealth].en, WEALTH_MEANS[campaign.wealth].es)} bodyClass="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Coins className="w-6 h-6 text-[#f2c46d]" />
              <div>
                <div style={serif} className="text-xl font-bold text-[#efe3c4]">
                  {pick(WEALTH_NAMES[campaign.wealth].en, WEALTH_NAMES[campaign.wealth].es)}
                </div>
                <WealthSeal wealth={campaign.wealth} />
              </div>
              <div className="ml-auto text-right">
                <div className="text-[10px] uppercase tracking-widest text-[#8a7a5a]">{T('fortune')}</div>
                <div className="font-mono text-lg text-[#f2c46d]">
                  {fmt(fortune(campaign))} {pick(CURRENCY.en, CURRENCY.es)}
                </div>
              </div>
            </div>
          </Frame>

          <Frame title={T('reputation')} bodyClass="p-4">
            <ul className="grid gap-2 sm:grid-cols-2">
              {SHINOBI_FACTIONS.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3">
                  <span className={`flex items-center gap-1.5 text-[13px] ${f.id === campaign.factionId ? 'text-[#f2c46d]' : 'text-[#efe3c4]'}`}>
                    <Flag className="w-3 h-3 text-[#8a7a5a]" /> {pick(f.name, f.nameEs)}
                  </span>
                  <ReputationBar n={campaign.factions[f.id]?.reputation ?? 0} />
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-3 border-t border-[#3d3122] pt-3">
              <span className="text-[13px] text-[#efe3c4]">{T('fame')}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 border ${i < campaign.fame ? 'border-[#f2c46d] bg-[#c99a4b]' : 'border-[#4a3a22] bg-[#1a140c]'}`} />
                ))}
              </div>
              <span className="text-[11px] text-[#8a7a5a]">{T('fameSub')}</span>
            </div>
          </Frame>

          <Frame title={T('chronicle')} bodyClass="p-4">
            <ul className="space-y-1.5">
              {recent.map((e, i) => (
                <li key={i} className="flex gap-3 text-[13px] text-[#efe3c4]">
                  <span className="shrink-0 font-mono text-[11px] text-[#8a7a5a]">
                    {e.year}·{pick(SEASON_NAMES[e.season].en, SEASON_NAMES[e.season].es)}
                  </span>
                  <Scroll className="w-3.5 h-3.5 shrink-0 text-[#8a7a5a] mt-0.5" />
                  <span>{pick(e.line, e.lineEs)}</span>
                </li>
              ))}
            </ul>
          </Frame>
        </div>

        <div className="space-y-5">
          <Frame title={T('household')} bodyClass="p-4">
            <div className="flex items-center gap-3">
              <ShinobiSpriteCanvas character={hero} size={72} showAura={false} />
              <div>
                <div className="text-sm font-bold text-[#efe3c4]">{hero.name}</div>
                <div className="text-[11px] text-[#8a7a5a]">{T('level', { n: hero.level })}</div>
              </div>
            </div>
            <Heading>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {T('household')}
              </span>
            </Heading>
            {campaign.family.length ? (
              <ul className="space-y-1 px-1">
                {campaign.family.map((p) => (
                  <li key={p.id} className="text-[13px] text-[#efe3c4]">
                    {pick(p.name, p.nameEs)} <span className="text-[#8a7a5a]">· {pick(p.role, p.roleEs)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Parchment>{T('nobody')}</Parchment>
            )}
          </Frame>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playCriticalHit();
                onMission();
              }}
              className="w-full border border-[#8a6a3a] bg-[linear-gradient(180deg,#5a4120,#2a1d0e)] px-4 py-3 text-left shadow-lg shadow-black hover:border-[#f2c46d]"
            >
              <div style={serif} className="text-base font-bold text-[#f2c46d]">
                {T('goMission')}
              </div>
              <div className="text-[11px] text-[#b9a98a]">{T('goMissionSub')}</div>
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playSelect();
                onPassSeason();
              }}
              className="w-full border border-[#6b5434] bg-[linear-gradient(180deg,#34373d,#202226)] px-4 py-3 text-left shadow-lg shadow-black hover:border-[#f2c46d]"
            >
              <div style={serif} className="text-base font-bold text-[#efe3c4]">
                {T('passSeason')}
              </div>
              <div className="text-[11px] text-[#b9a98a]">{T('passSeasonSub')}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
