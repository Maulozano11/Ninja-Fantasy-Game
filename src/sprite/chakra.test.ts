// Tests for Living Sparks (chakra burst 'cyan'), the second Lightning burst: npm test. The owner
// (2026-10-21) asked for a second electric burst with no aura round the body, only bolts now and then.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CHAKRA_LOOP, renderChakra, sparkCount, type ChakraMode } from './chakra';
import { chakraChoice, chakraHex } from './chakraInfo';
import { BURST_NATURE, chakraNature, chakraType, withNature } from './chakraNature';
import { renderSprite, renderSpriteCached } from './compose';
import { hexToRgb } from './color';
import { defaultAppearance } from './legacy';
import { GRID } from './raster';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type ChakraColorId, type SpriteAppearance, type SpritePose } from './types';

const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
const MODES: ChakraMode[] = ['aura', 'charge', 'cast', 'victory'];
const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
/** Its natural colours: the owner's lightning set (deep blue edge, cyan, white-hot core). */
const NATURAL = ['#0e1c5e', '#1c3aa8', '#3cc8e8', '#90dff5', '#eaffff'];
const VIOLET = ['#2a0a44', '#62209a', '#a54ce0', '#d996ff', '#f8e6ff'];

const look = (body: BodyType, tint?: string, burst: ChakraColorId = 'cyan'): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.chakra = { color: burst, ...(tint ? { tint } : {}), onCharge: true, onCast: true, onVictory: true };
  return l;
};
const pose = (m: ChakraMode): SpritePose => (m === 'aura' ? 'idle' : m);
const hex = (b: Uint8ClampedArray, i: number) => '#' + [b[i], b[i + 1], b[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');

/** Renders the burst over a body in a pose: the drawn pixels' colours and how much of the outline they cover. */
function burst(l: SpriteAppearance, p: SpritePose, mode: ChakraMode, tick: number) {
  const spr = renderSpriteCached(l, p, 0);
  const fx = renderChakra(l.chakra.color, mode, tick, spr.rgba, spr.rig, l.chakra.tint);
  const drawn = (i: number) => fx.back[i * 4 + 3] > 0 || fx.front[i * 4 + 3] > 0;
  // the outline: the pixels just outside the silhouette
  let rim = 0;
  let lit = 0;
  for (let y = 1; y < GRID - 1; y++)
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      if (spr.rgba[i * 4 + 3]) continue;
      let touch = false;
      for (let oy = -1; oy <= 1 && !touch; oy++) for (let ox = -1; ox <= 1; ox++) if (spr.rgba[(i + oy * GRID + ox) * 4 + 3]) touch = true;
      if (!touch) continue;
      rim++;
      if (drawn(i)) lit++;
    }
  const colours = new Map<string, number>();
  let count = 0;
  for (let i = 0; i < GRID * GRID; i++)
    for (const b of [fx.back, fx.front])
      if (b[i * 4 + 3] === 255) {
        const h = hex(b, i * 4);
        colours.set(h, (colours.get(h) ?? 0) + 1);
        count++;
      }
  return { fx, count, colours, outline: lit / rim };
}

describe('Living Sparks, the second Lightning burst', () => {
  it('is a Lightning burst, offered after Storm Lash, with the Lightning cast emblems', () => {
    assert.equal(BURST_NATURE.cyan, 'Lightning');
    assert.deepEqual(chakraType('Lightning').bursts, ['yellow', 'cyan']);
    assert.equal(chakraChoice('cyan').burst, 'Living Sparks');
    assert.equal(chakraChoice('cyan').motif, 'Lightning', 'the grimoire casts reuse the lightning emblem, orb and word');
    for (const tint of [undefined, 'red', 'black', '#00ff00']) assert.equal(chakraNature(look('male', tint).chakra), 'Lightning', `in ${tint}`);
    // picking Lightning keeps the burst chosen; picking another type and back gives Storm Lash first
    const sparks = look('male').chakra;
    assert.equal(withNature(sparks, 'Lightning').color, 'cyan');
    assert.equal(withNature(withNature(sparks, 'Fire'), 'Lightning').color, 'yellow');
    assert.equal(chakraHex(sparks), '#3cc8e8');
  });

  it('renders in every mode, on the four bodies and in every pose, the same each time', () => {
    const shows = (fx: { back: Uint8ClampedArray; front: Uint8ClampedArray }) => fx.front.some((v, i) => i % 4 === 3 && v > 0) || fx.back.some((v, i) => i % 4 === 3 && v > 0);
    for (const body of BODIES) {
      const l = look(body);
      for (const p of POSES) {
        const spr = renderSprite(l, p, 0);
        for (const mode of MODES) {
          // at the busiest tick, and at every tick in the pose the mode plays in, so every place the chart names gets drawn
          const ticks = Array.from({ length: CHAKRA_LOOP }, (_, t) => t).filter((t) => sparkCount(mode, t));
          const busiest = ticks.reduce((a, t) => (sparkCount(mode, t) > sparkCount(mode, a) ? t : a));
          for (const t of p === pose(mode) ? ticks : [busiest]) assert.ok(shows(renderChakra('cyan', mode, t, spr.rgba, spr.rig)), `${body} ${p} ${mode} ${t}: no bolt drawn`);
        }
      }
      const spr = renderSprite(l, 'charge', 1);
      for (let t = 0; t < CHAKRA_LOOP; t++) assert.deepEqual(renderChakra('cyan', 'charge', t, spr.rgba, spr.rig), renderChakra('cyan', 'charge', t + CHAKRA_LOOP, spr.rgba, spr.rig), `${body} ${t}: the same each loop`);
    }
  });

  it('keeps its own colours, takes a tint, and still reads in black', () => {
    const natural = burst(look('male'), 'charge', 'charge', 0);
    assert.ok(natural.count > 0);
    for (const h of natural.colours.keys()) assert.ok(NATURAL.includes(h), `natural ${h}`);
    assert.ok(natural.colours.has('#eaffff'), 'a white-hot core');
    const violet = burst(look('male', 'violet'), 'charge', 'charge', 0);
    for (const h of violet.colours.keys()) assert.ok(VIOLET.includes(h), `violet ${h}`);
    const custom = burst(look('male', '#00ff00'), 'charge', 'charge', 3);
    assert.ok([...custom.colours.keys()].some((h) => h === '#00ff00'), 'a custom colour shows itself');
    // black: a dark core inside a bright edge, so it reads on dark ground and on light
    for (const tint of ['black', '#000000']) {
      const black = burst(look('male', tint), 'charge', 'charge', 3);
      const lum = (h: string) => {
        const [r, g, b] = hexToRgb(h);
        return 0.3 * r + 0.59 * g + 0.11 * b;
      };
      const dark = [...black.colours].filter(([h]) => lum(h) < 24).reduce((a, [, n]) => a + n, 0);
      const bright = [...black.colours].filter(([h]) => lum(h) > 60).reduce((a, [, n]) => a + n, 0);
      assert.ok(dark > 0 && bright > dark, `${tint}: ${dark} dark, ${bright} bright`);
    }
  });

  it('is only occasional bolts: no glow, no outline round the body, often nothing at all', () => {
    for (const mode of MODES) {
      const counts = Array.from({ length: CHAKRA_LOOP }, (_, t) => sparkCount(mode, t));
      // mostly none to two bolts at a time; a charge crackles more often than the aura
      assert.ok(counts.filter((n) => n <= 2).length >= CHAKRA_LOOP * 0.8, `${mode}: ${counts}`);
      if (mode !== 'victory') assert.ok(Math.max(...counts) <= 2, `${mode}: ${counts}`);
      for (const body of BODIES)
        for (let t = 0; t < CHAKRA_LOOP; t++) {
          const r = burst(look(body), pose(mode), mode, t);
          // never an outline: the empowered aura lights a few pixels of it at most, a victory's burst a quarter
          assert.ok(r.outline < (mode === 'aura' ? 0.1 : 0.3), `${body} ${mode} ${t}: ${Math.round(r.outline * 100)}% of the outline lit`);
          if (!counts[t]) assert.equal(r.count, 0, `${body} ${mode} ${t}: nothing between the bolts`);
        }
    }
    const aura = Array.from({ length: CHAKRA_LOOP }, (_, t) => sparkCount('aura', t));
    assert.ok(aura.filter((n) => n === 0).length >= CHAKRA_LOOP / 2, `the aura is rare: ${aura}`);
    assert.ok(Math.max(...aura) <= 1);
    const charge = Array.from({ length: CHAKRA_LOOP }, (_, t) => sparkCount('charge', t));
    assert.ok(charge.reduce((a, b) => a + b) > aura.reduce((a, b) => a + b) * 2, 'a charge crackles more often');
    assert.ok(Math.max(sparkCount('victory', 0), sparkCount('victory', 1)) >= 5, 'a victory opens with a burst of bolts');
    // the test sees an outline when there is one: Storm Lash's aura wraps the body in a glowing rim
    assert.ok(burst(look('male', undefined, 'yellow'), 'idle', 'aura', 0).outline > 0.5);
  });
});
