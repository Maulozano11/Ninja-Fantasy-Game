// Tests for Aurelia's vestment (armor_dawn_vestment, the owner's pixels from his picture of her at our
// scale): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { FEMALE_BASE } from './femaleBaseArt';
import type { PaintedPiece } from './painted';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { GRID, PARTS, partIndex, RES } from './raster';
import { frameCount } from './rig';
import {
  AURELIA_BODICE,
  AURELIA_CLOTH,
  AURELIA_GEM,
  AURELIA_GOLD,
  AURELIA_SKIN_SHADES,
  AURELIA_SLEEVE_FORE_N,
  AURELIA_SLEEVE_UPPER_N,
} from './items/aureliaVestmentArt';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const look = (body: BodyType, armor?: string[], skin = '#f9ccaa'): SpriteAppearance => ({
  version: 1,
  body,
  skin,
  eyeShape: 'standard',
  eyeColor: '#226ba3',
  slots: armor ? { armor: { id: 'armor_dawn_vestment', colors: armor } } : {},
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number): string => {
  const i = (y * GRID + x) * 4;
  return rgba[i + 3] ? '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('') : '';
};

/** Each pixel of a piece where stampPiece lays it at its own angle: [x, y, its colour]. */
const laid = (p: PaintedPiece, at: { x: number; y: number }): [number, number, string][] => {
  const out: [number, number, string][] = [];
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  p.rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && out.push([ax + i, ay + j, p.colors[ch]])));
  return out;
};

