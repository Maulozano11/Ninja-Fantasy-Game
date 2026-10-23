// The bulky body, from the owner's bare broad man (docs/reference/bulky-base-owner-reference.jpg, 2026-10-21:
// "cuerpo fornido base sin camisa"): his body piece by piece (bulkyBaseArt.ts), each piece of his pixels
// riding one bone of our bulky rig, which stands on his joints. At rest every pixel of his body is where he
// drew it; in his skin colour every pixel is his; in any other pose each piece turns with its bone, and
// an edge of his that a pose bares is closed with his line (compose.ts).

import { hexToRgb, hslToHex, retintHex, rgbToHsl } from './color';
import { armDepth, armJoints, type Depth, DrawCtx, handDraw, handPose, legDepth, legJoints, Side } from './ctx';
import { BULKY_BASE, BULKY_BASE_BRIEFS, BULKY_BASE_KIND, BULKY_BASE_SKIN } from './bulkyBaseArt';
import { segAngle, stretchPiece, type PaintedPiece } from './painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, F_OWNER, F_SEAL, GRID, Layer, len, lerp, partIndex, PartId, RES, sub, Vec } from './raster';
import { drawRig, turnPoint, type Rig } from './rig';
import type { BodyType } from './types';
import { stampTemplate, type TemplatePalette } from './rotsprite';

/**
 * A colour of the owner's skin in the character's skin: the hue turned and the saturation scaled from his
 * skin (`from`), the lightness scaled so that his skin lands exactly on the character's, his shadows
 * staying as far below it and his lights as far above. In his own skin, his colour; his black line stays.
 */
export function ownerSkin(hex: string, from: string, to: string): string {
  if (to.toLowerCase() === from.toLowerCase() || hex.toLowerCase() === '#000000') return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(from));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(to));
  const lt = l <= l0 ? (l * l1) / l0 : l1 + ((l - l0) * (1 - l1)) / (1 - l0);
  return hslToHex(h + (h1 - h0), Math.min(1, (s * s1) / Math.max(0.01, s0)), lt);
}

/** How much of the upper arm's turn a shoulder cap follows (his broad shoulder sits mostly on the torso). */
const CAP_FOLLOW = 0.3;

const IDLE = new Map<BodyType, Rig>();
const idleOf = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

/**
 * Where an owner's shoulder cap goes (a sleeve over the shoulder) and how it turns: it rides halfway
 * between the shoulder joint and where the shoulder sits on the chest at rest (carried with the torso), and
 * turns with the torso and part of the way the upper arm turns past it, as the owner's pauldrons do. At
 * rest it is where he drew it.
 */
export function capPlace(r: Rig, s: Side, p: PaintedPiece): { at: Vec; deg: number } {
  const idle = idleOf(r.body);
  const torso = segAngle(r.pelvis, r.neck);
  const torso0 = segAngle(idle.pelvis, idle.neck);
  const sh = s === 'N' ? r.shoulderN : r.shoulderF;
  const sh0 = s === 'N' ? idle.shoulderN : idle.shoulderF;
  const onChest = turnPoint(add(r.neck, sub(sh0, idle.neck)), r.neck, torso - torso0);
  const arm = segAngle(sh, s === 'N' ? r.elbowN : r.elbowF);
  const rest = p.angle - torso0;
  return { at: lerp(sh, onChest, 0.5), deg: torso + rest + CAP_FOLLOW * (((arm - torso - rest + 540) % 360) - 180) };
}

/** Past this lean (degrees from his picture) a piece riding the torso is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

const FLAGS = F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER;

/** His piece with its pivot on `at`, its bone pointing along `deg` (at his angle, every pixel his). */
function onBone(L: Layer, p: PaintedPiece, at: Vec, deg: number, pal: TemplatePalette, part: PartId): void {
  stampTemplate(L, p, at, deg - p.angle, pal, part, { flags: FLAGS, seal: p.seal ? { rows: p.seal, flag: F_SEAL } : undefined });
}

/** His piece riding the torso: a small lean shears it (each row moved across whole), a large one turns it. */
function onTorso(L: Layer, p: PaintedPiece, at: Vec, deg: number, pal: TemplatePalette, part: PartId): void {
  const d = deg - p.angle;
  if (Math.abs(d) > LEAN_SHEAR) {
    onBone(L, p, at, deg, pal, part);
    return;
  }
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  const s = Math.sin((d * Math.PI) / 180);
  p.rows.forEach((row, j) => {
    const dx = -Math.round((j - p.pivot[1]) * s);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j, pal[row[i]][0], 3, part, FLAGS | (p.seal?.[j]?.[i] === 'x' ? F_SEAL : 0));
  });
}

/** The boxer briefs' colour: the briefs item's slot when it is worn, his own grey otherwise. */
function briefsColour(g: DrawCtx): string {
  const b = g.look.slots.bottom;
  return b?.id === 'bottom_boxer_briefs' && b.colors?.[0] ? b.colors[0] : BULKY_BASE_BRIEFS;
}

