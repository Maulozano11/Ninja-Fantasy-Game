// Tests for Battle Static (Estática de batalla, chakra burst 'cyan'), the second Lightning burst: npm
// test. The owner (2026-10-21) asked for a second electric burst with no aura round the body, only
// bolts; then for more of them, crackling regularly, and more still while empowered (potenciado).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CHAKRA_LOOP, SPARK_LOOP, chakraLoop, inFace, renderChakra, sparkCount, sparkTimes, type ChakraMode } from './chakra';
import { TINT_CHOICES, chakraChoice, chakraHex } from './chakraInfo';
import { BURST_NATURE, chakraNature, chakraType, withNature } from './chakraNature';
import { renderSpriteCached } from './compose';
import { hexToRgb } from './color';
import { defaultAppearance } from './legacy';
import { GRID } from './raster';
import { CAMP_POSES, CAST_STYLES, MOVE_POSES, SPRITE_POSES, type BodyType, type CastStyle, type ChakraColorId, type SpriteAppearance, type SpritePose } from './types';

const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
const MODES: ChakraMode[] = ['aura', 'charge', 'cast', 'victory'];
const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
/** Its natural colours: the owner's lightning set (deep blue edge, cyan, white-hot core). */
const NATURAL = ['#0e1c5e', '#1c3aa8', '#3cc8e8', '#90dff5', '#eaffff'];
const VIOLET = ['#2a0a44', '#62209a', '#a54ce0', '#d996ff', '#f8e6ff'];

