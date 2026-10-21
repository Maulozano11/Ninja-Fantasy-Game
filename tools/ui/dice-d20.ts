// Generates the d20 dice sheets: three styles (gem, ivory, obsidian) in two sizes (small: the quick
// roll over the actor; big: the window for criticals and important checks), every result 1..20
// thrown, popped, dimmed (the die advantage did not keep), the natural 20 and natural 1 effects,
// the shared halo/shadow/dust sprites, the critical hit's art and the readout pieces, plus a
// manifest.json that says where everything is and how long each frame lasts.
//
//   UI_OUT=<staging dir> npx tsx tools/ui/dice-d20.ts   writes into $UI_OUT (required without --assets)
//   npx tsx tools/ui/dice-d20.ts --assets             writes into src/assets/ui_dice/ (the game's copy)
//   add --preview                           also writes preview sheets (gem in every chakra colour,
//                                           throw filmstrips) next to the sheets (never into assets)
//
// Same input, same bytes: nothing here is random (the search for the numbering and every jitter
// use a fixed seed). Art pixels: the screen doubles them (the banner and damage digits triple).

import { join } from 'node:path';
import { Img, RGBA, hex, savePng, writeAtomic } from './ui-img';
import { NUMBERS, STYLE_IDS, STYLES, StyleId, GOLD20, gemKeys, recolour } from './dice-d20-art';
import {
  CLICK_FRAME, ROLL_FRAMES, SIZES, Size, dimDie, dustSprite, fromRight, halo, nat1Frames, nat20Frames, popFrames, rollFrame, rollPath, shadowSprite,
} from './dice-d20-fx';
import { advTag, bannerFrames, burstFrames, damageNumber, markIcon, maxTag } from './dice-d20-crit';
import { renderText } from './ui-font';
import { DICE_GEM_KEY_TINT, diceGemRamp } from '../../src/sprite/diceGem';

const ASSETS = join(import.meta.dirname, '../../src/assets/ui_dice');
const args = new Set(process.argv.slice(2));
if (!args.has('--assets') && !process.env.UI_OUT) {
  console.error('dice: set UI_OUT=<staging dir> (or pass --assets to write the game\'s copy)');
  process.exit(1);
}
const OUT = args.has('--assets') ? ASSETS : process.env.UI_OUT!;
const STAGING = process.env.UI_OUT ?? OUT;
const PREVIEW = args.has('--preview');

const CHAKRA_IDS = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'white', 'black', 'brown'];
const toHex = (c: RGBA) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');

// --- a small shelf packer for the mixed sheets ------------------------------------------------------

type Rect = [number, number, number, number];
class Atlas {
  items: { name: string; img: Img }[] = [];
  add(name: string, img: Img): void {
    if (this.items.some((i) => i.name === name)) throw new Error(`atlas: '${name}' twice`);
    this.items.push({ name, img });
  }
  /** Packs in insertion order into rows no wider than `maxW`, 1 pixel apart. */
  build(maxW: number): { img: Img; rects: Record<string, Rect> } {
    const rects: Record<string, Rect> = {};
    let x = 0, y = 0, rowH = 0, w = 0;
    for (const it of this.items) {
      if (x > 0 && x + it.img.w > maxW) {
        x = 0;
        y += rowH + 1;
        rowH = 0;
      }
      rects[it.name] = [x, y, it.img.w, it.img.h];
      x += it.img.w + 1;
      rowH = Math.max(rowH, it.img.h);
      w = Math.max(w, x);
    }
    const img = new Img(w, y + rowH);
    for (const it of this.items) img.draw(it.img, rects[it.name][0], rects[it.name][1]);
    return { img, rects };
  }
}

// --- the dice sheets ---------------------------------------------------------------------------------

const POP_COL = ROLL_FRAMES, DIM_COL = ROLL_FRAMES + 3;

/**
 * One style, one size: row r is result r + 1; columns 0..ROLL_FRAMES-1 the throw (the last is the
 * rest), then 3 of the pop, then the dimmed die (the manifest's diceSheet says which column is
 * which). Every cell is box x box with the die's centre in the middle.
 */
function diceSheet(style: StyleId, size: Size): Img {
  const box = SIZES[size].box;
  const img = new Img(box * (DIM_COL + 1), box * 20);
  for (let n = 1; n <= 20; n++) {
    const y = (n - 1) * box;
    for (let i = 0; i < ROLL_FRAMES; i++) img.draw(rollFrame(n, i, { style, size }).img, i * box, y);
    popFrames(n, style, size).forEach((f, k) => img.draw(f.img, (POP_COL + k) * box, y));
    img.draw(dimDie(n, style, size), DIM_COL * box, y);
  }
  return img;
}

