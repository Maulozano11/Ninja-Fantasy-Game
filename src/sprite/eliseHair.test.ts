// Tests for the owner's Elise's hair (hair_golden_fall, items/eliseHairArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { hexToRgb } from './color';
import { renderSpriteCached } from './compose';
import { ELISE_HAIR_BACK, ELISE_HAIR_BASE, ELISE_HAIR_FALL, ELISE_HAIR_FRONT, ELISE_HAIR_LINE, ELISE_HAIR_WISP, ELISE_ORNAMENT, ELISE_ORNAMENT_BASE } from './items/eliseHairArt';
import { wispPixels } from './items/eliseHair';
import { GRID, RES } from './raster';
import { rotateTemplate } from './rotsprite';
import type { BodyType, SpriteAppearance } from './types';
import { DEFAULT_CHARACTER } from '../data/shinobiData';

const look = (body: BodyType, colors: string[] = []): SpriteAppearance => ({
  ...DEFAULT_CHARACTER.appearance!,
  body,
  slots: { hair: { id: 'hair_golden_fall', colors } },
  accessories: [],
});

/** The face anchor (body.ts faceAnchor) of a rendered frame. */
const anchor = (f: ReturnType<typeof renderSpriteCached>): [number, number] => {
  const k = f.rig.bp.headScale;
  return [Math.floor((f.rig.head.x - 1.9 * k) * RES), Math.floor((f.rig.head.y + 1.0 * k) * RES)];
};

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number): string => {
  const i = (y * GRID + x) * 4;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');
};

