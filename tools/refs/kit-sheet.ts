// The "attack kit" sheet the owner paints over: one element's jutsu effects from a written
// group (PNGs + manifest), each sprite's key frame labeled at 2x, with a character for scale,
// in the same layout as the fire, lightning, wind and water kits. The beast panel points to
// the approved beast already in the game, which is shown at the bottom.
//
//   npx tsx tools/refs/kit-sheet.ts <groupDir> <element> <out.png> [beastsDir]
//
// beastsDir defaults to src/assets/world/vfx_beasts (the approved beasts). KIT_KEYS (optional,
// e.g. KIT_KEYS=hit=3,multi_hit=3,blast=4) names the key frame of a sprite's first animation,
// for sets whose one-shots were re-cut longer; without it the usual choice below is used.
// KIT_HEAD_JOIN=anchor (optional) places the stream head by its anchor on the next tile's anchor,
// as the game does, instead of by its left edge at the end of the third tile. KIT_GROUP (optional,
// e.g. KIT_GROUP=vfx_chakra_v3) names the group in the header instead of vfx_<element>.

import { existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { CHARACTER_FEET, Canvas, WorldSprite, characterRef, hex } from '../world-sprites/kit';
import { animInfo, text, textWidth } from '../world-sprites/vfx-a-lib';

const ACCENT: Record<string, string> = {
  fire: '#fba92a', water: '#62d6f0', wind: '#92d8b4', lightning: '#93d6ff',
  earth: '#e0a85a', genjutsu: '#c08cf0', chakra: '#7fc4ff', poison: '#a6e05a',
};
const BEAST_NAME: Record<string, string> = {
  fire: 'phoenix', water: 'water dragon', wind: 'crane', lightning: 'raiju',
  earth: 'stone dragon', genjutsu: 'crow', poison: 'cobra', chakra: 'beast',
};

const BG = hex('#15151d');
const PANEL = hex('#20212b');
const PANEL_EDGE = hex('#2c2e3a');
const INK = hex('#c9cbd6');
const INK_DIM = hex('#7d8092');
const WALLS = ['wall', 'wall_diag', 'wall_depth'];

/** Reads a PNG written by the kit (8-bit RGBA, every row filter 0). */
function readKitPng(path: string): Canvas {
  const buf = readFileSync(path);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const idat: Buffer[] = [];
  for (let p = 8; p < buf.length; ) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    if (raw[y * (w * 4 + 1)] !== 0) throw new Error(`${path}: row ${y} is filtered; only kit PNGs are supported`);
    rgba.set(raw.subarray(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1)), y * w * 4);
  }
  return Canvas.fromRgba(w, h, rgba);
}

interface ManifestSprite {
  label: string; file: string; frameW: number; frameH: number; anchor: [number, number];
  meters: [number, number]; tags: string[]; anims: Record<string, { row: number; frames: number; fps: number; loop: boolean }>;
}

/** A written group back as WorldSprites (frames sliced from each sheet). */
function readGroup(dir: string): WorldSprite[] {
  const man = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).sprites as Record<string, ManifestSprite>;
  return Object.entries(man).map(([name, m]) => {
    const sheet = readKitPng(join(dir, m.file));
    const anims: WorldSprite['anims'] = {};
    for (const [key, a] of Object.entries(m.anims)) {
      const frames = Array.from({ length: a.frames }, (_, i) => {
        const f = new Canvas(m.frameW, m.frameH);
        f.draw(sheet, -i * m.frameW, -a.row * m.frameH);
        return f;
      });
      anims[key] = { frames, fps: a.fps, loop: a.loop };
    }
    return { name, label: m.label, meters: m.meters, anchor: m.anchor, tags: m.tags, anims };
  });
}

const KIT_KEYS: Record<string, number> = Object.fromEntries(
  (process.env.KIT_KEYS ?? '').split(',').filter((p) => p.includes('=')).map((p) => [p.split('=')[0].trim(), Number(p.split('=')[1])]),
);

