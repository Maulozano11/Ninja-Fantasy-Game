// Shinobi headband: a plain cloth band, optionally with long cloth tails.
// Can be worn on the forehead, neck, near arm or waist. No metal plate and no
// emblem: the owner, 2026-10-22, "deja la pura bandana la pura tela".

import { armPoint, DrawCtx, fillTorso } from '../ctx';
import { capsule, Layer, Pen, poly, v, Vec } from '../raster';
import { hd } from './hairkit';

function tails(g: DrawCtx, L: Layer, knot: Vec, pen: Pen, long: boolean): void {
  const sway = [0, 1, 1, 0][g.rig.frame % 4];
  const pose = g.rig.pose;
  const trail =
    pose === 'attack' || pose === 'throw' || pose === 'pierce' || pose === 'hurt' || pose === 'charge' || pose === 'run'
      ? 3
      : pose === 'train' || pose === 'trainPole' || pose === 'trainFist'
        ? 2
        : pose === 'walk' || pose === 'sneak'
          ? 1
          : 0;
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
    // Band follows the skull curve: rows -4..-3 from the back of the head to the brow.
    const pts: Vec[] = [hd(g, -7.4, -4.4), hd(g, 6.6, -4.8), hd(g, 6.8, -1.8), hd(g, -7.2, -1.6)];
    poly(L, pts, pen, (x) => (x < hx - 3 ? 4 : 3));
    if (hb.tails) tails(g, g.L('hairBack'), hd(g, -7, -3), { mat: cloth, part: 'head' }, true);
    return;
  }

  if (hb.position === 'neck') {
    const r = g.rig;
    const L = g.L('neck');
    const pen: Pen = { mat: cloth, part: 'torso' };
    capsule(L, v(r.neck.x - 0.2, r.neck.y - 0.5), v(r.neck.x, r.neck.y - 2.5), g.bp.neckW + 1.6, g.bp.neckW + 1.4, pen);
    if (hb.tails) tails(g, g.L('capeBack'), v(r.neck.x - g.bp.neckW - 1, r.neck.y - 1), pen, false);
    return;
  }

  if (hb.position === 'arm') {
    const L = g.L('nearArm.armor');
    const pen: Pen = { mat: cloth, part: 'upperArmN' };
    const a = armPoint(g, 'N', 0.45);
    const b = armPoint(g, 'N', 0.75);
    capsule(L, a, b, g.bp.armR[0] + 0.7, g.bp.armR[1] + 0.8, pen);
    if (hb.tails) tails(g, g.L('nearArm.over'), v(a.x - 1, a.y + 1), pen, false);
    return;
  }

  if (hb.position === 'waist') {
    const L = g.L('waist');
    const pen: Pen = { mat: cloth, part: 'torso' };
    fillTorso(g, L, 1.1, pen, { top: 4.4, bottom: 2.4 });
    if (hb.tails) tails(g, g.L('waist'), g.rig.T(-g.bp.waistHalf - 0.5, 3.6), pen, false);
  }
}

