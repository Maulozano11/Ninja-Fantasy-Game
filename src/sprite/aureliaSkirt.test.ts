// Aurelia's skirt hangs as cloth from her waist in every pose: no panel stands like another leg or ends
// on the ground like another boot (the owner, 2026-10-22: "tienes un bug en la falda que esta poniendo como
// piernas o botas extra en diferentes posiciones"), and her knees are closed where the boot's pieces meet
// ("checa la rodilla izquierda del personaje en muchas poses se corta con pixeles blancos muertos"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite, spriteLayers } from './compose';
import { type Depth, legDepth } from './ctx';
import { DAWN_FAR, DAWN_FRONT, DAWN_LINING, DAWN_NEAR } from './items/aureliaLowerArt';
import { GRID, partIndex, RES } from './raster';
import { frameCount } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const aurelia = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character.appearance!;
/** Her skirt alone on her body: its layers hold only the skirt's pieces. */
const skirtOnly: SpriteAppearance = { ...aurelia, slots: { skirt: aurelia.slots.skirt } };
const noSkirt: SpriteAppearance = { ...aurelia, slots: Object.fromEntries(Object.entries(aurelia.slots).filter(([k]) => k !== 'skirt')) };
const SKIRT_DEPTHS: Depth[] = ['backGear', 'farLeg.armor', 'skirt'];

/** Every standing frame (lying down she is laid on the ground: no floor under the hems there). */
function* frames(): Generator<[SpritePose, number]> {
  for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[]) {
    if (pose === 'downed') continue;
    for (let f = 0; f < frameCount(pose); f++) yield [pose, f];
  }
}

/** The lowest row with a pixel of hers at idle frame 0: the outline under her soles. */
const SOLE_LINE = (() => {
  const f = renderSprite(aurelia, 'idle', 0);
  for (let y = GRID - 1; y >= 0; y--) for (let x = 0; x < GRID; x++) if (f.rgba[(y * GRID + x) * 4 + 3]) return y;
  return GRID;
})();

describe("Aurelia's skirt", () => {
  it('never reaches the ground: every hem ends at least three rows above her soles, in every pose and frame', () => {
    for (const [pose, fr] of frames()) {
      const { layers } = spriteLayers(skirtOnly, pose, fr);
      let low = -1;
      for (const d of SKIRT_DEPTHS) {
        const L = layers.get(d);
        if (!L) continue;
        for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0) low = Math.max(low, (i / GRID) | 0);
      }
      // the soles' own line is SOLE_LINE, their last pixel of boot the row above
      assert.ok(low <= SOLE_LINE - 4, `${pose} ${fr}: a hem on row ${low}, the soles on ${SOLE_LINE - 1}`);
    }
  });

  it('shows no strip of skirt shaped like a leg (narrow, long, down by the feet) apart from what he drew at rest', () => {
    // What the skirt adds to her picture, region by region: a region as wide as a boot or a little less,
    // upright, as tall as a shin and reaching down to the shoes stands there like another leg.
    const legLike = (look: SpriteAppearance, pose: SpritePose, fr: number): string[] => {
      const a = renderSprite(look, pose, fr).rgba;
      const b = renderSprite(noSkirt, pose, fr).rgba;
      const added = new Set<number>();
      for (let i = 0; i < GRID * GRID; i++) if (a[i * 4 + 3] && (a[i * 4] !== b[i * 4] || a[i * 4 + 1] !== b[i * 4 + 1] || a[i * 4 + 2] !== b[i * 4 + 2] || !b[i * 4 + 3])) added.add(i);
      const out: string[] = [];
      const seen = new Set<number>();
      for (const s of added) {
        if (seen.has(s)) continue;
        const stack = [s];
        seen.add(s);
        let [x0, y0, x1, y1] = [GRID, GRID, 0, 0];
        while (stack.length) {
          const i = stack.pop()!;
          const x = i % GRID;
          const y = (i / GRID) | 0;
          [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
          for (const j of [i - 1, i + 1, i - GRID, i + GRID]) if (added.has(j) && !seen.has(j)) (seen.add(j), stack.push(j));
        }
        if (x1 - x0 + 1 >= 3 && x1 - x0 + 1 <= 7 && y1 - y0 + 1 >= Math.max(12, 2 * (x1 - x0 + 1)) && y1 >= SOLE_LINE - 9) out.push(`${x0},${y0}-${x1},${y1}`);
      }
      return out;
    };
    // at rest he drew his far panel as such a strip beside the far boot: that one is his
    const rest = new Set(legLike(aurelia, 'idle', 0));
    for (const [pose, fr] of frames()) {
      if (pose === 'idle') continue;
      const bad = legLike(aurelia, pose, fr).filter((b) => !rest.has(b));
      assert.deepEqual(bad, [], `${pose} ${fr}: skirt strips like a leg at ${bad.join(' ')}`);
    }
  });

  it('hangs the far panel behind the far leg once the leg moves, only its edge showing past the boot', () => {
    const thighF = partIndex('thighF');
    for (const [pose, fr] of frames()) {
      if (pose === 'idle') continue;
      const { layers, rig } = spriteLayers(aurelia, pose, fr);
      const panel = layers.get('backGear')!;
      const leg = new Set<number>();
      for (const d of [legDepth('F', 'body'), legDepth('F', 'cloth'), legDepth('F', 'feet')]) {
        const L = layers.get(d);
        if (L) for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0) leg.add(i);
      }
      const knee = Math.ceil(rig.kneeF.y * RES) + 2;
      for (let y = knee; y < GRID; y++)
        for (let x = 0; x < GRID; x++) {
          const i = y * GRID + x;
          if (panel.mat[i] < 0 || panel.part[i] !== thighF || leg.has(i)) continue;
          let near = false;
          for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3 && !near; dx++) near = leg.has(i + dy * GRID + dx);
          assert.ok(near, `${pose} ${fr}: the far panel stands apart from the far leg at ${x},${y}`);
        }
    }
  });

  it('carries no leg outline on its lining: his line only on the lining\'s own edges', () => {
    const rows = DAWN_LINING.rows;
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== 'k') return;
        const inside = row[x - 1] && row[x - 1] !== '.' && row[x + 1] && row[x + 1] !== '.' && rows[y + 1] && rows[y + 1][x] !== '.';
        assert.ok(!inside, `his line inside the lining at ${x},${y}`);
      }),
    );
  });

  it('keeps her boots off her front panel: the panel is his panel, as wide as he drew it', () => {
    // The front panel once took both his boots (cells of cloth and gold next to it) and hung them from her
    // waist as two more legs: its piece is his panel alone, no wider than its border.
    assert.ok(DAWN_FRONT.rows[0].length <= 12, `the front panel is ${DAWN_FRONT.rows[0].length} wide`);
    for (const p of [DAWN_FAR, DAWN_NEAR, DAWN_FRONT]) assert.ok(p.rows.length <= 46);
  });
});

