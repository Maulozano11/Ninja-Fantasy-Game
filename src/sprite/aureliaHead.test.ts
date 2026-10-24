// Aurelia's head where the owner drew it (face shape 'aurelia', src/sprite/aureliaHead.ts): at rest her face,
// eyes, hair and the collar under her chin are his pixels at his places over her body (his game-scale
// picture: his pixel (x, y) is our (x + 73, y + 120), tools/refs/aurelia_rig.py), and in every other pose the
// whole head goes with her head, on her neck. The owner, 2026-10-23: "igual que romano copia la forma de cara
// cuello y peinado pixel a pixel me gusta mas la de mi dibujo". npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { AURELIA_FACE, AURELIA_FACE_LINE, AURELIA_FACE_SKIN } from './aureliaFaceArt';
import { DAWN_EYE_COLORS, DAWN_EYES } from './aureliaEyeArt';
import { AURELIA_HEAD_AHEAD, AURELIA_HEAD_UP, bodyHead } from './aureliaHead';
import { faceAnchor, skinTone } from './body';
import { retintHex } from './color';
import { renderSprite, spriteLayers } from './compose';
import { AURELIA_HAIR_FRONT_HIS, AURELIA_HAIR_LINE, AURELIA_HAIR_SKIN, AURELIA_SKIN_BASE } from './items/aureliaHairArt';
import { GRID, RES } from './raster';
import { frameCount } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const aurelia = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character.appearance!;
const noSkirt: SpriteAppearance = { ...aurelia, slots: Object.fromEntries(Object.entries(aurelia.slots).filter(([k]) => k !== 'skirt')) };
const ALL: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
/** His lash's first cell, the face anchor, in his picture; and where his pixels lie in our frame. */
const HIS_ANCHOR = [51, 16];
const HIS_AT = [73, 120];

const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const anchorOf = (look: SpriteAppearance, pose: SpritePose, fr: number) => {
  const { rig } = spriteLayers(look, pose, fr);
  return faceAnchor({ rig, bp: rig.bp, look } as never);
};

/** What his pixels make of her head at rest, cell by cell in our frame: her face, her eyes over it, her hair over both. */
function expected(look: SpriteAppearance): Map<number, string> {
  const { nx, ny } = anchorOf(look, 'idle', 0);
  const out = new Map<number, string>();
  const put = (x: number, y: number, c: string) => out.set(y * GRID + x, c.toLowerCase());
  const lines = new Set([...AURELIA_FACE_LINE].map((ch) => AURELIA_FACE.colors[ch]));
  AURELIA_FACE.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '.') continue;
      const h = AURELIA_FACE.colors[row[c]];
      put(nx - AURELIA_FACE.pivot[0] + c, ny - AURELIA_FACE.pivot[1] + r, lines.has(h) ? h : skinTone(h, look.skin, AURELIA_FACE_SKIN));
    }
  });
  const eyes = DAWN_EYES.open;
  for (const [eye, x0] of [[eyes.near, nx], [eyes.far, nx + 7]] as const)
    eye.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] !== '.') put(x0 + c, ny + r, DAWN_EYE_COLORS[row[c]]);
    });
  const hair = AURELIA_HAIR_FRONT_HIS;
  hair.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const h = hair.colors[ch];
      put(nx - hair.pivot[0] + c, ny - hair.pivot[1] + r, AURELIA_HAIR_LINE.includes(ch) || !AURELIA_HAIR_SKIN.includes(ch) ? h : retintHex(h, AURELIA_SKIN_BASE, look.skin));
    }
  });
  return out;
}

describe("Aurelia's head where the owner drew it", () => {
  it('stands her face anchor on his: his lash at our (124, 136) at rest, as all of her lies', () => {
    for (const look of [aurelia, noSkirt]) {
      const { nx, ny } = anchorOf(look, 'idle', 0);
      assert.deepEqual([nx, ny], [HIS_ANCHOR[0] + HIS_AT[0], HIS_ANCHOR[1] + HIS_AT[1]]);
    }
  });

  it('draws at rest every pixel of her face, eyes and hair as he drew them (no cell left that our rig cannot match)', () => {
    for (const look of [aurelia, noSkirt]) {
      const { rgba } = renderSprite(look, 'idle', 0);
      const off: string[] = [];
      for (const [i, want] of expected(look)) {
        const got = rgba[i * 4 + 3] ? hex(rgba, i) : 'none';
        if (got !== want) off.push(`(${(i % GRID) - HIS_AT[0]}, ${Math.floor(i / GRID) - HIS_AT[1]}): ${got}, his ${want}`);
      }
      assert.deepEqual(off, []);
    }
  });

  it('leaves empty what he left empty round her head and neck: behind her ear, behind her near lock, beside her collar', () => {
    const { rgba } = renderSprite(aurelia, 'idle', 0);
    for (const [x, y] of [[43, 19], [46, 22], [56, 25], [57, 25], [61, 22], [60, 23], [60, 24]]) {
      const i = (y + HIS_AT[1]) * GRID + x + HIS_AT[0];
      assert.equal(rgba[i * 4 + 3], 0, `his (${x}, ${y}) is his white ground`);
    }
  });

  it('carries her head from the body\'s own by his three pixels up and one ahead in every pose and frame', () => {
    for (const pose of ALL)
      for (let f = 0; f < frameCount(pose); f++) {
        const { rig } = spriteLayers(aurelia, pose, f);
        const d = { x: (rig.head.x - bodyHead(rig, aurelia).x) * RES, y: (rig.head.y - bodyHead(rig, aurelia).y) * RES };
        const up = d.x * rig.up.x + d.y * rig.up.y;
        const ahead = d.x * rig.right.x + d.y * rig.right.y;
        assert.ok(Math.abs(up - AURELIA_HEAD_UP) < 1e-6 && Math.abs(ahead - AURELIA_HEAD_AHEAD) < 1e-6, `${pose} ${f + 1}: ${up}, ${ahead}`);
      }
  });

  it('draws her whole face with her head in every pose and frame, and closes it on her neck and collar under the chin', () => {
    for (const look of [aurelia, noSkirt])
      for (const pose of ALL) {
        if (pose === 'downed') continue;
        for (let f = 0; f < frameCount(pose); f++) {
          const { layers } = spriteLayers(look, pose, f);
          const { nx, ny } = anchorOf(look, pose, f);
          const head = layers.get('head.body')!;
          AURELIA_FACE.rows.forEach((row, r) => {
            for (let c = 0; c < row.length; c++) {
              if (row[c] === '.') continue;
              const i = (ny - AURELIA_FACE.pivot[1] + r) * GRID + nx - AURELIA_FACE.pivot[0] + c;
              assert.ok(head.mat[i] >= 0, `${pose} ${f + 1}: her face's cell (${c}, ${r}) is drawn`);
            }
          });
          // between her chin and her collar (his rows 24-26, x 51-56) no ground shut in: her neck closes it (his
          // notch beside the collar, at 56-57, stays open to the side)
          const { rgba } = renderSprite(look, pose, f);
          const on = (x: number, y: number) => rgba[(y * GRID + x) * 4 + 3] > 0;
          for (let y = ny + 8; y <= ny + 10; y++)
            for (let x = nx; x <= nx + 5; x++)
              assert.ok(on(x, y) || !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1)), `${pose} ${f + 1}: a hole under her chin at ${x}, ${y}`);
        }
      }
  });
});