/**
 * The owner's bare broad man on our bulky rig: the far arm, the far leg, the pelvis, the near leg, the
 * chest, the near arm, each piece on its bone. The pelvis (his briefs' waistband and seat) lies under the
 * near leg, so a raised near knee comes in front of his belly and briefs; it is drawn on the near leg's
 * layer, first, and clothes take it away there as on the torso's. His fists close the hands when they hang, grip or make a fist; an open,
 * pointing or cradling hand is our hand picture on his wrist, in his skin.
 */
export function drawBulkyBase(g: DrawCtx): void {
  const r = g.rig;
  const briefs = briefsColour(g);
  const pal = (p: PaintedPiece): TemplatePalette => {
    const out: TemplatePalette = {};
    for (const [ch, hex] of Object.entries(p.colors)) {
      const k = BULKY_BASE_KIND[hex];
      const c = k === 'line' ? hex : k === 'cloth' ? retintHex(hex, BULKY_BASE_BRIEFS, briefs) : ownerSkin(hex, BULKY_BASE_SKIN, g.look.skin);
      out[ch] = [g.m(c, 'flat'), 3];
    }
    return out;
  };
  const B = BULKY_BASE;
  const arm = (s: Side) => {
    const L = g.L(armDepth(s, 'body'));
    const j = armJoints(r, s);
    const up = s === 'N' ? B.upperArmN : B.upperArmF;
    const fore = s === 'N' ? B.forearmN : B.forearmF;
    const hand = s === 'N' ? B.handN : B.handF;
    onBone(L, up, j.shoulder, segAngle(j.shoulder, j.elbow), pal(up), s === 'N' ? 'upperArmN' : 'upperArmF');
    onBone(L, fore, j.elbow, segAngle(j.elbow, j.wrist), pal(fore), s === 'N' ? 'forearmN' : 'forearmF');
    const { kind } = handPose(g, s);
    if (kind === 'grip' || kind === 'fist' || kind === 'relaxed') {
      onBone(L, hand, j.wrist, segAngle(j.elbow, j.wrist), pal(hand), s === 'N' ? 'handN' : 'handF');
    } else {
      handDraw(g, L, s, { mat: g.skin, part: s === 'N' ? 'handN' : 'handF', bias: s === 'F' ? -1 : 0 });
    }
  };
  const leg = (s: Side) => {
    const L = g.L(legDepth(s, 'body'));
    const { hip, knee, ankle } = legJoints(r, s);
    const thigh = s === 'N' ? B.thighN : B.thighF;
    const shin = s === 'N' ? B.shinN : B.shinF;
    const foot = s === 'N' ? B.footN : B.footF;
    // A seated leg longer than the body's (rig.ts kneeLegScaled): his thigh and shin lengthened with it,
    // rows of his repeated between the joints (stretchPiece), so they still meet at the knee.
    const long = stretchPiece(thigh, (len(sub(knee, hip)) - r.bp.thigh) * RES, r.bp.thigh * RES);
    const lower = stretchPiece(shin, (len(sub(ankle, knee)) - r.bp.shin) * RES, r.bp.shin * RES);
    onBone(L, long, hip, segAngle(hip, knee), pal(long), s === 'N' ? 'thighN' : 'thighF');
    onBone(L, lower, knee, segAngle(knee, ankle), pal(lower), s === 'N' ? 'shinN' : 'shinF');
    onBone(L, foot, ankle, foot.angle, pal(foot), s === 'N' ? 'footN' : 'footF');
  };
  const lean = segAngle(r.pelvis, r.neck);
  arm('F');
  leg('F');
  onTorso(g.L(legDepth('N', 'body')), B.pelvis, r.pelvis, lean, pal(B.pelvis), 'torso');
  leg('N');
  onTorso(g.L('torso.body'), B.chest, r.neck, lean, pal(B.chest), 'torso');
  arm('N');
  if (r.neckPitch !== undefined) g.after((layers) => closeNape(g, layers, neckShadow(g), 3));
  if (r.pose === 'throw') g.after((layers) => closeArmSlits(g, layers, 'N'));
}

/**
 * Throwing, a slit of background into his arm (its turned pieces' edge stepping in, as under the near elbow
 * raised in the coil: the owner on Solen's throw, "ahi tienes unos pixeles muertos"): a background pixel his
 * arm closes on three sides is filled, until none is left; filled on the outside it is his line, inside his
 * skin beside it.
 */