const look = (body: BodyType, tint?: string, burst: ChakraColorId = 'cyan', style?: CastStyle): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.chakra = { color: burst, ...(tint ? { tint } : {}), onCharge: true, onCast: true, onVictory: true };
  if (style) l.cast = { ...(l.cast ?? {}), style };
  return l;
};
const pose = (m: ChakraMode): SpritePose => (m === 'aura' ? 'idle' : m);
const hex = (b: Uint8ClampedArray, i: number) => '#' + [b[i], b[i + 1], b[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
const lum = (h: string) => {
  const [r, g, b] = hexToRgb(h);
  return 0.3 * r + 0.59 * g + 0.11 * b;
};
const shows = (fx: { back: Uint8ClampedArray; front: Uint8ClampedArray }) => fx.front.some((v, i) => i % 4 === 3 && v > 0) || fx.back.some((v, i) => i % 4 === 3 && v > 0);
/** Every tick of Battle Static's loop (the same for every mode). */
const ticks = (_mode?: ChakraMode) => Array.from({ length: SPARK_LOOP }, (_, t) => t);

/** The pixels just outside a sprite's silhouette. */
const rims = new WeakMap<Uint8ClampedArray, number[]>();
function rimOf(rgba: Uint8ClampedArray): number[] {
  let rim = rims.get(rgba);
  if (rim) return rim;
  rim = [];
  for (let y = 1; y < GRID - 1; y++)
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      if (rgba[i * 4 + 3]) continue;
      let touch = false;
      for (let oy = -1; oy <= 1 && !touch; oy++) for (let ox = -1; ox <= 1; ox++) if (rgba[(i + oy * GRID + ox) * 4 + 3]) touch = true;
      if (touch) rim.push(i);
    }
  rims.set(rgba, rim);
  return rim;
}

/** Renders the burst over a body in a pose: the drawn pixels' colours and how much of the outline they cover. */
function burst(l: SpriteAppearance, p: SpritePose, mode: ChakraMode, tick: number, empowered = false) {
  const spr = renderSpriteCached(l, p, 0);
  const fx = renderChakra(l.chakra.color, mode, tick, spr.rgba, spr.rig, l.chakra.tint, empowered);
  const rim = rimOf(spr.rgba);
  const lit = rim.filter((i) => fx.back[i * 4 + 3] > 0 || fx.front[i * 4 + 3] > 0).length;
  const colours = new Map<string, number>();
  let count = 0;
  for (let i = 0; i < GRID * GRID; i++)
    for (const b of [fx.back, fx.front])
      if (b[i * 4 + 3] === 255) {
        const h = hex(b, i * 4);
        colours.set(h, (colours.get(h) ?? 0) + 1);
        count++;
      }
  return { fx, spr, count, colours, outline: lit / rim.length };
}

describe('Battle Static, the second Lightning burst', () => {
  it('is a Lightning burst, offered after Storm Lash, with the Lightning cast emblems', () => {
    assert.equal(BURST_NATURE.cyan, 'Lightning');
    assert.deepEqual(chakraType('Lightning').bursts, ['yellow', 'cyan']);
    assert.equal(chakraChoice('cyan').burst, 'Battle Static');
    assert.equal(chakraChoice('cyan').motif, 'Lightning', 'the grimoire casts reuse the lightning emblem, orb and word');
    for (const tint of [undefined, 'red', 'black', '#00ff00']) assert.equal(chakraNature(look('male', tint).chakra), 'Lightning', `in ${tint}`);
    // picking Lightning keeps the burst chosen; picking another type and back gives Storm Lash first
    const sparks = look('male').chakra;
    assert.equal(withNature(sparks, 'Lightning').color, 'cyan');
    assert.equal(withNature(withNature(sparks, 'Fire'), 'Lightning').color, 'yellow');
    assert.equal(chakraHex(sparks), '#3cc8e8');
    // its cyan is not one more swatch in every type's colour row (it sat beside the water blue)
    assert.ok(!TINT_CHOICES.some((c) => c.id === 'cyan'));
    assert.equal(TINT_CHOICES.length, 10);
  });

  it('loops over ten seconds with every bolt its own, so nothing repeats every two seconds', () => {
    assert.equal(chakraLoop('cyan'), SPARK_LOOP);
    assert.equal(chakraLoop('yellow'), CHAKRA_LOOP, 'the other bursts keep their loop');
    for (const empowered of [false, true])
      for (const mode of MODES) {
        const chart = sparkTimes(mode, empowered);
        const name = `${mode}${empowered ? ' empowered' : ''}`;
        for (const [at, life] of chart) assert.ok(at >= 0 && at + life <= SPARK_LOOP, `${name}: no bolt runs over the loop's end`);
        // never the same place twice running (the victory's opening burst aside), and never two in one place at once
        const rest = chart.slice(mode === 'victory' ? (empowered ? 10 : 7) : 0);
        for (let k = 1; k < rest.length; k++) assert.notEqual(rest[k][2], rest[k - 1][2], `${name} ${k}`);
        for (const t of ticks()) {
          const at = chart.filter(([a, l]) => t >= a && t < a + l).map(([, , w]) => w);
          if (!(mode === 'victory' && t < 4)) assert.equal(new Set(at).size, at.length, `${name} ${t}: ${at}`);
        }
        // the two-second windows differ: how many bolts show, tick by tick, is not the same from one to the next
        const shape = (w: number) => Array.from({ length: CHAKRA_LOOP }, (_, t) => sparkCount(mode, w * CHAKRA_LOOP + t, empowered)).join();
        assert.ok(new Set([0, 1, 2, 3, 4].map(shape)).size >= 4, `${name}: the 2 s windows repeat`);
      }
    // the same lit tick a loop of the other bursts later draws a different bolt
    const spr = renderSpriteCached(look('male'), 'charge', 0);
    let same = 0;
    let both = 0;
    for (let t = 0; t < SPARK_LOOP - CHAKRA_LOOP; t += 2) {
      both++;
      const a = renderChakra('cyan', 'charge', t, spr.rgba, spr.rig);
      const b = renderChakra('cyan', 'charge', t + CHAKRA_LOOP, spr.rgba, spr.rig);
      if (Buffer.compare(Buffer.from(a.front), Buffer.from(b.front)) === 0 && Buffer.compare(Buffer.from(a.back), Buffer.from(b.back)) === 0) same++;
    }
    assert.ok(same === 0, `${same} of ${both} the same`);
  });

  it('renders in every mode, on the four bodies and in every pose', () => {
    for (const body of BODIES) {
      const l = look(body);
      for (const p of POSES) {
        const spr = renderSpriteCached(l, p, 0);
        for (const mode of MODES) {
          const lit = ticks(mode).filter((t) => sparkCount(mode, t));
          const busiest = lit.reduce((a, t) => (sparkCount(mode, t) > sparkCount(mode, a) ? t : a));
          assert.ok(shows(renderChakra('cyan', mode, busiest, spr.rgba, spr.rig)), `${body} ${p} ${mode} ${busiest}: no bolt drawn`);
        }
      }
      // in the pose each mode plays in, plain and empowered, every tick draws bolts (one may find no clear spot, never all)
      for (const empowered of [false, true])
        for (const mode of MODES) {
          const spr = renderSpriteCached(l, pose(mode), 0);
          const lit = ticks(mode).filter((t) => t % (body === 'male' ? 2 : 6) === 0);
          const drawn = lit.filter((t) => shows(renderChakra('cyan', mode, t, spr.rgba, spr.rig, undefined, empowered))).length;
          assert.equal(drawn, lit.length, `${body} ${mode} ${empowered}: ${drawn} of ${lit.length} ticks drawn`);
        }
    }
  });

  it('never draws a bolt over the face, whatever the cast style', () => {
    const faceHits = (l: SpriteAppearance, p: SpritePose, mode: ChakraMode, t: number, empowered = false) => {
      const spr = renderSpriteCached(l, p, 0);
      const fx = renderChakra('cyan', mode, t, spr.rgba, spr.rig, undefined, empowered);
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) if (fx.front[i * 4 + 3] && spr.rgba[i * 4 + 3] && inFace(spr.rig, { x: i % GRID, y: Math.floor(i / GRID) })) n++;
      return n;
    };
    for (const style of CAST_STYLES)
      for (const body of BODIES) {
        const l = look(body, undefined, 'cyan', style);
        // every other lit tick on the default body, a sample on the others (a whole loop of all of them is slow)
        for (const t of ticks('cast')) {
          if (t % (body === 'male' ? 2 : 6) === 0) assert.equal(faceHits(l, 'cast', 'cast', t), 0, `${style} ${body} ${t}`);
          if (t % (body === 'male' ? 4 : 12) === 1) assert.equal(faceHits(l, 'cast', 'cast', t, true), 0, `${style} ${body} ${t} empowered`);
        }
      }
    for (const empowered of [false, true])
      for (const mode of ['aura', 'charge', 'victory'] as ChakraMode[])
        for (const t of ticks(mode)) if (t % 2 === 0) assert.equal(faceHits(look('male'), pose(mode), mode, t, empowered), 0, `${mode} ${t} ${empowered}`);
  });

  it('keeps its own colours, takes a tint, and black reads as black lightning', () => {
    const natural = burst(look('male'), 'charge', 'charge', 1);
    assert.ok(natural.count > 0);
    for (const h of natural.colours.keys()) assert.ok(NATURAL.includes(h), `natural ${h}`);
    assert.ok(natural.colours.has('#eaffff'), 'a white-hot core');
    const violet = burst(look('male', 'violet'), 'charge', 'charge', 1);
    for (const h of violet.colours.keys()) assert.ok(VIOLET.includes(h), `violet ${h}`);
    const custom = burst(look('male', '#00ff00'), 'charge', 'charge', 1);
    assert.ok([...custom.colours.keys()].some((h) => h === '#00ff00'), 'a custom colour shows itself');
    // black: a black bolt (most of it dark) inside a thin bright edge that stands out on dark ground
    for (const tint of ['black', '#000000']) {
      const b = burst(look('male', tint), 'charge', 'charge', 1);
      const spr = b.spr.rgba;
      let dark = 0;
      let bright = 0;
      for (let i = 0; i < GRID * GRID; i++) {
        const layer = b.fx.front[i * 4 + 3] ? b.fx.front : b.fx.back;
        if (spr[i * 4 + 3] || !layer[i * 4 + 3]) continue;
        const l = lum(hex(layer, i * 4));
        if (l < 30) dark++;
        else if (l > 100) bright++;
      }
      assert.ok(dark > 0 && bright > 0 && dark >= bright * 0.6, `${tint}: ${dark} dark, ${bright} bright`);
    }
  });

  it('crackles all the time: bolts at every tick, but no glow and no outline round the body', () => {
    for (const empowered of [false, true])
      for (const mode of MODES) {
        const name = `${mode}${empowered ? ' empowered' : ''}`;
        const counts = ticks(mode).map((t) => sparkCount(mode, t, empowered));
        // never a tick without lightning: two bolts at least (three in a charge or a cast), and a cap
        const least = mode === 'victory' && !empowered ? 2 : 3;
        assert.ok(Math.min(...counts) >= least, `${name}: ${counts}`);
        const cap = empowered || mode === 'aura' ? 7 : 4;
        assert.ok(Math.max(...counts.slice(mode === 'victory' ? 4 : 0)) <= cap, `${name}: ${counts}`);
        for (const body of BODIES)
          ticks(mode).forEach((t) => {
            // every fourth tick on the default body, a few on the others
            if (t % (body === 'male' ? 4 : 16)) return;
            const r = burst(look(body), pose(mode), mode, t, empowered);
            // never an outline: bolts touch only a part of it
            assert.ok(r.outline < 0.35, `${body} ${name} ${t}: ${Math.round(r.outline * 100)}% of the outline lit`);
          });
      }
    assert.ok(sparkCount('victory', 1) >= 6, 'a victory opens with a burst of bolts');
    assert.ok(sparkCount('victory', 1, true) >= 9, 'a bigger one empowered');
    // the test sees an outline when there is one: Storm Lash's aura wraps the body in a glowing rim
    assert.ok(burst(look('male', undefined, 'yellow'), 'idle', 'aura', 0).outline > 0.5);
  });

  it('crackles harder empowered: more bolts, longer, and the aura (only played empowered) at that strength', () => {
    const l = look('male');
    for (const mode of ['charge', 'cast', 'victory'] as ChakraMode[]) {
      const sum = (empowered: boolean) => ticks(mode).reduce((a, t) => a + sparkCount(mode, t, empowered), 0);
      assert.ok(sum(true) >= sum(false) * 1.4, `${mode}: ${sum(true)} bolt frames empowered, ${sum(false)} plain`);
      // drawn: more lightning pixels on average
      let plain = 0;
      let strong = 0;
      for (let t = 0; t < SPARK_LOOP; t += 5) {
        plain += burst(l, pose(mode), mode, t).count;
        strong += burst(l, pose(mode), mode, t, true).count;
      }
      assert.ok(strong >= plain * 1.5, `${mode}: ${strong} px empowered, ${plain} plain`);
    }
    assert.deepEqual(sparkTimes('aura'), sparkTimes('aura', true));
    // the other bursts look the same either way
    const spr = renderSpriteCached(look('male', undefined, 'yellow'), 'charge', 0);
    for (const t of [0, 7]) {
      const a = renderChakra('yellow', 'charge', t, spr.rgba, spr.rig);
      const b = renderChakra('yellow', 'charge', t, spr.rgba, spr.rig, undefined, true);
      assert.ok(Buffer.from(a.front).equals(Buffer.from(b.front)) && Buffer.from(a.back).equals(Buffer.from(b.back)));
    }
  });
});
