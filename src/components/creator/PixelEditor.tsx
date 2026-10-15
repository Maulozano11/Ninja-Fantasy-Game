import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Grid3x3, Paintbrush, Pipette, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { nearestPart, renderSprite, toLocal, toWorld } from '../../sprite/compose';
import { rgbToHex } from '../../sprite/color';
import { GRID, PARTS, PartId } from '../../sprite/raster';
import { buildRig } from '../../sprite/rig';
import type { EyeSpecial, PixelEdit, SpriteAppearance } from '../../sprite/types';
import { CLOTH_COLORS, HAIR_COLORS, SKIN_TONES } from '../../sprite/palettes';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import type { ShinobiCharacter } from '../../types/shinobi';

type Tool = 'paint' | 'erase' | 'restore' | 'pick';

const SCALE = 4;
const QUICK = [...new Set([...CLOTH_COLORS, ...HAIR_COLORS.slice(0, 8), ...SKIN_TONES.slice(0, 5), '#000000', '#ffffff'])];

/**
 * Pixel-by-pixel paint editor. Painting happens on the idle pose; every edit
 * is stored relative to the body part under the brush so it follows that
 * part into every other pose.
 */
export const PixelEditor: React.FC<{
  look: SpriteAppearance;
  eye: EyeSpecial;
  character: ShinobiCharacter;
  onChange: (look: SpriteAppearance) => void;
}> = ({ look, eye, character, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>('paint');
  const [color, setColor] = useState('#d81b2a');
  const [grid, setGrid] = useState(true);
  const [history, setHistory] = useState<PixelEdit[][]>([]);
  const [previewPose, setPreviewPose] = useState<'attack' | 'cast' | 'victory' | 'charge'>('attack');
  const painting = useRef(false);
  const stroke = useRef<PixelEdit[] | null>(null);

  const rig = useMemo(() => buildRig(look.body, 'idle', 0), [look.body]);
  const base = useMemo(() => renderSprite(look, 'idle', 0, eye, { skipEdits: true }), [look, eye]);
  const shown = useMemo(() => renderSprite(look, 'idle', 0, eye), [look, eye]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const W = GRID * SCALE;
    ctx.clearRect(0, 0, W, W);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#1c1f2b' : '#212535';
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        const i = (y * GRID + x) * 4;
        if (shown.rgba[i + 3]) {
          ctx.fillStyle = `rgb(${shown.rgba[i]},${shown.rgba[i + 1]},${shown.rgba[i + 2]})`;
          ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        }
      }
    }
    if (grid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let k = 0; k <= GRID; k++) {
        ctx.beginPath();
        ctx.moveTo(k * SCALE + 0.5, 0);
        ctx.lineTo(k * SCALE + 0.5, W);
        ctx.moveTo(0, k * SCALE + 0.5);
        ctx.lineTo(W, k * SCALE + 0.5);
        ctx.stroke();
      }
    }
  }, [shown, grid]);

  const editsWithout = (edits: PixelEdit[], x: number, y: number) =>
    edits.filter((e) => {
      const w = toWorld(rig, e.part, e.a, e.b);
      return w.x !== x || w.y !== y;
    });

  const applyAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    const i = y * GRID + x;
    if (tool === 'pick') {
      if (shown.rgba[i * 4 + 3]) setColor(rgbToHex(shown.rgba[i * 4], shown.rgba[i * 4 + 1], shown.rgba[i * 4 + 2]));
      setTool('paint');
      return;
    }
    const current = stroke.current ?? look.pixelEdits;
    let next = editsWithout(current, x, y);
    if (tool !== 'restore') {
      const partIdx = base.part[i];
      const part: PartId = partIdx ? PARTS[partIdx] : nearestPart(rig, x, y);
      const { a, b } = toLocal(rig, part, x, y);
      next = [...next, { part, a, b, color: tool === 'erase' ? null : color }];
    }
    stroke.current = next;
    onChange({ ...look, pixelEdits: next });
  };

  const cell = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * GRID),
      y: Math.floor(((e.clientY - r.top) / r.height) * GRID),
    };
  };

  const toolBtn = (t: Tool, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTool(t)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition ${
        tool === t ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 leading-relaxed">
        Paint over your sprite one pixel at a time. Each pixel sticks to the body part you paint it on, so it follows
        that part into every pose. Erase removes sprite pixels; Restore undoes your edit on a pixel.
      </p>
      <div className="flex flex-wrap gap-2">
        {toolBtn('paint', 'Paint', <Paintbrush className="w-3.5 h-3.5" />)}
        {toolBtn('erase', 'Erase', <Eraser className="w-3.5 h-3.5" />)}
        {toolBtn('restore', 'Restore', <RotateCcw className="w-3.5 h-3.5" />)}
        {toolBtn('pick', 'Pick color', <Pipette className="w-3.5 h-3.5" />)}
        <button
          type="button"
          onClick={() => setGrid(!grid)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white"
        >
          <Grid3x3 className="w-3.5 h-3.5" /> Grid
        </button>
        <button
          type="button"
          disabled={!history.length}
          onClick={() => {
            const prev = history[history.length - 1];
            setHistory(history.slice(0, -1));
            onChange({ ...look, pixelEdits: prev });
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button
          type="button"
          disabled={!look.pixelEdits.length}
          onClick={() => {
            setHistory([...history, look.pixelEdits]);
            onChange({ ...look, pixelEdits: [] });
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border bg-slate-950/60 border-slate-800 text-rose-300 hover:text-rose-200 disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear all
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            setTool('paint');
          }}
          className="w-9 h-9 rounded-md bg-transparent border border-slate-700 cursor-pointer"
          title="Custom color"
        />
        {QUICK.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setColor(c);
              setTool('paint');
            }}
            className={`w-6 h-6 rounded-md border-2 ${color === c ? 'border-white scale-110' : 'border-slate-800'}`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        <canvas
          ref={canvasRef}
          width={GRID * SCALE}
          height={GRID * SCALE}
          className="rounded-xl border border-slate-800 cursor-crosshair touch-none max-w-full"
          style={{ width: GRID * SCALE, maxWidth: '100%', imageRendering: 'pixelated' }}
          onPointerDown={(e) => {
            painting.current = true;
            stroke.current = null;
            setHistory((h) => [...h, look.pixelEdits]);
            e.currentTarget.setPointerCapture(e.pointerId);
            const { x, y } = cell(e);
            applyAt(x, y);
          }}
          onPointerMove={(e) => {
            if (!painting.current || tool === 'pick') return;
            const { x, y } = cell(e);
            applyAt(x, y);
          }}
          onPointerUp={() => {
            painting.current = false;
            stroke.current = null;
          }}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Edits in motion</div>
          <ShinobiSpriteCanvas character={character} appearance={look} stance={previewPose} size={160} showAura={false} />
          <div className="grid grid-cols-2 gap-1">
            {(['attack', 'cast', 'victory', 'charge'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreviewPose(p)}
                className={`px-2 py-1 text-[10px] rounded-md capitalize ${
                  previewPose === p ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500">{look.pixelEdits.length} painted pixels</div>
        </div>
      </div>
    </div>
  );
};
