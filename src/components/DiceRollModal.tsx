import React, { useEffect, useState, useRef } from 'react';
import { DiceRollResult } from '../types/shinobi';
import { soundManager } from '../utils/audio';
import { Sparkles, Skull, Dices, RotateCw } from 'lucide-react';

interface DiceRollModalProps {
  rollResult: DiceRollResult | null;
  onClose: () => void;
  isOpen: boolean;
}

export const DiceRollModal: React.FC<DiceRollModalProps> = ({ rollResult, onClose, isOpen }) => {
  const [animStage, setAnimStage] = useState<'ready' | 'tumbling' | 'settled'>('ready');
  const [displayNum, setDisplayNum] = useState<number>(1);
  const [rotX, setRotX] = useState<number>(0);
  const [rotY, setRotY] = useState<number>(0);
  const [rotZ, setRotZ] = useState<number>(0);
  const [trayShake, setTrayShake] = useState<boolean>(false);
  const [showCriticalBurst, setShowCriticalBurst] = useState<boolean>(false);
  const tumblingTimerRef = useRef<number | null>(null);

  const startRollTumble = () => {
    if (!rollResult) return;
    setAnimStage('tumbling');
    soundManager.playDiceRoll();
    setTrayShake(true);
    setTimeout(() => setTrayShake(false), 350);

    let frames = 0;
    const maxFrames = 18;
    const interval = window.setInterval(() => {
      frames++;
      setDisplayNum(Math.floor(Math.random() * 20) + 1);
      setRotX((prev) => (prev + 35) % 360);
      setRotY((prev) => (prev + 48) % 360);
      setRotZ((prev) => (prev + 22) % 360);

      if (frames >= maxFrames) {
        window.clearInterval(interval);
        setDisplayNum(rollResult.roll);
        setAnimStage('settled');
        setRotX(0);
        setRotY(0);
        setRotZ(0);

        if (rollResult.isCritical) {
          setShowCriticalBurst(true);
          soundManager.playCriticalHit();
        } else if (rollResult.isFumble) {
          soundManager.playDestruction();
        } else if (rollResult.isSuccess) {
          soundManager.playHit();
        }
      }
    }, 45);

    tumblingTimerRef.current = interval;
  };

  useEffect(() => {
    if (!isOpen || !rollResult) {
      setAnimStage('ready');
      setShowCriticalBurst(false);
      return;
    }

    // Auto-prepare roll and kick off physics toss smoothly
    setAnimStage('tumbling');
    setShowCriticalBurst(false);
    startRollTumble();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (animStage === 'settled') {
          onClose();
        } else if (animStage === 'ready') {
          startRollTumble();
        }
      } else if (e.key === 'Enter') {
        if (animStage === 'settled') {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (tumblingTimerRef.current) window.clearInterval(tumblingTimerRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, rollResult]);

  if (!isOpen || !rollResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className={`relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 p-6 shadow-2xl text-center overflow-hidden transition-transform duration-150 ${trayShake ? 'scale-102 translate-y-0.5' : 'scale-100'}`}>
        {/* Glow backdrop for critical hit / fumble */}
        {rollResult.isCritical && (
          <div className="absolute inset-0 bg-radial from-amber-500/25 via-cyan-500/15 to-transparent pointer-events-none animate-pulse" />
        )}
        {rollResult.isFumble && (
          <div className="absolute inset-0 bg-radial from-red-600/30 via-slate-900/40 to-transparent pointer-events-none animate-pulse" />
        )}

        {/* Title / Action Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2 text-left">
            <span className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Dices className="w-4 h-4" />
            </span>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-bold">
                {rollResult.diceType === 'd20' ? 'D&D 5e Turn Check' : 'Damage Resolution'}
              </div>
              <h3 className="text-sm font-extrabold text-white">{rollResult.reason}</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Interactive Tray
            </span>
          </div>
        </div>

        {/* 3D Velvet Dice Tray Surface */}
        <div className="relative mx-auto my-3 w-full h-52 rounded-xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-800 shadow-[inset_0_4px_16px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center overflow-hidden">
          {/* Subtle Octagonal Tray Inlay Lines */}
          <div className="absolute inset-4 rounded-lg border border-slate-800/60 pointer-events-none" />
          <div className="absolute top-2 left-3 text-[9px] font-mono tracking-widest text-slate-600 uppercase">
            Shinobi D20 Dice Arena
          </div>

          {/* Critical Hit Shockwave Particles */}
          {showCriticalBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 rounded-full border-4 border-amber-400/80 animate-ping" />
              <div className="absolute w-28 h-28 rounded-full bg-cyan-400/30 blur-xl animate-pulse" />
            </div>
          )}

          {/* D20 3D Die Container */}
          <div
            className="relative flex items-center justify-center cursor-pointer select-none transition-transform"
            style={{
              perspective: '600px',
            }}
            onClick={() => {
              if (animStage === 'settled') {
                startRollTumble();
              }
            }}
          >
            {/* The 3D Die Body */}
            <div
              className={`relative w-28 h-28 rounded-2xl flex flex-col items-center justify-center font-black transition-all duration-150 ${
                animStage === 'tumbling'
                  ? 'scale-105 border-2 border-cyan-400 bg-gradient-to-br from-slate-800 via-cyan-950 to-slate-900 shadow-xl shadow-cyan-500/40 text-cyan-200'
                  : rollResult.isCritical
                  ? 'scale-115 border-2 border-amber-300 bg-gradient-to-br from-amber-500 via-orange-600 to-blue-700 text-white shadow-2xl shadow-amber-500/60 ring-4 ring-amber-400/40'
                  : rollResult.isFumble
                  ? 'scale-100 border-2 border-rose-600 bg-gradient-to-br from-rose-950 via-red-900 to-slate-950 text-rose-200 shadow-lg shadow-rose-950'
                  : rollResult.isSuccess
                  ? 'scale-110 border-2 border-cyan-400 bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-900 text-cyan-300 shadow-xl shadow-cyan-600/40'
                  : 'scale-100 border-2 border-slate-700 bg-slate-800 text-slate-200 shadow-md'
              }`}
              style={{
                transform:
                  animStage === 'tumbling'
                    ? `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`
                    : 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
              }}
            >
              {/* Die Face Number */}
              <div className="text-4xl tabular-nums font-mono font-black tracking-tight drop-shadow-md">
                {animStage === 'tumbling' ? displayNum : rollResult.roll}
              </div>

              {/* D20 Facet Watermark */}
              <div className="text-[10px] font-mono tracking-widest uppercase opacity-75 mt-0.5">
                {rollResult.diceType === 'd20' ? 'd20' : `${rollResult.diceCount || 1}d${rollResult.diceSides || 20}`}
              </div>

              {/* Shimmer Highlight */}
              <div className="absolute top-1 left-2 right-2 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl pointer-events-none" />
            </div>
          </div>

          {/* Quick Retoss Tip */}
          <div className="absolute bottom-2 text-[10px] text-slate-500 font-mono">
            {animStage === 'tumbling'
              ? 'Tumbling across velvet...'
              : 'Click die or press Space to roll again'}
          </div>
        </div>

        {/* Mathematical Breakdown & Outcome */}
        {animStage === 'settled' && (
          <div className="mt-2 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Banner outcome */}
            {rollResult.isCritical && (
              <div className="flex items-center justify-center gap-2 text-base font-extrabold text-amber-300 tracking-wide bg-amber-950/60 border border-amber-500/40 py-1 px-3 rounded-lg animate-bounce">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>NATURAL 20 · ROYAL WARP CRITICAL STRIKE!</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
            )}
            {rollResult.isFumble && (
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-rose-400 bg-rose-950/50 border border-rose-800/50 py-1 px-3 rounded-lg">
                <Skull className="w-4 h-4 text-rose-400" />
                <span>NATURAL 1 · CRITICAL FUMBLE!</span>
              </div>
            )}

            {/* D&D 5e Formula Breakdown */}
            <div className="text-xs text-slate-200 bg-slate-950/90 rounded-xl p-3 font-mono border border-slate-800 shadow-inner flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>5e Resolution Formula</span>
                <span className="text-cyan-400 font-semibold">
                  {rollResult.targetAC ? `Target AC: ${rollResult.targetAC}` : rollResult.targetDC ? `Target DC: ${rollResult.targetDC}` : 'Direct Check'}
                </span>
              </div>

              <div className="text-sm font-bold text-white flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  d20({rollResult.roll})
                </span>
                <span className="text-slate-400">
                  {rollResult.modifier >= 0 ? `+ ${rollResult.modifier}` : `- ${Math.abs(rollResult.modifier)}`} Mod
                </span>
                <span className="text-slate-400">=</span>
                <span className={`text-base font-extrabold px-2 py-0.5 rounded ${
                  rollResult.isSuccess ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}>
                  {rollResult.total}
                </span>
              </div>

              {rollResult.isSuccess !== undefined && (
                <div className={`text-xs font-semibold mt-1 ${rollResult.isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {rollResult.isSuccess
                    ? '✓ HIT CONFIRMED! Attack penetrates enemy defenses.'
                    : '✗ MISSED / EVADED! Defenses or cover held strong.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={startRollTumble}
            className="flex-1 py-2 px-3 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-98 border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Retoss Die</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-2 py-2 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-98 transition shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Confirm & Continue (Space)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