function closeArmSlits(g: DrawCtx, layers: ReadonlyMap<Depth, Layer>, s: Side): void {
  const L = layers.get(armDepth(s, 'body'));
  if (!L) return;
  const all = [...layers.values()];
  const bare = (i: number) => all.every((l) => l.mat[i] < 0);
  const parts = new Set([partIndex(s === 'N' ? 'upperArmN' : 'upperArmF'), partIndex(s === 'N' ? 'forearmN' : 'forearmF')]);
  // (his arm and what lies on it, a sleeve or a bracer: the topmost of them there)
  const armAt = (i: number) => {
    let top: Layer | undefined;
    for (const l of all) if (l.mat[i] >= 0) top = l;
    return top && parts.has(top.part[i]) ? top : undefined;
  };
  const lines = new Set(Object.entries(BULKY_BASE_KIND).filter(([, k]) => k === 'line').map(([hex]) => g.m(hex, 'flat')));
  const line = g.m('#000000', 'flat');
  const filled = new Set<number>();
  for (let pass = 0; pass < 4; pass++) {
    const next: number[] = [];
    for (let i = GRID + 1; i < GRID * (GRID - 1) - 1; i++) {
      if (!bare(i) || filled.has(i)) continue;
      if ([i - 1, i + 1, i - GRID, i + GRID].filter((q) => armAt(q) || filled.has(q)).length >= 3) next.push(i);
    }
    if (!next.length) break;
    for (const i of next) {
      const nb = [i - 1, i + 1, i - GRID, i + GRID].filter((q) => armAt(q));
      const q = nb.find((k) => !lines.has(armAt(k)!.mat[k])) ?? nb[0];
      const from = q === undefined ? L : armAt(q)!;
      const k = q ?? [i - 1, i + 1, i - GRID, i + GRID].find((n) => filled.has(n))!;
      L.mat[i] = from.mat[k];
      L.shade[i] = from.shade[k];
      L.part[i] = from.part[k];
      L.flags[i] = from.flags[k];
      filled.add(i);
    }
  }
  // his line along the outside of what was filled, and not inside it
  for (const i of filled) {
    const out = [i - 1, i + 1, i - GRID, i + GRID].some((q) => bare(q));
    if (out) L.mat[i] = line;
  }
}

/** The most background a gap behind the nape may hold to be closed (fine px): a gap, not the space under an arm. */
const NAPE_GAP = 10;

/** His skin in the shadow of his neck: the chest piece's darkest skin, in the character's skin. */
function neckShadow(g: DrawCtx): number {
  const skins = Object.values(BULKY_BASE.chest.colors).filter((hex) => BULKY_BASE_KIND[hex] === 'skin');
  const lum = (hex: string) => hexToRgb(hex).reduce((a, c, k) => a + c * [0.299, 0.587, 0.114][k], 0);
  return g.m(ownerSkin(skins.reduce((a, b) => (lum(b) < lum(a) ? b : a)), BULKY_BASE_SKIN, g.look.skin), 'flat');
}

/**
 * With the head turned forward on the neck (the throw's release, Rig.neckPitch) the back of the head comes
 * down over the collar, and between the hair, the collar and the shoulder a few pixels of background were
 * walled in behind the nape (the owner on Solen's throw: "el problema del cuello"). Each such gap beside the
 * head is closed with the skin in the shadow of the neck (`mat` at `shade`), so the nape reads as a neck under
 * the hair. On every body (body.ts for the others).
 */
export function closeNape(g: DrawCtx, layers: ReadonlyMap<Depth, Layer>, mat: number, shade: number): void {
  const all = [...layers.values()];
  const L = layers.get('torso.body');
  if (!L) return;
  const bare = (i: number) => all.every((l) => l.mat[i] < 0);
  const head = partIndex('head');
  const isHead = (i: number) => all.some((l) => l.mat[i] >= 0 && l.part[i] === head);
  const nx = Math.floor(g.rig.neck.x * RES);
  const ny = Math.floor(g.rig.neck.y * RES);
  const R = 16;
  const seen = new Set<number>();
  for (let y = ny - R; y <= ny + R; y++)
    for (let x = nx - R; x <= nx + R; x++) {
      const i0 = y * GRID + x;
      if (x < 1 || y < 1 || x >= GRID - 1 || y >= GRID - 1 || seen.has(i0) || !bare(i0)) continue;
      // the gap: all the background reached from here (within the window round the neck; reaching its edge, open)
      const gap = [i0];
      seen.add(i0);
      let open = false;
      for (let k = 0; k < gap.length; k++) {
        const i = gap[k];
        for (const q of [i - 1, i + 1, i - GRID, i + GRID]) {
          const qx = q % GRID;
          const qy = (q / GRID) | 0;
          if (Math.abs(qx - nx) > R || Math.abs(qy - ny) > R || qx < 1 || qy < 1 || qx >= GRID - 1 || qy >= GRID - 1) {
            open = true;
            continue;
          }
          if (!seen.has(q) && bare(q)) {
            seen.add(q);
            gap.push(q);
          }
        }
      }
      if (open) continue;
      if (gap.length > NAPE_GAP || !gap.some((i) => [i - 1, i + 1, i - GRID, i + GRID].some(isHead))) continue;
      for (const i of gap) L.set(i % GRID, (i / GRID) | 0, mat, shade, 'torso', F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER);
    }
}
