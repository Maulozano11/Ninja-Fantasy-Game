// The characters' dark line for the solid parts of jutsu effects (tools/world-sprites/solid-outline.ts):
// it goes outside the silhouette of the solid pieces only, never over a pixel of the drawing, never
// around droplets, spray or faint mist, and never as a second line outside his own dark line. The
// owner's decision of 2026-10-22 ("1 si 2 cambia 3 si"): every solid jutsu in the game carries it
// (the raiju's brown and the crane's teal line recoloured to it), energy carries none.
// npm test.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readPng } from '../../tools/world-sprites/creatures-assemble';
import { Canvas, type WorldSprite } from '../../tools/world-sprites/kit';
import { INK, lightOf, outlineFor, outlineSprite, particleColours, solidMask, solidOutline, solidOutlineFrames, type RgbaFrame, type SolidOutlineOptions } from '../../tools/world-sprites/solid-outline';
import { CRANE_OUTLINE, DRAKE_OUTLINE, FIRE_HEAD_HALF_OUTLINE, FIRE_HEAD_OUTLINE, RAIJU_OUTLINE } from '../../tools/world-sprites/solid-outline-sets';
import { COBRA_LINE } from '../../tools/world-sprites/vfx-beast-cobra';
import { CROWS_LINE } from '../../tools/world-sprites/vfx-beast-crows';
import { GRIFFIN_LINE } from '../../tools/world-sprites/vfx-beast-griffin';
import { buildWaterDragon } from '../../tools/world-sprites/vfx-beast-waterdragon';
import { chakraLineOptions } from '../../tools/world-sprites/vfx-chakra-v3';
import { earthLineOptions } from '../../tools/world-sprites/vfx-earth-v3';
import { genjutsuLineOptions } from '../../tools/world-sprites/vfx-genjutsu-v3';
import { poisonLineOptions } from '../../tools/world-sprites/vfx-poison-v3';

const W = 40, H = 30;
const BODY = [60, 140, 200], DROP = [200, 230, 245], LINE = [1, 7, 26], BROWN = [87, 50, 19];
const luma = (p: ArrayLike<number>, i: number) => p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11;

function canvas(): Uint8Array {
  return new Uint8Array(W * H * 4);
}
function put(px: Uint8Array, x: number, y: number, c: number[], a = 255): void {
  px.set([...c, a], (y * W + x) * 4);
}
/** A filled disc of the body colour. */
function disc(px: Uint8Array, cx: number, cy: number, r: number, c = BODY, a = 255): void {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(px, x, y, c, a);
}
const at = (px: ArrayLike<number>, x: number, y: number) => Array.from({ length: 4 }, (_, k) => px[(y * W + x) * 4 + k]);