/** One style, one size: row 0 the natural 20, row 1 the natural 1 (fx x fx cells). */
function fxSheet(style: StyleId, size: Size): { img: Img; nat20: { ms: number }[]; nat1: { ms: number; dx: number }[] } {
  const fx = SIZES[size].fx;
  const n20 = nat20Frames(style, size), n1 = nat1Frames(style, size);
  const img = new Img(fx * Math.max(n20.length, n1.length), fx * 2);
  n20.forEach((f, i) => img.draw(f.img, i * fx, 0));
  n1.forEach((f, i) => img.draw(f.img, i * fx, fx));
  return { img, nat20: n20.map((f) => ({ ms: f.ms })), nat1: n1.map((f) => ({ ms: f.ms, dx: f.dx ?? 0 })) };
}

/** Halos (per style, and gold), shadows and dust for one size. */
function sharedSheet(size: Size): { img: Img; rects: Record<string, Rect> } {
  const z = SIZES[size];
  const a = new Atlas();
  const W = Math.round(z.R * 3.2);
  const colours: [string, RGBA][] = [...STYLE_IDS.map((s) => [s, STYLES[s].halo] as [string, RGBA]), ['gold', GOLD20[6]]];
  for (const [name, col] of colours) [1, 0.7, 0.45, 0.2].forEach((k, i) => a.add(`halo_${name}_${i}`, halo(W, z.R * 1.2, col, k)));
  // The rest silhouette is about 1.7 R wide; the shadow shrinks as the die flies higher.
  [0.55, 0.65, 0.75, 0.85, 0.95, 1].forEach((k, i) => a.add(`shadow_${i}`, shadowSprite(Math.round(z.R * 1.7 * k), i === 5)));
  for (let s = 1; s <= 3; s++) for (let f = 0; f < 4; f++) a.add(`dust_${s}_${f}`, dustSprite(size, s, f));
  return a.build(size === 'small' ? 400 : 900);
}

/** The critical hit's art and the readout pieces. */
function critSheet(): { img: Img; rects: Record<string, Rect>; banner: Record<string, { ms: number[]; hold: number }>; burstMs: number[] } {
  const a = new Atlas();
  const banner: Record<string, { ms: number[]; hold: number }> = {};
  // crit: a natural 20 on an attack; fumble: a natural 1 on a save (it takes the caster's critical);
  // nat20: a natural 20 on a save or a check (the owner's rules A3 and C3).
  const TEXTS: [string, string, string][] = [
    ['crit', 'es', '¡CRÍTICO!'], ['crit', 'en', 'CRITICAL!'],
    ['fumble', 'es', '¡FALLO CRÍTICO!'], ['fumble', 'en', 'CRITICAL FAIL!'],
    ['nat20', 'es', '¡20 NATURAL!'], ['nat20', 'en', 'NATURAL 20!'],
  ];
  for (const [kind, lang, text] of TEXTS) {
    const b = bannerFrames(text);
    b.frames.forEach((f, i) => a.add(`banner_${kind}_${lang}_${i}`, f.img));
    banner[`${kind}_${lang}`] = { ms: b.frames.map((f) => f.ms), hold: b.hold };
  }
  const burst = burstFrames();
  burst.forEach((f, i) => a.add(`burst_${i}`, f.img));
  // One digit each, with its rim and shadow: lay them 7 art pixels apart (they overlap by their rims).
  for (let d = 0; d <= 9; d++) a.add(`dmg_gold_${d}`, damageNumber(d));
  for (let d = 0; d <= 9; d++) a.add(`dmg_white_${d}`, damageNumber(d, 'white'));
  a.add('max_es', maxTag('MÁX'));
  a.add('max_en', maxTag('MAX'));
  return { ...a.build(1200), banner, burstMs: burst.map((f) => f.ms) };
}
const DARK: RGBA = hex('#0b0805');
const INK = { cream: hex('#efe6cf'), dim: hex('#b8ad94'), gold: hex('#ffd23c'), dull: hex('#c27a68') };