/** KIT_HEAD_JOIN=anchor: the stream head is placed by its anchor, as the game places it. */
const JOIN_BY_ANCHOR = process.env.KIT_HEAD_JOIN === 'anchor';

/** Which frame shows a sprite best (the same choice as the other kits, unless KIT_KEYS names it). */
function keyFrame(s: WorldSprite): { key: string; i: number } {
  if (s.name in KIT_KEYS) return { key: Object.keys(s.anims)[0], i: KIT_KEYS[s.name] };
  if (s.anims.idle && s.anims.rise) return { key: 'idle', i: 0 };
  if (s.anims.burn) return { key: 'burn', i: 0 };
  if (s.name === 'hit') return { key: 'hit', i: 2 };
  if (s.name === 'blast') return { key: 'blast', i: 3 };
  return { key: Object.keys(s.anims)[0], i: 0 };
}

function panel(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x - 1, y - 1, w + 2, h + 2, PANEL_EDGE);
  c.fillRect(x, y, w, h, PANEL);
}

interface Card { w: number; h: number; draw: (c: Canvas, x: number, y: number) => void }

function flow(cards: Card[], maxW: number, gap = 10): { w: number; h: number; place: { card: Card; x: number; y: number }[] } {
  const place: { card: Card; x: number; y: number }[] = [];
  let x = 0, y = 0, rowH = 0, W = 0;
  for (const card of cards) {
    if (x > 0 && x + card.w > maxW) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    place.push({ card, x, y });
    x += card.w + gap;
    W = Math.max(W, x - gap);
    rowH = Math.max(rowH, card.h);
  }
  return { w: W, h: y + rowH, place };
}

const [groupDir, el, outPath, beastsArg] = process.argv.slice(2);
if (!groupDir || !el || !outPath) {
  console.error('usage: npx tsx tools/refs/kit-sheet.ts <groupDir> <element> <out.png> [beastsDir]');
  process.exit(1);
}
const beastsDir = beastsArg ?? join(import.meta.dirname, '../../src/assets/world/vfx_beasts');
const accent = hex(ACCENT[el] ?? '#c9cbd6');
const sprites = readGroup(groupDir);
const by = Object.fromEntries(sprites.map((s) => [s.name, s]));
const ref = characterRef();
const refBounds = ref.bounds()!;
const beastName = BEAST_NAME[el] ?? 'beast';
const approved = existsSync(join(beastsDir, 'manifest.json')) ? readGroup(beastsDir).find((s) => s.name === el) : undefined;

