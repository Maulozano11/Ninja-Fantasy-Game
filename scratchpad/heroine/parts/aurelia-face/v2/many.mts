// npx tsx many.mts <outdir> <cases.json>
// cases: [{name, body, pose, frame, special?, look?, crop?: 'head' | 'full', box?: [w,h]}]
// Writes <outdir>/<i>.png (head crop, transparent as is) and <outdir>/manifest.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cee7f3a5-3e8-2/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cee7f3a5-3e8-2/src/sprite/raster';
import type { BodyType, EyeSpecial, SpriteAppearance, SpritePose } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cee7f3a5-3e8-2/src/sprite/types';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cee7f3a5-3e8-2/tools/world-sprites/kit';

const [out, casesPath] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const cases = JSON.parse(readFileSync(casesPath, 'utf8'));
const manifest: { file: string; name: string }[] = [];
cases.forEach((c: any, i: number) => {
  const look: SpriteAppearance = {
    version: 1,
    body: c.body as BodyType,
    skin: '#f9ccaa',
    eyeShape: 'dawn',
    eyeColor: '#226ba3',
    slots: {},
    accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
    pixelEdits: [],
    ...(c.look || {}),
  };
  const f = renderSprite(look, c.pose as SpritePose, c.frame || 0, (c.special || 'none') as EyeSpecial);
  const [w, h] = c.box || [26, 24];
  let x0 = 0, y0 = 0, W = GRID, H = GRID;
  if (c.crop !== 'full') {
    x0 = Math.round(f.rig.head.x * RES) - 14;
    y0 = Math.round(f.rig.head.y * RES) - 12;
    W = w;
    H = h;
  }
  const o = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = x0 + x, sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) continue;
    const s = (sy * GRID + sx) * 4;
    o.set(f.rgba.subarray(s, s + 4), (y * W + x) * 4);
  }
  const file = `${out}/${i}.png`;
  writePng(file, W, H, o);
  manifest.push({ file, name: c.name });
});
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest));
