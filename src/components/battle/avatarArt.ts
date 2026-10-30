// The fire avatar's battle sprites (the owner's pictures, cut by tools/refs/fire-avatar-sprites-from-ref.py):
// one image per stance for the Colossal Avatar (3.3 times the ninja) and the improved one (5 times).
import type { AvatarStance } from '../../battle/types';

const FILES = import.meta.glob('../../assets/battle_avatar/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const MANIFEST = Object.values(import.meta.glob('../../assets/battle_avatar/manifest.json', { eager: true, import: 'default' }) as Record<string, Record<string, AvatarArt>>)[0] ?? {};

/** One stance's image: its size, the root of its fire column (x), and how many times the ninja's height it stands. */
export interface AvatarArt {
  w: number;
  h: number;
  rootX: number;
  times: number;
}

/** The url and size of the stance's image, or nothing when it isn't shipped. */
export function avatarArt(stance: AvatarStance, plus: boolean): (AvatarArt & { url: string }) | undefined {
  const key = stance + (plus ? '_plus' : '');
  const url = Object.entries(FILES).find(([k]) => k.endsWith(`/${key}.png`))?.[1];
  const art = MANIFEST[key];
  return url && art ? { ...art, url } : undefined;
}