const cards: Card[] = [];
for (const s of sprites) {
  if (s.name === 'stream_head' || s.name === 'aura_back') continue;
  if (s.name === 'beast' && approved) {
    // The beast is approved and in the game: point to it instead of the old one.
    const w = 128, h = 56;
    cards.push({
      w, h: h + 16,
      draw: (c, x, y) => {
        text(c, x, y, 'BEAST', accent);
        panel(c, x, y + 14, w, h);
        text(c, x + 6, y + 14 + 20, 'BEAST: SEE THE APPROVED', INK_DIM);
        text(c, x + 6, y + 14 + 28, `${beastName.toUpperCase()} BELOW`, INK_DIM);
      },
    });
    continue;
  }
  const { key, i } = keyFrame(s);
  const f = s.anims[key].frames[i];
  const label = s.name === 'stream' ? 'STREAM x3 + STREAM_HEAD' : s.name.toUpperCase();
  const info = `${f.w}x${f.h}  ` + Object.keys(s.anims).map((k) => animInfo(s, k)).join(', ');
  if (s.name === 'stream') {
    const head = by.stream_head?.anims.fly.frames[0];
    // Where the head goes: by default its left edge at the end of the third tile. With
    // KIT_HEAD_JOIN=anchor it goes where the game puts it, its anchor on the next tile's anchor
    // (for a set whose head reaches back over the last tile).
    const hx = head && JOIN_BY_ANCHOR ? 3 * f.w + s.anchor[0] - by.stream_head.anchor[0] : 3 * f.w;
    const w = Math.max(f.w * 3, head ? hx + head.w : 0);
    cards.push({
      w: Math.max(w, textWidth(info)), h: f.h + 16,
      draw: (c, x, y) => {
        text(c, x, y, label, accent);
        text(c, x, y + 7, info, INK_DIM);
        panel(c, x, y + 14, w, f.h);
        for (let k = 0; k < 3; k++) c.draw(f, x + k * f.w, y + 14);
        if (head) c.draw(head, x + hx, y + 14);
      },
    });
    continue;
  }
  const withRef = ['aura', 'blast', ...WALLS].includes(s.name);
  const refW = withRef && s.name !== 'aura' ? refBounds[2] - refBounds[0] + 6 : 0;
  const w = f.w + refW;
  cards.push({
    w: Math.max(w, textWidth(label), textWidth(info)), h: f.h + 16,
    draw: (c, x, y) => {
      text(c, x, y, label, accent);
      text(c, x, y + 7, info, INK_DIM);
      panel(c, x, y + 14, w, f.h);
      if (s.name === 'aura') {
        // The character standing in the aura, feet on the anchor (its back layer behind him).
        const back = by.aura_back;
        if (back) c.draw(back.anims.idle.frames[0], x + s.anchor[0] - back.anchor[0], y + 14 + s.anchor[1] - back.anchor[1]);
        c.draw(ref, x + s.anchor[0] - CHARACTER_FEET[0], y + 14 + s.anchor[1] - CHARACTER_FEET[1]);
      }
      if (s.anims.burn) c.draw(ref, x + s.anchor[0] - 6 - CHARACTER_FEET[0], y + 14 + s.anchor[1] - CHARACTER_FEET[1]);
      if (refW) c.draw(ref, x + f.w + 3 - refBounds[0], y + 14 + s.anchor[1] - CHARACTER_FEET[1]);
      c.draw(f, x, y + 14);
    },
  });
}
if (approved) {
  // The approved beast, two frames of its flight.
  const a = approved.anims.fly ?? Object.values(approved.anims)[0];
  const picks = [0, Math.floor(a.frames.length * 2 / 3)];
  const fw = a.frames[0].w, fh = a.frames[0].h;
  const w = picks.length * fw + (picks.length + 1) * 8;
  const title = `BEAST (${beastName.toUpperCase()}, APPROVED, IN GAME)`;
  const info = `${fw}x${fh}  FLY ${a.frames.length}F ${a.fps}FPS LOOP  (FRAMES ${picks.join(', ')})`;
  cards.push({
    w: Math.max(w, textWidth(title), textWidth(info)), h: fh + 16 + 16,
    draw: (c, x, y) => {
      text(c, x, y, title, accent);
      text(c, x, y + 7, info, INK_DIM);
      panel(c, x, y + 14, w, fh + 16);
      picks.forEach((p, k) => c.draw(a.frames[p], x + 8 + k * (fw + 8), y + 14 + 8));
    },
  });
}

const lay = flow(cards, 820, 12);
const pad = 10;
const out = new Canvas(lay.w + pad * 2, lay.h + pad * 2 + 16);
out.fillRect(0, 0, out.w, out.h, BG);
text(out, pad, pad, `${el.toUpperCase()}   GROUP ${(process.env.KIT_GROUP ?? `vfx_${el}`).toUpperCase()}   ${sprites.length} SPRITES   (SHOWN 2X, KEY FRAME)`, INK);
for (const p of lay.place) p.card.draw(out, pad + p.x, pad + 16 + p.y);
const tmp = `${outPath}.part`;
out.scaled(2).save(tmp);
renameSync(tmp, outPath);
console.log(`${outPath}: ${out.w * 2}x${out.h * 2}, ${sprites.length} sprites${approved ? `, approved ${beastName}` : ''}`);
