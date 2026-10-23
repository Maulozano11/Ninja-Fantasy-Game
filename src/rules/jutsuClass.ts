// Which jutsu a ninja's class lets it learn (docs/GAMEPLAY_DESIGN.md, "Chakra type", "Jutsu of a class").
//
// The owner (2026-10-21), asked who learns the genjutsu, kenjutsu and taijutsu jutsu: "los que elijan
// de clase genjutsu kenjutsu o taijutsu". So the jutsu with no element (their `nature` is Taijutsu,
// Kenjutsu or Genjutsu) in the Element and S-rank slots belong to a class: only a ninja of that class
// learns them. The game's classes, mapped (the nearest one, nothing wider):
// - Taijutsu jutsu: Taijutsu Master.
// - Kenjutsu jutsu: Bukijutsu Master (the weapon class; its own text names "kenjutsu katana forms").
// - Genjutsu jutsu: Genjutsu Adept.
// - Ninjutsu Specialist and Medical Specialist: none of the three (they learn their element's jutsu).
// Utility jutsu (Body Flicker, the Substitution, the healing palm) stay open to every ninja, and a
// clan's jutsu to its clan, whatever their kind. Pure data, no React.

import { JUTSUS_DATA } from '../data/shinobiData';
import type { JutsuDefinition, ShinobiClassType, ShinobiCharacter } from '../types/shinobi';

/** A kind of jutsu with no element that belongs to a class. */
export type ClassStyle = 'Taijutsu' | 'Kenjutsu' | 'Genjutsu';

/** The class each kind of jutsu belongs to. */
export const STYLE_CLASS: Record<ClassStyle, ShinobiClassType> = {
  Taijutsu: 'Taijutsu Master',
  Kenjutsu: 'Bukijutsu Master',
  Genjutsu: 'Genjutsu Adept',
};

const STYLES = Object.keys(STYLE_CLASS) as ClassStyle[];

/** The kind of jutsu a class learns, if any (Ninjutsu Specialist and Medical Specialist: none). */
export const classStyle = (cls: ShinobiClassType): ClassStyle | undefined => STYLES.find((s) => STYLE_CLASS[s] === cls);

/** Whether the class decides if a ninja may learn this jutsu: a taijutsu, kenjutsu or genjutsu jutsu in the Element or S-rank slots. */
export const classGated = (j: JutsuDefinition): boolean => (j.category === 'Elemental' || j.category === 'Ultimate') && (STYLES as string[]).includes(j.nature);

/** Whether a ninja of this class may learn the jutsu: it is not gated, or it is of the class's kind. */
export const jutsuFitsClass = (j: JutsuDefinition, cls: ShinobiClassType): boolean => !classGated(j) || STYLE_CLASS[j.nature as ClassStyle] === cls;

/** The jutsu of a loadout that belong to another class (a companion's sheet, an older sheet): they stay, marked. */
export function offClassJutsus(loadout: ShinobiCharacter['selectedJutsus'], cls: ShinobiClassType): string[] {
  return Object.values(loadout).filter((id) => {
    const j = JUTSUS_DATA.find((x) => x.id === id);
    return !!j && !jutsuFitsClass(j, cls);
  });
}
