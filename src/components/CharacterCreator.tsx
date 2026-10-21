import React, { useEffect, useMemo, useState } from 'react';
import { ShinobiCharacter, ClanType, ArmorStyleType, ShinobiClassType, AbilityScores } from '../types/shinobi';
import {
  CLANS_DATA,
  SHINOBI_CLASSES,
  SHINOBI_FEATS,
  JUTSUS_DATA,
  LEGENDARY_PRESETS,
  DEFAULT_CHARACTER,
  clanName,
} from '../data/shinobiData';
import { ShinobiSpriteCanvas } from './ShinobiSpriteCanvas';
import { AppearanceEditor, type AppearanceGroup } from './creator/AppearanceEditor';
import { renderSpriteCached } from '../sprite/compose';
import { BOX, GRID, RES } from '../sprite/raster';
import { FEET } from '../sprite/rig';
import { getItem } from '../sprite/catalog';
import { chakraHex } from '../sprite/chakraInfo';
import { defaultAppearance, dojutsuToEye, getAppearance } from '../sprite/legacy';
import { randomAppearance } from '../sprite/random';
import { CAST_STYLES, CastStyle, SPRITE_POSES, SpriteAppearance, SpritePose } from '../sprite/types';
import { CAST_STYLE_INFO, defaultCastStyle } from '../sprite/castInfo';
import { soundManager } from '../utils/audio';
import { deriveStats } from '../rules/derived';
import { clanBonus } from '../rules/checks';
import { migrateCharacter, natureOf, sanitizeMissionFields } from '../rules/ninja';
import { fitLoadout, offNatureJutsus, type JutsuSwap } from '../rules/jutsuNature';
import { aboveRank, asMade, creatorChoices, fitNewNinja, rankOpen, typeFixed } from '../rules/progression';
import { pouchTags, TAG_JUTSU } from '../rules/pouch';
import { chakraNature, chakraType } from '../sprite/chakraNature';
import type { ChakraNature } from '../types/shinobi';
import { Dice5, Download, Shield, Zap, Eye, Swords, BookOpen, UserCheck, Sparkles, Lock, Bomb } from 'lucide-react';
import { ForestScene, forestGround } from './scene/ForestScene';
import { BigButton, Chip, Frame, Heading, IronButton, Parchment, Row, StepTabs, serif } from './creator/stage';
import { iconUrl } from './battle/kit';
import { L } from './creator/words';
import { pick, strings, useLang } from '../i18n';

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const sameKind = (d: unknown, v: unknown) => (Array.isArray(d) ? Array.isArray(v) : isObj(d) ? isObj(v) : typeof d === typeof v);

/** `base` with the entries of `v` that have the same kind of value (unknown keys are kept as they are). */
function mergeKind(base: Record<string, unknown>, v: Record<string, unknown>): Record<string, unknown> {
  const out = { ...base };
  for (const [k, x] of Object.entries(v)) if (!(k in base) || sameKind(base[k], x)) out[k] = isObj(base[k]) && isObj(x) ? mergeKind(base[k], x) : x;
  return out;
}

/** Earlier sheets used other jutsu ids; they load as the jutsu that replaced each one. */
const RENAMED_JUTSUS: Record<string, string> = { hyuga_sixtyfour_palms: 'taki_sixtyfour_palms' };

/**
 * A complete character from pasted JSON: anything missing or of the wrong kind
 * falls back to the default character, so a partial or older sheet can't
 * break the page. Null when the JSON isn't a character sheet at all.
 */
export function characterFromImport(raw: unknown): ShinobiCharacter | null {
  if (!isObj(raw) || typeof raw.clan !== 'string' || !isObj(raw.stats)) return null;
  const out = mergeKind(DEFAULT_CHARACTER as unknown as Record<string, unknown>, raw);
  if (Array.isArray(out.selectedFeats)) out.selectedFeats = out.selectedFeats.filter((f) => typeof f === 'string');
  // every jutsu slot must name a jutsu that exists, or be empty (a new ninja's S-rank slot); the old
  // explosive tag jutsu goes through, and migrateCharacter turns it into the item
  const slots = out.selectedJutsus as Record<string, unknown>;
  const defSlots = DEFAULT_CHARACTER.selectedJutsus as unknown as Record<string, string>;
  for (const k of Object.keys(defSlots)) {
    const id = RENAMED_JUTSUS[slots[k] as string] ?? slots[k];
    slots[k] = id === '' || id === TAG_JUTSU || JUTSUS_DATA.some((j) => j.id === id) ? id : defSlots[k];
  }
  // The sheet's version is its own: one without it was saved before the clan bonus counted, and
  // gets it counted on load (not the default character's version).
  if (typeof raw.sheetVersion === 'number' && Number.isFinite(raw.sheetVersion)) out.sheetVersion = raw.sheetVersion;
  else delete out.sheetVersion;
  if ('appearance' in out) {
    if (isObj(out.appearance)) out.appearance = mergeKind(defaultAppearance() as unknown as Record<string, unknown>, out.appearance);
    else delete out.appearance;
  }
  // Earlier sheets used other clan names; they load as the clan that replaced each one (without
  // the bonus an old clan built into its maxima), and with the clan's ability bonus counted once.
  // An imported sheet is a ninja someone made: its chakra type is fixed.
  return asMade(migrateCharacter(sanitizeMissionFields(out as unknown as ShinobiCharacter)));
}

/**
 * The creator's sheet for a new ninja: a sheet that is not a legend and has not been made yet (a new
 * game's starting sheet, a copy made from a legend) learns jutsu of rank D and C and its clan's
 * (rules/progression.ts); the S-rank slot is empty until it opens. Legends and made ninjas keep theirs.
 */
function asNewNinja(c: ShinobiCharacter): ShinobiCharacter {
  if (typeFixed(c) || LEGENDARY_PRESETS.some((p) => p.character.id === c.id)) return c;
  const fitted = fitNewNinja(c.selectedJutsus, natureOf(c), c.clan).loadout;
  return Object.values(fitted).join() === Object.values(c.selectedJutsus).join() ? c : { ...c, selectedJutsus: fitted };
}

// --- the creator's words (ES / EN) and small pieces ----------------------------------------------