describe('solid outline: the characters\' line around solid jutsu parts', () => {
  it('lays a 1 px near-black line outside the body; every pixel of the drawing keeps its colour', () => {
    const px = canvas();
    disc(px, 20, 15, 8);
    const { rgba, added } = solidOutline(px, W, H);
    assert.ok(added > 30, `added ${added}`);
    for (let i = 0; i < W * H; i++) {
      if (px[i * 4 + 3]) assert.deepEqual(at(rgba, i % W, (i / W) | 0), at(px, i % W, (i / W) | 0));
      else if (rgba[i * 4 + 3]) {
        assert.ok(luma(rgba, i) < 20, 'the line is near-black');
        // It touches the body on a side, so the line is 1 px: no line pixel lies two steps out.
        const x = i % W, y = (i / W) | 0;
        assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => px[((y + dy) * W + x + dx) * 4 + 3]));
      }
    }
    // Straight out from the disc's rim: one line pixel, then clear.
    assert.equal(rgba[(15 * W + 29) * 4 + 3], 255);
    assert.equal(rgba[(15 * W + 30) * 4 + 3], 0);
  });

  it('uses the characters\' rule for the colour: the darkest ramp step pulled 70% toward #07060b', () => {
    const [r, g, b] = outlineFor(151, 196, 217);
    const ink = [7, 6, 11];
    for (const [v, k] of [[r, 0], [g, 1], [b, 2]] as const) assert.ok(Math.abs(v - ink[k]) <= 20, `${[r, g, b]} vs ${INK}`);
    assert.ok(b >= r, 'a blue surface gives a line with a whisper of blue');
  });

  it('leaves droplets and faint mist without a line', () => {
    const px = canvas();
    disc(px, 12, 15, 8);
    for (const [x, y] of [[30, 5], [31, 5], [30, 6], [34, 20]]) put(px, x, y, DROP); // spray, apart from the body
    put(px, 25, 15, BODY, 60); // faint mist beside it
    const { rgba } = solidOutline(px, W, H);
    for (const [x, y] of [[29, 5], [32, 5], [30, 4], [30, 7], [33, 20], [35, 20]]) assert.equal(rgba[(y * W + x) * 4 + 3], 0, `around a droplet at ${x},${y}`);
    // The faint mist pixel is not part of the body: the line goes where the body ends (x 21), not round the mist.
    assert.equal(rgba[(15 * W + 21) * 4 + 3], 255);
    assert.equal(rgba[(15 * W + 26) * 4 + 3], 0);
  });

  it('a piece small next to the biggest one is a particle too (minShare)', () => {
    const px = canvas();
    disc(px, 12, 15, 9); // about 250 px
    disc(px, 33, 8, 2.5); // about 20 px: a puff that came off, under 15% of the body
    const solid = solidMask(px, W, H, { minArea: 10 });
    assert.equal(solid[15 * W + 12], 1);
    assert.equal(solid[8 * W + 33], 0);
    assert.equal(solidMask(px, W, H, { minArea: 10, minShare: 0 })[8 * W + 33], 1);
  });

  it('a droplet touching the body keeps no line when its colour lives in the spray over the animation', () => {
    const frames = [0, 1, 2].map((k) => {
      const px = canvas();
      disc(px, 12, 15, 8);
      if (k < 2) for (const [x, y] of [[30, 5 + k], [33, 18], [27, 24]]) put(px, x, y, DROP); // apart
      else for (const [x, y] of [[21, 15], [22, 15], [22, 14]]) put(px, x, y, DROP); // the drop splashes on the body's side
      return { px, w: W, h: H };
    });
    const spray = particleColours(frames);
    assert.ok(spray.has((DROP[0] << 16) | (DROP[1] << 8) | DROP[2]));
    assert.ok(!spray.has((BODY[0] << 16) | (BODY[1] << 8) | BODY[2]));
    const out = solidOutlineFrames(frames)[2];
    for (const [x, y] of [[23, 15], [22, 13], [23, 14]]) assert.equal(out[(y * W + x) * 4 + 3], 0, `no line around the drop at ${x},${y}`);
  });

  it('the generator can name its own energy colours (dust, mist) that stay unlined though attached', () => {
    const px = canvas();
    disc(px, 12, 15, 8);
    disc(px, 24, 15, 4, [190, 150, 90]); // a dust puff stuck to the body
    const dust = (r: number, g: number, b: number) => r > b + 25 && r >= g;
    const plain = solidOutline(px, W, H).rgba, told = solidOutline(px, W, H, { particleColour: dust }).rgba;
    assert.equal(plain[(15 * W + 29) * 4 + 3], 255);
    assert.equal(told[(15 * W + 29) * 4 + 3], 0);
  });

  it('never stacks a second line outside his own dark line', () => {
    const px = canvas();
    disc(px, 20, 15, 8, LINE);
    disc(px, 20, 15, 7);
    const { added } = solidOutline(px, W, H);
    assert.equal(added, 0);
  });

  it('recolours his line where it is not dark (lineColour) on the silhouette only, and lays none outside it', () => {
    const px = canvas();
    disc(px, 20, 15, 8, BROWN);
    disc(px, 20, 15, 7);
    put(px, 20, 15, BROWN); // his brown inside the body (a detail line): stays his
    const plain = solidOutline(px, W, H);
    assert.ok(plain.added > 30, 'without it a black line would go outside his brown: 2 px of line');
    const { rgba, added, recoloured } = solidOutline(px, W, H, { lineColour: (r, g, b) => r === BROWN[0] && g === BROWN[1] && b === BROWN[2] });
    assert.equal(added, 0);
    assert.ok(recoloured > 30, `recoloured ${recoloured}`);
    assert.deepEqual(at(rgba, 20, 15), [...BROWN, 255]);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        // On the silhouette: a pixel round it (corners too) is clear.
        const rim = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => !px[((y + dy) * W + x + dx) * 4 + 3]));
        if (!px[i * 4 + 3]) assert.equal(rgba[i * 4 + 3], 0, 'nothing outside the silhouette');
        else if (rim && at(px, x, y).join() === [...BROWN, 255].join()) assert.ok(luma(rgba, i) < 20, 'his rim is near-black now');
        else assert.deepEqual(at(rgba, x, y), at(px, x, y), 'everything else is his');
      }
  });

  it('leaves a cut open where the art comes out of something else (noLine)', () => {
    const px = canvas();
    disc(px, 20, 15, 8);
    const { rgba } = solidOutline(px, W, H, { noLine: (_x, y) => y >= 20 });
    assert.equal(rgba[(6 * W + 20) * 4 + 3], 255, 'the line above');
    assert.equal(rgba[(24 * W + 20) * 4 + 3], 0, 'none along the cut below');
  });

  it('lines a body fading in or out as opaque as the body', () => {
    const px = canvas();
    disc(px, 20, 15, 8, BODY, 160);
    const { rgba } = solidOutline(px, W, H);
    assert.equal(rgba[(15 * W + 29) * 4 + 3], 160);
  });

  it('his light colours (semi-transparent in his palette) are energy at any alpha', () => {
    const light = lightOf(['#ffe27a82', '#573213ff', '#ffe27aff']);
    assert.ok(light(0xff, 0xe2, 0x7a));
    assert.ok(!light(0x57, 0x32, 0x13));
  });

  it('a sprite keeps its frames and anchor; a tile is lined as the repeating tile it is', () => {
    const px = canvas();
    for (let y = 10; y < 20; y++) for (let x = 0; x < W; x++) put(px, x, y, BODY); // a band across the whole tile
    const s: WorldSprite = { name: 't', label: '', meters: [1, 1], anchor: [3, 4], tags: [], anims: { fly: { frames: [new Canvas(W, H, px)], fps: 1 } } };
    const plain = outlineSprite(s), tile = outlineSprite(s, {}, { wrapX: true });
    for (const o of [plain, tile]) {
      assert.deepEqual(o.anchor, [3, 4]);
      assert.equal(o.anims.fly.frames[0].w, W);
      assert.equal(o.anims.fly.frames[0].h, H);
    }
    // Lines above and below the band, right to the tile's edges (it goes on past them).
    for (const x of [0, W - 1]) {
      assert.equal(tile.anims.fly.frames[0].alpha(x, 9), 255);
      assert.equal(tile.anims.fly.frames[0].alpha(x, 20), 255);
    }
  });
});