/** The readout's pieces: digits and signs per ink, the totals, the labels, the marks, the tags. */
function readoutSheet(): { img: Img; rects: Record<string, Rect> } {
  const a = new Atlas();
  for (const [ink, col] of Object.entries(INK)) for (const ch of '0123456789+-=') a.add(`t_${ink}_${ch}`, renderText(ch, 'title', { color: col, outline: DARK }));
  for (const [ink, col] of [['good', hex('#86dca0')], ['bad', hex('#ef8a90')], ['gold', INK.gold]] as [string, RGBA][])
    for (const ch of '0123456789') a.add(`big_${ink}_${ch}`, renderText(ch, 'big', { color: col, outline: DARK, top: hex('#ffffff') }));
  for (const lab of ['CA', 'CD', 'AC', 'DC']) a.add(`label_${lab}`, renderText(lab, 'label', { color: INK.dim, outline: DARK }));
  for (const ch of '0123456789') a.add(`l_dim_${ch}`, renderText(ch, 'label', { color: INK.dim, outline: DARK }));
  a.add('mark_ok', markIcon(true));
  a.add('mark_fail', markIcon(false));
  a.add('adv_es', advTag('VENTAJA', true));
  a.add('dis_es', advTag('DESVENTAJA', false));
  a.add('adv_en', advTag('ADVANTAGE', true));
  a.add('dis_en', advTag('DISADVANTAGE', false));
  return a.build(400);
}

// --- previews (staging only) ---------------------------------------------------------------------------

function previews(dir: string): void {
  // The gem in every natural chakra colour, small and big, at rest on a 20 and a 7.
  for (const size of ['small', 'big'] as Size[]) {
    const box = SIZES[size].box;
    const sheet = new Img(box * CHAKRA_IDS.length, box * 2);
    const keys = gemKeys();
    CHAKRA_IDS.forEach((id, i) => {
      for (const [row, n] of [[0, 20], [1, 7]]) {
        const cell = new Img(box, box);
        cell.draw(rollFrame(n, ROLL_FRAMES - 1, { style: 'gem', size }).img, 0, 0);
        sheet.draw(recolour(cell, keys, diceGemRamp(id)), i * box, row * box);
      }
    });
    savePng(join(dir, `preview_gem_colours_${size}.png`), sheet.scaled(size === 'small' ? 4 : 2));
  }
}

// --- main -------------------------------------------------------------------------------------------------

