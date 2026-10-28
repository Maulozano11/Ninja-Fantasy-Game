// Tests for the seams painted pieces open as they move apart (sprite/seams.ts): npm test.
// Solen's cowl has its own in solen.test.ts.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALL_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { defaultAppearance, dojutsuToEye, getAppearance } from './legacy';
import { GRID, partIndex, RES } from './raster';
import { frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
const aiden = ALL_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character;
/** A look in the Shadow Half-Cloak, its clasps pure green so its studs are found by colour. */
const cloaked = (l: SpriteAppearance): SpriteAppearance => ({ ...structuredClone(l), slots: { ...structuredClone(l.slots), cape: { id: 'cape_shadow', colors: ['#1c1b22', '#00ff00', '#e5e4e2'] } } });

describe("the owner's Shadow Half-Cloak", () => {
  it('shows no background beside its studs in any pose, frame or body but at rest', () => {
    // The owner, 2026-10-22: "arreglar igual capa". The mantle hangs from the neck, the shoulder piece rides the
    // near shoulder, the plate the far one and the hair the head; the seam beside a stud is filled with his
    // cloth as it opens (clothSeam in sprite/seams.ts). Idle is left as drawn. Round each stud (2 px about
    // it): no transparent pixel the figure walls in (within 3 px left, right, above and below).
    const looks: [string, SpriteAppearance, ReturnType<typeof dojutsuToEye>][] = [
      ['default', cloaked(defaultAppearance()), 'none'],
      ['Aiden', cloaked(getAppearance(aiden)), dojutsuToEye(aiden.dojutsu)],
    ];
    const held = partIndex('held');
    const bad: string[] = [];
    for (const [name, look, eye] of looks)
      for (const body of ['male', 'female', 'bulky'] as BodyType[]) {
        const l = { ...look, body };
        for (const pose of POSES) {
          if (pose === 'idle') continue;
          const rp = rigPoseFor(pose, l.cast?.style, l.slots.held?.id);
          for (let f = 0; f < frameCount(rp); f++) {
            const fr = renderSprite(l, pose, f, eye);
            const at = (x: number, y: number) => (y * GRID + x) * 4;
            const on = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && fr.rgba[at(x, y) + 3] > 0;
            const walled = (x: number, y: number, dx: number, dy: number) => [1, 2, 3].some((k) => on(x + dx * k, y + dy * k));
            const js = [fr.rig.neck, fr.rig.shoulderN, fr.rig.shoulderF].map((p) => [Math.floor(p.x * RES), Math.floor(p.y * RES)]);
            const near = (x: number, y: number) => js.some(([jx, jy]) => Math.abs(x - jx) <= 10 && Math.abs(y - jy) <= 10);
            // Its studs: green near the neck and shoulders (not a weapon held there), in clusters.
            const studs: number[][][] = [];
            for (let y = 0; y < GRID; y++)
              for (let x = 0; x < GRID; x++) {
                const i = at(x, y);
                const [r, g, b] = [fr.rgba[i], fr.rgba[i + 1], fr.rgba[i + 2]];
                if (!on(x, y) || !(g > r + 60 && g > b + 60) || !near(x, y) || fr.part[y * GRID + x] === held) continue;
                const c = studs.find((s) => s.some(([sx, sy]) => Math.abs(sx - x) <= 3 && Math.abs(sy - y) <= 3));
                if (c) c.push([x, y]);
                else studs.push([[x, y]]);
              }
            const seen = new Set<number>();
            for (const s of studs) {
              const xs = s.map((p) => p[0]);
              const ys = s.map((p) => p[1]);
              for (let y = Math.min(...ys) - 2; y <= Math.max(...ys) + 2; y++)
                for (let x = Math.min(...xs) - 2; x <= Math.max(...xs) + 2; x++) {
                  if (seen.has(y * GRID + x)) continue;
                  seen.add(y * GRID + x);
                  if (!on(x, y) && walled(x, y, -1, 0) && walled(x, y, 1, 0) && walled(x, y, 0, -1) && walled(x, y, 0, 1)) bad.push(`${name} ${body} ${pose} ${f}: background at ${x},${y}`);
                }
            }
            if (pose === 'walk' && f === 0 && studs.length < 2) bad.push(`${name} ${body} walk 0: ${studs.length} studs found`);
          }
        }
      }
    // KNOWN, open: on the owner's bare female body (body/female-v2, which came in with Lyra) Aiden's downed
    // frame 0 leaves two pixels of background beside a stud; the cloak was fitted on the old female body, and the
    // owner decided the old clothing is not refitted to the new one ("las piezas de armadura y ropa femeninas no
    // las rehagas").
    const known = new Set(['Aiden female downed 0: background at 103,210', 'Aiden female downed 0: background at 104,210']);
    assert.deepEqual(bad.filter((b) => !known.has(b)), []);
  });
});