describe('the water dragon', () => {
  it('has the line by default; SOLID_OUTLINE=0 (outline: false) builds his sheet as it was', () => {
    const def = buildWaterDragon(), on = buildWaterDragon({ outline: true });
    assert.deepEqual(def.anchor, on.anchor);
    def.anims.fly.frames.forEach((f, i) => assert.deepEqual(f.px, on.anims.fly.frames[i].px));
  });

  it('his pixels stay his; only a few near-black line pixels are added outside the body', () => {
    const off = buildWaterDragon({ outline: false }), on = buildWaterDragon({ outline: true });
    assert.deepEqual(on.anchor, off.anchor);
    let added = 0;
    on.anims.fly.frames.forEach((f, k) => {
      const o = off.anims.fly.frames[k];
      assert.equal(f.w, o.w);
      assert.equal(f.h, o.h);
      for (let i = 0; i < f.w * f.h; i++) {
        if (o.px[i * 4 + 3]) assert.deepEqual(Array.from(f.px.subarray(i * 4, i * 4 + 4)), Array.from(o.px.subarray(i * 4, i * 4 + 4)));
        else if (f.px[i * 4 + 3]) {
          added++;
          assert.ok(luma(f.px, i) < 25);
        }
      }
    });
    // His drake already carries his dark navy line: the option only closes its gaps (claw and fin tips).
    assert.ok(added > 20 && added < 300, `added ${added}`);
  });
});

