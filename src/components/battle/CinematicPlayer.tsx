import React, { useEffect, useMemo, useRef } from 'react';
import type { ShinobiCharacter } from '../../types/shinobi';
import { renderSpriteCached } from '../../sprite/compose';
import { dojutsuToEye, getAppearance } from '../../sprite/legacy';
import { FEET, frameCount, POSE_FPS, rigPoseFor } from '../../sprite/rig';
import { GRID } from '../../sprite/raster';
import type { SpritePose } from '../../sprite/types';
import { strings, useLang } from '../../i18n';
import { frameAt, unitPlacement } from './cinematic';
import type { CinematicManifest } from './cinematic';

const T = strings({
  skip: { en: 'Skip', es: 'Saltar' },
});

/** A unit the game draws over the cinematic, by the manifest's role ('caster', ...). */
export interface CinematicCast {
  role: string;
  character: ShinobiCharacter;
  pose?: SpritePose;
}

export interface CinematicPlayerProps {
  manifest: CinematicManifest;
  /** The video made by tools/cinematics/render.py (no party in it). */
  src: string;
  cast: CinematicCast[];
  onEnd: () => void;
}

/** One sprite frame as a canvas, cached by look, pose and frame. */
const sprites = new Map<string, HTMLCanvasElement>();
function spriteCanvas(c: ShinobiCharacter, pose: SpritePose, frame: number): HTMLCanvasElement {
  const look = getAppearance(c);
  const key = `${c.id}|${JSON.stringify(look)}|${pose}|${frame}`;
  let cv = sprites.get(key);
  if (cv) return cv;
  const f = renderSpriteCached(look, pose, frame, dojutsuToEye(c.dojutsu));
  cv = document.createElement('canvas');
  cv.width = GRID;
  cv.height = GRID;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(GRID, GRID);
  img.data.set(f.rgba);
  ctx.putImageData(img, 0, 0);
  sprites.set(key, cv);
  return cv;
}

/**
 * Plays a cinematic full screen: the video, and the real units drawn over it under the same camera
 * every frame (the manifest's), so it shows the player's own ninjas, then hands back to the battle.
 * Skippable.
 */
export const CinematicPlayer: React.FC<CinematicPlayerProps> = ({ manifest, src, cast, onEnd }) => {
  useLang();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ended = useRef(false);
  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    onEnd();
  };
  const units = useMemo(
    () => cast.map((c) => ({ ...c, at: manifest.units.find((u) => u.role === c.role) })).filter((c) => c.at),
    [cast, manifest],
  );

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const v = video.current;
      const cv = canvas.current;
      if (v && cv) {
        const ctx = cv.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        if (v.readyState >= 2) ctx.drawImage(v, 0, 0, cv.width, cv.height);
        const f = frameAt(manifest, v.currentTime);
        for (const u of units) {
          const pose = u.pose ?? 'cast';
          const n = frameCount(rigPoseFor(pose));
          const sf = Math.floor(v.currentTime * (POSE_FPS[pose] ?? 6)) % Math.max(1, n);
          const p = unitPlacement(manifest, f, u.at!, cv.width);
          const s = p.scale;
          ctx.drawImage(spriteCanvas(u.character, pose, sf), p.x - FEET.x * s, p.y - FEET.y * s, GRID * s, GRID * s);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [manifest, units]);

  const [w, h] = [1920, Math.round((1920 * manifest.size[1]) / manifest.size[0])];
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" data-cinematic={manifest.name}>
      <video ref={video} src={src} autoPlay muted playsInline onEnded={finish} className="hidden" />
      <canvas ref={canvas} width={w} height={h} className="max-w-full max-h-full" style={{ imageRendering: 'pixelated' }} />
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-6 px-4 py-2 rounded bg-black/60 text-amber-100 border border-amber-300/40 hover:bg-black/80"
      >
        {T('skip')}
      </button>
    </div>
  );
};