describe("Aurelia's knees", () => {
  it('are closed where the boot\'s pieces meet: no light pixel past the line, no line across the leg, no notch, in every pose and frame', () => {
    for (const [pose, fr] of frames()) {
      if (pose === 'idle') continue;
      const { layers, rig } = spriteLayers(aurelia, pose, fr);
      for (const s of ['N', 'F'] as const) {
        const L = layers.get(legDepth(s, 'feet'))!;
        const knee = s === 'N' ? rig.kneeN : rig.kneeF;
        const kx = Math.floor(knee.x * RES);
        const ky = Math.floor(knee.y * RES);
        const line = new Set<number>();
        const on = (i: number) => L.mat[i] >= 0;
        const where: string = `${pose} ${fr} ${s}`;
        // his line: the material most of the boot's edge round the knee is drawn in
        const lineMat = (() => {
          const counts = new Map<number, number>();
          for (let y = ky - 5; y <= ky + 5; y++)
            for (let x = kx - 5; x <= kx + 5; x++) {
              const i = y * GRID + x;
              if (on(i) && [i - 1, i + 1, i - GRID, i + GRID].some((j) => !on(j))) counts.set(L.mat[i], (counts.get(L.mat[i]) ?? 0) + 1);
            }
          return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;
        })();
        for (let y = ky - 4; y <= ky + 4; y++)
          for (let x = kx - 4; x <= kx + 4; x++) {
            const i = y * GRID + x;
            const ns = [i - 1, i + 1, i - GRID, i + GRID];
            const drawn = ns.filter(on).length;
            if (on(i)) {
              assert.ok(drawn >= 2, `${where}: a pixel standing out of the knee at ${x},${y}`);
              if (L.mat[i] !== lineMat && drawn < 4) assert.fail(`${where}: the knee open (no line) at ${x},${y}`);
              if (L.mat[i] === lineMat && drawn === 4) line.add(i);
            } else assert.ok(drawn < 3, `${where}: a notch in the knee at ${x},${y}`);
          }
        // a line cutting across the leg has the boot's cloth on both sides of it (above and below, or left
        // and right); his line round a turn steps diagonally, cloth on one side only
        const fill = (j: number) => L.mat[j] !== lineMat;
        for (const i of line) {
          const across = (fill(i - GRID) && fill(i + GRID)) || (fill(i - 1) && fill(i + 1));
          assert.ok(!across, `${where}: his line across the knee at ${i % GRID},${(i / GRID) | 0}`);
        }
      }
    }
  });
});
