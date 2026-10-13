// Spanish and English for the game's screens. The language starts as the browser's (Spanish for any
// "es-*", English otherwise), can be switched at any time and is remembered on this device.
// Strings live next to the screens that use them, as { en, es } pairs made with `strings()`.

import { useSyncExternalStore } from 'react';

export type Lang = 'es' | 'en';

const KEY = 'shinobi.lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // storage blocked: fall back to the browser
  }
  const nav = typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language : 'en';
  return nav?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

let current: Lang = typeof window !== 'undefined' ? detect() : 'en';
const subs = new Set<() => void>();

export const getLang = (): Lang => current;

export function setLang(l: Lang): void {
  if (l === current) return;
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // not remembered, still switched
  }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** The current language; the component re-renders when it changes. */
export const useLang = (): Lang => useSyncExternalStore(subscribe, getLang, () => 'en' as Lang);

export type Params = Record<string, string | number>;
export type Entry = { en: string; es: string };

/** Fills {name} placeholders. */
export const fill = (text: string, p?: Params): string => (p ? text.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : text);

/**
 * A table of strings for one screen: `const T = strings({ hello: { en: 'Hello {name}', es: 'Hola {name}' } })`,
 * then `T('hello', { name })` in the current language (call `useLang()` in the component so it re-renders).
 */
export function strings<K extends string>(table: Record<K, Entry>) {
  const fn = (key: K, p?: Params, lang: Lang = current): string => fill(table[key]?.[lang] ?? table[key]?.en ?? key, p);
  fn.has = (key: string): key is K => key in table;
  return fn;
}

/** Picks the right one of a data pair (name / nameEs). */
export const pick = (en: string, es: string | undefined, lang: Lang = current): string => (lang === 'es' && es ? es : en);
