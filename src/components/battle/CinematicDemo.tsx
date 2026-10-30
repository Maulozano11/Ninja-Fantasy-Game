import React, { useState } from 'react';
import type { ShinobiCharacter } from '../../types/shinobi';
import { strings, useLang } from '../../i18n';
import { CinematicPlayer } from './CinematicPlayer';
import { CINEMATICS } from './cinematics';

const T = strings({
  title: { en: 'Cinematics', es: 'Cinemáticas' },
  play: { en: 'Play', es: 'Ver' },
  hint: { en: 'Your ninja is drawn over each cinematic by the game.', es: 'El juego dibuja a tu ninja sobre cada cinemática.' },
  'fire-avatar-shield': { en: 'Fire avatar: shield', es: 'Avatar de fuego: escudo' },
  'fire-avatar-spear': { en: 'Fire avatar: spear', es: 'Avatar de fuego: lanza' },
});

/** A test screen (#cinematic): every shipped cinematic, played with the current ninja as the caster. */
export const CinematicDemo: React.FC<{ character: ShinobiCharacter }> = ({ character }) => {
  useLang();
  const [playing, setPlaying] = useState<string | null>(null);
  const c = playing ? CINEMATICS[playing] : undefined;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <h1 className="text-2xl font-bold text-amber-200 mb-2">{T('title')}</h1>
      <p className="text-slate-400 mb-6">{T('hint')}</p>
      <div className="flex flex-wrap gap-3">
        {Object.keys(CINEMATICS).sort().map((name) => (
          <button key={name} type="button" onClick={() => setPlaying(name)} className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600" data-play={name}>
            {T('play')}: {T.has(name) ? T(name) : name}
          </button>
        ))}
      </div>
      {c && <CinematicPlayer manifest={c.manifest} src={c.src} cast={[{ role: 'caster', character }]} onEnd={() => setPlaying(null)} />}
    </div>
  );
};
