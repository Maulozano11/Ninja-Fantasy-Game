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
import { importedSlots, offNatureJutsus, type JutsuSwap } from '../rules/jutsuNature';
import { aboveRank, asMade, creatorChoices, fitNewNinja, fitToClass, fitToGrowth, fitToType, isLegend, learnable, learnsAsNew, RANK_A_LEVEL, RANK_S_LEVEL, slotChoices, slotOpensAt, typeFixed } from '../rules/progression';
import {
  chooseGrowth,
  chooseThirdElement,
  earnedGrowth,
  GROWTH_LEVEL,
  growthFixed,
  growthOf,
  growthOpen,
  hasSecondElement,
  naturesOf,
  otherElements,
  THIRD_ELEMENT_FEAT,
  THIRD_ELEMENT_LEVEL,
  thirdElementOpen,
} from '../rules/natureGrowth';
import { featNeeds, featOpen, keepEarnedFeats } from '../rules/feats';
import { classStyle, offClassJutsus } from '../rules/jutsuClass';
import { pouchTags } from '../rules/pouch';
import { chakraNature, chakraType } from '../sprite/chakraNature';
import type { ChakraNature, NatureGrowth } from '../types/shinobi';
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
  // explosive tag jutsu goes through, and migrateCharacter turns it into the item (rules/jutsuNature.ts)
  out.selectedJutsus = importedSlots(isObj(out.selectedJutsus) ? out.selectedJutsus : {}, DEFAULT_CHARACTER.selectedJutsus, RENAMED_JUTSUS);
  // The sheet's version is its own: one without it was saved before the clan bonus counted, and
  // gets it counted on load (not the default character's version).
  if (typeof raw.sheetVersion === 'number' && Number.isFinite(raw.sheetVersion)) out.sheetVersion = raw.sheetVersion;
  else delete out.sheetVersion;
  if ('appearance' in out) {
    if (isObj(out.appearance)) {
      // A sheet without a face shape was drawn with our default face: it keeps it (the default look's
      // newer Roman face is for new characters only).
      const { faceShape: _newer, ...base } = defaultAppearance();
      // nor his hair and bare forehead (2026-10-23): a sheet without them keeps our spikes and headband
      base.slots = { ...base.slots, hair: { id: 'hair_sunburst', colors: [] } };
      base.headband = { ...base.headband, position: 'forehead' };
      out.appearance = mergeKind(base as unknown as Record<string, unknown>, out.appearance);
    }
    else delete out.appearance;
  }
  // Earlier sheets used other clan names; they load as the clan that replaced each one (without
  // the bonus an old clan built into its maxima), and with the clan's ability bonus counted once.
  // An imported sheet is a ninja someone made: its chakra type is fixed. A feat whose requirements it
  // doesn't meet is dropped (Triple Nature below level 9, or without a second element: rules/feats.ts).
  const made = asMade(migrateCharacter(sanitizeMissionFields(out as unknown as ShinobiCharacter)));
  return keepEarnedFeats(made, natureOf(made));
}

/**
 * The creator's sheet for a new ninja: a sheet that is not a legend and has not been made yet (a new
 * game's starting sheet, a copy made from a legend) learns jutsu of rank D and C and its clan's
 * (rules/progression.ts); the S-rank slot is empty until it opens. Legends and made ninjas keep theirs.
 */
