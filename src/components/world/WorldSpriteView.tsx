import React, { useEffect, useRef } from 'react';
import { subscribeTick, TICK_FPS } from '../../sprite/ticker';

/** A sprite manifest written by tools/world-sprites (src/assets/world/<group>/manifest.json). */
interface WorldManifest {
  group: string;
  pxPerMeter: number;
  sprites: Record<
    string,
    {
      label: string;
      file: string;
      frameW: number;
      frameH: number;
      anchor: [number, number];
      meters: [number, number];
      tags: string[];
      anims: Record<string, { row: number; frames: number; fps: number; loop: boolean }>;
    }
  >;
}

const SHEETS = import.meta.glob('../../assets/world/*/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const MANIFESTS = import.meta.glob('../../assets/world/*/manifest.json', { eager: true, import: 'default' }) as Record<string, WorldManifest>;

const images = new Map<string, HTMLImageElement>();
export function sheetImage(url: string): HTMLImageElement {
  let img = images.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    images.set(url, img);
  }
  return img;
}

/**
 * Starts loading every sheet of the groups whose name starts with `prefix` (e.g. 'vfx_'), so an
 * effect is drawn from its sheet the first time it plays instead of its stand-in.
 */
export function preloadWorldGroups(prefix: string): void {
  for (const [path, url] of Object.entries(SHEETS)) {
    const group = path.split('/').at(-2) ?? '';
    if (group.startsWith(prefix)) sheetImage(url);
  }
}

export function worldSpriteSpec(group: string, name: string) {
  return MANIFESTS[`../../assets/world/${group}/manifest.json`]?.sprites[name];
}

/** A world sprite's spec and its sheet image (loading starts on the first call). */
export function worldSprite(group: string, name: string) {
  const spec = worldSpriteSpec(group, name);
  const url = spec ? SHEETS[`../../assets/world/${group}/${spec.file}`] : undefined;
  return spec && url ? { spec, img: sheetImage(url) } : undefined;
}

export interface WorldSpriteViewProps {
  group: string;
  name: string;
  /** Animation row; the sprite's first animation when missing or unknown. */
  anim?: string;
  /** Integer display scale (the art is drawn at 1 m = 57 px). */
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

/** One animated world sprite (campfire, tent, tree…) drawn crisp from its sheet. */
export const WorldSpriteView: React.FC<WorldSpriteViewProps> = ({ group, name, anim, scale = 2, className = '', style, title }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spec = worldSpriteSpec(group, name);
  const url = spec ? SHEETS[`../../assets/world/${group}/${spec.file}`] : undefined;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !spec || !url) return;
    const img = sheetImage(url);
    const a = (anim && spec.anims[anim]) || Object.values(spec.anims).sort((x, y) => x.row - y.row)[0];
    let last = -1;
    const draw = (frame: number) => {
      if (!img.complete || !img.naturalWidth) return false;
      ctx.clearRect(0, 0, spec.frameW, spec.frameH);
      ctx.drawImage(img, frame * spec.frameW, a.row * spec.frameH, spec.frameW, spec.frameH, 0, 0, spec.frameW, spec.frameH);
      return true;
    };
    return subscribeTick((tick) => {
      const n = a.fps > 0 && a.frames > 1 ? Math.floor((tick * a.fps) / TICK_FPS) : 0;
      const frame = a.loop ? n % a.frames : Math.min(n, a.frames - 1);
      if (frame === last) return;
      if (draw(frame)) last = frame;
    });
  }, [spec, url, anim]);

  if (!spec || !url) return null;
  return (
    <canvas
      ref={canvasRef}
      width={spec.frameW}
      height={spec.frameH}
      title={title ?? spec.label}
      className={className}
      style={{ width: spec.frameW * scale, height: spec.frameH * scale, imageRendering: 'pixelated', ...style }}
    />
  );
};