const T = strings({
  title: { en: 'Character creation', es: 'Creación de personaje' },
  step_origin: { en: 'Origin', es: 'Origen' },
  step_clan: { en: 'Clan', es: 'Clan' },
  step_class: { en: 'Class', es: 'Clase' },
  step_appearance: { en: 'Appearance', es: 'Apariencia' },
  step_abilities: { en: 'Abilities', es: 'Atributos' },
  step_jutsus: { en: 'Jutsu', es: 'Jutsus' },
  stepAppearance: { en: 'Appearance', es: 'Apariencia' },
  pickOrigin: { en: 'Choose your origin', es: 'Elige tu origen' },
  pickClan: { en: 'Choose your clan', es: 'Elige tu clan' },
  pickClass: { en: 'Choose your class', es: 'Elige tu clase' },
  pickAbilities: { en: 'Ability scores', es: 'Puntuaciones de atributo' },
  pickJutsus: { en: 'Jutsu loadout', es: 'Jutsus equipados' },
  stepHint_origin: { en: 'Your own ninja, or one of the legends', es: 'Tu propio ninja, o una de las leyendas' },
  stepHint_clan: { en: 'Your bloodline: its bonus and its secrets', es: 'Tu linaje: su bonificación y sus secretos' },
  stepHint_class: { en: 'How you fight and what you cast with', es: 'Cómo peleas y con qué lanzas' },
  stepHint_appearance: { en: 'Body, face, hair, clothes and chakra', es: 'Cuerpo, cara, pelo, ropa y chakra' },
  stepHint_abilities: { en: 'Your scores, with the clan bonus, and up to 3 feats', es: 'Tus puntuaciones, con la del clan, y hasta 3 dotes' },
  stepHint_jutsus: { en: 'Five slots: open one to change it', es: 'Cinco ranuras: abre una para cambiarla' },
  custom: { en: 'Custom', es: 'Personalizado' },
  customSub: { en: 'Make your own ninja', es: 'Crea tu propio ninja' },
  customText: {
    en: 'Start from this sheet and make it yours: choose a clan and a class, shape the look, set the scores and fill the five jutsu slots. A legend can be your starting point too.',
    es: 'Parte de esta hoja y hazla tuya: elige clan y clase, dale forma a su aspecto, reparte las puntuaciones y llena las cinco ranuras de jutsu. Una leyenda también puede ser tu punto de partida.',
  },
  legends: { en: 'Legends', es: 'Leyendas' },
  level: { en: 'Level {n}', es: 'Nivel {n}' },
  jutsus: { en: 'Jutsu', es: 'Jutsus' },
  clanBonus: { en: 'Clan bonus', es: 'Bonificación de clan' },
  lineage: { en: 'Bloodline', es: 'Linaje' },
  castsWith: { en: 'Casts with {stat}', es: 'Lanza con {stat}' },
  classFeatures: { en: 'Class features', es: 'Rasgos de clase' },
  dice: { en: 'Dice and saves', es: 'Dados y salvaciones' },
  hitDie: { en: 'Hit die d{n}', es: 'Dado de golpe d{n}' },
  chakraDie: { en: 'Chakra die d{n}', es: 'Dado de chakra d{n}' },
  save: { en: '{s} save', es: 'Salvación de {s}' },
  base: { en: 'base {n}', es: 'base {n}' },
  feats: { en: 'Feats · {n} of 3', es: 'Dotes · {n} de 3' },
  feat: { en: 'Feat', es: 'Dote' },
  sheet: { en: 'Your sheet', es: 'Tu hoja' },
  hp: { en: 'HP', es: 'PG' },
  chakraMax: { en: 'Chakra', es: 'Chakra' },
  nature: { en: 'Nature', es: 'Naturaleza' },
  ac: { en: 'AC', es: 'CA' },
  dc: { en: 'Jutsu DC', es: 'CD jutsu' },
  atk: { en: 'Attack', es: 'Ataque' },
  speed: { en: 'Speed', es: 'Velocidad' },
  tiles: { en: '{n} tiles', es: '{n} casillas' },
  slotUtility: { en: 'Utility', es: 'Utilidad' },
  slotElementA: { en: 'Element I', es: 'Elemento I' },
  slotElementB: { en: 'Element II', es: 'Elemento II' },
  slotClan: { en: 'Clan secret', es: 'Secreto del clan' },
  slotUltimate: { en: 'S-rank', es: 'Rango S' },
  natureRule: {
    en: 'Nature: {n}. The Element and S-rank slots offer {n} jutsu and jutsu with no element (taijutsu, kenjutsu, genjutsu).',
    es: 'Naturaleza: {n}. Las ranuras de Elemento y Rango S ofrecen jutsus de {n} y jutsus sin elemento (taijutsu, kenjutsu, genjutsu).',
  },
  natureRuleNone: {
    en: 'Nature: {n}. Its own jutsu will come later; for now it learns no elemental jutsu, only jutsu with no element (taijutsu, kenjutsu, genjutsu).',
    es: 'Naturaleza: {n}. Sus jutsus llegarán más adelante; por ahora no aprende jutsus elementales, solo jutsus sin elemento (taijutsu, kenjutsu, genjutsu).',
  },
  offNature: { en: 'not your nature', es: 'no es de tu naturaleza' },
  rankRule: {
    en: 'A new ninja learns rank D and C jutsu, and its clan\'s. The S-rank slot opens later.',
    es: 'Un ninja nuevo aprende jutsus de rango D y C, y los de su clan. La ranura de Rango S se abre más adelante.',
  },
  aboveRank: { en: 'rank {r}: stays on its sheet', es: 'rango {r}: se queda en su hoja' },
  slotLocked: { en: 'Unlocks later', es: 'Se desbloquea más adelante' },
  slotLockedSub: { en: '{slot} · not for a new ninja', es: '{slot} · no es para un ninja nuevo' },
  slotEmptied: { en: 'empty (S-rank unlocks later)', es: 'vacía (el Rango S se desbloquea más adelante)' },
  tools: { en: 'Tools', es: 'Herramientas' },
  tagName: { en: 'Explosive tag', es: 'Sello explosivo' },
  tagSub: { en: 'Consumable item · not a jutsu', es: 'Objeto consumible · no es un jutsu' },
  tagPouch: { en: '×{n} in its pouch', es: '×{n} en su bolsa' },
  tagReach: { en: 'Throw 9 m · hide 4.5 m', es: 'Lanzar 9 m · esconder 4,5 m' },
  tagText: {
    en: 'A tool, not a jutsu: the party\'s backpack carries explosive tags (2 for each mission), and anyone can use them from the battle\'s item slots. Throw one (up to 9 m: it blows up where it lands) or hide one on the ground (up to 4.5 m: it blows up when an enemy steps on it). Either way, 3d6 fire in 1.5 m, DEX save DC 13 for half. It costs no chakra and needs no hand seals.',
    es: 'Una herramienta, no un jutsu: la mochila del grupo lleva sellos explosivos (2 por misión) y cualquiera los usa desde las ranuras de objetos de la batalla. Lanza uno (hasta 9 m: estalla donde cae) o escóndelo en el suelo (hasta 4,5 m: estalla cuando un enemigo lo pisa). En los dos casos, 3d6 de fuego en 1,5 m, salvación de DES CD 13 para la mitad. No gasta chakra ni necesita sellos de manos.',
  },
  tagPouchText: {
    en: 'This ninja carries {n} more in its own pouch (it had the explosive tag as a jutsu): they join the backpack at the start of every mission and practice battle.',
    es: 'Este ninja lleva {n} más en su propia bolsa (tenía el sello explosivo como jutsu): se suman a la mochila al empezar cada misión y cada batalla de práctica.',
  },
  natureSwaps: {
    en: 'Now {n}: the jutsu of another element were changed. {list}.',
    es: 'Ahora {n}: se cambiaron los jutsus de otro elemento. {list}.',
  },
  rank: { en: 'Rank {r}', es: 'Rango {r}' },
  chakra: { en: '{n} chakra', es: '{n} chakra' },
  reach: { en: 'Reach {n}', es: 'Alcance {n}' },
  enhanced: { en: 'Enhanced', es: 'Potenciado' },
  castStyle: { en: 'Casting style', es: 'Estilo de lanzamiento' },
  castDefault: { en: 'Default ({s})', es: 'Por defecto ({s})' },
  unnamed: { en: 'Unnamed ninja', es: 'Ninja sin nombre' },
  auraOn: { en: 'Chakra aura: on', es: 'Aura de chakra: sí' },
  auraOff: { en: 'Chakra aura: off', es: 'Aura de chakra: no' },
  name: { en: 'Name', es: 'Nombre' },
  namePh: { en: 'Your name', es: 'Tu nombre' },
  randomize: { en: 'Random ninja', es: 'Ninja al azar' },
  exportImport: { en: 'Export / Import', es: 'Exportar / Importar' },
  exportText: { en: 'Copy this sheet to keep or share your ninja, or paste another sheet and apply it.', es: 'Copia esta hoja para guardar o compartir a tu ninja, o pega otra hoja y aplícala.' },
  applyImport: { en: 'Apply', es: 'Aplicar' },
  close: { en: 'Close', es: 'Cerrar' },
  back: { en: 'Back', es: 'Atrás' },
  mainMenu: { en: 'Main menu', es: 'Menú principal' },
  next: { en: 'Next', es: 'Siguiente' },
  accept: { en: 'Accept', es: 'Aceptar' },
  pose_idle: { en: 'Idle', es: 'Reposo' },
  pose_handsigns: { en: 'Hand signs', es: 'Sellos' },
  pose_attack: { en: 'Attack', es: 'Ataque' },
  pose_throw: { en: 'Throw weapon', es: 'Arrojar arma' },
  pose_pierce: { en: 'Thrust', es: 'Estocada' },
  pose_cast: { en: 'Cast', es: 'Lanzar' },
  pose_hurt: { en: 'Hurt', es: 'Herido' },
  pose_victory: { en: 'Victory', es: 'Victoria' },
  pose_charge: { en: 'Charge', es: 'Cargar' },
  stat_str: { en: 'Strength', es: 'Fuerza' },
  stat_dex: { en: 'Dexterity', es: 'Destreza' },
  stat_con: { en: 'Constitution', es: 'Constitución' },
  stat_int: { en: 'Intelligence', es: 'Inteligencia' },
  stat_wis: { en: 'Wisdom', es: 'Sabiduría' },
  stat_cha: { en: 'Charisma', es: 'Carisma' },
  short_str: { en: 'STR', es: 'FUE' },
  short_dex: { en: 'DEX', es: 'DES' },
  short_con: { en: 'CON', es: 'CON' },
  short_int: { en: 'INT', es: 'INT' },
  short_wis: { en: 'WIS', es: 'SAB' },
  short_cha: { en: 'CHA', es: 'CAR' },
  about_str: { en: 'Raw power: heavy weapons, shoving and tripping, carrying weight, and Strength saves.', es: 'Fuerza bruta: armas pesadas, empujar y derribar, cargar peso y salvaciones de Fuerza.' },
  about_dex: { en: 'Speed and precision: light and thrown weapons, armor class in light armor, initiative and Dexterity saves.', es: 'Rapidez y precisión: armas ligeras y arrojadizas, clase de armadura con armadura ligera, iniciativa y salvaciones de Destreza.' },
  about_con: { en: 'Toughness: hit points every level, holding concentration and Constitution saves.', es: 'Aguante: puntos de golpe en cada nivel, mantener la concentración y salvaciones de Constitución.' },
  about_int: { en: 'Study and analysis: knowledge, seals and investigation, and the casting score of some classes.', es: 'Estudio y análisis: conocimiento, sellos e investigación, y el atributo de lanzamiento de algunas clases.' },
  about_wis: { en: 'Awareness: perception, insight, seeing through illusions and Wisdom saves.', es: 'Atención: percepción, perspicacia, ver a través de ilusiones y salvaciones de Sabiduría.' },
  about_cha: { en: 'Presence: deception, intimidation and command, and the casting score of some classes.', es: 'Presencia: engaño, intimidación y mando, y el atributo de lanzamiento de algunas clases.' },
});
type TK = Parameters<typeof T>[0];

