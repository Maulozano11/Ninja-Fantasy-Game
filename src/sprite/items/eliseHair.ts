// The owner's Elise's hair as a hairstyle (hair_golden_fall): her pixels brought down to our scale
// (eliseHairArt.ts, tools/refs/elise-hair-from-ref.py). The head's hair rides the face anchor like
// the owner's other painted hair; the long fall down her back hangs from the back of the head and
// turns with the torso.

import { faceAnchor } from '../body';
import { retintHex } from '../color';
import type { DrawCtx, ItemDef } from '../ctx';
import { stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, RES, v } from '../raster';
import type { Rig } from '../rig';
import { rotateTemplate, type RotatedPixel } from '../rotsprite';
import type { PaintedPart } from './capeArt';
import {
  ELISE_HAIR_BACK,
  ELISE_HAIR_BASE,
  ELISE_HAIR_FALL,
  ELISE_HAIR_FALL_AT,
  ELISE_HAIR_FRONT,
  ELISE_HAIR_LINE,
  ELISE_HAIR_WISP,
  ELISE_ORNAMENT,
  ELISE_ORNAMENT_BASE,
} from './eliseHairArt';

/** Her hair recoloured: her darkest line stays, her golds and browns follow the hair, the flower its own gold. */
const eliseColor = (hair: string, ornament: string) => (ch: string, hex: string) => {
  if (ELISE_HAIR_LINE.includes(ch)) return hex;
  if (ELISE_ORNAMENT.includes(ch)) return retintHex(hex, ELISE_ORNAMENT_BASE, ornament);
  return retintHex(hex, ELISE_HAIR_BASE, hair);
};

/** Stamps a part of her head's hair with its pivot on the face anchor: her pixels go in unscaled, as drawn. */
function atFace(g: DrawCtx, L: Layer, p: PaintedPart, color: (ch: string, hex: string) => string): void {
  const { nx, ny } = faceAnchor(g);
  const ax = nx - p.pivot[0];
  const ay = ny - p.pivot[1];
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  L.noFray = true;
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch !== '.') L.set(ax + i, ay + j, pens[ch], 3, 'head', F_NO_TEXTURE | F_NO_OUTLINE);
    }
  });
}

/** Above the eyes her hair is the head's outline: the skull is trimmed to the back part. */
function trimSkull(g: DrawCtx, p: PaintedPart): void {
  const H = g.L('head.body');
  const { nx, ny } = faceAnchor(g);
  const ax = nx - p.pivot[0];
  const ay = ny - p.pivot[1];
  for (let y = Math.max(0, ny - 32); y < ny; y++) {
    for (let x = Math.max(0, nx - 32); x < Math.min(GRID, nx + 32); x++) {
      if (H.has(x, y) && (p.rows[y - ay]?.[x - ax] ?? '.') === '.') H.clear(x, y);
    }
  }
}

/**
 * Knocked out the figure is drawn upright and then laid face down: the fall swings in toward the back
 * by this much (degrees, against the clock) so it lies along her back instead of standing up off it.
 */
const LIE_TURN = -24;

/**
 * Pitched far forward (the throw, rig.ts THROW) her head is carried out ahead of her neck, and a fall
 * turned only with the torso would hang down between her legs: for each design unit the head is
 * ahead of the neck past HEAD_AHEAD, the fall swings back by HEAD_TURN degrees (with the clock), up
 * to HEAD_TURN_MAX, so it streams out along her back as the cape does. No other pose carries the
 * head that far forward.
 */
const HEAD_AHEAD = 1;
const HEAD_TURN = 18;
const HEAD_TURN_MAX = 60;

/** How far the head sits ahead of the neck, along the shoulder line (design units). */
const headAhead = (r: Rig): number => (r.head.x - r.neck.x) * r.right.x + (r.head.y - r.neck.y) * r.right.y;

/**
 * The long fall, behind the body: its pivot hangs from the back of the head (a fixed step from the
 * face anchor) and it turns as the torso turns from its angle at idle, so it trails behind when she
 * leans in and stays along her back when she leans back or lies down.
 */