// --- the shipped sheets ---------------------------------------------------------------------------

const WORLD = join(import.meta.dirname, '../assets/world');

/** Every frame of a sprite of a shipped group (all its rows). */
function sheetFrames(group: string, name: string): RgbaFrame[] {
  const spec = JSON.parse(readFileSync(join(WORLD, group, 'manifest.json'), 'utf8')).sprites[name];
  const sheet = readPng(join(WORLD, group, spec.file));
  const frames: RgbaFrame[] = [];
  for (const a of Object.values<{ row: number; frames: number }>(spec.anims))
    for (let f = 0; f < a.frames; f++) {
      const px = new Uint8Array(spec.frameW * spec.frameH * 4);
      for (let y = 0; y < spec.frameH; y++) {
        const s = ((a.row * spec.frameH + y) * sheet.w + f * spec.frameW) * 4;
        px.set(sheet.px.subarray(s, s + spec.frameW * 4), y * spec.frameW * 4);
      }
      frames.push({ px, w: spec.frameW, h: spec.frameH });
    }
  return frames;
}

/** The solid sprites, each with the options its generator lines it with. */
const SOLID: [string, string, SolidOutlineOptions][] = [
  ['vfx_beasts', 'water', {}], ['vfx_beasts', 'earth', DRAKE_OUTLINE], ['vfx_beasts', 'genjutsu', CROWS_LINE], ['vfx_beasts', 'poison', COBRA_LINE],
  ['vfx_beasts', 'fire', {}], ['vfx_beasts', 'lightning', RAIJU_OUTLINE], ['vfx_beasts', 'wind', CRANE_OUTLINE], ['vfx_beasts', 'chakra', GRIFFIN_LINE],
  ...['bolt', 'sphere', 'slash', 'multi', 'stream', 'stream_head', 'hit', 'blast', 'aura_back', 'wall', 'wall_diag', 'wall_depth'].map((n): [string, string, SolidOutlineOptions] => ['vfx_earth', n, earthLineOptions(n)!]),
  ...['wall', 'wall_diag', 'wall_depth'].map((n): [string, string, SolidOutlineOptions] => ['vfx_genjutsu', n, genjutsuLineOptions(n)!]),
  ...['wall', 'wall_diag'].map((n): [string, string, SolidOutlineOptions] => ['vfx_poison', n, poisonLineOptions(n)!]),
  ...['wall', 'wall_diag', 'wall_depth'].map((n): [string, string, SolidOutlineOptions] => ['vfx_chakra', n, chakraLineOptions(n)!]),
  ...[0, 1, 2].map((k): [string, string, SolidOutlineOptions] => ['vfx_dc', `earth_multi_${k}`, earthLineOptions('multi')!]),
  ['vfx_dragon', 'fire_head', FIRE_HEAD_OUTLINE], ['vfx_dragon', 'fire_head_half', FIRE_HEAD_HALF_OUTLINE], ['vfx_dragon', 'water_head', {}],
  ['vfx_wood', 'wood_dragon', {}], ['vfx_wood', 'wood_root', {}], ['vfx_tide_s', 'dragon', {}],
];

/**
 * The energy sprites' sheets as approved (sha-256, first 16 hex digits): the line never went on
 * them. A change to one of these sheets needs the owner's approval first; then update its digest.
 */