const STEPS = ['origin', 'clan', 'class', 'appearance', 'abilities', 'jutsus'] as const;
type Step = (typeof STEPS)[number];
const STEP_ICON: Record<Step, React.ReactNode> = {
  origin: <UserCheck className="w-4 h-4" />,
  clan: <Eye className="w-4 h-4" />,
  class: <Swords className="w-4 h-4" />,
  appearance: <Shield className="w-4 h-4" />,
  abilities: <BookOpen className="w-4 h-4" />,
  jutsus: <Zap className="w-4 h-4" />,
};
const STATS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const statLong = (s: keyof AbilityScores) => T(`stat_${s}` as TK);
const statShort = (s: keyof AbilityScores) => T(`short_${s}` as TK);
type SlotKey = keyof ShinobiCharacter['selectedJutsus'];

/** What the detail panel shows: the hovered entry, else the step's chosen one. */
type Hover =
  | { kind: 'custom' }
  | { kind: 'preset'; i: number }
  | { kind: 'clan'; id: ClanType }
  | { kind: 'dojutsu'; id: string }
  | { kind: 'class'; id: ShinobiClassType }
  | { kind: 'stat'; id: keyof AbilityScores }
  | { kind: 'feat'; id: string }
  | { kind: 'jutsu'; id: string }
  | { kind: 'tool' }
  | { kind: 'locked'; slot: string }
  | { kind: 'look' };

const jutsuName = (j: { name: string; nameEs?: string }) => pick(j.name, j.nameEs);
/** A jutsu's name in two lines for a list row: its own name, and its "Fire Technique" kind. */
const jutsuParts = (j: { name: string; nameEs?: string }): [string, string] => {
  const n = jutsuName(j);
  const at = n.indexOf(': ');
  return at > 0 ? [n.slice(at + 2), n.slice(0, at)] : [n, ''];
};

/** A clan's lineage text as its abilities: "Name (cost): text." runs split where a new name starts. */
function traits(text: string): { name?: string; text: string }[] {
  return text.split(/(?<=\.)\s+(?=\p{Lu}[^.]{2,80}?:)/u).map((part) => {
    // The name runs to its colon, or past a "(cost):" when it has one ("Katon: Pursuing Flame (action, 3 chakra): ...").
    const paren = part.indexOf('): ');
    const colon = part.indexOf(': ');
    const end = paren >= 0 && paren < 90 ? paren + 1 : colon >= 0 && colon < 50 ? colon : -1;
    return end > 0 ? { name: part.slice(0, end), text: part.slice(end + 2).trim() } : { text: part };
  });
}

/** The eyes' names on the Spanish screens (the Sharingan and Mangekyo keep theirs). */
const DOJUTSU_ES: Record<string, string> = {
  None: 'Ninguno',
  'Sage Eyes (Toad)': 'Ojos de Sabio (Sapo)',
  'Byakugan (Pure)': 'Byakugan (Puro)',
  'Byakugan (Active Veined)': 'Byakugan (Venas activas)',
};
const dojutsuName = (d: string) => pick(d, DOJUTSU_ES[d]);
const className = (id: ShinobiClassType) => pick(id, SHINOBI_CLASSES[id].nameEs);

/** A clan's or a class's seal: a diamond in its colour with its first letter. */
function Seal({ letter, color }: { letter: string; color: string }) {
  return (
    <span className="relative grid place-items-center w-9 h-9">
      <span className="absolute inset-1 rotate-45 border-2" style={{ borderColor: color, background: `radial-gradient(circle, ${color}55, #14110d 75%)` }} />
      <span style={serif} className="relative text-sm font-bold text-[#efe3c4] [text-shadow:0_1px_0_#000]">
        {letter}
      </span>
    </span>
  );
}

/** The owner's painted icon for a jutsu in his steel slot, or its element's initial until he paints one. */
function JutsuIcon({ id, nature, small, big }: { id?: string; nature?: string; small?: boolean; big?: boolean }) {
  const dense = typeof window !== 'undefined' && window.devicePixelRatio > 1;
  const url = id ? iconUrl(id, dense || !!big) : undefined;
  const size = big ? 88 : small ? 30 : 38;
  return url ? (
    <img src={url} alt="" width={size} height={size} className="pixelated border border-[#6b5434] bg-black" style={{ width: size, height: size, imageRendering: 'pixelated' }} />
  ) : (
    <span
      style={{ ...serif, width: size, height: size }}
      className="grid place-items-center border border-[#6b5434] bg-[radial-gradient(circle,#3a2a12,#14110d)] text-[11px] font-bold text-[#f2c46d]"
    >
      {(nature ?? '?').slice(0, 2)}
    </span>
  );
}

/** A ninja's head and shoulders, cut from its sprite, for a list row. */
function Portrait({ character }: { character: ShinobiCharacter }) {
  return (
    <span className="relative block w-10 h-10 overflow-hidden border border-[#6b5434] bg-[radial-gradient(circle,#3a2a12,#0e0b08)]">
      <span className="absolute" style={{ left: -28, top: -10 }}>
        <ShinobiSpriteCanvas character={character} size={96} showAura={false} showShadow={false} />
      </span>
    </span>
  );
}