function fall(g: DrawCtx, color: (ch: string, hex: string) => string): void {
  const { nx, ny } = faceAnchor(g);
  const at = v((nx + ELISE_HAIR_FALL_AT[0] + 0.5) / RES, (ny + ELISE_HAIR_FALL_AT[1] + 0.5) / RES);
  const deg = (Math.atan2(g.rig.up.y, g.rig.up.x) * 180) / Math.PI + (g.rig.lay ? LIE_TURN : 0) + (g.rig.lay ? 0 : Math.min(HEAD_TURN_MAX, HEAD_TURN * Math.max(0, headAhead(g.rig) - HEAD_AHEAD)));
  g.L('hairBack').noFray = true;
  stampPiece(g, 'hairBack', ELISE_HAIR_FALL, at, deg, 'back', color);
  // the loose strand would stand up off her back when she lies down
  if (g.rig.lay) return;
  const L = g.L('hairBack');
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(ELISE_HAIR_WISP.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  for (const p of wispPixels(deg)) L.set(ax + p.dx, ay + p.dy, pens[p.ch], 3, 'back', F_NO_TEXTURE | F_NO_OUTLINE);
}

/**
 * The loose strand turned by `deg` (the fall's angle), as pixels from the fall's pivot: only what still
 * hangs on the fall, through the strand itself, side or corner. Turned, a strand a pixel wide can
 * lose a pixel on the way and leave its end floating off the hair; that end is left out.
 */
export function wispPixels(deg: number): RotatedPixel[] {
  const fall = rotateTemplate(ELISE_HAIR_FALL, deg - ELISE_HAIR_FALL.angle);
  const wisp = rotateTemplate(ELISE_HAIR_WISP, deg - ELISE_HAIR_WISP.angle);
  const at = (x: number, y: number) => `${x},${y}`;
  const onFall = new Set(fall.map((p) => at(p.dx, p.dy)));
  const loose = new Map(wisp.filter((p) => !onFall.has(at(p.dx, p.dy))).map((p) => [at(p.dx, p.dy), p]));
  const touches = (p: RotatedPixel, on: (k: string) => boolean) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && on(at(p.dx + dx, p.dy + dy))) return true;
    return false;
  };
  const kept: RotatedPixel[] = [];
  const keptAt = new Set<string>();
  let queue = [...loose.values()].filter((p) => touches(p, (k) => onFall.has(k)));
  while (queue.length) {
    const next: RotatedPixel[] = [];
    for (const p of queue) {
      const k = at(p.dx, p.dy);
      if (keptAt.has(k)) continue;
      keptAt.add(k);
      kept.push(p);
      loose.delete(k);
    }
    for (const p of loose.values()) if (touches(p, (k) => keptAt.has(k))) next.push(p);
    queue = next;
  }
  // At some angles the turned strand lies against the mass and walls in a pixel or a few of
  // background: those are filled with the strand, so no hole shows between the strand and the hair.
  if (!kept.length) return kept;
  const all = [...fall, ...kept];
  const solid = new Set(all.map((p) => at(p.dx, p.dy)));
  const x0 = Math.min(...all.map((p) => p.dx)) - 1;
  const x1 = Math.max(...all.map((p) => p.dx)) + 1;
  const y0 = Math.min(...all.map((p) => p.dy)) - 1;
  const y1 = Math.max(...all.map((p) => p.dy)) + 1;
  const outside = new Set<string>();
  const stack: [number, number][] = [[x0, y0]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const k = at(x, y);
    if (x < x0 || x > x1 || y < y0 || y > y1 || outside.has(k) || solid.has(k)) continue;
    outside.add(k);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // each walled-in pocket next to the strand is filled whole, in the colour of the strand beside it
  const strand = new Map(kept.map((p) => [at(p.dx, p.dy), p]));
  const fill: RotatedPixel[] = [];
  for (let grew = true; grew; ) {
    grew = false;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const k = at(x, y);
        if (solid.has(k) || outside.has(k) || strand.has(k)) continue;
        const by = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].map((n) => strand.get(n)).find((p) => p);
        if (!by) continue;
        const p = { dx: x, dy: y, ch: by.ch };
        strand.set(k, p);
        fill.push(p);
        grew = true;
      }
    }
  }
  return [...kept, ...fill];
}

export const GOLDEN_FALL: ItemDef = {
  id: 'hair_golden_fall',
  slot: 'hair',
  name: 'Golden Fall',
  desc: 'Long straight blonde hair to the waist, side-swept bangs, a lock before each ear and a gold flower above the temple.',
  colors: [
    { key: 'hair', label: 'Hair', default: ELISE_HAIR_BASE, kind: 'hair' },
    { key: 'ornament', label: 'Ornament', default: ELISE_ORNAMENT_BASE, kind: 'metal' },
  ],
  draw: (g, [hair, ornament]) => {
    // The owner's Elise (2026-10-21), brought down to our scale in her colours: the fall behind the
    // body, the head's hair behind the head (with what her face hides filled in), then over it.
    const tint = eliseColor(hair, ornament);
    fall(g, tint);
    atFace(g, g.L('hairBack'), ELISE_HAIR_BACK, tint);
    atFace(g, g.L('hairFront'), ELISE_HAIR_FRONT, tint);
    trimSkull(g, ELISE_HAIR_BACK);
  },
};