function asNewNinja(sheet: ShinobiCharacter): ShinobiCharacter {
  if (!learnsAsNew(sheet)) return sheet;
  // Its second element only when it earned it (a copy of Kaien leaves his behind: rules/natureGrowth.ts).
  const nature = natureOf(sheet);
  const c = earnedGrowth(sheet, nature);
  const fitted = fitNewNinja(c.selectedJutsus, nature, c.clan, c.shinobiClass, growthOf(c, nature)).loadout;
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
  // The jutsu with no element belong to a class now (rules/jutsuClass.ts): the class note says which.
  // The S-rank slot is locked for every ninja until it opens, so the note names only the Element slots.
  // {n} is the ninja's elements joined by "+" (Rayo + Fuego), {m} the same in a sentence.
  natureRuleNew: {
    en: 'Nature: {n}. The Element slots offer {m} jutsu.',
    es: 'Naturaleza: {n}. Las ranuras de Elemento ofrecen jutsus de {m}.',
  },
  and: { en: ' and ', es: ' y ' },
  growthHead: { en: 'Level {l}: chakra growth', es: 'Nivel {l}: crecer en el chakra' },
  growthSoon: {
    en: 'At level {l} it chooses one: a second element, or a higher rank of its main element ({n}). Its chakra type never changes.',
    es: 'Al nivel {l} elige una: un segundo elemento, o subir de rango su elemento principal ({n}). Su tipo de chakra no cambia nunca.',
  },
  growthPick: { en: 'Choose one, for good: its chakra type ({n}) stays.', es: 'Elige una, para siempre: su tipo de chakra ({n}) se queda.' },
  growthFixedNote: { en: 'Chosen when this ninja was made: it no longer changes.', es: 'Elegido al crear a este ninja: ya no cambia.' },
  growthElement: { en: 'Second element', es: 'Segundo elemento' },
  growthElementOf: { en: 'Second element: {e}', es: 'Segundo elemento: {e}' },
  growthElementSub: { en: 'Learns the rank D and C jutsu of another element', es: 'Aprende los jutsus de rango D y C de otro elemento' },
  growthRank: { en: 'Rank up: {n}', es: 'Subir de rango: {n}' },
  growthRankSub: { en: 'Learns the rank B jutsu of {n}', es: 'Aprende los jutsus de rango B de {n}' },
  growthLegend: { en: 'Its own as a legend, before level {l}', es: 'Suyo como leyenda, antes del nivel {l}' },
  growthOpens: { en: 'Opens: {list}', es: 'Abre: {list}' },
  // Triple Nature's third element (the owner: "feat del tercer elemento opcion a"), under the level-5 choice.
  thirdHead: { en: 'Level {l}: third element', es: 'Nivel {l}: tercer elemento' },
  thirdSoon: {
    en: 'At level {l}, the feat Triple Nature (Abilities) gives a ninja with a second element a third one.',
    es: 'Al nivel {l}, la dote Tres naturalezas (en Atributos) le da un tercer elemento a quien tiene un segundo.',
  },
  thirdNeedsSecond: { en: 'Triple Nature needs a second element (the level-{g} choice).', es: 'Tres naturalezas necesita un segundo elemento (la elección del nivel {g}).' },
  thirdTakeFeat: { en: 'Take the feat Triple Nature (Abilities) for a third element.', es: 'Toma la dote Tres naturalezas (en Atributos) para un tercer elemento.' },
  thirdPick: { en: 'Triple Nature: pick its third element.', es: 'Tres naturalezas: elige su tercer elemento.' },
  thirdOf: { en: 'Third element: {e}', es: 'Tercer elemento: {e}' },
  thirdText: {
    en: 'Triple Nature (a feat, level 9, with a second element): a third element, whose jutsu open in the Element slots as the second element\'s do (rank D and C; rank A from level 7). Once per long rest, a jutsu of one of its elements costs 1 chakra less when the previous jutsu it cast that battle was of another of its elements.',
    es: 'Tres naturalezas (una dote, nivel 9, con un segundo elemento): un tercer elemento, cuyos jutsus se abren en las ranuras de Elemento como los del segundo (rango D y C; rango A desde el nivel 7). Una vez por descanso largo, un jutsu de uno de sus elementos cuesta 1 de chakra menos si el jutsu anterior que lanzó en esa batalla era de otro de sus elementos.',
  },
  // What a feat asks for (rules/feats.ts).
  featNeedsLevel: { en: 'level {l}', es: 'nivel {l}' },
  featNeedsSecond: { en: 'a second element', es: 'un segundo elemento' },
  featRequires: { en: 'Requires {list}', es: 'Requiere {list}' },
  featMissing: { en: 'Missing: {list}', es: 'Le falta: {list}' },
  growthNothing: { en: 'Nothing yet: its jutsu of these ranks come later', es: 'Nada aún: sus jutsus de este rango llegarán más adelante' },
  growthSwaps: {
    en: 'Now {g}: the jutsu it no longer learns were changed. {list}.',
    es: 'Ahora {g}: se cambiaron los jutsus que ya no aprende. {list}.',
  },
  growthText: {
    en: 'At level {l} a ninja chooses one of two, for good: a second element (it learns that element\'s rank D and C jutsu in the Element slots) or a higher rank of its main element (it learns its rank B jutsu). Its chakra type, the main element, never changes. A third element comes only with the feat Triple Nature, at level 9, for a ninja with a second element.',
    es: 'Al nivel {l} un ninja elige una de dos, para siempre: un segundo elemento (aprende los jutsus de rango D y C de ese elemento en las ranuras de Elemento) o subir de rango su elemento principal (aprende sus jutsus de rango B). Su tipo de chakra, el elemento principal, no cambia nunca. Un tercer elemento llega solo con la dote Tres naturalezas, al nivel 9, para quien tiene un segundo elemento.',
  },
  natureRuleNone: {
    en: 'Nature: {n}. Its own jutsu will come later; for now it learns no elemental jutsu.',
    es: 'Naturaleza: {n}. Sus jutsus llegarán más adelante; por ahora no aprende jutsus elementales.',
  },
  classRule: {
    en: 'Class: {c}. It also learns {s} jutsu: taijutsu, kenjutsu and genjutsu each belong to their class.',
    es: 'Clase: {c}. También aprende jutsus de {s}: el taijutsu, el kenjutsu y el genjutsu son de su clase.',
  },
  classRuleNone: {
    en: 'Class: {c}. Taijutsu, kenjutsu and genjutsu belong to their classes: this class learns none of them.',
    es: 'Clase: {c}. El taijutsu, el kenjutsu y el genjutsu son de sus clases: esta clase no aprende ninguno.',
  },
  classJutsu: { en: 'Class jutsu', es: 'Jutsus de clase' },
  classJutsuStyle: {
    en: 'Learns the {s} jutsu: only this class does. Utility jutsu are open to every class.',
    es: 'Aprende los jutsus de {s}: solo esta clase los aprende. Los de utilidad son para todas las clases.',
  },
  classJutsuNone: {
    en: 'Learns no taijutsu, kenjutsu or genjutsu jutsu: only its element\'s, the utility jutsu and its clan\'s.',
    es: 'No aprende jutsus de taijutsu, kenjutsu ni genjutsu: solo los de su elemento, los de utilidad y los de su clan.',
  },
  offNature: { en: 'not your nature', es: 'no es de tu naturaleza' },
  offClass: { en: 'not your class', es: 'no es de tu clase' },
  classSwaps: {
    en: 'Now {c}: the jutsu of another class were changed. {list}.',
    es: 'Ahora {c}: se cambiaron los jutsus de otra clase. {list}.',
  },
  slotNone: { en: 'Nothing to learn yet', es: 'Nada que aprender aún' },
  slotNoneSub: { en: '{slot} · nothing for your nature and class', es: '{slot} · nada para tu naturaleza y clase' },
  slotNoneText: {
    en: 'No jutsu of this slot fits this ninja\'s nature and class yet. Another class, or a nature with an element, opens it.',
    es: 'Ningún jutsu de esta ranura encaja aún con la naturaleza y la clase de este ninja. Otra clase, o una naturaleza con elemento, la abre.',
  },
  slotCleared: { en: 'empty', es: 'vacía' },
  rankRule: {
    en: 'A new ninja learns rank D and C jutsu, and its clan\'s.',
    es: 'Un ninja nuevo aprende jutsus de rango D y C, y los de su clan.',
  },
  // A ninja being edited or a legend: the same ranks, earned by level (rules/progression.ts).
  rankRuleLevel: {
    en: 'It learns rank D and C jutsu, and its clan\'s.',
    es: 'Aprende jutsus de rango D y C, y los de su clan.',
  },
  rankRuleUp: {
    en: 'It learns rank D and C jutsu, its clan\'s, and the rank B jutsu of {n} (its rank up).',
    es: 'Aprende jutsus de rango D y C, los de su clan y los de rango B de {n} (subió de rango).',
  },
  // The ladder (the owner: "al subir al nivel 7 te un rango A y al 10 un rango S"), after the rule above.
  rankLadderSoon: {
    en: 'Rank A at level {a}; the S-rank slot at level {s}.',
    es: 'Rango A al nivel {a}; la ranura de Rango S, al nivel {s}.',
  },
  rankLadderA: {
    en: 'From level {a}, rank A too. The S-rank slot opens at level {s}.',
    es: 'Desde el nivel {a}, también rango A. La ranura de Rango S se abre al nivel {s}.',
  },
  rankLadderS: {
    en: 'From level {a}, rank A too; from level {s}, the S-rank slot.',
    es: 'Desde el nivel {a}, también rango A; desde el nivel {s}, la ranura de Rango S.',
  },
  aboveRank: { en: 'rank {r}: stays on its sheet', es: 'rango {r}: se queda en su hoja' },
  slotLocked: { en: 'Unlocks later', es: 'Se desbloquea más adelante' },
  slotLockedAt: { en: 'Unlocks at level {l}', es: 'Se desbloquea al nivel {l}' },
  slotLockedSub: { en: '{slot} · not for a new ninja', es: '{slot} · no es para un ninja nuevo' },
  slotLockedSubLevel: { en: '{slot} · not at its rank yet', es: '{slot} · aún no a su rango' },
  slotEmptied: { en: 'empty (S-rank unlocks at level {l})', es: 'vacía (el Rango S se desbloquea al nivel {l})' },
  tools: { en: 'Tools', es: 'Herramientas' },
  tagName: { en: 'Explosive tag', es: 'Sello explosivo' },
  tagSub: { en: 'Consumable item · not a jutsu', es: 'Objeto consumible · no es un jutsu' },
  tagPouch: { en: '×{n} in its pouch', es: '×{n} en su bolsa' },
  tagReach: { en: 'Throw 9 m · hide 4.5 m', es: 'Lanzar 9 m · esconder 4,5 m' },
  tagText: {
    en: 'A tool, not a jutsu: the party\'s backpack carries explosive tags (2 for each mission), and anyone can use them from the battle\'s item slots. Throw one (up to 9 m: it blows up where it lands) or hide one on the ground (up to 4.5 m: it blows up when an enemy steps on it). Either way, 3d6 fire in 1.5 m, DEX save for half: DC 13 when thrown, the hider\'s jutsu DC when hidden. It costs no chakra and needs no hand seals.',
    es: 'Una herramienta, no un jutsu: la mochila del grupo lleva sellos explosivos (2 por misión) y cualquiera los usa desde las ranuras de objetos de la batalla. Lanza uno (hasta 9 m: estalla donde cae) o escóndelo en el suelo (hasta 4,5 m: estalla cuando un enemigo lo pisa). En los dos casos, 3d6 de fuego en 1,5 m, salvación de DES para la mitad: CD 13 si se lanza, la CD de jutsu de quien lo esconde si se esconde. No gasta chakra ni necesita sellos de manos.',
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
  pose_tackle: { en: 'Tackle', es: 'Embestida' },
  pose_combo: { en: 'Combo', es: 'Combo' },
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
  /** An empty slot: locked by rank (the S-rank slot), or `none` for its nature and class at any rank. */
  | { kind: 'locked'; slot: string; none?: boolean }
  /** The level-5 choice: a second element, or a higher rank of the main element. */
  | { kind: 'growth' }
  /** Triple Nature's third element. */
  | { kind: 'third' }
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
  /** The jutsu the last change of class swapped (shown while that class stays). */
  const [classSwaps, setClassSwaps] = useState<{ cls: ShinobiClassType; swaps: JutsuSwap[] } | null>(null);
  /** The jutsu the last level-5 choice swapped (shown while that choice stays). */
  const [growthSwaps, setGrowthSwaps] = useState<{ key: string; swaps: JutsuSwap[] } | null>(null);
  /** A made ninja's level-5 choice, as it was saved: fixed, as its chakra type is (rules/natureGrowth.ts). */
  const [savedGrowthFixed] = useState(() => growthFixed(initialCharacter));
  /** A made ninja's third element (Triple Nature), as it was saved: fixed too, and the feat with it. */
  const [savedThirdFixed] = useState(() => initialCharacter.created === true && thirdElementOpen(initialCharacter) && (initialCharacter.extraNatures?.length ?? 0) >= 2);

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
    // A legend keeps its sheet: its jutsu of every rank become the new element's.
    const fitted = nature !== natureOf(character) ? fitToType(character, nature) : null;
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
    // The taijutsu, kenjutsu and genjutsu jutsu belong to their class (rules/jutsuClass.ts): a new class
    // swaps the ones of another class, as a new type does, and says which.
    const fitted = newClass !== character.shinobiClass ? fitToClass(character, natureOf(character), newClass) : null;
    if (fitted) setClassSwaps(fitted.swaps.length ? { cls: newClass, swaps: fitted.swaps } : null);
    setCharacter({
      ...character,
      shinobiClass: newClass,
      ...(fitted ? { selectedJutsus: fitted.loadout } : {}),
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
    const feat = SHINOBI_FEATS.find((f) => f.id === featId);
    const has = character.selectedFeats.includes(featId);
    // A feat's requirements come first (Triple Nature: level 9 and a second element, rules/feats.ts), and
    // Triple Nature stays once the ninja is made with its third element (as the level-5 choice does).
    if (!has && feat && !featOpen(feat, character)) return;
    if (has && featId === THIRD_ELEMENT_FEAT && typeFixed(character) && savedThirdFixed) return;
    soundManager.playSelect();
    let newFeats: string[];
    if (has) {
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

    // Triple Nature brings its third element, and takes it away with the jutsu it opened.
    const nature = natureOf(character);
    const next = keepEarnedFeats({ ...character, selectedFeats: newFeats, ...derived }, nature);
    const fitted = fitToGrowth(character, next, nature);
    if (fitted.swaps.length) setGrowthSwaps({ key: `${next.natureGrowth ?? ''}:${growthOf(next, nature).extra.join()}`, swaps: fitted.swaps });
    setCharacter({ ...next, selectedJutsus: fitted.loadout });
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
    // until it opens (rules/progression.ts); all of them of its class (rules/jutsuClass.ts). A made
    // ninja keeps its jutsu, whatever their rank: the clan secret follows the new clan, and the ones of
    // another class are swapped as a class change in the creator does.
    const made = typeFixed(character);
    const nature = chakraNature(randomLook.chakra);
    const one = <J,>(xs: J[]): J | undefined => xs[Math.floor(Math.random() * xs.length)];
    const own = <J extends { nature: string }>(xs: J[]): J[] => (xs.some((j) => j.nature === nature) ? xs.filter((j) => j.nature === nature) : xs);
    // Its level-5 choice, if it has one, opens its jutsu too; a new ninja keeps only what it earned
    // (a random ninja made from Kaien leaves his Fire behind: rules/natureGrowth.ts).
    const grown = made ? character : earnedGrowth(character, nature);
    const growth = growthOf(grown, nature);
    const element1 = one(own(creatorChoices('slot2Elemental', nature, randomClan, randomClass, growth)));
    const element2 = one(creatorChoices('slot3Elemental', nature, randomClan, randomClass, growth).filter((j) => j.id !== element1?.id));
    const ultimate = one(own(creatorChoices('slot5Ultimate', nature, randomClan, randomClass, growth)));

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
      ...grown,
      name: ['Kaito', 'Ren', 'Sasori', 'Ayame', 'Shino', 'Hana', 'Raijin', 'Kuro'][Math.floor(Math.random() * 8)],
      clan: randomClan,
      shinobiClass: randomClass,
      armorStyle: randomArmor,
      dojutsu: randomDojutsu,
      stats: randomizedStats,
      // A random ninja made from a legend's sheet is not that legend: a new ninja of its own.
      ...(isLegend(character) ? { id: `ninja_${Date.now().toString(36)}` } : {}),
      selectedJutsus: made
        ? fitToClass({ ...character, clan: randomClan, selectedJutsus: { ...character.selectedJutsus, slot4Clan: clanInfo.signatureJutsuId } }, nature, randomClass).loadout
        : fitNewNinja(
            {
              ...character.selectedJutsus,
              slot2Elemental: element1?.id ?? '',
              slot3Elemental: element2?.id ?? '',
              slot4Clan: clanInfo.signatureJutsuId,
              slot5Ultimate: ultimate?.id ?? '',
            },
            nature,
            randomClan,
            randomClass,
            growth,
          ).loadout,
      appearance: randomLook,
      palette: {
        ...character.palette,
        chakraAuraColor: chakraHex(randomLook.chakra),
      },
      ...derived,
    });
    setNatureSwaps(null);
    setClassSwaps(null);
    setGrowthSwaps(null);
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
    setClassSwaps(null);
    setImportExportModal(false);
    soundManager.playSelect();
  };

  // The jutsu each slot offers: the Element and S-rank slots only those of the ninja's nature, plus
  // the ones with no element (rules/jutsuNature.ts). A jutsu already chosen of another element (a
  // legend's second element, an older sheet) stays until the slot or the type is changed.
  const nature = natureOf(character);
  // Its other elements (a second at level 5, a legend's own: Kaien Fire, Raiga Earth) are its nature too.
  const growth = growthOf(character, nature);
  const natures = naturesOf(character, nature);
  const offNature = new Set(offNatureJutsus(character.selectedJutsus, nature, growth.extra));
  // Every ninja learns rank D and C jutsu and its clan's, and at level 5 what its choice opens
  // (rules/progression.ts); a sheet's own jutsu of a higher rank (a legend's, an older sheet's) stay, marked.
  const newNinja = learnsAsNew(character);
  const highRank = new Set(aboveRank(character.selectedJutsus, character.clan, growth.rankUp ? nature : undefined, character.level));
  // The taijutsu, kenjutsu and genjutsu jutsu belong to their class (rules/jutsuClass.ts); one of
  // another class on the sheet (a companion's, an older sheet's) stays, marked.
  const offClass = new Set(offClassJutsus(character.selectedJutsus, character.shinobiClass));
  // An emptied slot: the S-rank one waits for its rank; another had nothing left for the nature and class.
  const jutsuTitle = (id: string, slot?: SlotKey) =>
    id ? jutsuParts(JUTSUS_DATA.find((j) => j.id === id) ?? { name: id })[0] : T(slot === 'slot5Ultimate' ? 'slotEmptied' : 'slotCleared', { l: RANK_S_LEVEL });
  const swapList = (xs: JutsuSwap[]) => xs.map((x) => `${jutsuTitle(x.from)} → ${jutsuTitle(x.to, x.slot)}`).join('; ');
  // Only the swaps the player has not changed since: a slot picked again drops out of the note.
  const swapsKept = natureSwaps && natureSwaps.nature === nature ? natureSwaps.swaps.filter((x) => character.selectedJutsus[x.slot] === x.to) : [];
  const natureSwapText = swapsKept.length ? T('natureSwaps', { n: L(nature), list: swapList(swapsKept) }) : undefined;
  const classKept = classSwaps && classSwaps.cls === character.shinobiClass ? classSwaps.swaps.filter((x) => character.selectedJutsus[x.slot] === x.to) : [];
  const classSwapText = classKept.length ? T('classSwaps', { c: className(character.shinobiClass), list: swapList(classKept) }) : undefined;
  // The level-5 choice (rules/natureGrowth.ts): its name, as the note and the row say it.
  const growthKey = `${character.natureGrowth ?? ''}:${growth.extra.join()}`;
  const growthName = character.natureGrowth === 'rank' ? T('growthRank', { n: L(nature) }) : growth.extra[0] ? T('growthElementOf', { e: L(growth.extra[0]) }) : '';
  const growthKept = growthSwaps && growthSwaps.key === growthKey ? growthSwaps.swaps.filter((x) => character.selectedJutsus[x.slot] === x.to) : [];
  const growthSwapText = growthKept.length ? T('growthSwaps', { g: growthName, list: swapList(growthKept) }) : undefined;
  /** The jutsu `next` opens in the Element slots beyond what `without` learns, for a choice's row. */
  const opensBeyond = (next: ShinobiCharacter, without: ShinobiCharacter) => {
    const now = new Set(['slot2Elemental', 'slot3Elemental'].flatMap((s) => slotChoices(without, s as SlotKey, nature, character.clan).map((j) => j.id)));
    const opened = ['slot2Elemental', 'slot3Elemental']
      .flatMap((s) => slotChoices(next, s as SlotKey, nature, character.clan))
      .filter((j, i, xs) => !now.has(j.id) && xs.findIndex((x) => x.id === j.id) === i);
    return opened.length ? T('growthOpens', { list: opened.map((j) => jutsuParts(j)[0]).join(', ') }) : T('growthNothing');
  };
  /** The jutsu a level-5 choice opens (beyond what the ninja learns without one). */
  const opensWith = (g: NatureGrowth, second?: ChakraNature) =>
    opensBeyond(chooseGrowth(character, nature, g, second), { ...character, natureGrowth: undefined, extraNatures: [] });
  /** The jutsu a third element opens (beyond its type and second element). */
  const opensWithThird = (third: ChakraNature) => opensBeyond(chooseThirdElement(character, nature, third), { ...character, extraNatures: growth.extra.slice(0, 1) });
  /** Makes the level-5 choice (before the ninja is made with it) and swaps the jutsu it no longer opens. */
  const setGrowth = (g: NatureGrowth, second?: ChakraNature) => {
    soundManager.playSelect();
    // A choice without a second element drops Triple Nature and its third (rules/feats.ts).
    const next = keepEarnedFeats(chooseGrowth(character, nature, g, second), nature);
    if (next === character) return;
    const fitted = fitToGrowth(character, next, nature);
    const key = `${next.natureGrowth ?? ''}:${growthOf(next, nature).extra.join()}`;
    setGrowthSwaps(fitted.swaps.length ? { key, swaps: fitted.swaps } : null);
    setCharacter({ ...next, selectedJutsus: fitted.loadout });
  };
  /** Picks Triple Nature's third element (before the ninja is made with it); the old third's jutsu are swapped. */
  const setThird = (third: ChakraNature) => {
    soundManager.playSelect();
    const next = chooseThirdElement(character, nature, third);
    if (next === character) return;
    const fitted = fitToGrowth(character, next, nature);
    setGrowthSwaps(fitted.swaps.length ? { key: `${next.natureGrowth ?? ''}:${growthOf(next, nature).extra.join()}`, swaps: fitted.swaps } : null);
    setCharacter({ ...next, selectedJutsus: fitted.loadout });
  };
  const growthLocked = typeFixed(character) && savedGrowthFixed;
  const thirdLocked = typeFixed(character) && savedThirdFixed;
  // The ranks it learns and the ladder ahead: A at level 7, S at 10 (rules/progression.ts).
  const rankRuleText = `${growth.rankUp ? T('rankRuleUp', { n: L(nature) }) : newNinja ? T('rankRule') : T('rankRuleLevel')} ${T(
    character.level >= RANK_S_LEVEL ? 'rankLadderS' : character.level >= RANK_A_LEVEL ? 'rankLadderA' : 'rankLadderSoon',
    { a: RANK_A_LEVEL, s: RANK_S_LEVEL },
  )}`;
  /** A feat's requirements, said: "Requiere nivel 9 y un segundo elemento". */
  const featNeedList = (f: (typeof SHINOBI_FEATS)[number], only?: ReturnType<typeof featNeeds>) =>
    [
      f.requires?.level !== undefined && (!only || only.includes('level')) ? T('featNeedsLevel', { l: f.requires.level }) : '',
      f.requires?.secondElement && (!only || only.includes('secondElement')) ? T('featNeedsSecond') : '',
    ]
      .filter(Boolean)
      .join(T('and'));
  const natureNames = natures.map((n) => L(n));
  const style = classStyle(character.shinobiClass);
  const classRuleText = style
    ? T('classRule', { c: className(character.shinobiClass), s: style.toLowerCase() })
    : T('classRuleNone', { c: className(character.shinobiClass) });

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
    { key: 'slot1Utility', label: T('slotUtility'), list: slotChoices(character, 'slot1Utility', nature, character.clan) },
    { key: 'slot2Elemental', label: T('slotElementA'), list: slotChoices(character, 'slot2Elemental', nature, character.clan) },
    { key: 'slot3Elemental', label: T('slotElementB'), list: slotChoices(character, 'slot3Elemental', nature, character.clan) },
    { key: 'slot4Clan', label: T('slotClan'), list: slotChoices(character, 'slot4Clan', nature, character.clan), fixed: true },
    { key: 'slot5Ultimate', label: T('slotUltimate'), list: slotChoices(character, 'slot5Ultimate', nature, character.clan) },
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
              setClassSwaps(null);
              setGrowthSwaps(null);
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
                setClassSwaps(null);
                setGrowthSwaps(null);
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
      {step === 'class' && classSwapText && (
        <p className="mx-3 mt-1 text-[12px] leading-snug text-[#f2c46d] border border-[#6b5434] bg-[#3a2a12]/60 px-2 py-1">{classSwapText}</p>
      )}
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
          {SHINOBI_FEATS.map((f) => {
            // A feat with requirements says them; it can't be taken until they are met (rules/feats.ts). It
            // stays hoverable, so its panel shows what is missing.
            const selected = character.selectedFeats.includes(f.id);
            const unmet = !featOpen(f, character);
            const locked = f.id === THIRD_ELEMENT_FEAT && selected && thirdLocked;
            return (
              <Row
                key={f.id}
                selected={selected}
                disabled={locked}
                onClick={() => handleFeatToggle(f.id)}
                onHover={hoverOn({ kind: 'feat', id: f.id })}
                title={pick(f.name, f.nameEs)}
                sub={f.requires ? <span className={unmet ? 'text-[#e8956a]' : undefined}>{T('featRequires', { list: featNeedList(f) })}</span> : undefined}
                right={(unmet && !selected) || locked ? <Lock className="w-3.5 h-3.5 text-[#b9a98a]" /> : undefined}
              />
            );
          })}
        </>
      )}
      {step === 'jutsus' && (
        <div className="px-3 pb-2 space-y-1.5">
          <p className="text-[12px] leading-snug text-[#b9a98a]">
            {!chakraType(nature).elemental && natures.length === 1
              ? T('natureRuleNone', { n: L(nature) })
              : T('natureRuleNew', { n: natureNames.join(' + '), m: natureNames.join(T('and')) })}
          </p>
          <p className="text-[12px] leading-snug text-[#b9a98a]">{classRuleText}</p>
          <p className="text-[12px] leading-snug text-[#b9a98a]">{rankRuleText}</p>
          {natureSwapText && <p className="text-[12px] leading-snug text-[#f2c46d] border border-[#6b5434] bg-[#3a2a12]/60 px-2 py-1">{natureSwapText}</p>}
          {classSwapText && <p className="text-[12px] leading-snug text-[#f2c46d] border border-[#6b5434] bg-[#3a2a12]/60 px-2 py-1">{classSwapText}</p>}
          {growthSwapText && <p className="text-[12px] leading-snug text-[#f2c46d] border border-[#6b5434] bg-[#3a2a12]/60 px-2 py-1">{growthSwapText}</p>}
        </div>
      )}
      {step === 'jutsus' &&
        slots.map((slot) => {
          const chosen = JUTSUS_DATA.find((j) => j.id === character.selectedJutsus[slot.key]);
          const open = openSlot === slot.key;
          // Nothing to offer here: the S-rank slot of a new ninja, shown locked in its place; or a slot
          // with nothing for this nature and class at any rank (a type with no element in a class with
          // no kind of jutsu of its own), shown empty.
          const none = !chosen && !slot.list.length && !learnable(slot.key, nature, character.clan, character.shinobiClass).length;
          // The level that opens it (7 for rank A, 10 for the S-rank slot), when its level alone does.
          const opensAt = slotOpensAt(slot.key, nature, character.clan, character.shinobiClass, growth);
          const lockedTitle = opensAt ? T('slotLockedAt', { l: opensAt }) : T('slotLocked');
          if (!chosen && !slot.list.length)
            return (
              <Row
                key={slot.key}
                onClick={() => undefined}
                onHover={hoverOn({ kind: 'locked', slot: slot.label, none })}
                icon={
                  <span className="grid place-items-center border border-[#6b5434] bg-[radial-gradient(circle,#2a2016,#0e0b08)] text-[#8a7a5c]" style={{ width: 38, height: 38 }}>
                    <Lock className="w-4 h-4" />
                  </span>
                }
                title={none ? T('slotNone') : lockedTitle}
                sub={T(none ? 'slotNoneSub' : newNinja ? 'slotLockedSub' : 'slotLockedSubLevel', { slot: slot.label })}
              />
            );
          const mark = !chosen
            ? null
            : offNature.has(chosen.id)
              ? T('offNature')
              : offClass.has(chosen.id)
                ? T('offClass')
                : highRank.has(chosen.id)
                  ? T('aboveRank', { r: chosen.rank })
                  : null;
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
              {open && !slot.list.length && <p className="pl-8 pr-3 py-1.5 text-[12px] text-[#b9a98a]">{lockedTitle}</p>}
            </React.Fragment>
          );
        })}
      {/* The level-5 choice (the owner, 2026-10-21: "nivel 5 suena bien para segundo elemento o subir de
          rango tu elemento principal"): below level 5 a line says what comes; from level 5 the two
          choices, open until the ninja is made with one. The chakra type never changes. */}
      {step === 'jutsus' && chakraType(nature).elemental && (
        <>
          <Heading>{T('growthHead', { l: GROWTH_LEVEL })}</Heading>
          {!growthOpen(character) ? (
            growth.extra[0] ? (
              <Row
                selected
                onClick={() => undefined}
                onHover={hoverOn({ kind: 'growth' })}
                icon={<Seal letter={L(growth.extra[0])[0]} color="#c99a4b" />}
                title={T('growthElementOf', { e: L(growth.extra[0]) })}
                sub={T('growthLegend', { l: GROWTH_LEVEL })}
                right={<Lock className="w-3.5 h-3.5 text-[#b9a98a]" />}
              />
            ) : (
              <p className="mx-3 flex items-start gap-2 text-[12px] leading-snug text-[#b9a98a]">
                <Lock className="mt-0.5 w-3.5 h-3.5 shrink-0" />
                <span>{T('growthSoon', { l: GROWTH_LEVEL, n: L(nature) })}</span>
              </p>
            )
          ) : (
            <>
              <p className="mx-3 text-[12px] leading-snug text-[#b9a98a]">{growthLocked ? T('growthFixedNote') : T('growthPick', { n: L(nature) })}</p>
              {(!growthLocked || character.natureGrowth === 'element') && (
                <Row
                  selected={character.natureGrowth === 'element'}
                  disabled={growthLocked}
                  onClick={() => !growthLocked && character.natureGrowth !== 'element' && setGrowth('element', growth.extra[0] ?? otherElements(nature)[0])}
                  onHover={hoverOn({ kind: 'growth' })}
                  icon={<Seal letter="II" color="#c99a4b" />}
                  title={character.natureGrowth === 'element' && growth.extra[0] ? T('growthElementOf', { e: L(growth.extra[0]) }) : T('growthElement')}
                  sub={T('growthElementSub')}
                  right={growthLocked ? <Lock className="w-3.5 h-3.5 text-[#b9a98a]" /> : undefined}
                />
              )}
              {character.natureGrowth === 'element' &&
                !growthLocked &&
                otherElements(nature).map((e) => (
                  <Row
                    key={e}
                    indent
                    selected={growth.extra[0] === e}
                    onClick={() => setGrowth('element', e)}
                    onHover={hoverOn({ kind: 'growth' })}
                    title={L(e)}
                    sub={opensWith('element', e)}
                  />
                ))}
              {(!growthLocked || character.natureGrowth === 'rank') && (
                <Row
                  selected={character.natureGrowth === 'rank'}
                  disabled={growthLocked}
                  onClick={() => !growthLocked && setGrowth('rank')}
                  onHover={hoverOn({ kind: 'growth' })}
                  icon={<Seal letter="B" color="#c99a4b" />}
                  title={T('growthRank', { n: L(nature) })}
                  sub={character.natureGrowth === 'rank' ? T('growthRankSub', { n: L(nature) }) : opensWith('rank')}
                  right={growthLocked ? <Lock className="w-3.5 h-3.5 text-[#b9a98a]" /> : undefined}
                />
              )}
            </>
          )}
          {/* Triple Nature's third element (the owner: "feat del tercer elemento opcion a"): level 9, a
              second element and the feat; then the player picks it, until the ninja is made with it. */}
          <Heading>{T('thirdHead', { l: THIRD_ELEMENT_LEVEL })}</Heading>
          {thirdElementOpen(character) ? (
            <>
              <p className="mx-3 text-[12px] leading-snug text-[#b9a98a]">{thirdLocked ? T('growthFixedNote') : T('thirdPick')}</p>
              {thirdLocked && growth.extra[1] ? (
                <Row
                  selected
                  disabled
                  onClick={() => undefined}
                  onHover={hoverOn({ kind: 'third' })}
                  icon={<Seal letter="III" color="#c99a4b" />}
                  title={T('thirdOf', { e: L(growth.extra[1]) })}
                  right={<Lock className="w-3.5 h-3.5 text-[#b9a98a]" />}
                />
              ) : (
                otherElements(nature, growth.extra.slice(0, 1)).map((e) => (
                  <Row
                    key={e}
                    indent
                    selected={growth.extra[1] === e}
                    onClick={() => setThird(e)}
                    onHover={hoverOn({ kind: 'third' })}
                    title={L(e)}
                    sub={opensWithThird(e)}
                  />
                ))
              )}
            </>
          ) : (
            <p className="mx-3 flex items-start gap-2 text-[12px] leading-snug text-[#b9a98a]" onMouseEnter={() => setHover({ kind: 'third' })} onMouseLeave={() => setHover(null)}>
              <Lock className="mt-0.5 w-3.5 h-3.5 shrink-0" />
              <span>
                {character.level < THIRD_ELEMENT_LEVEL
                  ? T('thirdSoon', { l: THIRD_ELEMENT_LEVEL })
                  : !hasSecondElement(character)
                    ? T('thirdNeedsSecond', { g: GROWTH_LEVEL })
                    : T('thirdTakeFeat')}
              </span>
            </p>
          )}
        </>
      )}
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
          {naturesOf(character, natureOf(character)).map((n) => L(n)).join(' + ')}
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
            <Heading>{T('classJutsu')}</Heading>
            <p className="px-3 text-[13px] leading-relaxed text-[#d9caa6]">
              {classStyle(h.id) ? T('classJutsuStyle', { s: classStyle(h.id)!.toLowerCase() }) : T('classJutsuNone')}
            </p>
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
      const needs = featNeeds(f, character);
      return {
        title: pick(f.name, f.nameEs),
        sub: f.requires ? `${T('feat')} · ${T('featRequires', { list: featNeedList(f) })}` : T('feat'),
        body: (
          <>
            <Parchment>{pick(f.description, f.descriptionEs)}</Parchment>
            {needs.length > 0 && <p className="px-3 pt-2 text-[13px] leading-relaxed text-[#e8956a]">{T('featMissing', { list: featNeedList(f, needs) })}</p>}
          </>
        ),
      };
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
    if (h.kind === 'growth')
      return { title: T('growthHead', { l: GROWTH_LEVEL }), sub: growthName || T('level', { n: character.level }), body: <Parchment>{T('growthText', { l: GROWTH_LEVEL })}</Parchment> };
    if (h.kind === 'third')
      return {
        title: T('thirdHead', { l: THIRD_ELEMENT_LEVEL }),
        sub: growth.extra[1] ? T('thirdOf', { e: L(growth.extra[1]) }) : T('level', { n: character.level }),
        body: <Parchment>{T('thirdText')}</Parchment>,
      };
    if (h.kind === 'locked')
      return h.none
        ? { title: h.slot, sub: T('slotNone'), body: <Parchment>{T('slotNoneText')}</Parchment> }
        : { title: h.slot, sub: T('slotLocked'), body: <Parchment>{rankRuleText}</Parchment> };
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
          {/* The pose bar sits in the strip under the side panels (they end at bottom-[96px]), between
              the two corner buttons, so it never covers the ninja (the owner, 2026-10-28: on short
              screens the old bar, 18 px under the feet or raised to fit, sat over the boots) nor the
              panels' options; there it has the width for one row. */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 8, maxWidth: view.w - 2 * (24 + 230) }}>
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
