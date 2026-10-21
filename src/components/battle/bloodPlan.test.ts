// Tests for the Bleeding Cut's blood (bloodPlan.ts, vfx_blood): npm test.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { JUTSU } from '../../battle/jutsu';
import type { BattleEvent } from '../../battle/types';
import { BLOOD_GROUP, DRIP_MS, SCREEN_MS, SPLAT, SPRAY_DELAY, SPRAY_LANDED, SPRAY_MS, bleedingStarts, isBleedTick, screenSplats, splatAt, splatScale } from './bloodPlan';
import { jutsuTint, tintSheetsOf, unitTintSheets } from './vfxTintPlan';

interface Spec {
  file: string;
  frameW: number;
  frameH: number;
  anchor: [number, number];
  anims: Record<string, { row: number; frames: number; fps: number; loop: boolean }>;
}
const manifest = JSON.parse(readFileSync(new URL(`../../assets/world/${BLOOD_GROUP}/manifest.json`, import.meta.url), 'utf8')) as { group: string; pxPerMeter: number; sprites: Record<string, Spec> };

describe('the Bleeding Cut\'s blood', () => {
  it('only the Bleeding Cut throws blood, and its blood is never in a chakra colour', () => {
    const cut = JUTSU.kenjutsu_bleeding_cut;
    assert.equal(cut.seq?.blood, true);
    assert.deepEqual(Object.values(JUTSU).filter((j) => j.seq?.blood).map((j) => j.id), ['kenjutsu_bleeding_cut']);
    // A sword art with no element: nothing of it is recoloured or prepared in a colour, whoever casts it.
    assert.ok(!cut.elemental);
    assert.equal(jutsuTint(cut, { look: { chakra: { color: 'red', tint: 'violet', onCharge: true, onCast: true, onVictory: false } } } as never), undefined);
    assert.deepEqual(tintSheetsOf(cut), []);
    const sheets = unitTintSheets({ look: { chakra: { color: 'red', tint: 'violet', onCharge: true, onCast: true, onVictory: false } }, jutsus: ['kenjutsu_bleeding_cut'] } as never, (id) => JUTSU[id]);
    assert.deepEqual(sheets, []);
    for (const s of Object.values(JUTSU)) for (const r of tintSheetsOf(s)) assert.notEqual(r.group, BLOOD_GROUP, s.id);
  });

  it('the sheets are in the game at the VFX scale: the spray (burst and drip) and four drops for the screen', () => {
    assert.equal(manifest.group, BLOOD_GROUP);
    assert.equal(manifest.pxPerMeter, 57);
    const spray = manifest.sprites.spray;
    assert.ok(spray.anims.burst.frames >= 8 && spray.anims.burst.frames <= 12, 'the burst is 8 to 12 frames');
    assert.equal(spray.anims.burst.loop, false);
    assert.equal(spray.anims.drip.loop, false);
    // It plays as long as the screen gives it, and its drops are down well before it ends.
    assert.equal(Math.round((spray.anims.burst.frames / spray.anims.burst.fps) * 1000), SPRAY_MS);
    assert.equal(Math.round((spray.anims.drip.frames / spray.anims.drip.fps) * 1000), DRIP_MS);
    assert.ok(SPRAY_LANDED < SPRAY_MS && SPRAY_DELAY < 480, 'it bursts while the crescent is still crossing');
    // About a character's size (100 px), anchored on the ground under the wound.
    assert.ok(spray.frameW <= 160 && spray.frameH <= 120);
    assert.ok(spray.anchor[1] > spray.frameH * 0.75);
    const screen = manifest.sprites.screen;
    assert.deepEqual(Object.keys(screen.anims).sort(), ['a', 'b', 'c', 'd']);
    assert.deepEqual([screen.frameW, screen.frameH, ...screen.anchor], [SPLAT.w, SPLAT.h, ...SPLAT.anchor]);
    for (const a of Object.values(screen.anims)) assert.equal(a.frames, 7, 'splatAt uses frames 0 to 6');
  });

  it('the drops land on the screen when the cut leaves Bleeding, and drip when Bleeding hurts', () => {
    const on: BattleEvent = { t: 'effect', unit: 'rogue_0', effect: 'bleeding', on: true };
    assert.ok(bleedingStarts(on));
    assert.ok(!bleedingStarts({ ...on, on: false }), 'a bandage stopping it is not');
    assert.ok(!bleedingStarts({ ...on, effect: 'burning' }));
    assert.ok(!bleedingStarts({ t: 'damage', unit: 'rogue_0', amount: 4, dmgType: 'Slashing', hp: 10 }), 'a cut that hurts but leaves no Bleeding is not');
    const bleeding = { effects: [{ id: 'bleeding' as const }] };
    const tick: BattleEvent = { t: 'damage', unit: 'rogue_0', amount: 2, dmgType: 'Slashing', hp: 8 };
    assert.ok(isBleedTick(tick, bleeding));
    assert.ok(!isBleedTick({ ...tick, source: 'a' }, bleeding), 'a blade\'s blow names its striker');
    assert.ok(!isBleedTick({ ...tick, dmgType: 'Fire' }, bleeding), 'burning is not');
    assert.ok(!isBleedTick(tick, { effects: [] }));
  });

  it('on the screen: toward the side the cut went, near the edge, clear of the panels, scaled with the screen', () => {
    const W = 1600, H = 900;
    const right = screenSplats(W, H, 1, 7);
    const left = screenSplats(W, H, -1, 7);
    assert.equal(right.length, 3);
    for (const s of right) assert.ok(s.x > W * 0.75, 'right edge');
    for (const s of left) assert.ok(s.x < W * 0.25, 'left edge');
    assert.deepEqual(right.map((s) => s.y), left.map((s) => s.y), 'mirrored');
    assert.deepEqual(screenSplats(W, H, 1, 7), right, 'the same drops for the same seed');
    // The camera's zoom never enters: only the screen's size.
    assert.equal(splatScale(720), 2);
    assert.equal(splatScale(900), 3);
    assert.equal(splatScale(1800), 6);
    assert.ok(screenSplats(W * 2, H * 2, 1, 7)[0].scale > right[0].scale);
    // A panel over a spot sends the drop elsewhere, never under it.
    const panel = { x: W * 0.8, y: 0, w: W * 0.2, h: H * 0.5 };
    const clear = screenSplats(W, H, 1, 7, [panel]);
    assert.ok(clear.length > 0);
    for (const s of clear) {
      const r = { x: s.x - SPLAT.anchor[0] * s.scale, y: s.y - SPLAT.anchor[1] * s.scale, w: SPLAT.w * s.scale, h: SPLAT.h * s.scale };
      assert.ok(!(r.x < panel.x + panel.w && panel.x < r.x + r.w && r.y < panel.y + panel.h && panel.y < r.y + r.h));
    }
  });

  it('a drop on the screen hits, holds, runs down and fades within its time', () => {
    assert.equal(splatAt(-1), null);
    assert.equal(splatAt(SCREEN_MS), null);
    assert.deepEqual(splatAt(0), { frame: 0, slide: 0, alpha: 1 });
    assert.equal(splatAt(300)!.frame, 2);
    let last = 0;
    for (let ms = 0; ms < SCREEN_MS; ms += 50) {
      const s = splatAt(ms)!;
      assert.ok(s.frame >= last && s.frame <= 6);
      last = s.frame;
    }
    assert.equal(splatAt(SCREEN_MS - 50)!.frame, 6);
    assert.ok(splatAt(SCREEN_MS - 50)!.alpha < 0.1);
    assert.ok(SCREEN_MS >= 1200 && SCREEN_MS <= 2000);
  });
});