describe('hair_golden_fall', () => {
  it('is a hairstyle with her blonde and her flower gold as its colour slots', () => {
    const def = getItem('hair_golden_fall')!;
    assert.equal(def.slot, 'hair');
    assert.deepEqual(def.colors.map((c) => [c.key, c.default]), [['hair', ELISE_HAIR_BASE], ['ornament', ELISE_ORNAMENT_BASE]]);
  });

  it('has whole pictures: even rows, every character coloured, the pivots inside', () => {
    for (const p of [ELISE_HAIR_FRONT, ELISE_HAIR_BACK, ELISE_HAIR_FALL, ELISE_HAIR_WISP]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(p.colors[ch] ?? '', /^#[0-9a-f]{6}$/, `'${ch}'`);
    }
    for (const p of [ELISE_HAIR_FRONT, ELISE_HAIR_BACK, ELISE_HAIR_FALL]) assert.ok(p.pivot[0] >= 0 && p.pivot[0] < p.rows[0].length && p.pivot[1] >= 0 && p.pivot[1] < p.rows.length);
    assert.notEqual(ELISE_HAIR_FALL.rows[ELISE_HAIR_FALL.pivot[1]][ELISE_HAIR_FALL.pivot[0]], '.', 'the fall hangs from a pixel of hers');
    // the loose strand rides with the fall: the same pivot in our frame
    assert.equal(ELISE_HAIR_WISP.angle, ELISE_HAIR_FALL.angle);
  });

  it('shows her pixels in her colours over our female head at idle', () => {
    const f = renderSpriteCached(look('female'), 'idle', 0);
    const [nx, ny] = anchor(f);
    const p = ELISE_HAIR_FRONT;
    let seen = 0;
    p.rows.forEach((row, j) => {
      const y = ny - p.pivot[1] + j;
      if (y >= ny) return; // above the eyes: nothing of ours is drawn over her hair there
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.') continue;
        assert.equal(hexAt(f.rgba, nx - p.pivot[0] + i, y), p.colors[row[i]], `(${i}, ${j})`);
        seen++;
      }
    });
    assert.ok(seen > 250);
  });

  it('recolours her golds and her flower but keeps her darkest line', () => {
    const plain = renderSpriteCached(look('female'), 'idle', 0);
    const black = renderSpriteCached(look('female', ['#2a2230', ELISE_ORNAMENT_BASE]), 'idle', 0);
    const silver = renderSpriteCached(look('female', [ELISE_HAIR_BASE, '#c0c8d8']), 'idle', 0);
    const [nx, ny] = anchor(plain);
    const p = ELISE_HAIR_FRONT;
    p.rows.forEach((row, j) => {
      const y = ny - p.pivot[1] + j;
      if (y >= ny) return;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.') continue;
        const x = nx - p.pivot[0] + i;
        const was = hexAt(plain.rgba, x, y);
        if (ELISE_HAIR_LINE.includes(ch)) assert.equal(hexAt(black.rgba, x, y), was, 'her line stays');
        else if (ELISE_ORNAMENT.includes(ch)) {
          assert.equal(hexAt(black.rgba, x, y), was, 'the flower keeps its gold with a new hair colour');
          assert.notEqual(hexAt(silver.rgba, x, y), was, 'the flower takes its own colour');
        } else {
          const [r, g, b] = hexToRgb(hexAt(black.rgba, x, y));
          assert.ok(r + g + b < hexToRgb(was).reduce((a, c) => a + c, 0), 'her golds darken with black hair');
          assert.equal(hexAt(silver.rgba, x, y), was, 'a new flower colour leaves the hair');
        }
      }
    });
  });

  it('draws on every body, in every pose, laid down too', () => {
    for (const body of ['female', 'slender', 'male', 'bulky'] as BodyType[]) {
      for (const pose of ['idle', 'attack', 'run', 'crouch', 'downed', 'sit'] as const) {
        const bald = renderSpriteCached({ ...look(body), slots: {} }, pose, 0).rgba;
        assert.notDeepEqual(renderSpriteCached(look(body), pose, 0).rgba, bald, `${body} ${pose}`);
      }
    }
  });

  it('streams back along her back when she is pitched forward, not down between her legs', () => {
    // The throw from the fling on, head carried out ahead: nothing the hair adds is well below the
    // hips and forward of them, where the legs are.
    for (const body of ['female', 'slender'] as BodyType[]) {
      for (const frame of [2, 3, 4]) {
        const f = renderSpriteCached(look(body), 'throw', frame);
        const bald = renderSpriteCached({ ...look(body), slots: {} }, 'throw', frame).rgba;
        const [hx, hy] = [Math.round(f.rig.pelvis.x * RES), Math.round(f.rig.pelvis.y * RES)];
        let under = 0;
        for (let i = 0; i < GRID * GRID; i++) {
          const added = f.rgba[i * 4 + 3] && f.rgba.subarray(i * 4, i * 4 + 4).some((c, k) => c !== bald[i * 4 + k]);
          if (added && ((i / GRID) | 0) > hy + 6 && i % GRID >= hx) under++;
        }
        assert.equal(under, 0, `${body} ${frame}: hair pixels under the body`);
      }
    }
  });

  it('keeps the loose strand whole at every angle: no bit of it floats off, no background walled in', () => {
    const key = (x: number, y: number) => `${x},${y}`;
    for (let deg = -180; deg < 180; deg++) {
      const fall = rotateTemplate(ELISE_HAIR_FALL, deg - ELISE_HAIR_FALL.angle);
      const wisp = wispPixels(deg);
      const on = new Set([...fall, ...wisp].map((p) => key(p.dx, p.dy)));
      // every strand pixel reaches the fall through the strand (side or corner)
      const fallAt = new Set(fall.map((p) => key(p.dx, p.dy)));
      const reached = new Set<string>();
      let grew = true;
      while (grew) {
        grew = false;
        for (const p of wisp) {
          const k = key(p.dx, p.dy);
          if (reached.has(k)) continue;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const n = key(p.dx + dx, p.dy + dy);
              if ((dx || dy) && (fallAt.has(n) || reached.has(n)) && !reached.has(k)) {
                reached.add(k);
                grew = true;
              }
            }
          }
        }
      }
      assert.equal(reached.size, new Set(wisp.map((p) => key(p.dx, p.dy))).size, `${deg}: a loose bit of the strand`);
      // no background next to the strand is walled in by the strand and the fall
      const xs = [...fall, ...wisp].map((p) => p.dx);
      const ys = [...fall, ...wisp].map((p) => p.dy);
      const [x0, x1, y0, y1] = [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...ys) - 1, Math.max(...ys) + 1];
      const out = new Set<string>();
      const stack: [number, number][] = [[x0, y0]];
      while (stack.length) {
        const [x, y] = stack.pop()!;
        const k = key(x, y);
        if (x < x0 || x > x1 || y < y0 || y > y1 || out.has(k) || on.has(k)) continue;
        out.add(k);
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      const strand = new Set(wisp.map((p) => key(p.dx, p.dy)));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (on.has(key(x, y)) || out.has(key(x, y))) continue;
          const byStrand = [key(x - 1, y), key(x + 1, y), key(x, y - 1), key(x, y + 1)].some((n) => strand.has(n));
          assert.ok(!byStrand, `${deg}: background walled in at (${x}, ${y})`);
        }
      }
    }
  });

  it('shows her strands in the shade behind the near arm, not a flat slab', () => {
    // The fall's part behind our arm (hidden at idle, shown when the arm swings): in each of its rows
    // her clumps of strands, each lit in her gold and creased in her darkest brown.
    const hex = (ch: string) => ELISE_HAIR_FALL.colors[ch];
    const rows = ELISE_HAIR_FALL.rows.slice(12, 30).map((r) => r.slice(-10).replace(/[.7K]/g, ''));
    for (const r of rows) {
      if (r.length < 6) continue;
      assert.ok([...r].some((ch) => hex(ch) === '#764534'), `a crease in ${r}`);
      assert.ok([...r].some((ch) => hex(ch) === '#cb9658'), `a lit strand in ${r}`);
    }
  });
});
