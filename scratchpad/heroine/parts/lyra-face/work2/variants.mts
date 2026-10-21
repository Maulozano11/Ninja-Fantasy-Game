// npx tsx variants.mts <outdir> : renders the female idle head with the keen eyes in several near-eye
// variants (patched into the module's data), cropped at 1x, for a sheet.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/src/sprite/raster';
import { KEEN_BROWS, KEEN_EYES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/src/sprite/lyraEyeArt';
import type { SpriteAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/src/sprite/types';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1f080632-3ee-2/tools/world-sprites/kit';

const out = process.argv[2];
const look: SpriteAppearance = {
  version: 1, body: 'female', skin: '#fdceb0', eyeShape: 'keen', eyeColor: '#4eb570', slots: {}, accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [],
};
const variants: Record<string, { near?: string[]; far?: string[]; brow?: string[] }> = JSON.parse(process.argv[3]);
const orig = { near: [...KEEN_EYES.open.near.rows], far: [...KEEN_EYES.open.far.rows], brow: [...KEEN_BROWS.near.rows] };
for (const [name, v] of Object.entries(variants)) {
  KEEN_EYES.open.near.rows = v.near || orig.near;
  KEEN_EYES.open.far.rows = v.far || orig.far;
  KEEN_BROWS.near.rows = v.brow || orig.brow;
  const f = renderSprite(look, 'idle', 0);
  writePng(`${out}/v-${name}.png`, GRID, GRID, f.rgba);
}
