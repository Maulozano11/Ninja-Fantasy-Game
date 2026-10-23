// The owner's broad man reading, on the bulky body: his own frame of it (docs/reference/bulky-read-owner-reference.jpg,
// tools/refs/bulky-read-from-ref.py -> broadReadArt.ts), shown whole in place of our pieces wherever the broad man
// as he drew him reads. The owner (2026-10-23), after the read was mended twice: "sigue mal pasame esta para
// repintarlo", then, with his repaint over our "Leer 1": "aqui esta la referencia exacta q quiero". Our read is
// one held frame on the male bodies (rig.ts READ_KEYS), so his one frame is all 12.

import { BROAD_READ } from './broadReadArt';
import { getItem } from './catalog';
import { hexToRgb, retintHex } from './color';
import type { SpriteFrame } from './compose';
import { GRID } from './raster';
import type { Rig } from './rig';
import type { SpriteAppearance, SpritePose } from './types';

/** The colours of his picture the character's own follow (at these, every pixel is his). */
export const BROAD_READ_BASE = { skin: '#f2bd97', hair: '#f0cc74', eye: '#5a4b32' } as const;

/** His broad man's clothes, as he drew him (bulky-owner-reference.jpg), each in its own colours. */
const HIS_KIT: Record<string, string> = {
  top: 'top_seam_shirt',
  bottom: 'bottom_jeans',
  waist: 'waist_brawler_belt',
  hands: 'hands_brawler_bracers',
  feet: 'feet_brawler_boots',
};

/** The broad man as he drew him, on the bulky body (the look the owner's frame was painted over). */
export const BROAD_READ_LOOK: SpriteAppearance = {
  version: 1,
  body: 'bulky',
  skin: BROAD_READ_BASE.skin,
  eyeShape: 'stern',
  faceShape: 'stern',
  eyeColor: BROAD_READ_BASE.eye,
  slots: {
    hair: { id: 'hair_long_lock', colors: [BROAD_READ_BASE.hair] },
    ...Object.fromEntries(Object.entries(HIS_KIT).map(([slot, id]) => [slot, { id, colors: [] }])),
  },
  accessories: [],
  headband: { position: 'none', tails: false, cloth: '#1e3a8a' },
  chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false },
  pixelEdits: [],
};

/**
 * Whether a look is his broad man reading on the bulky body: his hair, face, eyes and kit, the kit in its own
 * colours, nothing else worn. His skin, hair and eye colours may be the character's: they are retinted.
 */
export function readsAsHisBroadMan(look: SpriteAppearance, pose: SpritePose): boolean {
  if (pose !== 'read' || look.body !== 'bulky' || look.faceShape !== 'stern' || look.eyeShape !== 'stern') return false;
  if (look.headband.position !== 'none' || look.accessories.length || look.stowed) return false;
  const slots = Object.entries(look.slots).filter(([, c]) => c);
  if (slots.length !== Object.keys(HIS_KIT).length + 1 || look.slots.hair?.id !== 'hair_long_lock') return false;
  return Object.entries(HIS_KIT).every(([slot, id]) => {
    const c = look.slots[slot as keyof typeof look.slots];
    if (c?.id !== id) return false;
    const own = getItem(id)?.colors.map((k) => k.default.toLowerCase()) ?? [];
    return c.colors.every((h, k) => h.toLowerCase() === own[k]);
  });
}

/** His frame, his pixels at his colours; his skin, hair and eyes in the character's. */
export function broadReadFrame(look: SpriteAppearance, rig: Rig): SpriteFrame {
  const N = GRID * GRID;
  const rgba = new Uint8ClampedArray(N * 4);
  const part = new Uint8Array(N);
  const hair = new Uint8Array(N >> 3);
  const fx = new Uint8Array(N >> 3);
  const to = { skin: look.skin, hair: look.slots.hair?.colors[0] ?? BROAD_READ_BASE.hair, eye: look.eyeColor };
  const rgb = new Map<string, [number, number, number]>();
  const colour = (ch: string): [number, number, number] => {
    let c = rgb.get(ch);
    if (!c) {
      const hex = BROAD_READ.colors[ch];
      const kind = BROAD_READ.kinds[ch];
      c = hexToRgb(kind === 'fixed' ? hex : retintHex(hex, BROAD_READ_BASE[kind], to[kind]));
      rgb.set(ch, c);
    }
    return c;
  };
  const [x0, y0] = BROAD_READ.at;
  BROAD_READ.rows.forEach((row, j) => {
    for (let k = 0; k < row.length; k++) {
      const ch = row[k];
      if (ch === '.') continue;
      const i = (y0 + j) * GRID + x0 + k;
      rgba.set([...colour(ch), 255], i * 4);
      part[i] = BROAD_READ.parts[j].charCodeAt(k) - 97;
      if (BROAD_READ.kinds[ch] === 'hair') hair[i >> 3] |= 1 << (i & 7);
    }
  });
  return { rgba, part, hair, fx, rig };
}