const ENERGY: Record<string, Record<string, string>> = {
  vfx_blood: { screen: '797cea35ed18b5bf', spray: 'b9f8cb56dfdefc2b' },
  vfx_chakra: { aura: '758cde99d7bfb0a1', aura_back: '00402972414438fa', blast: '79e0f8073d56db09', bolt: 'feb24382da062862', breath: 'e574b6e425913ee7', hit: '5bdbbb246794e711', multi: 'e907ca1c5d5cde20', slash: 'bcb96473301d30f8', sphere: 'fa1440c5a73b29fa', stream: 'bc8bd9b037c3369b', stream_head: 'bb10eb07700e4cdc' },
  vfx_dc: { fire_multi_0: 'aa02dfdafb7da0d0', fire_multi_1: 'cda28f3656622c19', fire_multi_2: 'def7705a317e10a7', lightning_fan: 'b9cea0321701ce68', lightning_multi_0: '7b9b7a5d74e87351', lightning_multi_1: '3b65fca038c85a94', lightning_multi_2: 'a7fe33b71d739301' },
  vfx_dragon: { fire_wall_half: '5fddaaa0043a152e' },
  vfx_earth: { aura: 'fe74c739e7701339', breath: '56a0ef7d268edae9', multi_hit: '5353fa6e88d25214' },
  vfx_fire: { annihilation: '4d4662827bfa1e41', annihilation_enh: '55d2b5b1594eec82', aura: '6001287d105b5c6d', aura_back: '330292a770656d95', blast: 'f14a93745ac4d810', bolt: '2b58d8a7dbbe691d', breath: '0a17104cec250d8d', fireball: '484c95c714308d2d', fireball_great: '5fdb238647072f7c', hit: '618a742ae72f9dc7', multi: 'da06cefc08dc58bb', slash: '0eb5b92539b1e1bc', sphere: 'dfe76240ce8881e3', stream: 'b380106b6e37a3cf', stream_head: '7a05c0bb9d8894a9', wall: 'ff1e81190a99ca71', wall_depth: 'e5f028b2e8063a6a', wall_diag: '317e776f9f2c00d1' },
  vfx_genjutsu: { aura: '372920ce12e91e55', aura_back: '66e868921822864c', blast: '4beefe9960b6ec00', bolt: '220fa9c6f5eca42a', breath: '0a9bc5d9c743aa16', hit: 'f358e0eb74ad14f1', multi: '10b6e51d153cce27', slash: '04113f581235fd13', sphere: '020b634ee32ccbe9', stream: '1298c7e32cbc3403', stream_head: 'ff2df8f3440b4cb7' },
  vfx_hand: { lightning_hand: '7ae533e0b6272b6c' },
  vfx_lightning: { aura: '1042b13923223945', blast: '511371bca057ec0c', bolt: '69b8bf7051100e4a', breath: '877740a9a78b3441', hit: '324758b1ddf15d9a', kirin: '7f82b080d6adfe4c', kirin_enh: 'a8c449b413fa6401', multi: 'd45e91f42140edc3', slash: 'e7d9e94de14db7a6', sphere: '39184c7031a3037e', stream: '3cce73c0d2a97f08', stream_head: '69fef09360e67f8e', wall: 'c41fcf6e86d81286', wall_depth: '7c131d097949c2ae', wall_diag: '589178725711ab5f' },
  vfx_neutral: { slash: '36c868e3e42f3bf0' },
  vfx_poison: { aura: '6167f52043d0f96b', aura_back: 'f76be70431aa611c', blast: '8f6b0823e18f6010', bolt: '279b7dec66c2d411', breath: 'bc1533704bc633c1', hit: '7167c9d604e5769d', multi: '149534581fb020a9', slash: '43003dd8f36528e6', sphere: 'f9049be7577ad3de', stream: '5c617e4702ac12e2', stream_head: '1b03a946f5bb002a', wall_depth: '0b1310c5c2870d6a' },
  vfx_tide_s: { curl: '56bf6eede86debb8', kanji: 'bac2815a79b68bba' },
  vfx_water: { aura: 'cc68bc42b25bb945', aura_back: '2b7bdcb833585b29', blast: 'b1d6e5efa2784fbf', bolt: '2db47f04d2fe4041', breath: '3bbae1995b0a244b', hit: '4057d02cb6e43b27', multi: 'bb042715fd7d6aa0', slash: 'c1896ba5bf11eb83', sphere: '9015d6c62b9cde72', stream: 'd5f14c2451178c77', stream_head: '83afabb04c29de92', wall: '486872674a9ef712', wall_depth: '704440927ff445e1', wall_diag: '61ca178954488484' },
  vfx_wind: { aura: 'fe49177bf06a1e00', aura_back: 'b8d0a8e8c02bedb6', blast: '9e14341c98b188ee', bolt: '7ac974b7e4c1abb5', breath: 'f350fc7367ca53f4', hit: '458eb018b9ecfb6c', multi: '226b2fca16a8756b', slash: '60acf02a60ffca27', sphere: 'b6a572c15bc697f3', stream: 'a986e6be55635459', stream_head: 'd55aad6940ac42a4', wall: '6048086045e17712', wall_depth: '3e1b3c12332582f3', wall_diag: '3ccb5ae8e649d3d4' },
  vfx_wood: { wood_leaves: '9d08dbbce9010d38' },
};

