// The shinobi pack's names for the engine's vocabulary (docs/WORLD_DESIGN.md: wealth levels of
// section 8, reputation levels of section 7, the seasons of section 10, the currency).

import type { ReputationLevel, Season, Wealth } from '../../campaign/state';

export const WEALTH_NAMES: Record<Wealth, { en: string; es: string }> = {
  0: { en: 'Ruined', es: 'Arruinado' },
  1: { en: 'Poor', es: 'Pobre' },
  2: { en: 'Modest', es: 'Modesto' },
  3: { en: 'Well-off', es: 'Acomodado' },
  4: { en: 'Rich', es: 'Rico' },
  5: { en: 'Magnate', es: 'Magnate' },
  6: { en: 'Legend', es: 'Leyenda' },
};

export const WEALTH_MEANS: Record<Wealth, { en: string; es: string }> = {
  0: { en: 'You eat what you hunt; the base is a borrowed room', es: 'Comes lo que cazas; la base es un cuarto prestado' },
  1: { en: 'The basics; half the mission supplies', es: 'Lo básico; suministros de misión a medias' },
  2: { en: 'Full supplies', es: 'Suministros completos' },
  3: { en: 'A small base module a season', es: 'Un módulo de base pequeño por temporada' },
  4: { en: 'A big module; a minor holding', es: 'Un módulo grande; una propiedad menor' },
  5: { en: 'A major holding; the base goes up a tier', es: 'Una propiedad mayor; la base sube de nivel' },
  6: { en: 'Everything; the factions ask you for money', es: 'Todo; las facciones te piden dinero a ti' },
};

export const REPUTATION_NAMES: Record<ReputationLevel, { en: string; es: string }> = {
  hostile: { en: 'Hostile', es: 'Hostil' },
  cold: { en: 'Cold', es: 'Frío' },
  neutral: { en: 'Neutral', es: 'Neutral' },
  friend: { en: 'Friend', es: 'Amigo' },
  ally: { en: 'Ally', es: 'Aliado' },
};

export const SEASON_NAMES: Record<Season, { en: string; es: string }> = {
  0: { en: 'Spring', es: 'Primavera' },
  1: { en: 'Summer', es: 'Verano' },
  2: { en: 'Autumn', es: 'Otoño' },
  3: { en: 'Winter', es: 'Invierno' },
};

export const CURRENCY = { en: 'ryō', es: 'ryō' };
