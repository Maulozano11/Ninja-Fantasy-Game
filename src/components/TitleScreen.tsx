import React, { useState } from 'react';
import type { ShinobiCharacter } from '../types/shinobi';
import type { AppView } from '../appNav';
import { ForestScene } from './scene/ForestScene';
import { LangToggle } from '../i18n/LangToggle';
import { pick, strings, useLang } from '../i18n';
import { soundManager } from '../utils/audio';
import { loadRoster, forgetNinja, type SavedNinja } from '../game/saves';
import { loadRun, missionOf } from '../game/missionRun';
import { characterFromImport } from './CharacterCreator';
import { clanName } from '../data/shinobiData';
import { DicePreview } from './dice/DicePreview';
import { DICE_STYLES, setDiceStyle, useDiceStyle } from './dice/diceStyle';
import { diceSound } from './dice/diceSound';

// The game opens here: the owner's burning forest, the title, and Start game / New game / Load
// game, as a game's own main menu (the web navigation is gone). The practice modes stay one step
// down, under "Practice".

const T = strings({
  title1: { en: 'Shinobi 5e', es: 'Shinobi 5e' },
  title2: { en: 'Chronicles', es: 'Chronicles' },
  start: { en: 'Start game', es: 'Iniciar juego' },
  startWith: { en: 'Continue as {name}', es: 'Continúa con {name}' },
  startRun: { en: '{name} · {mission}', es: '{name} · {mission}' },
  startFirst: { en: 'Make your ninja first', es: 'Primero crea a tu ninja' },
  newGame: { en: 'New game', es: 'Nueva partida' },
  newGameSub: { en: 'A new ninja, a new story', es: 'Un ninja nuevo, una historia nueva' },
  load: { en: 'Load game', es: 'Cargar partida' },
  loadSub: { en: 'A saved game or ninja', es: 'Una partida o un personaje guardado' },
  practice: { en: 'Practice', es: 'Práctica' },
  practiceSub: { en: 'Battles, arena and campaign arcs', es: 'Batallas, arena y arcos de campaña' },
  combat: { en: 'Practice battles', es: 'Batallas de práctica' },
  arena: { en: 'Arena & PvP', es: 'Arena y JcJ' },
  campaign: { en: 'Campaign arcs', es: 'Arcos de campaña' },
  sureNew: { en: 'You have a mission under way with {name}. A new game replaces it once your new ninja is made.', es: 'Tienes una misión en curso con {name}. Una partida nueva la reemplaza cuando termines a tu nuevo ninja.' },
  sureYes: { en: 'Start over', es: 'Empezar de nuevo' },
  sureNo: { en: 'Keep it', es: 'Conservarla' },
  loadTitle: { en: 'Load', es: 'Cargar' },
  runHead: { en: 'Mission under way', es: 'Misión en curso' },
  runResume: { en: 'Continue', es: 'Continuar' },
  ninjasHead: { en: 'Your ninjas', es: 'Tus ninjas' },
  noNinjas: { en: 'No ninja saved on this device yet. A ninja is saved when you finish it in the creator.', es: 'Todavía no hay ningún ninja guardado en este dispositivo. Un ninja se guarda al terminarlo en el creador.' },
  play: { en: 'Play', es: 'Jugar' },
  edit: { en: 'Edit', es: 'Editar' },
  forget: { en: 'Delete', es: 'Borrar' },
  forgetSure: { en: 'Delete {name}?', es: '¿Borrar a {name}?' },
  importHead: { en: 'Import a ninja (JSON)', es: 'Importar un ninja (JSON)' },
  importHint: { en: 'Paste a sheet exported from the creator.', es: 'Pega una hoja exportada desde el creador.' },
  importGo: { en: 'Import', es: 'Importar' },
  importBad: { en: 'That text is not a ninja sheet.', es: 'Ese texto no es la hoja de un ninja.' },
  close: { en: 'Close', es: 'Cerrar' },
  level: { en: 'Level {n}', es: 'Nivel {n}' },
  options: { en: 'Options', es: 'Opciones' },
  optionsSub: { en: 'Your dice', es: 'Tus dados' },
  diceHead: { en: 'Dice style', es: 'Estilo de dados' },
  diceHint: { en: 'Every roll in battle is a d20 thrown on screen, landing on the number the rules rolled. A natural 20 on an attack is a critical with maximum damage.', es: 'Cada tirada en batalla es un d20 que se lanza en pantalla y cae en el número que sacó la regla. Un 20 natural en un ataque es un crítico con daño máximo.' },
  dice_gem: { en: 'Gem', es: 'Gema' },
  dice_gemSub: { en: 'Clear crystal in the chakra colour of whoever rolls.', es: 'Cristal translúcido del color del chakra de quien tira.' },
  dice_ivory: { en: 'Ivory and gold', es: 'Marfil y oro' },
  dice_ivorySub: { en: 'Old ivory with gold edges and engraved numbers, like the battle frames.', es: 'Marfil antiguo con aristas y números grabados en oro, como los marcos de la batalla.' },
  dice_obsidian: { en: 'Runic obsidian', es: 'Obsidiana rúnica' },
  dice_obsidianSub: { en: 'Black glass with carved runes and glowing numbers.', es: 'Vidrio negro con runas talladas y números que brillan.' },
  chosen: { en: 'Chosen', es: 'Elegido' },
  choose: { en: 'Choose', es: 'Elegir' },
});

