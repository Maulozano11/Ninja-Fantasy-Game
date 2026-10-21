// The dice style the player picks in the main menu (the owner's three designs: "Gema", "Marfil y
// oro", "Obsidiana rúnica"), remembered on this device. The battle reads it every frame, so a change
// shows at once. Marfil y oro is the default: it matches the HUD's gold and reads the same for every
// chakra colour.

import { useSyncExternalStore } from 'react';

export type DiceStyle = 'gem' | 'ivory' | 'obsidian';
/** In the menu's order: A, B, C as the owner saw them. */
export const DICE_STYLES: DiceStyle[] = ['gem', 'ivory', 'obsidian'];
export const DEFAULT_DICE: DiceStyle = 'ivory';

const KEY = 'shinobi.dice';

function load(): DiceStyle {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'gem' || v === 'ivory' || v === 'obsidian') return v;
  } catch {
    // storage blocked: the default
  }
  return DEFAULT_DICE;
}

let current: DiceStyle = typeof window !== 'undefined' ? load() : DEFAULT_DICE;
const subs = new Set<() => void>();

export const getDiceStyle = (): DiceStyle => current;

export function setDiceStyle(s: DiceStyle): void {
  if (s === current) return;
  current = s;
  try {
    localStorage.setItem(KEY, s);
  } catch {
    // not remembered, still switched
  }
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** The dice style; the component re-renders when it changes. */
export const useDiceStyle = (): DiceStyle => useSyncExternalStore(subscribe, getDiceStyle, () => DEFAULT_DICE);
