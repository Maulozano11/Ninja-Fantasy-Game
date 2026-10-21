import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { strings } from './i18n';

const T = strings({
  crashed: { en: 'Something went wrong on this screen.', es: 'Algo falló en esta pantalla.' },
  tell: { en: 'Send a screenshot of this message so it can be fixed:', es: 'Manda una captura de este mensaje para poder arreglarlo:' },
  back: { en: 'Back to the main menu', es: 'Volver al menú principal' },
});

/** A screen that throws shows what went wrong and a way back to the title, not a blank page. */
class Crash extends React.Component<{ children: React.ReactNode }, { error: Error | null; restarts: number }> {
  state = { error: null as Error | null, restarts: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error, restarts } = this.state;
    if (!error) return <React.Fragment key={restarts}>{this.props.children}</React.Fragment>;
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 px-4 text-[#efe3c4]">
        <div className="w-full max-w-lg rounded-sm border border-[#8a6a3a] bg-[#0e0a07] p-5">
          <p className="text-base font-semibold text-[#f2c46d]">{T('crashed')}</p>
          <p className="mt-2 text-xs text-[#b9a98a]">{T('tell')}</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-black/50 p-2 text-[11px] text-[#ff9a7a]">
            {`${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(1, 5).join('\n')}`}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null, restarts: restarts + 1 })}
            className="mt-4 rounded-sm border border-[#f2c46d] bg-[#3a2a12] px-3 py-1 text-xs font-bold text-[#f2c46d] hover:bg-[#4d3816]"
          >
            {T('back')}
          </button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <Crash>
    <App />
  </Crash>,
);