const serif: React.CSSProperties = { fontFamily: "'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif" };
const ink = '#efe3c4';
const gold = '#f2c46d';

export interface TitleScreenProps {
  hero: ShinobiCharacter | null;
  onStart: () => void;
  onNewGame: () => void;
  /** Play this ninja (edit: open it in the creator first). */
  onPickNinja: (c: ShinobiCharacter, edit: boolean) => void;
  onPractice: (v: AppView) => void;
}

function MenuItem({ label, sub, onClick, active }: { label: string; sub?: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        soundManager.playSelect();
        onClick();
      }}
      className="group relative flex flex-col items-start text-left py-1.5 pl-7 outline-none"
    >
      <span
        className={`absolute left-0 top-[0.95rem] h-2.5 w-2.5 rotate-45 border transition ${active ? 'bg-[#f2c46d] border-[#f2c46d]' : 'border-[#8a6a3a] group-hover:bg-[#f2c46d] group-hover:border-[#f2c46d] group-focus-visible:bg-[#f2c46d]'}`}
      />
      <span
        style={{ ...serif, color: active ? gold : ink, textShadow: '0 2px 0 #000, 0 0 18px rgba(0,0,0,0.9)' }}
        className="text-[1.65rem] leading-tight font-semibold tracking-wide transition group-hover:!text-[#f2c46d] group-focus-visible:!text-[#f2c46d]"
      >
        {label}
      </span>
      {sub && <span className="text-xs text-[#b9a98a] tracking-wide [text-shadow:0_1px_0_#000]">{sub}</span>}
    </button>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[34rem] max-h-[78vh] overflow-y-auto rounded-sm border border-[#8a6a3a] bg-[#0e0a07]/90 p-1 shadow-2xl shadow-black backdrop-blur-sm">
      <div className="border border-[#3d2e1b] px-6 py-5">
        <div className="flex items-center justify-between gap-4 border-b border-[#3d2e1b] pb-3 mb-4">
          <h2 style={{ ...serif, color: gold }} className="text-xl font-semibold tracking-wider">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-xs text-[#b9a98a] hover:text-white">
            {T('close')}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const quiet = 'px-3 py-1 text-xs rounded-sm border border-[#5c4a2e] text-[#efe3c4] hover:bg-[#2a2116] hover:border-[#8a6a3a] transition';
const loud = 'px-3 py-1 text-xs font-bold rounded-sm border border-[#f2c46d] bg-[#3a2a12] text-[#f2c46d] hover:bg-[#4d3816] transition';

/** The options: the dice style, each with its die thrown in a little preview. */
function OptionsPanel({ onClose }: { onClose: () => void }) {
  useLang();
  const chosen = useDiceStyle();
  return (
    <Panel title={T('options')} onClose={onClose}>
      <h3 style={{ ...serif, color: ink }} className="text-base font-semibold tracking-wide">
        {T('diceHead')}
      </h3>
      <p className="mt-1 mb-3 text-xs leading-relaxed text-[#b9a98a]">{T('diceHint')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {DICE_STYLES.map((s) => {
          const on = s === chosen;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setDiceStyle(s);
                diceSound('throw');
              }}
              className={`flex flex-col items-center rounded-sm border p-1.5 text-center transition ${on ? 'border-[#f2c46d] bg-[#2a1f10]' : 'border-[#3d2e1b] bg-black/30 hover:border-[#8a6a3a]'}`}
            >
              <DicePreview style={s} width={150} height={128} />
              <span style={{ ...serif, color: on ? gold : ink }} className="mt-1 text-sm font-semibold">
                {T(`dice_${s}`)}
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-[#b9a98a]">{T(`dice_${s}Sub`)}</span>
              <span className={`mt-1.5 ${on ? loud : quiet}`}>{on ? T('chosen') : T('choose')}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function LoadPanel({ onClose, onStart, onPickNinja }: { onClose: () => void; onStart: () => void; onPickNinja: TitleScreenProps['onPickNinja'] }) {
  useLang();
  const run = loadRun();
  const [roster, setRoster] = useState<SavedNinja[]>(() => loadRoster());
  const [sure, setSure] = useState<string | null>(null);
  const [json, setJson] = useState('');
  const [bad, setBad] = useState(false);
  const runHero = run?.party.members.find((m) => m.id === run.heroId) ?? run?.party.members[0];
  return (
    <Panel title={T('loadTitle')} onClose={onClose}>
      {run && runHero && (
        <section className="mb-5">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a8957a] mb-2">{T('runHead')}</h3>
          <div className="flex items-center justify-between gap-3 rounded-sm border border-[#3d2e1b] bg-black/30 px-3 py-2">
            <div className="min-w-0">
              <div style={serif} className="text-[#efe3c4] font-semibold truncate">
                {runHero.name}
              </div>
              <div className="text-xs text-[#b9a98a] truncate">{pick(missionOf(run).name, missionOf(run).nameEs)}</div>
            </div>
            <button type="button" className={loud} onClick={onStart}>
              {T('runResume')}
            </button>
          </div>
        </section>
      )}
      <section className="mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a8957a] mb-2">{T('ninjasHead')}</h3>
        {roster.length === 0 && <p className="text-xs text-[#b9a98a] leading-relaxed">{T('noNinjas')}</p>}
        <ul className="flex flex-col gap-1.5">
          {roster.map(({ character: c }) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-sm border border-[#3d2e1b] bg-black/30 px-3 py-2">
              <div className="min-w-0">
                <div style={serif} className="text-[#efe3c4] font-semibold truncate">
                  {c.name}
                </div>
                <div className="text-xs text-[#b9a98a] truncate">
                  {clanName(c.clan)} · {T('level', { n: c.level })}
                </div>
              </div>
              {sure === c.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-[#efe3c4]">{T('forgetSure', { name: c.name })}</span>
                  <button
                    type="button"
                    className={quiet}
                    onClick={() => {
                      forgetNinja(c.id);
                      setRoster(loadRoster());
                      setSure(null);
                    }}
                  >
                    {T('forget')}
                  </button>
                  <button type="button" className={quiet} onClick={() => setSure(null)}>
                    {T('sureNo')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" className={loud} onClick={() => onPickNinja(c, false)}>
                    {T('play')}
                  </button>
                  <button type="button" className={quiet} onClick={() => onPickNinja(c, true)}>
                    {T('edit')}
                  </button>
                  <button type="button" className={quiet} onClick={() => setSure(c.id)}>
                    {T('forget')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a8957a] mb-1">{T('importHead')}</h3>
        <p className="text-xs text-[#b9a98a] mb-2">{T('importHint')}</p>
        <textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setBad(false);
          }}
          rows={3}
          className="w-full rounded-sm border border-[#3d2e1b] bg-black/40 p-2 font-mono text-[11px] text-[#efe3c4] outline-none focus:border-[#8a6a3a]"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            className={loud}
            disabled={!json.trim()}
            onClick={() => {
              let c: ShinobiCharacter | null = null;
              try {
                c = characterFromImport(JSON.parse(json));
              } catch {
                c = null;
              }
              if (!c) return setBad(true);
              onPickNinja(c, true);
            }}
          >
            {T('importGo')}
          </button>
          {bad && <span className="text-xs text-[#ff9a7a]">{T('importBad')}</span>}
        </div>
      </section>
    </Panel>
  );
}

export function TitleScreen({ hero, onStart, onNewGame, onPickNinja, onPractice }: TitleScreenProps) {
  useLang();
  const [panel, setPanel] = useState<'none' | 'load' | 'practice' | 'sure' | 'options'>('none');
  const run = loadRun();
  const runHero = run?.party.members.find((m) => m.id === run.heroId) ?? run?.party.members[0];
  const startSub = run && runHero
    ? T('startRun', { name: runHero.name, mission: pick(missionOf(run).name, missionOf(run).nameEs) })
    : hero
      ? T('startWith', { name: hero.name })
      : T('startFirst');
  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-[#efe3c4]">
      <ForestScene className="absolute inset-0" position="50% 62%" />
      {/* Shade where the menu sits, and the edges, so the words read over the fire. */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,rgba(6,3,2,0.86)_0%,rgba(6,3,2,0.55)_30%,rgba(6,3,2,0)_58%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_60%_45%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.55)_100%)]" />

      <div className="relative z-10 flex h-full flex-col overflow-y-auto px-6 sm:px-12 lg:px-20 py-8 sm:py-12">
        <header>
          <h1 style={{ ...serif, textShadow: '0 3px 0 #000, 0 0 30px rgba(0,0,0,0.8)' }} className="leading-[0.95]">
            <span className="block text-[2.6rem] sm:text-[3.6rem] font-extrabold tracking-wide text-[#f2c46d]">{T('title1')}</span>
            <span className="block text-[1.4rem] sm:text-[1.9rem] font-semibold tracking-[0.35em] text-[#efe3c4] pl-1">{T('title2')}</span>
          </h1>
          <div className="mt-3 h-px w-64 bg-gradient-to-r from-[#8a6a3a] to-transparent" />
        </header>

        {/* The menu holds its place when a panel opens beside it (nothing jumps under the pointer). */}
        <div className="flex-1 flex flex-col lg:flex-row items-start gap-8 pt-[10vh] pb-6">
          <nav className="flex flex-col gap-2.5 shrink-0" aria-label="Menu">
            <MenuItem label={T('start')} sub={startSub} onClick={() => (run || hero ? onStart() : onNewGame())} />
            <MenuItem label={T('newGame')} sub={T('newGameSub')} active={panel === 'sure'} onClick={() => (run && runHero ? setPanel('sure') : onNewGame())} />
            <MenuItem label={T('load')} sub={T('loadSub')} active={panel === 'load'} onClick={() => setPanel(panel === 'load' ? 'none' : 'load')} />
            <MenuItem label={T('practice')} sub={T('practiceSub')} active={panel === 'practice'} onClick={() => setPanel(panel === 'practice' ? 'none' : 'practice')} />
            {panel === 'practice' && (
              <div className="flex flex-col gap-1 pl-7 pt-1">
                {(['combat', 'arena', 'campaign'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      soundManager.playSelect();
                      onPractice(v);
                    }}
                    style={serif}
                    className="text-left text-lg text-[#d9caa6] hover:text-[#f2c46d] [text-shadow:0_2px_0_#000]"
                  >
                    {T(v)}
                  </button>
                ))}
              </div>
            )}
            <MenuItem label={T('options')} sub={T('optionsSub')} active={panel === 'options'} onClick={() => setPanel(panel === 'options' ? 'none' : 'options')} />
          </nav>

          {panel === 'load' && <LoadPanel onClose={() => setPanel('none')} onStart={onStart} onPickNinja={onPickNinja} />}
          {panel === 'options' && <OptionsPanel onClose={() => setPanel('none')} />}
        </div>

        <footer className="flex items-end justify-between gap-4">
          <LangToggle />
          <span className="text-[11px] text-[#8f8068] [text-shadow:0_1px_0_#000]">Shinobi 5e Chronicles</span>
        </footer>
      </div>

      {/* Asked over the whole screen, so it shows whatever the window's size (beside or under the
          menu it could fall off a short screen, and the click looked like it did nothing). */}
      {panel === 'sure' && runHero && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4" onClick={() => setPanel('none')}>
          <div className="w-full max-w-md rounded-sm border border-[#8a6a3a] bg-[#0e0a07]/95 p-1 shadow-2xl shadow-black" onClick={(e) => e.stopPropagation()}>
            <div className="border border-[#3d2e1b] px-5 py-4">
              <p className="text-sm leading-relaxed text-[#efe3c4]">{T('sureNew', { name: runHero.name })}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className={loud} onClick={onNewGame}>
                  {T('sureYes')}
                </button>
                <button type="button" className={quiet} onClick={() => setPanel('none')}>
                  {T('sureNo')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