function main(): void {
  const manifest: Record<string, unknown> = {
    generator: 'tools/ui/dice-d20.ts (rerun it to change these files; never edit them by hand)',
    status: 'New art waiting for the owner\'s approval (branch ui/dice-d20).',
    styles: STYLE_IDS,
    defaultStyle: 'gem',
    names: { gem: { es: 'Gema', en: 'Gem' }, ivory: { es: 'Marfil y oro', en: 'Ivory and gold' }, obsidian: { es: 'Obsidiana rúnica', en: 'Runic obsidian' } },
    screenScale: { dice: 2, readout: 2, banner: 3, damage: 3, burst: 1 },
    numbers: { faces: NUMBERS, note: 'The number on each face (opposite faces sum to 21).' },
    sizes: Object.fromEntries((['small', 'big'] as Size[]).map((s) => [s, { box: SIZES[s].box, R: SIZES[s].R, fx: SIZES[s].fx }])),
  };
  // Where a cell is in a dice sheet.
  manifest.diceSheet = {
    file: 'dice_<style>_<size>.png',
    rowOfResult: 'result - 1',
    rollColumns: [0, ROLL_FRAMES - 1],
    rollNote: 'The throw: spin and smear in the air, three bounces, it lands on a neighbouring face, rolls over the edge onto the result (click), wobbles and settles.',
    restColumn: ROLL_FRAMES - 1,
    clickFrame: CLICK_FRAME,
    popColumns: [POP_COL, POP_COL + 2],
    dimColumn: DIM_COL,
    popMs: [50, 60, 90],
    popDy: [-1, 0, 0],
  };
  const throwPath = (size: Size) => rollPath(1, size).map((f) => ({ dx: f.dx, dy: f.dy, ms: f.ms, contact: f.contact ?? 0, ground: Math.round(f.ground * 100) / 100 }));
  manifest.throw = {
    note: 'Where the die is in each throw frame, from where it lands (art pixels), for results thrown from the left. The results in fromRight come from the right: negate dx. A frame with contact > 0 hits the ground (dust_<contact>_0..3 there, a click sound); the first frames carry their own motion smear; ground picks the shadow (shadow_<round(ground*5)>; shadow_5, on the ground, has the dark contact core). The last frame holds.',
    fromRight: Array.from({ length: 20 }, (_, i) => i + 1).filter(fromRight),
    small: throwPath('small'),
    big: throwPath('big'),
  };
  const fxMeta: Record<string, unknown> = {};
  for (const style of STYLE_IDS)
    for (const size of ['small', 'big'] as Size[]) {
      savePng(join(OUT, `dice_${style}_${size}.png`), diceSheet(style, size));
      const fx = fxSheet(style, size);
      savePng(join(OUT, `dice_${style}_${size}_fx.png`), fx.img);
      fxMeta[`${style}_${size}`] = { nat20: fx.nat20, nat1: fx.nat1 };
    }
  manifest.fx = {
    file: 'dice_<style>_<size>_fx.png',
    note: 'Row 0: the natural 20 (gold flash, rays, sparkles, shine; the last frame holds: on the small die its own colours with the 20 in gold, on the big one, the window, still gold). Row 1: the natural 1 (dull red, crack, chips; dx is the shake). Cells are fx x fx with the die centred.',
    frames: fxMeta,
  };
  const shared: Record<string, unknown> = {};
  for (const size of ['small', 'big'] as Size[]) {
    const s = sharedSheet(size);
    savePng(join(OUT, `dice_shared_${size}.png`), s.img);
    shared[size] = s.rects;
  }
  manifest.shared = { file: 'dice_shared_<size>.png', note: 'halo_<style|gold>_<0..3> under a landed die (0 strongest); shadow_<0..5>; dust_<strength 1..3>_<frame 0..3> at a contact (40 ms a frame).', rects: shared };
  const crit = critSheet();
  savePng(join(OUT, 'crit.png'), crit.img);
  manifest.crit = {
    file: 'crit.png',
    rects: crit.rects,
    banner: crit.banner,
    burstMs: crit.burstMs,
    note: 'A natural 20 on an attack: automatic critical, maximum damage. See timeline (ms at speed 1; the battle speed divides them; a click skips to the end).',
    timeline: {
      note: 'Two parts. "roll" is timed from the moment the small die settles on 20; "impact" from the frame the blow lands.',
      roll: [
        { at: 0, what: 'smallDie', detail: 'The small die over the actor (the target, for a save) lands and plays its natural-20 row from the small fx sheet (gold flash).' },
        { at: 100, what: 'window', detail: 'The big window opens in the free band over the fight, the small die flying into it: the screen around it darkens (a 45% vignette, the middle left lighter), the big die plays its natural-20 row (dice_<style>_big_fx row 0, 2x).' },
        { at: 180, what: 'banner', detail: 'banner_<kind>_<lang>_0..hold under the die (3x): opens from half its width, a shine crosses it, it holds.' },
        { at: 300, what: 'readout', detail: 'The readout pops in under the banner (natural 20 in gold, total, mark, CA/CD).' },
        { at: 620, what: 'swing', detail: 'The attack plays; the window fades out over 200 ms as the blade comes down.' },
      ],
      impact: [
        { at: 0, what: 'hitStop', ms: 110, detail: 'Everything holds still on the impact frame (the target shows its hit flash).' },
        { at: 0, what: 'flash', ms: 70, detail: 'A bright white-gold bloom on the target (added light, not a flat wash over the screen): two quick frames.' },
        { at: 0, what: 'sound', detail: 'The critical sting (see sound).' },
        { at: 30, what: 'burst', detail: 'burst_0..7 on the target, centred on its chest (world pixels, 50 ms each).' },
        { at: 30, what: 'shake', ms: 260, px: 6, detail: 'The camera kicks 6 px and shakes, easing out.' },
        { at: 120, what: 'damage', detail: 'The maximum damage over the target: dmg_white digits for 60 ms, then dmg_gold at 3x with max_<lang> beside it; it rises and fades out at the end.' },
        { at: 900, what: 'end', detail: 'The next event plays (the number keeps fading over it).' },
      ],
    },
    sound: 'tools/ui/dice-d20-sound.ts writes the sting as a WAV; the recipe there is the one to port to WebAudio.',
  };
  const ro = readoutSheet();
  savePng(join(OUT, 'readout.png'), ro.img);
  manifest.readout = {
    file: 'readout.png',
    rects: ro.rects,
    note: 't_<ink>_<char> (title font; inks cream, dim, gold for a natural 20, dull for a natural 1), big_<good|bad|gold>_<digit> (the total), label_<CA|CD|AC|DC>, l_dim_<digit>, mark_ok/mark_fail, adv_/dis_<lang>. Layout: die number, sign, bonus, =, total, mark, label and target, on a dark plaque (PANEL #16120c at 92%, rim #6e5d40 lit #b3a383, outline #140c05), 18 art pixels tall.',
  };
  manifest.gem = {
    keyTint: DICE_GEM_KEY_TINT,
    keys: gemKeys(),
    note: 'gem sheets are drawn in these key colours; swap each for the same step of diceGemRamp(caster tint) (src/sprite/diceGem.ts). Every chakra colour id and any #rrggbb work.',
    ramps: Object.fromEntries(CHAKRA_IDS.map((id) => [id, diceGemRamp(id)])),
  };
  manifest.goldColours = GOLD20.map(toHex);
  writeAtomic(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  if (PREVIEW) previews(OUT === ASSETS ? (process.env.UI_OUT ?? STAGING) : OUT);
  console.log(`dice: wrote ${OUT}`);
}

main();
