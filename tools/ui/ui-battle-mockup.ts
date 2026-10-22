// The mockup: the kit laid over a real battle frame (canvas only, no HTML) at the owner's
// positions (his 1024x576 picture times 1.5625), with our names and numbers and the game's own
// portraits cropped from its screenshots.
//
// Inputs (see ui-battle-kit.ts):
//   capture/frame.png    1600x900 battle canvas, every HTML overlay hidden, no web header
//   capture/hud.png      the same moment with the current HUD (for the turn order portraits)
//   capture/minimap.png  the game's minimap canvas at its own pixels
//   shots/1-turno.png    the current HUD screenshot with Akira acting (card and party portraits)

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { Img, RGBA, hex, loadPng } from './ui-img';
import { FontName, renderText } from './ui-font';
import { INK, PANEL } from './ui-draw';
import { Piece } from './ui-battle-pieces';

const K = 2;

/** His picture's coordinates to ours, snapped to even pixels (the 2-pixel art grid). */
export const S = (v: number): number => Math.round((v * 1600) / 1024 / 2) * 2;

// --- small helpers ------------------------------------------------------------------------------------

function text(s: string, font: FontName, scale: 1 | 2, color: RGBA, opts: { outline?: RGBA | null; shadow?: RGBA } = {}): Img {
  const t = renderText(s, font, { color, outline: opts.outline === null ? undefined : opts.outline ?? INK.dark, shadow: opts.shadow });
  return scale === 1 ? t : t.scaled(2);
}
/** Draws text with its visible box centred on x (the 1-pixel margin of renderText is kept). */
function textC(out: Img, s: string, font: FontName, scale: 1 | 2, color: RGBA, cx: number, y: number, opts: { outline?: RGBA | null; shadow?: RGBA } = {}): void {
  const t = text(s, font, scale, color, opts);
  out.draw(t, Math.round(cx - t.w / 2), y);
}

/**
 * Draws a 9-slice image into the box as CSS `border-image-repeat: repeat` does: corners as they
 * are; the edges and the centre tiled with one tile centred in each run, so the tiles meet the
 * corners at whatever phase the run's length gives. With `fromStart` the tiles start at the
 * corners instead (the seamless reference the generator compares against).
 */
export function nine(out: Img, src: Img, ins: [number, number, number, number], x: number, y: number, w: number, h: number, fromStart = false): void {
  const [t, r, b, l] = ins;
  const cw = src.w - l - r, ch = src.h - t - b;
  const iw = w - l - r, ih = h - t - b;
  if (iw < 0 || ih < 0) return;
  const tile = (d: number, run: number, size: number): number => {
    if (size <= 0) return 0;
    const off = fromStart ? 0 : (run - size) / 2; // where a tile starts, so one is centred in the run
    return (((d - off) % size) + size) % size;
  };
  for (let dy = 0; dy < h; dy++) {
    const sy = dy < t ? dy : dy >= h - b ? src.h - (h - dy) : t + tile(dy - t, ih, ch);
    for (let dx = 0; dx < w; dx++) {
      const sx = dx < l ? dx : dx >= w - r ? src.w - (w - dx) : l + tile(dx - l, iw, cw);
      const c = src.get(sx, sy);
      if (c[3]) out.plot(x + dx, y + dy, c);
    }
  }
}

/** Pixels of the screenshot's slate-800 portrait background become transparent. */
function cutBackground(img: Img): Img {
  const o = img.clone();
  for (let y = 0; y < o.h; y++)
    for (let x = 0; x < o.w; x++) {
      const c = o.get(x, y);
      if (Math.abs(c[0] - 30) + Math.abs(c[1] - 41) + Math.abs(c[2] - 59) < 6) o.set(x, y, [0, 0, 0, 0]);
    }
  return o;
}

/** The 40x40 native portrait back from the game's 56x56 nearest-neighbour upscale. */
function from56(img: Img): Img {
  const o = new Img(40, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) o.set(x, y, img.get(Math.floor((x + 0.5) * 1.4), Math.floor((y + 0.5) * 1.4)));
  return o;
}

function circleMask(img: Img, cx: number, cy: number, r: number): Img {
  const o = img.clone();
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) o.set(x, y, [0, 0, 0, 0]);
  return o;
}

// --- the mockup -----------------------------------------------------------------------------------------

export interface Mockup {
  img: Img;
  /** Where each piece went: name -> list of [x, y, w, h] in screen pixels. */
  layout: Record<string, [number, number, number, number][]>;
}