describe('the shipped jutsu sheets (the owner\'s decision of 2026-10-22)', () => {
  // A solid sprite's silhouette is closed by a dark line: in no frame does a light pixel (luma above
  // 32) of its solid parts touch the clear on its side, except along a cut its generator leaves open
  // (noLine). The pieces are found with the generator's own options, with every dark pixel counted
  // as line (his and ours), so the body is the light part the lines wall in; spray, dust, slime,
  // panes and glow are not solid and may touch the clear.
  for (const [group, name, opts] of SOLID)
    it(`${group}/${name}: the solid silhouette is closed by a dark line`, () => {
      const own = opts.particleColour;
      const o: SolidOutlineOptions = { ...opts, particleColour: (r, g, b, a) => r * 0.3 + g * 0.59 + b * 0.11 <= 32 || !!own?.(r, g, b, a) };
      const frames = sheetFrames(group, name);
      const particle = particleColours(frames, o);
      let open = 0, first = '';
      frames.forEach((f, k) => {
        const solid = solidMask(f.px, f.w, f.h, o, particle);
        for (let y = 0; y < f.h; y++)
          for (let x = 0; x < f.w; x++) {
            if (!solid[y * f.w + x]) continue;
            const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
              const xx = x + dx, yy = y + dy;
              return xx >= 0 && yy >= 0 && xx < f.w && yy < f.h && f.px[(yy * f.w + xx) * 4 + 3] < 128 && !opts.noLine?.(xx, yy);
            });
            if (touches && !open++) first = `frame ${k} at ${x},${y}`;
          }
      });
      assert.equal(open, 0, `${open} light silhouette pixels without a line (first: ${first})`);
    });

  it('the raiju\'s brown and the crane\'s teal are gone from their silhouettes', () => {
    for (const [name, line] of [['lightning', 0x573213], ['wind', 0x234a49]] as const)
      for (const f of sheetFrames('vfx_beasts', name))
        for (let y = 0; y < f.h; y++)
          for (let x = 0; x < f.w; x++) {
            const i = y * f.w + x;
            if (f.px[i * 4 + 3] < 128 || ((f.px[i * 4] << 16) | (f.px[i * 4 + 1] << 8) | f.px[i * 4 + 2]) !== line) continue;
            const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
              const xx = x + dx, yy = y + dy;
              return xx < 0 || yy < 0 || xx >= f.w || yy >= f.h || f.px[(yy * f.w + xx) * 4 + 3] < 128;
            });
            assert.ok(!edge, `${name}: his line colour on the silhouette at ${x},${y}`);
          }
  });

  it('the energy sheets are untouched (fire, lightning, wind, water, chakra, poison, genjutsu, dust, smoke)', () => {
    for (const [group, sprites] of Object.entries(ENERGY)) {
      const manifest = JSON.parse(readFileSync(join(WORLD, group, 'manifest.json'), 'utf8')).sprites;
      for (const [name, digest] of Object.entries(sprites)) {
        const got = createHash('sha256').update(readFileSync(join(WORLD, group, manifest[name].file))).digest('hex').slice(0, 16);
        assert.equal(got, digest, `${group}/${name} changed`);
      }
    }
  });
});
