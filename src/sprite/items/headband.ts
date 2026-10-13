// Shinobi headband: cloth band + metal plate with an original emblem.
// Can be worn on the forehead, neck, near arm or waist, optionally slashed
// (rogue) and with long cloth tails.

import { armPoint, DrawCtx, fillTorso } from '../ctx';
import { capsule, F_NO_OUTLINE, Layer, line, Pen, poly, px, v, Vec } from '../raster';
import type { EmblemId } from '../types';
import { hd } from './hairkit';

export const EMBLEMS: { id: EmblemId; name: string }[] = [
  { id: 'crescent', name: 'Crescent Moon' },
  { id: 'wave', name: 'Twin Waves' },
  { id: 'peak', name: 'Mountain Peak' },
  { id: 'bolt', name: 'Thunderbolt' },
  { id: 'sun', name: 'Rising Sun' },
  { id: 'spiral', name: 'Whirl' },
  { id: 'blank', name: 'Blank Plate' },
];

const EMBLEM_BITMAPS: Record<EmblemId, string[]> = {
  crescent: ['.##', '#..', '.##'],
  wave: ['#.#.', '.#.#'],
  peak: ['.#.', '#.#'],
  bolt: ['..#', '.#.', '#..'],
  sun: ['.#.', '###', '.#.'],
  spiral: ['###', '..#', '#.#'],
  blank: [],
};

/** Metal plate with engraved emblem; (x, y) is the top-left pixel. */
function plate(g: DrawCtx, L: Layer, x: number, y: number, w: number, h: number, part: Pen['part']): void {
  const hb = g.look.headband;
  const pen: Pen = { mat: g.m(hb.plate, 'metal'), part };
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const edgeTop = yy === 0;
      const edgeBottom = yy === h - 1;
      const shade = edgeTop ? 4 : edgeBottom ? 2 : xx === 0 ? 4 : 3;
      px(L, x + xx, y + yy, pen, shade);
    }
  }
  px(L, x + 1, y + 1, { ...pen, flags: F_NO_OUTLINE }, 5);
  const bmp = EMBLEM_BITMAPS[hb.emblem] || [];
  const bw = bmp[0]?.length || 0;
  const ox = x + Math.floor((w - bw) / 2);
  const oy = y + Math.floor((h - bmp.length) / 2);
  const engrave: Pen = { ...pen, flags: F_NO_OUTLINE };
  bmp.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === '#') px(L, ox + c, oy + r, engrave, 1);
  });
  if (hb.slashed) {
    line(L, v(x, y + h - 1), v(x + w - 1, y), { mat: g.m('#14161c', 'flat'), part, flags: F_NO_OUTLINE }, 3);
  }
}

function tails(g: DrawCtx, L: Layer, knot: Vec, pen: Pen, long: boolean): void {
  const sway = [0, 1, 1, 0][g.rig.frame % 4];
  const pose = g.rig.pose;
  const trail = pose === 'attack' || pose === 'hurt' || pose === 'charge' || pose === 'run' ? 3 : pose === 'walk' || pose === 'sneak' ? 1 : 0;
  const n = long ? 12 : 7;
  for (const [dy, len] of [
    [0, n],
    [2, n - 2],
  ] as const) {
    const a = v(knot.x, knot.y + dy);
    const mid = v(knot.x - 3 - trail, knot.y + dy + len * 0.45 + sway);
    const end = v(knot.x - 4 - trail * 2 - sway, knot.y + dy + len);
    capsule(L, a, mid, 1.3, 1.1, pen);
    capsule(L, mid, end, 1.1, 0.8, pen);
  }
}

export function drawHeadband(g: DrawCtx): void {
  const hb = g.look.headband;
  if (!hb || hb.position === 'none') return;
  const cloth = g.m(hb.cloth, 'cloth');

  if (hb.position === 'forehead') {
    if (g.has('hair', 'hair_helm')) return;
    const L = g.L('head.gear');
    const pen: Pen = { mat: cloth, part: 'head' };
    const hx = g.rig.head.x;
    const hy = g.rig.head.y;
    // Band follows the skull curve: rows -4..-3 from the back of the head to the brow.
    const pts: Vec[] = [hd(g, -7.4, -4.4), hd(g, 6.6, -4.8), hd(g, 6.8, -1.8), hd(g, -7.2, -1.6)];
    poly(L, pts, pen, (x) => (x < hx - 3 ? 4 : 3));
    plate(g, L, hx - 1, hy - 5, 6, 4, 'head');
    if (hb.tails) tails(g, g.L('hairBack'), hd(g, -7, -3), { mat: cloth, part: 'head' }, true);
    return;
  }

  if (hb.position === 'neck') {
    const r = g.rig;
    const L = g.L('neck');
    const pen: Pen = { mat: cloth, part: 'torso' };
    capsule(L, v(r.neck.x - 0.2, r.neck.y - 0.5), v(r.neck.x, r.neck.y - 2.5), g.bp.neckW + 1.6, g.bp.neckW + 1.4, pen);
    plate(g, L, Math.round(r.neck.x), Math.round(r.neck.y - 3), 5, 3, 'torso');
    if (hb.tails) tails(g, g.L('capeBack'), v(r.neck.x - g.bp.neckW - 1, r.neck.y - 1), pen, false);
    return;
  }

  if (hb.position === 'arm') {
    const L = g.L('nearArm.armor');
    const pen: Pen = { mat: cloth, part: 'upperArmN' };
    const a = armPoint(g, 'N', 0.45);
    const b = armPoint(g, 'N', 0.75);
    capsule(L, a, b, g.bp.armR[0] + 0.7, g.bp.armR[1] + 0.8, pen);
    const c = armPoint(g, 'N', 0.6);
    plate(g, L, Math.round(c.x) - 1, Math.round(c.y) - 1, 3, 3, 'upperArmN');
    if (hb.tails) tails(g, g.L('nearArm.over'), v(a.x - 1, a.y + 1), pen, false);
    return;
  }

  if (hb.position === 'waist') {
    const L = g.L('waist');
    const pen: Pen = { mat: cloth, part: 'torso' };
    fillTorso(g, L, 1.1, pen, { top: 4.4, bottom: 2.4 });
    const p = g.rig.T(g.bp.waistHalf * 0.2, 5.2);
    plate(g, L, Math.round(p.x), Math.round(p.y), 5, 3, 'torso');
    if (hb.tails) tails(g, g.L('waist'), g.rig.T(-g.bp.waistHalf - 0.5, 3.6), pen, false);
  }
}