describe("Aurelia's vestment", () => {
  it('is armour for the women, her white, gold and gem the defaults', () => {
    const d = getItem('armor_dawn_vestment')!;
    assert.equal(d.slot, 'armor');
    assert.deepEqual(d.bodies, ['female', 'slender']);
    assert.deepEqual(
      d.colors.map((c) => [c.key, c.default]),
      [
        ['cloth', AURELIA_CLOTH],
        ['gold', AURELIA_GOLD],
        ['gem', AURELIA_GEM],
      ],
    );
  });

  it('lays her near sleeve on our female at idle frame 0 exactly as drawn', () => {
    const f = renderSprite(look('female', []), 'idle', 0);
    const upper = laid(AURELIA_SLEEVE_UPPER_N, f.rig.shoulderN);
    const over = new Set(upper.map(([x, y]) => `${x},${y}`));
    const fore = laid(AURELIA_SLEEVE_FORE_N, f.rig.elbowN).filter(([x, y]) => !over.has(`${x},${y}`));
    // his bare shoulder over the band is drawn in the body's skin (next test)
    const skin = new Set(Object.keys(AURELIA_SKIN_SHADES).map((ch) => AURELIA_SLEEVE_UPPER_N.colors[ch]));
    const his = [...upper, ...fore].filter(([, , c]) => !skin.has(c));
    assert.ok(his.length > 100);
    for (const [x, y, c] of his) assert.equal(hexAt(f.rgba, x, y), c, `(${x}, ${y})`);
  });

  it("draws his bare near shoulder over the band in the player's skin", () => {
    const shoulder = (skin: string) => {
      const f = renderSprite(look('female', [], skin), 'idle', 0);
      const cells = laid(AURELIA_SLEEVE_UPPER_N, f.rig.shoulderN).filter(([, , c]) =>
        Object.keys(AURELIA_SKIN_SHADES).some((ch) => AURELIA_SLEEVE_UPPER_N.colors[ch] === c),
      );
      assert.ok(cells.length > 20);
      return cells.map(([x, y]) => hexAt(f.rgba, x, y)).join();
    };
    assert.notEqual(shoulder('#f9ccaa'), shoulder('#7a4a30'));
  });

  it('shows her gem at the throat, and follows the colour slots', () => {
    const at = (colors: string[]) => {
      const f = renderSprite(look('female', colors), 'idle', 0);
      const gem = laid(AURELIA_BODICE, f.rig.neck).filter(([, , c]) => c === AURELIA_GEM);
      assert.ok(gem.length > 0);
      return gem.map(([x, y]) => hexAt(f.rgba, x, y));
    };
    // her collar lies just under our chin, as his under his: the gem's top pixels can go under the chin
    const gem = at([]);
    assert.ok(gem.filter((c) => c === AURELIA_GEM).length >= Math.ceil(gem.length / 2), `gem ${gem.join()}`);
    assert.ok(at(['', '', '#c8202c']).every((c) => c !== AURELIA_GEM));
  });

  it("draws his skin in the keyhole under the gem in the player's skin", () => {
    const keyhole = (skin: string) => {
      const f = renderSprite(look('female', [], skin), 'idle', 0);
      const cells = laid(AURELIA_BODICE, f.rig.neck).filter(([x, y]) => {
        const ch = AURELIA_BODICE.rows[y - (Math.floor(f.rig.neck.y * RES) - AURELIA_BODICE.pivot[1])][x - (Math.floor(f.rig.neck.x * RES) - AURELIA_BODICE.pivot[0])];
        // the keyhole is beside the neck's middle; his other skin (the armpit) is by the near arm
        return AURELIA_SKIN_SHADES[ch] === 3 && x >= Math.floor(f.rig.neck.x * RES);
      });
      assert.ok(cells.length > 0);
      return cells.map(([x, y]) => hexAt(f.rgba, x, y)).join();
    };
    assert.notEqual(keyhole('#f9ccaa'), keyhole('#7a4a30'));
  });

  it('lets none of our undergarment show past her bodice above the hips', () => {
    // the body's sports top (his bare woman's, femaleBaseArt.ts): the bare body shows it there
    const chest = FEMALE_BASE.chest;
    const under = new Set([...chest.cloth].map((ch) => chest.colors[ch]));
    const torso = partIndex('torso');
    const shown = (armor?: string[]) => {
      const f = renderSprite(look('female', armor), 'idle', 0);
      let n = 0;
      for (let y = 150; y < 172; y++) for (let x = 100; x < 150; x++) if (f.part[y * GRID + x] === torso && under.has(hexAt(f.rgba, x, y))) n++;
      return n;
    };
    assert.ok(shown() > 0);
    assert.equal(shown([]), 0);
  });

  it('is not drawn on the men', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      assert.deepEqual(renderSprite(look(body, []), 'idle', 0).rgba, renderSprite(look(body), 'idle', 0).rgba);
    }
  });
  it('keeps her edges closed in every pose: no pixel of her clothes or body left open on the figure', () => {
    // The owner's review: "unos pixeles de la espalda se ven cortados", "la mano en arrojada se ve
    // cortada". A pixel on the figure's edge is his line, never cloth or skin left open (her head, whose
    // hair has its own lit edge, and her staff's glow aside; the cast effect's runes sit over the hands).
    const look0 = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character.appearance!;
    const skip = new Set(['head', 'held', 'none']);
    for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[]) {
      if (pose === 'cast') continue;
      for (let fr = 0; fr < frameCount(pose); fr++) {
        const f = renderSprite(look0, pose, fr);
        const op = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && f.rgba[(y * GRID + x) * 4 + 3] > 0;
        const open: string[] = [];
        for (let y = 0; y < GRID; y++)
          for (let x = 0; x < GRID; x++) {
            const i = y * GRID + x;
            if (!op(x, y) || skip.has(PARTS[f.part[i]]) || Math.max(f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2]) < 70) continue;
            if (!op(x + 1, y) || !op(x - 1, y) || !op(x, y + 1) || !op(x, y - 1)) open.push(`${x},${y}`);
          }
        assert.ok(open.length <= 2, `${pose} ${fr}: ${open.join(' ')}`);
      }
    }
  });

  it("keeps her head on her neck through the throw, with no pocket of background under her chin", () => {
    // The owner: "aurelia falta arreglarle el cuello y cabeza como los otros arreglalo en arrojar". The
    // throw hung her head ahead of the chest and below the shoulders, 17 px from the neck's foot (8.9 at
    // rest); now it stays at the neck's length, above the shoulders (rig.ts PoseFrame.neckPitch). Her
    // turned bodice also left a dent at its front under the collar that her line closed round: a pixel of
    // background inside her dress. Near the neck the only enclosed empty pixels allowed are her hair's
    // own, which his picture has at rest too (carried with the head).
    const look0 = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character.appearance!;
    const head = partIndex('head');
    /** The empty pixels a frame encloses (not reached from its border). */
    const pockets = (f: ReturnType<typeof renderSprite>): number[] => {
      const empty = (i: number) => f.rgba[i * 4 + 3] === 0;
      const outside = new Uint8Array(GRID * GRID);
      const stack: number[] = [];
      for (let k = 0; k < GRID; k++) for (const i of [k, (GRID - 1) * GRID + k, k * GRID, k * GRID + GRID - 1]) if (empty(i) && !outside[i]) (outside[i] = 1), stack.push(i);
      while (stack.length) {
        const i = stack.pop()!;
        const x = i % GRID;
        for (const j of [x > 0 ? i - 1 : -1, x < GRID - 1 ? i + 1 : -1, i - GRID, i + GRID]) if (j >= 0 && j < GRID * GRID && empty(j) && !outside[j]) (outside[j] = 1), stack.push(j);
      }
      return [...Array(GRID * GRID).keys()].filter((i) => empty(i) && !outside[i]);
    };
    const idle = renderSprite(look0, 'idle', 0);
    const rest = idle.rig;
    const neckLen = Math.hypot(rest.head.x - rest.neck.x, rest.head.y - rest.neck.y) * RES;
    // his hair's own pockets at rest: enclosed by the head alone
    const hairPockets = new Set(pockets(idle).filter((i) => [i - 1, i + 1, i - GRID, i + GRID].every((j) => idle.part[j] === head)));
    for (let fr = 2; fr < frameCount('throw'); fr++) {
      const f = renderSprite(look0, 'throw', fr);
      const r = f.rig;
      const len = Math.hypot(r.head.x - r.neck.x, r.head.y - r.neck.y) * RES;
      assert.ok(Math.abs(len - neckLen) <= 1.5, `throw ${fr}: head ${len.toFixed(1)} px from the neck's foot (${neckLen.toFixed(1)} at rest)`);
      assert.ok(r.head.y < Math.min(r.shoulderN.y, r.shoulderF.y), `throw ${fr}: the head below the shoulders`);
      const dx = Math.round((r.head.x - rest.head.x) * RES);
      const dy = Math.round((r.head.y - rest.head.y) * RES);
      const near = pockets(f).filter((i) => {
        const x = i % GRID;
        const y = (i - x) / GRID;
        return Math.hypot(x + 0.5 - r.neck.x * RES, y + 0.5 - r.neck.y * RES) <= 16 && !hairPockets.has((y - dy) * GRID + x - dx);
      });
      assert.deepEqual(near.map((i) => `${i % GRID},${Math.floor(i / GRID)}`), [], `throw ${fr}: background enclosed by her neck, collar or dress`);
    }
  });
});
