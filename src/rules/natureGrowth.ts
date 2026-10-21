// How a ninja's chakra grows past its type (docs/GAMEPLAY_DESIGN.md, "Chakra type", "Level 5: a second
// element or a higher rank").
//
// The owner (2026-10-21): "no se puede cambiar de tipo lo que se va poder es tener 2ndo elemento en nivel
// mas alto y 3 elementos si tienes el feat especial para eso", then, asked for the level: "nivel 5 suena
// bien para segundo elemento o subir de rango tu elemento principal". So at level 5 a ninja chooses ONE:
// - 'element': a second element. As built (a proposal for his approval): its rank D and C jutsu open
//   to the Element slots, as the main element's do.
// - 'rank': a higher rank of its main element. As built (a proposal): its main element's rank B jutsu
//   open to the Element slots.
// The chakra type, the main element, never changes. A third element comes only with a special feat:
// the feat is not decided (THIRD_ELEMENT_FEAT is the hook). The legends Kaien (Lightning + Fire) and
// Raiga (Fire + Earth) have a second element on their own sheets ("ok con kaien y raiga").
// The game has no level-up screen yet: `growthPending` and `chooseGrowth` are what one will call. Today
// the choice is made in the creator, for a ninja of level 5 or more (the legends, their saved copies).
// Pure data, no React.

import type { ChakraNature, NatureGrowth, ShinobiCharacter } from '../types/shinobi';
import { ELEMENTS } from './jutsuNature';

/** The level at which a ninja chooses a second element or a higher rank of its main element. */
export const GROWTH_LEVEL = 5;

/**
 * The feat that will give a third element: a proposal, not in the feat list yet (the owner decides the
 * feat). A sheet that has it may hold a third element.
 */
export const THIRD_ELEMENT_FEAT = 'triple_nature';

/** What a ninja's growth opens, for the rules that offer jutsu (rules/progression.ts). */
export interface Growth {
  /** The ninja's elements besides its type. */
  extra: ChakraNature[];
  /** Its main element's rank B jutsu are open to it. */
  rankUp: boolean;
}

/** No growth: a ninja below level 5 with only its type. */
export const NO_GROWTH: Growth = { extra: [], rankUp: false };

type Grows = Pick<ShinobiCharacter, 'level'> & Partial<Pick<ShinobiCharacter, 'natureGrowth' | 'extraNatures' | 'selectedFeats'>>;

/** The ninja is level 5 or more: it may make the level-5 choice. */
export const growthOpen = (c: Pick<ShinobiCharacter, 'level'>): boolean => c.level >= GROWTH_LEVEL;

/**
 * It is level 5 or more and has not chosen yet (a level-up screen will ask it). A legend's own second
 * element (Kaien's, before level 5) counts as its choice.
 */
export const growthPending = (c: Grows): boolean => growthOpen(c) && c.natureGrowth === undefined && !c.extraNatures?.length;

/** It has the feat for a third element. */
export const thirdElementOpen = (c: Grows): boolean => (c.selectedFeats ?? []).includes(THIRD_ELEMENT_FEAT);

/**
 * The ninja's elements besides its type `nature`: the five elements only, never its type, each once, at
 * most two (a second and a third). A sheet's own list is read as it is (a legend's second element comes
 * before level 5: Kaien); the creator writes it only through `chooseGrowth`.
 */
export function extraNatures(c: Grows, nature: ChakraNature): ChakraNature[] {
  const out: ChakraNature[] = [];
  for (const n of Array.isArray(c.extraNatures) ? c.extraNatures : [])
    if ((ELEMENTS as readonly string[]).includes(n) && n !== nature && !out.includes(n)) out.push(n);
  return out.slice(0, 2);
}

/** The ninja's elements: its type first, then the others it has. */
export const naturesOf = (c: Grows, nature: ChakraNature): ChakraNature[] => [nature, ...extraNatures(c, nature)];

/** Its main element's rank B jutsu are open: it chose a higher rank at level 5. */
export const rankedUp = (c: Grows): boolean => growthOpen(c) && c.natureGrowth === 'rank';

/** What the ninja's growth opens to it. */
export const growthOf = (c: Grows, nature: ChakraNature): Growth => ({ extra: extraNatures(c, nature), rankUp: rankedUp(c) });

/** The elements a ninja of this type may take as its second (or third): the other four of the five. */
export const otherElements = (nature: ChakraNature, has: readonly ChakraNature[] = []): ChakraNature[] =>
  (ELEMENTS as readonly ChakraNature[]).filter((e) => e !== nature && !has.includes(e));

/**
 * The sheet's level-5 choice, made: 'element' with the second element picked (one of the other four),
 * or 'rank' (no second element; a third from the feat stays). Below level 5, or with a second element
 * that is not one of the other four, nothing changes. `extraNatures` is always written (an empty list
 * for 'rank'), so a legend's own second element is not given back on the next load.
 */
export function chooseGrowth<C extends Grows>(c: C, nature: ChakraNature, growth: NatureGrowth, second?: ChakraNature): C {
  if (!growthOpen(c)) return c;
  const now = extraNatures(c, nature);
  const third = thirdElementOpen(c) ? now.slice(1) : [];
  if (growth === 'rank') return { ...c, natureGrowth: 'rank', extraNatures: third };
  if (!second || !otherElements(nature).includes(second)) return c;
  return { ...c, natureGrowth: 'element', extraNatures: [second, ...third.filter((n) => n !== second)] };
}

/**
 * A new ninja's growth (a copy made from a legend, the random ninja): only what its level and feats
 * earn. A second element needs level 5 and the choice of one, a third the feat; below level 5 there is
 * no choice. A legend's own second element before level 5 (Kaien's) is the legend's, not its copy's.
 */
export function earnedGrowth<C extends Grows>(c: C, nature: ChakraNature): C {
  const open = growthOpen(c);
  const keep = (open && c.natureGrowth === 'element' ? 1 : 0) + (thirdElementOpen(c) ? 1 : 0);
  const extra = extraNatures(c, nature).slice(0, keep);
  const growth = open ? c.natureGrowth : undefined;
  const sameExtra = (c.extraNatures === undefined && !extra.length) || (Array.isArray(c.extraNatures) && c.extraNatures.join() === extra.join());
  if (growth === c.natureGrowth && sameExtra) return c;
  const out: C = { ...c, extraNatures: extra };
  if (growth === undefined) delete out.natureGrowth;
  return out;
}

/**
 * The level-5 choice can no longer change: the ninja was made with it (saved after choosing). Before
 * the creator's Accept, or on a ninja that has not chosen, it is open.
 */
export const growthFixed = (c: Grows & Pick<ShinobiCharacter, 'created'>): boolean => c.created === true && c.natureGrowth !== undefined;
