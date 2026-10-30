// The heroine knights' longsword (the owner's picture docs/reference/heroine-knights-owner-reference.jpg: the
// same sword in all three hands), built from parts the player picks a version of, as the katana's are (the
// owner: "la espada ponlos como para escoger la guarda como la katana"): the blade and the guard. Every
// version is a piece of his pixels (tools/refs/hk-sword-from-ref.py) on the same pivot, the grip under her
// near fist, at the angle he drew the blade: at rest every pixel is his.
//
// Another guard (or blade) is one more entry here: its piece lifted with the same pivot and angle (a block in
// tools/refs/hk-sword-from-ref.py, or its own script writing a module beside heroineKnightSwordArt.ts), its
// option (id, label, desc) and its Spanish label in creator/words.ts. The first entry is the default.

import { retintHex } from '../color';
import type { Depth, DrawCtx, PartSlot, PartsPreview } from '../ctx';
import type { PaintedPiece } from '../painted';
import type { Vec } from '../raster';
import { drawPaintedWeapon } from './weapons';
import { HK_SWORD_BLADE, HK_SWORD_GEM, HK_SWORD_GUARD, HK_SWORD_HILT, HK_SWORD_KIND, HK_SWORD_STEEL } from './heroineKnightSwordArt';

interface SwordPart {
  id: string;
  label: string;
  desc: string;
  piece: PaintedPiece;
}

/** The blades the creator offers, the first the default. */
export const HK_BLADES: SwordPart[] = [{ id: 'long', label: 'Pale longblade', desc: 'His long straight blade, pale blue and bright along the edge.', piece: HK_SWORD_BLADE }];

/** The guards the creator offers, the first the default. */
export const HK_GUARDS: SwordPart[] = [{ id: 'cross', label: 'Gem cross-guard', desc: 'His silver cross-guard, a blue gem in its middle, and the silver pommel.', piece: HK_SWORD_GUARD }];

export const HK_SWORD_PARTS: PartSlot[] = [
  { key: 'blade', label: 'Blade', options: HK_BLADES.map(({ id, label, desc }) => ({ id, label, desc })) },
  { key: 'guard', label: 'Guard', options: HK_GUARDS.map(({ id, label, desc }) => ({ id, label, desc })) },
];

const partOf = (list: SwordPart[], id: string | undefined): PaintedPiece => (list.find((p) => p.id === id) ?? list[0]).piece;

/** The blade's angle at rest (his): the angle the sword hangs at in her hand while she stands. */
export const HK_SWORD_ANGLE = HK_SWORD_BLADE.angle;

/** His blade's steel and glint from the blade colour, his silver from the hilt colour, his gem from the gem colour; his line stays. */
const tintOf =
  (steel: string, hilt: string, gem: string) =>
  (_ch: string, hex: string): string => {
    const k = HK_SWORD_KIND[hex];
    if (k === 'line') return hex;
    if (k === 'blue') return retintHex(hex, HK_SWORD_GEM, gem);
    return k === 'cyan' ? retintHex(hex, HK_SWORD_STEEL, steel) : retintHex(hex, HK_SWORD_HILT, hilt);
  };
const isLine = (hex: string) => HK_SWORD_KIND[hex] === 'line';

/** Draws the sword with its grip at `at` (rig units), the blade pointing along `deg`. */
export function drawHeroineSword(g: DrawCtx, depth: Depth, at: Vec, deg: number, colors: string[], parts: Record<string, string>): void {
  const tint = tintOf(colors[0], colors[1], colors[2]);
  drawPaintedWeapon(g, depth, partOf(HK_BLADES, parts.blade), at, deg, tint, isLine);
  drawPaintedWeapon(g, depth, partOf(HK_GUARDS, parts.guard), at, deg, tint, isLine);
}

/** The sword with these parts on its own, at his angle, for the creator's part pickers. */
export function heroineSwordPreview(parts: Record<string, string>): PartsPreview {
  const pieces = [partOf(HK_BLADES, parts.blade), partOf(HK_GUARDS, parts.guard)];
  // both pivot on the grip: lay them on one grid by their pivots
  const left = Math.max(...pieces.map((p) => p.pivot[0]));
  const top = Math.max(...pieces.map((p) => p.pivot[1]));
  const W = Math.max(...pieces.map((p) => left - p.pivot[0] + Math.max(...p.rows.map((r) => r.length))));
  const H = Math.max(...pieces.map((p) => top - p.pivot[1] + p.rows.length));
  const grid = Array.from({ length: H }, () => Array<string>(W).fill('.'));
  const colors: Record<string, string> = {};
  const key = new Map<string, string>();
  const CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (const p of pieces) {
    const dx = left - p.pivot[0];
    const dy = top - p.pivot[1];
    p.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        const hex = p.colors[ch];
        let k = key.get(hex);
        if (!k) key.set(hex, (k = CH[key.size % CH.length]));
        colors[k] = hex;
        grid[y + dy][x + dx] = k;
      }),
    );
  }
  return { rows: grid.map((r) => r.join('')), colors };
}

export { HK_SWORD_GEM, HK_SWORD_HILT, HK_SWORD_STEEL };
