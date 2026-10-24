import React from 'react';
import { setLang, useLang } from './index';

/** ES | EN switch: the choice is remembered on this device. */
export const LangToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const lang = useLang();
  const btn = (l: 'es' | 'en', label: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      className={`px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wider transition-colors ${lang === l ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:text-white'}`}
    >
      {label}
    </button>
  );
  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full bg-slate-900/80 border border-slate-600/60 p-0.5 ${className}`} role="group" aria-label="Language / Idioma">
      {btn('es', 'ES')}
      {btn('en', 'EN')}
    </div>
  );
};