/** The window's size, for placing the ninja on the forest's ground. */
function useView() {
  const get = () => ({ w: typeof window !== 'undefined' ? window.innerWidth : 1600, h: typeof window !== 'undefined' ? window.innerHeight : 900 });
  const [v, setV] = useState(get);
  useEffect(() => {
    const on = () => setV(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

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
  const [character, setCharacter] = useState<ShinobiCharacter>(() => asNewNinja(initialCharacter));
  const [activeTab, setActiveTab] = useState<'identity' | 'appearance' | 'stats' | 'jutsus'>('identity');
  const [previewStance, setPreviewStance] = useState<SpritePose>('idle');
  /** A jutsu's own cast style being previewed (null = the default style). */
  const [previewCast, setPreviewCast] = useState<CastStyle | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(384);
  const [previewEnhanced, setPreviewEnhanced] = useState<boolean>(false);
  const [importExportModal, setImportExportModal] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  useLang();
  const view = useView();
  const [step, setStep] = useState<Step>('origin');
  const [hover, setHover] = useState<Hover | null>(null);
  const [openSlot, setOpenSlot] = useState<SlotKey | null>(null);
  const [focusStat, setFocusStat] = useState<keyof AbilityScores>('dex');
  /** The appearance section open: the head brings the camera to the face, as in Baldur's Gate 3. */
  const [lookGroup, setLookGroup] = useState<AppearanceGroup>('body');
  /** The jutsu the last change of chakra type swapped, to tell the player (shown while that type stays). */
  const [natureSwaps, setNatureSwaps] = useState<{ nature: ChakraNature; swaps: JutsuSwap[] } | null>(null);

  const look = useMemo(() => getAppearance(character), [character]);
  const eye = dojutsuToEye(character.dojutsu);

  /** Armor equipped on the sprite decides the armor style used for AC. */
  const armorStyleFor = (l: SpriteAppearance): ArmorStyleType =>
    ((l.slots.armor && getItem(l.slots.armor.id)?.statsArmor) || 'Ronin Wanderer Cloak') as ArmorStyleType;

  // Recompute derived stats whenever stats, clan, class or armor change; an edited character starts fresh.
  const calculateDerived = (
    stats: AbilityScores,
    clan: ClanType,
    cls: ShinobiClassType,
    armor: ArmorStyleType,
    feats: string[]
  ) => {
    const d = deriveStats({ level: character.level, stats, clan, shinobiClass: cls, armor, feats });
    return { ...d, currentHp: d.maxHp, currentChakra: d.maxChakra };
  };

  /** Sets (or clears, with '') the cast style of one jutsu and previews it. */
  const setJutsuCast = (jutsuId: string, style: CastStyle | '') => {
    const cast = look.cast ?? { style: defaultCastStyle(look) };
    const jutsu = { ...(cast.jutsu ?? {}) };
    if (style) jutsu[jutsuId] = style;
    else delete jutsu[jutsuId];
    updateLook({ ...look, cast: { ...cast, jutsu } });
    setPreviewCast(style || null);
    setPreviewStance('cast');
  };

  const updateLook = (picked: SpriteAppearance) => {
    // A made ninja's chakra type is fixed (the owner, 2026-10-21): its burst may change within the type, never the type.
    const next = typeFixed(character) && chakraNature(picked.chakra) !== natureOf(character) ? { ...picked, chakra: look.chakra } : picked;
    const armorStyle = armorStyleFor(next);
    const auraHex = chakraHex(next.chakra);
    const derived =
      armorStyle !== character.armorStyle
        ? calculateDerived(character.stats, character.clan, character.shinobiClass, armorStyle, character.selectedFeats)
        : {};
    // The chakra type is the nature, and the nature decides the elemental jutsu: a new type swaps the
    // jutsu of another element for ones of its own (rules/jutsuNature.ts), at the ranks a new ninja may
    // take (rules/progression.ts), and says which.
    const nature = chakraNature(next.chakra);
    const fitted = nature !== natureOf(character) ? fitLoadout(character.selectedJutsus, nature, character.clan, (j) => rankOpen(j, character.clan)) : null;
    if (fitted) setNatureSwaps(fitted.swaps.length ? { nature, swaps: fitted.swaps } : null);
    setCharacter({
      ...character,
      appearance: next,
      armorStyle,
      palette: { ...character.palette, chakraAuraColor: auraHex },
      ...(fitted ? { selectedJutsus: fitted.loadout } : {}),
      ...derived,
    });
  };

  const handleClanChange = (newClan: ClanType) => {
    soundManager.playSelect();
    const clanInfo = CLANS_DATA[newClan];
    const newDojutsu = clanInfo.availableDojutsu[0];
    const newJutsus = { ...character.selectedJutsus, slot4Clan: clanInfo.signatureJutsuId };

    const derived = calculateDerived(
      character.stats,
      newClan,
      character.shinobiClass,
      character.armorStyle,
      character.selectedFeats
    );

    // The clan leaves the chakra alone: its type is the ninja's nature, the player's own choice in
    // Appearance > Chakra. A sheet older than the sprite look draws its burst from the aura colour,
    // so writing the clan's colour there would change that ninja's nature.
    setCharacter({
      ...character,
      clan: newClan,
      dojutsu: newDojutsu,
      palette: {
        ...character.palette,
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
    const clans = Object.keys(CLANS_DATA) as ClanType[];
    const randomClan = clans[Math.floor(Math.random() * clans.length)];
    const clanInfo = CLANS_DATA[randomClan];

    const randomClass = (Object.keys(SHINOBI_CLASSES) as ShinobiClassType[])[
      Math.floor(Math.random() * Object.keys(SHINOBI_CLASSES).length)
    ];

    const randomDojutsu = clanInfo.availableDojutsu[Math.floor(Math.random() * clanInfo.availableDojutsu.length)];
    // A made ninja keeps its chakra type (and the look of its chakra).
    const rolled = randomAppearance();
    const randomLook = typeFixed(character) ? { ...rolled, chakra: look.chakra } : rolled;
    const randomArmor = armorStyleFor(randomLook);
    // Jutsu a new ninja may learn, of its own nature: Element I of its element when there is one,
    // Element II any other it may learn; the clan secret is its clan's, and the S-rank slot is empty
    // until it opens (rules/progression.ts).
    const nature = chakraNature(randomLook.chakra);
    const one = <J,>(xs: J[]): J | undefined => xs[Math.floor(Math.random() * xs.length)];
    const own = <J extends { nature: string }>(xs: J[]): J[] => (xs.some((j) => j.nature === nature) ? xs.filter((j) => j.nature === nature) : xs);
    const element1 = one(own(creatorChoices('slot2Elemental', nature, randomClan)));
    const element2 = one(creatorChoices('slot3Elemental', nature, randomClan).filter((j) => j.id !== element1?.id)) ?? element1;
    const ultimate = one(own(creatorChoices('slot5Ultimate', nature, randomClan)));

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
      armorStyle: randomArmor,
      dojutsu: randomDojutsu,
      stats: randomizedStats,
      selectedJutsus: fitNewNinja(
        {
          ...character.selectedJutsus,
          slot2Elemental: element1?.id ?? '',
          slot3Elemental: element2?.id ?? '',
          slot4Clan: clanInfo.signatureJutsuId,
          slot5Ultimate: ultimate?.id ?? '',
        },
        nature,
        randomClan,
      ).loadout,
      appearance: randomLook,
      palette: {
        ...character.palette,
        chakraAuraColor: chakraHex(randomLook.chakra),
      },
      ...derived,
    });
    setNatureSwaps(null);
  };

  const handleExport = () => {
    const jsonStr = JSON.stringify(character, null, 2);
    setImportJsonText(jsonStr);
    setImportError('');
    setImportExportModal(true);
  };

  const handleImportApply = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJsonText);
    } catch {
      setImportError('This text is not valid JSON. Paste the whole sheet exported from the creator.');
      return;
    }
    const imported = characterFromImport(parsed);
    if (!imported) {
      setImportError('This JSON is not a character sheet: it needs at least a clan and ability scores.');
      return;
    }
    setImportError('');
    setCharacter(imported);
    setNatureSwaps(null);
    setImportExportModal(false);
    soundManager.playSelect();
  };

  // The jutsu each slot offers: the Element and S-rank slots only those of the ninja's nature, plus
  // the ones with no element (rules/jutsuNature.ts). A jutsu already chosen of another element (a
  // legend's second element, an older sheet) stays until the slot or the type is changed.
  const nature = natureOf(character);
  const offNature = new Set(offNatureJutsus(character.selectedJutsus, nature));
  // A new ninja learns rank D and C jutsu and its clan's (rules/progression.ts); a sheet's own jutsu of
  // a higher rank (a legend's, an older sheet's) stay, marked.
  const highRank = new Set(aboveRank(character.selectedJutsus, character.clan));
  const jutsuTitle = (id: string) => (id ? jutsuParts(JUTSUS_DATA.find((j) => j.id === id) ?? { name: id })[0] : T('slotEmptied'));
  // Only the swaps the player has not changed since: a slot picked again drops out of the note.
  const swapsKept = natureSwaps && natureSwaps.nature === nature ? natureSwaps.swaps.filter((x) => character.selectedJutsus[x.slot] === x.to) : [];
  const natureSwapText = swapsKept.length
    ? T('natureSwaps', { n: L(nature), list: swapsKept.map((x) => `${jutsuTitle(x.from)} → ${jutsuTitle(x.to)}`).join('; ') })
    : undefined;

  // --- the stage: the forest, the ninja standing in it, the panels at its sides ---------------
  const wide = view.w >= 1100;
  /** Where the ninja's head is on its sprite (fine pixels), for the close-up on the face. */
  const headAt = useMemo(() => {
    const r = renderSpriteCached(look, 'idle', 0, eye).rig.head;
    return { x: r.x * RES, y: r.y * RES };
  }, [look, eye]);
  const ground = forestGround(view.w, view.h);
  /** The ninja's scale: whole steps, as big as fits between the step tabs and the ground. */
  const k = wide ? Math.max(2, Math.min(5, Math.floor((ground - 170) / 110))) : 3;
  const stepIdx = STEPS.indexOf(step);
  const presetOf = LEGENDARY_PRESETS.findIndex((p) => p.character.id === character.id);
  const go = (s: Step) => {
    soundManager.playSelect();
    setHover(null);
    setStep(s);
  };
  const back = () => (stepIdx === 0 ? onCancel?.() : go(STEPS[stepIdx - 1]));
  const next = () => {
    if (stepIdx < STEPS.length - 1) return go(STEPS[stepIdx + 1]);
    soundManager.playCriticalHit();
    // Accepting makes the ninja: from now on its chakra type is fixed.
    onSave(asMade(character));
  };
  const shown: Hover =
    hover ??
    (step === 'origin'
      ? presetOf >= 0
        ? { kind: 'preset', i: presetOf }
        : { kind: 'custom' }
      : step === 'clan'
        ? { kind: 'clan', id: character.clan }
        : step === 'class'
          ? { kind: 'class', id: character.shinobiClass }
          : step === 'abilities'
            ? { kind: 'stat', id: focusStat }
            : step === 'jutsus'
              ? { kind: 'jutsu', id: (openSlot && character.selectedJutsus[openSlot]) || character.selectedJutsus.slot1Utility }
              : { kind: 'look' });
  const hoverOn = (h: Hover) => (on: boolean) => setHover(on ? h : null);

  const slots: { key: SlotKey; label: string; list: typeof JUTSUS_DATA; fixed?: boolean }[] = [
    { key: 'slot1Utility', label: T('slotUtility'), list: creatorChoices('slot1Utility', nature, character.clan) },
    { key: 'slot2Elemental', label: T('slotElementA'), list: creatorChoices('slot2Elemental', nature, character.clan) },
    { key: 'slot3Elemental', label: T('slotElementB'), list: creatorChoices('slot3Elemental', nature, character.clan) },
    { key: 'slot4Clan', label: T('slotClan'), list: creatorChoices('slot4Clan', nature, character.clan), fixed: true },
    { key: 'slot5Ultimate', label: T('slotUltimate'), list: creatorChoices('slot5Ultimate', nature, character.clan) },
  ];

  const leftTitle = { origin: T('pickOrigin'), clan: T('pickClan'), class: T('pickClass'), appearance: T('stepAppearance'), abilities: T('pickAbilities'), jutsus: T('pickJutsus') }[step];

  const list = (
    <div className="flex flex-col gap-0.5 p-2">
      {step === 'origin' && (
        <>
          <Row
            selected={presetOf < 0}
            onClick={() => {
              soundManager.playSelect();
              // A copy of a legend is a new ninja of its own: not made yet, at a new ninja's ranks.
              if (presetOf >= 0) {
                const { created: _made, ...copy } = character;
                setCharacter(asNewNinja({ ...copy, id: `ninja_${Date.now().toString(36)}` }));
              }
              setNatureSwaps(null);
            }}
            onHover={hoverOn({ kind: 'custom' })}
            icon={<Seal letter="+" color="#c99a4b" />}
            title={T('custom')}
            sub={T('customSub')}
          />
          <Heading>{T('legends')}</Heading>
          {LEGENDARY_PRESETS.map((p, i) => (
            <Row
              key={p.name}
              selected={presetOf === i}
              onClick={() => {
                soundManager.playCriticalHit();
                setCharacter(p.character);
                setNatureSwaps(null);
              }}
              onHover={hoverOn({ kind: 'preset', i })}
              icon={<Portrait character={p.character} />}
              title={pick(p.name, p.nameEs)}
              sub={pick(p.tag, p.tagEs)}
            />
          ))}
        </>
      )}
      {step === 'clan' &&
        (Object.keys(CLANS_DATA) as ClanType[]).map((id) => {
          const c = CLANS_DATA[id];
          const on = character.clan === id;
          return (
            <React.Fragment key={id}>
              <Row
                selected={on}
                onClick={() => handleClanChange(id)}
                onHover={hoverOn({ kind: 'clan', id })}
                icon={<Seal letter={c.name[0]} color={c.recommendedChakraColor} />}
                title={c.name}
                sub={c.japaneseName}
                right={<span className="text-[11px] text-[#d9b46a]">{c.statBonuses.map((b) => `+${b.bonus} ${statShort(b.stat)}`).join(' ')}</span>}
              />
              {/* The clan's eyes come under it, as a race's subraces do. */}
              {on &&
                c.availableDojutsu.length > 1 &&
                c.availableDojutsu.map((d) => (
                  <Row
                    key={d}
                    indent
                    selected={character.dojutsu === d}
                    onClick={() => {
                      soundManager.playSelect();
                      setCharacter({
                        ...character,
                        dojutsu: d,
                        palette: { ...character.palette, eyeColor: d.includes('Sharingan') ? '#ef4444' : d.includes('Byakugan') ? '#e0e7ff' : character.palette.eyeColor },
                      });
                    }}
                    onHover={hoverOn({ kind: 'dojutsu', id: d })}
                    title={dojutsuName(d)}
                  />
                ))}
            </React.Fragment>
          );
        })}
      {step === 'class' &&
        (Object.keys(SHINOBI_CLASSES) as ShinobiClassType[]).map((id) => (
          <Row
            key={id}
            selected={character.shinobiClass === id}
            onClick={() => handleClassChange(id)}
            onHover={hoverOn({ kind: 'class', id })}
            icon={<Seal letter={id[0]} color="#c99a4b" />}
            title={className(id)}
            sub={T('castsWith', { stat: statLong(SHINOBI_CLASSES[id].castingStat) })}
          />
        ))}
      {step === 'abilities' && (
        <>
          {STATS.map((s) => {
            const base = character.stats[s];
            const bonus = clanBonus(character.clan)[s] ?? 0;
            const val = base + bonus;
            const mod = Math.floor((val - 10) / 2);
            return (
              <div
                key={s}
                onMouseEnter={() => setHover({ kind: 'stat', id: s })}
                onMouseLeave={() => setHover(null)}
                onClick={() => setFocusStat(s)}
                className={`flex items-center gap-3 px-3 py-2 border cursor-pointer ${focusStat === s ? 'border-[#c99a4b] bg-[rgba(242,196,109,0.08)]' : 'border-transparent hover:border-[#5b4426]'}`}
              >
                <div className="min-w-0 flex-1">
                  <div style={serif} className="font-semibold tracking-wide text-[#efe3c4]">
                    {statLong(s)}
                  </div>
                  <div className="text-[11px] text-[#b9a98a]">
                    {T('base', { n: base })}
                    {bonus > 0 && <span className="text-[#f2c46d]"> +{bonus} {clanName(character.clan)}</span>}
                  </div>
                </div>
                <button type="button" aria-label="-" onClick={() => handleStatChange(s, -1)} className="w-7 h-7 border border-[#6b5434] bg-[#1d1812] text-[#efe3c4] hover:border-[#c99a4b] hover:text-[#f2c46d] font-bold">
                  −
                </button>
                <div className="w-14 text-center">
                  <div style={serif} className="text-xl font-bold text-[#f2c46d] leading-none">
                    {val}
                  </div>
                  <div className="text-[11px] text-[#b9a98a]">{mod >= 0 ? `+${mod}` : mod}</div>
                </div>
                <button type="button" aria-label="+" onClick={() => handleStatChange(s, 1)} className="w-7 h-7 border border-[#6b5434] bg-[#1d1812] text-[#efe3c4] hover:border-[#c99a4b] hover:text-[#f2c46d] font-bold">
                  +
                </button>
              </div>
            );
          })}
          <Heading>{T('feats', { n: character.selectedFeats.length })}</Heading>
          {SHINOBI_FEATS.map((f) => (
            <Row
              key={f.id}
              selected={character.selectedFeats.includes(f.id)}
              onClick={() => handleFeatToggle(f.id)}
              onHover={hoverOn({ kind: 'feat', id: f.id })}
              title={pick(f.name, f.nameEs)}
            />
          ))}
        </>
      )}
      {step === 'jutsus' && (
        <div className="px-3 pb-2 space-y-1.5">
          <p className="text-[12px] leading-snug text-[#b9a98a]">{T(chakraType(nature).elemental ? 'natureRule' : 'natureRuleNone', { n: L(nature) })}</p>
          <p className="text-[12px] leading-snug text-[#b9a98a]">{T('rankRule')}</p>
          {natureSwapText && <p className="text-[12px] leading-snug text-[#f2c46d] border border-[#6b5434] bg-[#3a2a12]/60 px-2 py-1">{natureSwapText}</p>}
        </div>
      )}
      {step === 'jutsus' &&
        slots.map((slot) => {
          const chosen = JUTSUS_DATA.find((j) => j.id === character.selectedJutsus[slot.key]);
          const open = openSlot === slot.key;
          // Nothing to offer a new ninja here (the S-rank slot): shown locked, in its place.
          if (!chosen && !slot.list.length)
            return (
              <Row
                key={slot.key}
                onClick={() => undefined}
                onHover={hoverOn({ kind: 'locked', slot: slot.label })}
                icon={
                  <span className="grid place-items-center border border-[#6b5434] bg-[radial-gradient(circle,#2a2016,#0e0b08)] text-[#8a7a5c]" style={{ width: 38, height: 38 }}>
                    <Lock className="w-4 h-4" />
                  </span>
                }
                title={T('slotLocked')}
                sub={T('slotLockedSub', { slot: slot.label })}
              />
            );
          const mark = chosen && offNature.has(chosen.id) ? T('offNature') : chosen && highRank.has(chosen.id) ? T('aboveRank', { r: chosen.rank }) : null;
          return (
            <React.Fragment key={slot.key}>
              <Row
                selected={open}
                onClick={() => {
                  soundManager.playSelect();
                  setOpenSlot(open ? null : slot.key);
                }}
                onHover={chosen ? hoverOn({ kind: 'jutsu', id: chosen.id }) : undefined}
                icon={<JutsuIcon id={chosen?.id} nature={chosen?.nature} />}
                title={chosen ? jutsuParts(chosen)[0] : '—'}
                sub={
                  chosen && mark ? (
                    // the mark on a line of its own, so a narrow panel never cuts it off
                    <>
                      <span className="block truncate">{`${slot.label} · ${jutsuParts(chosen)[1]}`}</span>
                      <span className="block truncate text-[#e8956a]">{mark}</span>
                    </>
                  ) : chosen ? (
                    `${slot.label} · ${jutsuParts(chosen)[1]}`
                  ) : (
                    slot.label
                  )
                }
                right={<span className="text-[#b9a98a] text-xs">{open ? '▾' : '▸'}</span>}
              />
              {open &&
                slot.list.map((j) => (
                  <Row
                    key={j.id}
                    indent
                    disabled={slot.fixed}
                    selected={character.selectedJutsus[slot.key] === j.id}
                    onClick={() => {
                      if (slot.fixed) return;
                      soundManager.playSelect();
                      setCharacter({ ...character, selectedJutsus: { ...character.selectedJutsus, [slot.key]: j.id } });
                    }}
                    onHover={hoverOn({ kind: 'jutsu', id: j.id })}
                    icon={<JutsuIcon id={j.id} nature={j.nature} small />}
                    title={jutsuParts(j)[0]}
                    sub={`${jutsuParts(j)[1] ? `${jutsuParts(j)[1]} · ` : ''}${T('rank', { r: j.rank })} · ${T('chakra', { n: j.chakraCost })}${j.damageDice ? ` · ${j.damageDice}` : ''}`}
                  />
                ))}
              {/* A legend's S-rank jutsu: kept, with nothing a new ninja may pick in its place. */}
              {open && !slot.list.length && <p className="pl-8 pr-3 py-1.5 text-[12px] text-[#b9a98a]">{T('slotLocked')}</p>}
            </React.Fragment>
          );
        })}
      {/* The explosive tag is a consumable item, not a jutsu (the owner, 2026-10-21): it is shown with
          the jutsu as the tool every ninja can use, and what this ninja carries in its own pouch. */}
      {step === 'jutsus' && (
        <>
          <Heading>{T('tools')}</Heading>
          <Row
            onClick={() => soundManager.playSelect()}
            onHover={hoverOn({ kind: 'tool' })}
            icon={
              <span className="grid place-items-center border border-[#6b5434] bg-[radial-gradient(circle,#3a2a12,#14110d)] text-[#f2c46d]" style={{ width: 38, height: 38 }}>
                <Bomb className="w-5 h-5" />
              </span>
            }
            title={T('tagName')}
            sub={T('tagSub')}
            right={pouchTags(character) ? <span className="text-[11px] text-[#f2c46d]">{T('tagPouch', { n: pouchTags(character) })}</span> : undefined}
          />
        </>
      )}
      {step === 'appearance' && (
        <div className="p-1">
          <AppearanceEditor look={look} eye={eye} character={character} onChange={updateLook} onPreviewStance={setPreviewStance} onGroup={setLookGroup} chakraNote={natureSwapText} typeFixed={typeFixed(character)} />
        </div>
      )}
    </div>
  );

  const sheet = (
    <div className="grid grid-cols-3 gap-1.5 text-center">
      {[
        [T('hp'), character.maxHp],
        [T('chakraMax'), character.maxChakra],
        [T('ac'), character.armorClass],
        [T('dc'), character.jutsuSaveDC],
        [T('atk'), `+${character.jutsuAttackBonus}`],
        [T('speed'), T('tiles', { n: character.speed })],
      ].map(([l, v]) => (
        <div key={String(l)} className="border border-[#3d3122] bg-black/30 px-1 py-1.5">
          <div className="text-[10px] uppercase tracking-wider text-[#b9a98a]">{l}</div>
          <div style={serif} className="text-base font-bold text-[#f2c46d]">
            {v}
          </div>
        </div>
      ))}
      {/* The chakra type picked in Appearance > Chakra is the ninja's elemental nature. */}
      <div className="col-span-3 flex items-baseline justify-center gap-2 border border-[#3d3122] bg-black/30 px-1 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-[#b9a98a]">{T('nature')}</span>
        <span style={serif} className="text-base font-bold text-[#f2c46d]">
          {L(natureOf(character))}
        </span>
      </div>
    </div>
  );

  const detail = (() => {
    const h = shown;
    if (h.kind === 'custom')
      return { title: T('custom'), sub: T('customSub'), body: <Parchment>{T('customText')}</Parchment> };
    if (h.kind === 'preset') {
      const p = LEGENDARY_PRESETS[h.i];
      const c = p.character;
      const js = [...new Set(Object.values(c.selectedJutsus))].map((id) => JUTSUS_DATA.find((j) => j.id === id)).filter(Boolean) as typeof JUTSUS_DATA;
      return {
        title: pick(p.name, p.nameEs),
        sub: pick(p.tag, p.tagEs),
        body: (
          <>
            <Parchment>
              <p>
                <b>{clanName(c.clan)}</b> · {className(c.shinobiClass)} · {T('level', { n: c.level })}
              </p>
              <p className="mt-1">{pick(CLANS_DATA[c.clan].description, CLANS_DATA[c.clan].descriptionEs)}</p>
            </Parchment>
            <Heading>{T('jutsus')}</Heading>
            <ul className="flex flex-col gap-1 px-1">
              {js.map((j) => (
                <li key={j.id} className="flex items-center gap-2 text-[13px] text-[#efe3c4]">
                  <JutsuIcon id={j.id} nature={j.nature} small />
                  {jutsuName(j)}
                </li>
              ))}
            </ul>
          </>
        ),
      };
    }
    if (h.kind === 'clan' || h.kind === 'dojutsu') {
      const id = h.kind === 'clan' ? h.id : character.clan;
      const c = CLANS_DATA[id];
      return {
        title: h.kind === 'dojutsu' ? dojutsuName(h.id) : c.name,
        sub: c.japaneseName,
        body: (
          <>
            <Parchment>{pick(c.description, c.descriptionEs)}</Parchment>
            <Heading>{T('clanBonus')}</Heading>
            <div className="flex flex-wrap gap-1.5 px-3">
              {c.statBonuses.map((b) => (
                <Chip key={b.stat}>
                  +{b.bonus} {statLong(b.stat)}
                </Chip>
              ))}
            </div>
            <Heading>{T('lineage')}</Heading>
            <ul className="flex flex-col gap-2 px-3 pb-3">
              {traits(pick(c.lineageTraits, c.lineageTraitsEs)).map((t, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-[#d9caa6]">
                  {t.name && <b className="text-[#f2c46d]">{t.name}: </b>}
                  {t.text}
                </li>
              ))}
            </ul>
          </>
        ),
      };
    }
    if (h.kind === 'class') {
      const c = SHINOBI_CLASSES[h.id];
      return {
        title: className(h.id),
        sub: T('castsWith', { stat: statLong(c.castingStat) }),
        body: (
          <>
            <Parchment>{pick(c.description, c.descriptionEs)}</Parchment>
            <Heading>{T('classFeatures')}</Heading>
            <p className="px-3 text-[13px] leading-relaxed text-[#d9caa6]">{pick(c.classFeatures, c.classFeaturesEs)}</p>
            <Heading>{T('dice')}</Heading>
            <div className="flex flex-wrap gap-1.5 px-3 pb-3">
              <Chip>{T('hitDie', { n: c.hitDie })}</Chip>
              <Chip>{T('chakraDie', { n: c.chakraDie })}</Chip>
              {c.savingProficiencies.map((s) => (
                <Chip key={s} tone="dark">
                  {T('save', { s })}
                </Chip>
              ))}
            </div>
          </>
        ),
      };
    }
    if (h.kind === 'stat')
      return {
        title: statLong(h.id),
        sub: statShort(h.id),
        body: (
          <>
            <Parchment>{T(`about_${h.id}` as TK)}</Parchment>
            <Heading>{T('sheet')}</Heading>
            <div className="px-3 pb-3">{sheet}</div>
          </>
        ),
      };
    if (h.kind === 'feat') {
      const f = SHINOBI_FEATS.find((x) => x.id === h.id)!;
      return { title: pick(f.name, f.nameEs), sub: T('feat'), body: <Parchment>{pick(f.description, f.descriptionEs)}</Parchment> };
    }
    if (h.kind === 'tool')
      return {
        title: T('tagName'),
        sub: T('tagSub'),
        body: (
          <>
            <div className="flex justify-center pt-3">
              <span className="grid place-items-center border border-[#6b5434] bg-[radial-gradient(circle,#3a2a12,#14110d)] text-[#f2c46d]" style={{ width: 88, height: 88 }}>
                <Bomb className="w-10 h-10" />
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 px-3 pt-3">
              <Chip>3d6</Chip>
              <Chip tone="dark">{T('save', { s: pick('DEX', 'DES') })}</Chip>
              <Chip tone="dark">{T('tagReach')}</Chip>
            </div>
            <div className="p-3">
              <Parchment>{T('tagText')}</Parchment>
            </div>
            {pouchTags(character) > 0 && <p className="px-3 text-[13px] leading-relaxed text-[#f2c46d]">{T('tagPouchText', { n: pouchTags(character) })}</p>}
          </>
        ),
      };
    if (h.kind === 'locked')
      return { title: h.slot, sub: T('slotLocked'), body: <Parchment>{T('rankRule')}</Parchment> };
    if (h.kind === 'jutsu') {
      const j = JUTSUS_DATA.find((x) => x.id === h.id);
      if (!j) return { title: '—', body: null };
      return {
        title: jutsuName(j),
        sub: `${j.japaneseName} · ${T('rank', { r: j.rank })}`,
        body: (
          <>
            <div className="flex justify-center pt-3">
              <JutsuIcon id={j.id} nature={j.nature} big />
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 px-3 pt-3">
              <Chip>{T('chakra', { n: j.chakraCost })}</Chip>
              {j.damageDice && <Chip>{j.damageDice}</Chip>}
              {j.savingThrow && <Chip tone="dark">{T('save', { s: j.savingThrow })}</Chip>}
              <Chip tone="dark">{T('reach', { n: j.range })}</Chip>
            </div>
            <div className="p-3">
              <Parchment>{pick(j.description, j.descriptionEs)}</Parchment>
            </div>
            <Heading>{T('enhanced')}</Heading>
            <p className="px-3 text-[13px] leading-relaxed text-[#d9caa6]">
              {T('chakra', { n: j.enhancementChakraCost })} · {j.enhancementEffect}
            </p>
            {Object.values(character.selectedJutsus).includes(j.id) && (
              <>
                <Heading>{T('castStyle')}</Heading>
                <div className="px-3 pb-3">
                  <select
                    value={look.cast?.jutsu?.[j.id] ?? ''}
                    onChange={(e) => {
                      soundManager.playSelect();
                      setJutsuCast(j.id, e.target.value as CastStyle | '');
                    }}
                    className="w-full border border-[#6b5434] bg-[#14110d] p-2 text-[13px] text-[#efe3c4]"
                  >
                    <option value="">{T('castDefault', { s: L(CAST_STYLE_INFO[defaultCastStyle(look)].label) })}</option>
                    {CAST_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {L(CAST_STYLE_INFO[s].label)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </>
        ),
      };
    }
    // Appearance: the sheet and the chakra aura.
    return {
      title: character.name || T('unnamed'),
      sub: `${clanName(character.clan)} · ${className(character.shinobiClass)} · ${T('level', { n: character.level })}`,
      body: (
        <div className="p-3 flex flex-col gap-3">
          {sheet}
          <button
            type="button"
            onClick={() => {
              soundManager.playChakraSurge();
              setPreviewEnhanced(!previewEnhanced);
            }}
            className={`w-full px-3 py-2 text-xs font-semibold border ${previewEnhanced ? 'border-[#f2c46d] text-[#f2c46d] bg-[#3a2a12]' : 'border-[#6b5434] text-[#efe3c4] bg-[#1d1812]'}`}
          >
            {T(previewEnhanced ? 'auraOn' : 'auraOff')}
          </button>
        </div>
      ),
    };
  })();

  const faceCam = wide && step === 'appearance' && lookGroup === 'head';
  /** The ninja: the whole frame on the stage (room for long weapons), its box in the phone column. */
  const figure = (full: boolean) => (
    <ShinobiSpriteCanvas
      character={character}
      appearance={look}
      stance={previewStance}
      castStyle={previewStance === 'cast' ? previewCast ?? undefined : undefined}
      size={(full ? GRID : BOX.w) * k}
      frame={full ? 'full' : 'body'}
      isEnhanced={previewEnhanced}
      showAura={true}
    />
  );

  const nameplate = (
    <label className="group relative flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#b9a98a] [text-shadow:0_1px_0_#000]">{T('name')}</span>
      <span className="relative mt-1 flex items-center border-2 border-[#8a6a3a] bg-[linear-gradient(180deg,#34373d,#1c1d21)] px-1 shadow-[0_6px_24px_rgba(0,0,0,0.7)]">
        <span className="text-[#c99a4b] px-2 select-none" aria-hidden>
          ❖
        </span>
        <input
          value={character.name}
          onChange={(e) => setCharacter({ ...character, name: e.target.value })}
          placeholder={T('namePh')}
          maxLength={28}
          style={serif}
          className="w-[16rem] bg-transparent py-1.5 text-center text-xl font-bold tracking-wider text-[#efe3c4] outline-none placeholder:text-[#6b5a44]"
        />
        <span className="text-[#c99a4b] px-2 select-none" aria-hidden>
          ❖
        </span>
      </span>
    </label>
  );

  const stances = (
    <div className="flex flex-wrap justify-center gap-1 border border-[#6b5434] bg-[rgba(20,17,13,0.85)] p-1 shadow-[0_6px_24px_rgba(0,0,0,0.7)]">
      {SPRITE_POSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => {
            soundManager.playSelect();
            setPreviewStance(s);
            setPreviewCast(null);
          }}
          className={`px-2.5 py-1 text-[11px] font-semibold border ${previewStance === s ? 'border-[#f2c46d] text-[#1c1206] bg-[linear-gradient(180deg,#f6d58e,#c99a4b)]' : 'border-[#3d3122] text-[#d9caa6] bg-[#1d1812] hover:border-[#8a6a3a]'}`}
        >
          {T(`pose_${s}` as TK)}
        </button>
      ))}
    </div>
  );

  const tabs = <StepTabs steps={STEPS} active={step} onPick={go} label={(s) => T(`step_${s}` as TK)} icon={(s) => STEP_ICON[s]} />;
  const tools = (
    <div className="flex items-center gap-2">
      <IronButton onClick={handleRandomize} title={T('randomize')}>
        <Dice5 className="w-3.5 h-3.5" />
        {wide && T('randomize')}
      </IronButton>
      <IronButton onClick={handleExport} title={T('exportImport')}>
        <Download className="w-3.5 h-3.5" />
        {wide && T('exportImport')}
      </IronButton>
    </div>
  );
  const backLabel = stepIdx === 0 ? T('mainMenu') : T('back');
  const nextLabel = stepIdx === STEPS.length - 1 ? T('accept') : T('next');

  return (
    <div className="creator-bg3 fixed inset-0 z-30 overflow-hidden bg-black text-[#efe3c4]">
      <ForestScene className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_55%,rgba(0,0,0,0)_40%,rgba(0,0,0,0.6)_100%)]" />
      {wide ? (
        <>
          <div className="absolute inset-x-0 top-0 h-28 pointer-events-none bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute left-6 top-5">
            <div style={serif} className="text-[11px] uppercase tracking-[0.3em] text-[#b9a98a] [text-shadow:0_1px_0_#000]">
              Shinobi 5e Chronicles
            </div>
            <h1 style={serif} className="text-2xl font-bold tracking-wide text-[#f2c46d] [text-shadow:0_2px_0_#000]">
              {T('title')}
            </h1>
          </div>
          {/* over the ninja: a raised weapon or a burst of chakra may reach up to them */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 z-10">{tabs}</div>
          <div className="absolute right-6 top-6 z-10">{tools}</div>

          {/* The ninja, under the panels (the close-up on the face grows past them). The camera comes in on
              the face while the head is being edited: the sprite doubles around its head. */}
          <div
            className="absolute"
            style={{
              left: view.w / 2 - FEET.x * k,
              top: ground - FEET.y * k,
              pointerEvents: 'none',
              transform: faceCam ? 'scale(2)' : 'none',
              transformOrigin: `${headAt.x * k}px ${headAt.y * k}px`,
              transition: 'transform 380ms ease-out',
            }}
          >
            {figure(true)}
          </div>
          <Frame className={`absolute left-6 top-[112px] bottom-[96px] ${step === 'appearance' ? 'w-[min(34vw,560px)]' : 'w-[min(26vw,400px)]'}`} title={leftTitle} sub={T(`stepHint_${step}` as TK)}>
            {list}
          </Frame>
          <Frame className="absolute right-6 top-[112px] bottom-[96px] w-[min(27vw,420px)]" title={detail.title} sub={detail.sub}>
            <div className="pb-3">{detail.body}</div>
          </Frame>

          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 132 }}>
            {nameplate}
          </div>
          {/* The pose bar stays between the side panels (it wraps when they leave too little room): it
              must not cover the panel's options. The widths mirror the panels' classes above. */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: Math.min(ground + 18, view.h - 140),
              maxWidth:
                2 *
                  Math.min(
                    view.w / 2 - 24 - (step === 'appearance' ? Math.min(view.w * 0.34, 560) : Math.min(view.w * 0.26, 400)),
                    view.w / 2 - 24 - Math.min(view.w * 0.27, 420)
                  ) -
                24,
            }}
          >
            {stances}
          </div>

          <div className="absolute left-6 bottom-6">
            <BigButton onClick={back}>‹ {backLabel}</BigButton>
          </div>
          <div className="absolute right-6 bottom-6">
            <BigButton tone="gold" onClick={next}>
              {nextLabel} ›
            </BigButton>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <h1 style={serif} className="text-lg font-bold text-[#f2c46d]">
                {T('title')}
              </h1>
              {tools}
            </div>
            <div className="overflow-x-auto pb-1">{tabs}</div>
            <div className="flex justify-center">{nameplate}</div>
            <div className="flex justify-center">{figure(false)}</div>
            {stances}
            <Frame title={leftTitle} sub={T(`stepHint_${step}` as TK)}>
              {list}
            </Frame>
            <Frame title={detail.title} sub={detail.sub}>
              <div className="pb-3">{detail.body}</div>
            </Frame>
            <div className="flex justify-between gap-2 pb-6">
              <BigButton onClick={back}>‹ {backLabel}</BigButton>
              <BigButton tone="gold" onClick={next}>
                {nextLabel} ›
              </BigButton>
            </div>
          </div>
        </div>
      )}

      {/* Export / import */}
      {importExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <Frame className="w-full max-w-xl" title={T('exportImport')}>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs text-[#b9a98a]">{T('exportText')}</p>
              <textarea
                rows={12}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full border border-[#3d3122] bg-black/50 p-3 font-mono text-xs text-[#efe3c4] outline-none focus:border-[#8a6a3a]"
              />
              {importError && <p className="text-xs text-[#ff9a7a]">{importError}</p>}
              <div className="flex items-center justify-end gap-2">
                <IronButton onClick={() => setImportExportModal(false)}>{T('close')}</IronButton>
                <BigButton tone="gold" onClick={handleImportApply}>
                  {T('applyImport')}
                </BigButton>
              </div>
            </div>
          </Frame>
        </div>
      )}
    </div>
  );
};
