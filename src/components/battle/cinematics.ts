// The cinematics the game ships: each one's video and manifest, made by tools/cinematics/render.py
// (--assets src/assets/cinematics). Generated: rerun the tool to change them.
import type { CinematicManifest } from './cinematic';

const videos = import.meta.glob('../../assets/cinematics/*.mp4', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const manifests = import.meta.glob('../../assets/cinematics/*.json', { eager: true, import: 'default' }) as Record<string, CinematicManifest>;

export interface Cinematic {
  manifest: CinematicManifest;
  src: string;
}

export const CINEMATICS: Record<string, Cinematic> = Object.fromEntries(
  Object.entries(manifests).map(([path, manifest]) => [manifest.name, { manifest, src: videos[path.replace(/\.json$/, '.mp4')] }]),
);