export function buildMockup(ps: Piece[], capDir: string, shotsDir: string): Mockup {
  const frame = loadPng(join(capDir, 'frame.png'));
  const hud = loadPng(join(capDir, 'hud.png'));
  const shot = loadPng(join(shotsDir, '1-turno.png'));
  if (frame.w !== 1600 || frame.h !== 900) throw new Error('frame.png must be 1600x900');
  const byName = new Map(ps.map((p) => [p.name, p]));
  const P = (n: string): Img => {
    const p = byName.get(n);
    if (!p) throw new Error(`no piece ${n}`);
    return p.img.scaled(K);
  };
  const ins = (n: string) => byName.get(n)!.slice!.map((v) => v * K) as [number, number, number, number];
  const out = frame.clone();
  const layout: Mockup['layout'] = {};
  const log = (name: string, x: number, y: number, w: number, h: number) => (layout[name] ??= []).push([x, y, w, h].map(Math.round) as [number, number, number, number]);
  /** Draws a piece and records where it went. */
  const even = (v: number) => Math.round(v / 2) * 2;
  const put = (name: string, x0: number, y0: number) => {
    const im = P(name);
    const x = even(x0), y = even(y0);
    out.draw(im, x, y);
    log(name, x, y, im.w, im.h);
  };
  /** Draws a sliced piece into a box (as CSS repeat would) and records it. */
  const put9 = (name: string, x0: number, y0: number, w0: number, h: number) => {
    const x = even(x0), y = even(y0), w = even(w0);
    nine(out, P(name), ins(name), x, y, w, h);
    log(name, x, y, w, h);
  };
  const cream = INK.cream, dim = hex('#cfc3a6'), white = INK.white;

  // --- top left: the menu button (the web header is gone in battle) -------------------------------------
  put('menu_button', 16, 12);

  // --- chains, round medallion, turn row ---------------------------------------------------------------------
  const med = P('round_medallion');
  const medX = S(380) - med.w / 2, medY = S(65) - med.h / 2;
  put('chain_left', medX + 5 - 72, medY + 40 - 100);
  // The sag hangs under the turn row with its ends behind the bells' bases (drawn before them).
  put('chain_sag', S(475) - 4, S(80) - 6);
  // His end circle is centred on (609, 66): (952, 104) here.
  const endW = P('init_end').w;
  const endX = S(609) - endW / 2, endY = S(66) - endW / 2;
  put('chain_right', endX + endW - 4, endY + endW / 2 - 111);
  put('round_medallion', medX, medY);
  textC(out, 'RONDA', 'title', 1, dim, S(380), medY + 23);
  textC(out, '1', 'big', 2, white, S(380), medY + 35);

  // Turn order of this battle, read off the HUD screenshot of the same moment (hud.png):
  // Akira (acting), then allies (blue) and enemies (red) at 38 px steps.
  const order: ('ally' | 'enemy')[] = ['ally', 'enemy', 'enemy', 'ally', 'enemy', 'ally'];
  const actX = S(409), actY = S(52);
  const first = cutBackground(hud.crop(638, 82, 40, 40));
  out.rect(actX + 6, actY + 6, 32, 32, PANEL[2]);
  out.draw(first.crop(4, 3, 32, 32), actX + 6, actY + 6);
  put('init_active', actX, actY);
  const cxs = [450, 476, 501, 527, 552, 577].map(S);
  order.forEach((team, i) => {
    const bell = P(team === 'ally' ? 'init_ally' : 'init_enemy');
    const bx = cxs[i] - bell.w / 2, by = S(52);
    const src = cutBackground(hud.crop(684 + i * 38, 82, 32, 32));
    const face = circleMask(src.crop(2, 2, 28, 28), 14, 14, 14);
    for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) if (Math.hypot(x + 0.5 - 14, y + 0.5 - 14) <= 14) out.set(bx + 4 + x, by + 4 + y, PANEL[2]);
    out.draw(face, bx + 4, by + 4);
    put(team === 'ally' ? 'init_ally' : 'init_enemy', bx, by);
  });
  put('chain_link', 920 - 1, endY + endW / 2 - 5);
  put('init_end', endX, endY);

  // --- target bar: the hovered bandit -------------------------------------------------------------------------
  // His plaque runs from x 612 to 1002 here (390 wide) with its channel centred on y 31.6 of his.
  const tb = P('target_bar');
  const tbX = 612, tbW = 390, tbY = S(31.6) - tb.h / 2;
  put9('target_bar', tbX, tbY, tbW, tb.h);
  const fill = P('target_fill');
  const hp = 25, hpMax = 25;
  const tw = byName.get('target_bar')!.window!;
  const chX = tbX + tw.x * K, chW = tbW - 2 * tw.x * K;
  put9('target_fill', chX, tbY + tw.y * K, Math.round((chW * hp) / hpMax), fill.h);
  textC(out, 'Bandido - Nv 3', 'title', 2, cream, tbX + tbW / 2, 12, { shadow: INK.shadow });
  // His HP numbers are small: the 1x title font, centred on the channel.
  textC(out, `${hp} / ${hpMax}`, 'title', 1, white, tbX + tbW / 2, tbY + tw.y * K + fill.h / 2 - 5);

  // --- minimap ----------------------------------------------------------------------------------------------------
  const ring = P('minimap_ring');
  const rX = S(962) - ring.w / 2, rY = S(67) - ring.h / 2;
  const win = byName.get('minimap_ring')!.window!;
  const wx = rX + win.x * K, wy = rY + win.y * K, wd = win.w * K;
  if (existsSync(join(capDir, 'minimap.png'))) {
    const mini = loadPng(join(capDir, 'minimap.png')).scaled(2);
    // Centre on the camera rectangle (its near-white outline).
    let x0 = mini.w, y0 = mini.h, x1 = -1, y1 = -1;
    for (let y = 0; y < mini.h; y++)
      for (let x = 0; x < mini.w; x++) {
        const c = mini.get(x, y);
        if (c[0] > 225 && c[1] > 225 && c[2] > 225) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
    const mcx = x1 >= 0 ? (x0 + x1) / 2 : mini.w / 2, mcy = y1 >= 0 ? (y0 + y1) / 2 : mini.h / 2;
    for (let y = 0; y < wd; y++)
      for (let x = 0; x < wd; x++) {
        if (Math.hypot(x + 0.5 - wd / 2, y + 0.5 - wd / 2) > wd / 2) continue;
        const c = mini.get(Math.round(mcx - wd / 2 + x), Math.round(mcy - wd / 2 + y));
        out.set(wx + x, wy + y, c[3] ? c : hex('#0d1712'));
      }
  }
  put('minimap_ring', rX, rY);

  // --- action bar ----------------------------------------------------------------------------------------------------
  // His bar runs from x 222 to 800 and y 492 to 554 (346..1250 and 768..866 here). The element is
  // 908 x 100 at (344, 768), so its image area with the 6-px outset is 920 x 112: CSS repeat centres
  // the tiles, and (920 - 48) and (112 - 48) are multiples of 8, so the dotted lines meet the
  // corners in phase (the generator checks this for every sliced placement).
  const o = 6; // the frame's outset (corner gems, lace)
  const barX = 344 - o, barY = S(492) - o, barW = 908 + 2 * o, barH = 100 + 2 * o;
  put9('bar_frame', barX, barY, barW, barH);
  const barBottom = barY + barH - o;

  // Crest strip (his runs from x 352 to 680, 512 px here), its trough on the bar's top rail; then
  // the acting character medallion over its middle.
  const crest = P('crest_strip');
  const crestL = 550, crestR = 1062;
  const crestY = S(492) - crest.h;
  put9('crest_strip', crestL, crestY, crestR - crestL, crest.h);
  const cw = byName.get('crest_strip')!.window!;
  // HP in the left half of the trough (full: it runs under the medallion), no numbers (his shows
  // only the bar; the numbers would show on hover).
  const hpFill = P('hp_fill');
  put9('hp_fill', crestL + cw.x * K, crestY + cw.y * K, 806 - (crestL + cw.x * K), hpFill.h);
  // Chakra: his thin line through the right half of the trough, and the three gems on it.
  const line = P('chakra_line');
  const gemY = crestY + cw.y * K + (cw.h * K) / 2; // the middle of the trough
  put9('chakra_line', 846, gemY - line.h / 2, crestR - cw.x * K - 846, line.h);
  ['chakra_red', 'chakra_orange', 'chakra_blue'].forEach((g, i) => {
    const gp = P(g);
    put(g, [880, 914, 948][i] - gp.w / 2, gemY - gp.h / 2);
  });
  // His medallion's ring is centred on (516, 466) in his picture: (806, 728) here.
  const ma = byName.get('medallion_active')!.anchor!;
  const maX = 806 - ma.x * K, maY = 728 - ma.y * K;
  const akira = from56(shot.crop(25, 98, 56, 56));
  const face = cutBackground(akira).crop(4, 3, 33, 33).scaled(2);
  const fw = byName.get('medallion_active')!.window!;
  for (let y = 0; y < 66; y++)
    for (let x = 0; x < 66; x++) {
      if (Math.hypot(x + 0.5 - 33, y + 0.5 - 33) > 33) continue;
      const c = face.get(x, y);
      out.set(maX + fw.x * K + x, maY + fw.y * K + y, c[3] ? c : PANEL[2]);
    }
  put('medallion_active', maX, maY);

  // Action / bonus / reaction pips and the movement bar.
  // His pips at x 248, 279 and 309 (388, 436, 482 here); the outer two sit 2 and 4 px further out
  // so each caption, centred on its pip, keeps a clear gap from the next (his have one).
  const pips: [string, string, number][] = [['pip_action', 'Acción', 386], ['pip_bonus', 'Adicional', 436], ['pip_reaction', 'Reacción', 486]];
  for (const [pn, label, px] of pips) {
    const pp = P(pn);
    put(pn, px - pp.w / 2, S(516) - pp.h / 2 - 2);
    textC(out, label, 'title', 1, dim, px, S(516) + 10);
  }
  // The movement trough starts right after "Mov." (x 400, his 256) with its pointed end.
  const trough = P('move_trough');
  const mvX = 400, mvW = S(330) - mvX, mvY = S(537) - trough.h / 2;
  out.draw(text('Mov.', 'title', 1, dim), S(233), mvY - 1);
  put9('move_trough', mvX, mvY, mvW, trough.h);
  const mf = P('move_fill'), mw = byName.get('move_trough')!.window!;
  put9('move_fill', mvX + mw.x * K, mvY + mw.y * K, mvW - (trough.w - mw.w * K), mf.h);
  out.draw(text('9,0/9 m', 'title', 1, cream), S(334), mvY - 1);

  // Numbered skill slots, empty for the icons he will paint (a faint placeholder glyph).
  const slot = P('skill_slot'), tag = P('skill_tag'), ph = P('glyph_placeholder');
  for (let i = 0; i < 6; i++) {
    // His tags sit 6 px under the dotted line (y 776) and overlap the slot top by 10 px.
    const sx = S(358) + i * 62, sy = 796;
    const sw = byName.get('skill_slot')!.window!;
    out.rect(sx + sw.x * K, sy + sw.y * K, sw.w * K, sw.h * K, PANEL[1]);
    put('skill_slot', sx, sy);
    put('glyph_placeholder', sx + (slot.w - ph.w) / 2, sy + (slot.h - ph.h) / 2);
    put('skill_tag', sx + (slot.w - tag.w) / 2, sy - tag.h + 10);
    textC(out, String(i + 1), 'label', 2, cream, sx + slot.w / 2, sy - tag.h + 10 + 1, { outline: null });
  }

  // Greyed item slots with dim icons, labels and the blue count badges.
  const item = P('item_slot');
  const items: [string, string, number | null][] = [['glyph_pills', 'Píldoras', 2], ['glyph_bandage', 'Vendas', 3], ['glyph_antidote', 'Antídoto', 1], ['glyph_seal', 'Sello expl.', 2], ['glyph_more', '+', null]];
  items.forEach(([g, label, n], i) => {
    const ix = S(596) + i * 62, iy = 798;
    put('item_slot', ix, iy);
    const ic = P(g);
    put(g, ix + (item.w - ic.w) / 2, iy + 8);
    textC(out, label, 'title', 1, hex('#8f8676'), ix + item.w / 2, iy + 31, { outline: null });
    if (n !== null) {
      put('item_badge', ix + item.w - 14, iy + item.h - 12);
      textC(out, String(n), 'label', 2, hex('#93a6b8'), ix + item.w - 4, iy + item.h - 11, { outline: null });
    }
  });
  // His small pink gem sits inside the panel, about 10 px down and left of the corner gem.
  const etg = P('end_turn_gem');
  put('end_turn_gem', barX + barW - 19 - 10 - etg.w / 2, barY + 11 + 10 - etg.h / 2);

  // Plaque under the bar.
  const lp = P('lower_plaque');
  put9('lower_plaque', S(330), barBottom, S(700) - S(330), lp.h);

  // --- party, bottom left ---------------------------------------------------------------------------------------------
  put('button_small', S(11) - 2, S(500) - 2);
  const em = P('glyph_emblem');
  put('glyph_emblem', S(11) - 2 + (24 - em.w) / 2, S(500) - 2 + (24 - em.h) / 2);
  const partyY = [221, 281, 341, 401]; // the four rows of the screenshot's party list (Solen, the old medic companion, Kenji, Akira)
  const orderParty = [3, 0, 1, 2]; // shown with Akira first
  orderParty.forEach((k, i) => {
    const fx = S(7) + i * 64, fy = S(520);
    const src = cutBackground(shot.crop(21, partyY[k], 36, 36));
    const faceP = src.crop(6, 8, 24, 25).scaled(2);
    out.rect(fx + 6, fy + 6, 48, 50, PANEL[2]);
    out.draw(faceP, fx + 6, fy + 6);
    put('party_frame', fx, fy);
    const hpF = P('party_hp_fill'), chF = P('party_ch_fill');
    put9('party_hp_fill', fx + 6, fy + 58, 48, hpF.h);
    put9('party_ch_fill', fx + 6, fy + 68, 48, chF.h);
  });
  return { img: out, layout };
}
