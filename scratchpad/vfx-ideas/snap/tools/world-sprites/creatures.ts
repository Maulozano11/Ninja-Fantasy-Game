// Creatures for the battle maps. First: the HYDRA, boss of the first mission.
//
//   npx tsx tools/world-sprites/creatures.ts [previewDir]
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/creatures.ts [previewDir]   (art waiting for approval)
//
// The hydra is a rig of separate sprites so the battle engine can cut heads off one by one:
// hydra_body (coiled serpent body, two clawed legs, curling tail), seven hydra_neck_N (one neck with
// its head each), hydra_stump (what is left after a cut, raw or burnt shut), hydra_venom (the spat
// gob) and hydra_splash (where it lands). creatures/hydra.json says where every neck joins the body,
// whether it is drawn behind or in front of it, and where its head and mouth are.
//
// Everything is modelled like the landmarks: meshes rasterised with the battle camera (57 px per
// meter across and up, 38 px per meter of depth), Lambert light from the upper left with cast
// shadows, the kit's clustered band() picking ramp steps, crests on lit edges and dark inner lines
// where parts overlap (creatures-mesh.ts). Necks, tail and legs are tubes along curves with a
// tapering radius; the skin carries scale rows (overlapping arcs), golden belly plates on the inner
// side and golden spikes along the top, all anchored to the surface so they ride along when a neck
// moves. Heads are faceted skulls with a hinged jaw, a purple mouth, white teeth and glowing eyes.
// Glows (eyes, venom) are translucent halos without outline, like fire.
//
// Besides the sheets and manifest the script writes creatures/hydra.json (the rig) next to the
// manifest, prints measurable checks (canvas sizes, loop seams, rooted bases, value budget) and,
// through creatures-assemble.ts, reads everything back from disk to build the proof pictures
// (hydra-assembled.png, hydra-anims*.png, hydra-sever.png, hydra-states.png, hydra-zoom-*.png) in
// the preview directory.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Anim, Canvas, Color, MATERIALS, PX_PER_M, WorldSprite, hash, hex, m, mix, noise, preview, previewDir, ramp, toHex, withAlpha, writeGroup } from './kit';
import { Attr, C, Frame, K, Mesh, PixelInfo, Scene, TAU, Tri, V2, V3, add, bez, catmull, clamp, cone, cross, disk, dot, len, lerp, lerp3, loft, mul, pal, render, resample, resetGroups, rotXH, smoothstep, sub, transform, tube, unit } from './creatures-mesh';
import { deliverables } from './creatures-assemble';

// --- palettes -------------------------------------------------------------------------------

const blend = (a: string, b: string, t: number): string => toHex(mix(hex(a), hex(b), t));

const R = {
  // Deep teal-green scales: the shared deep leaf green pulled toward water (shadows drift blue,
  // lights drift olive like the owner's reference).
  scale: ramp('#33705c', { shift: 18, spread: 0.85 }),
  // Golden-ochre horn: spikes, horns, claws (rope straw warmed by fire, darkened by old wood).
  gold: ramp(blend(blend(MATERIALS.rope, MATERIALS.fire, 0.3), MATERIALS.woodDark, 0.16), { shift: 12 }),
  // Belly plates: the gold pulled toward the leaf green (olive ochre).
  belly: ramp(blend(blend(blend(MATERIALS.rope, MATERIALS.fire, 0.3), MATERIALS.woodDark, 0.24), MATERIALS.leaf, 0.42), { shift: 12, spread: 0.85 }),
  // Purple-pink mouth (a saturated accent: it means "this bites").
  mouth: ramp('#8e3f74', { shift: 10, spread: 0.9 }),
  teeth: ramp(MATERIALS.paper, { shift: 8 }),
  charred: ramp(MATERIALS.charred, { shift: 8 }),
  fire: ramp(MATERIALS.fire),
};
/** Venom and eye glow, dark to white-hot (not a lit material: it emits). */
const VENOM: Color[] = ['#0d2b1c', '#1f6b3c', '#2fa652', '#55de65', '#9cf56a', '#e5ff9a'].map((c) => hex(c));

const P = {
  scale: pal(R.scale),
  gold: pal(R.gold),
  belly: pal(R.belly),
  mouth: pal(R.mouth),
  teeth: pal(R.teeth),
  charred: pal(R.charred),
  venom: pal(VENOM),
};

// --- shared skin patterns ---------------------------------------------------------------------

/** Angle around a tube from its attributes (0 = belly, +-PI = spine). */
const angOf = (at: Attr): number => Math.atan2(at[2], at[1]);

/**
 * Overlapping scales (roof tiles whose rounded free edge points toward the base of the tube) in
 * surface coordinates (s along the tube, c around it): -1 in the 1 px shadow under a scale's free
 * edge, +1 on the raised edge just above it (a short lit arc), 0 elsewhere. Odd rows are offset by
 * half a scale.
 */
function scaleMark(s: number, c: number, row: number, wid: number): number {
  const k = Math.floor(s / row);
  const fs = s / row - k; // 0 at the free edge's lowest point .. 1 at the root
  const off = k & 1 ? 0.5 : 0;
  const fc = c / wid - off;
  const u = fc - Math.round(fc); // -0.5 .. 0.5 across the scale
  const edge = 0.06 + 1.9 * u * u; // a U: lowest mid-scale, rising to the sides
  if (fs < edge) return edge - fs < 1 / row ? -1 : 0;
  if (fs - edge < 1.5 / row && Math.abs(u) < 0.28) return 1;
  return 0;
}

interface SkinOpts {
  /** Scale row spacing and width (px). */
  row: number;
  wid: number;
  /** Belly plate spacing (px) and half-width of the belly band (radians); 0 = no plates. */
  plate: number;
  bellyHalf: number;
  /** s range of the belly plates (they stop short of the body joint and of a rounded end). */
  plateFrom?: number;
  plateTo?: number;
  /** Extra darkening (far limbs, back coils). */
  dark?: number;
  /** Steps added to the plates (big lit bellies). */
  plateLift?: number;
}

/** Tube skin: scale rows on the back and sides, golden belly plates along the ventral band. */
function skinShade(o: SkinOpts) {
  return (px: PixelInfo, st: number): number | [number, number] => {
    const at = px.at;
    const a = angOf(at);
    const s = at[0], r = at[3];
    const lit = px.light > 0.45;
    if (o.plate > 0 && Math.abs(a) < o.bellyHalf && s >= (o.plateFrom ?? -Infinity) && s <= (o.plateTo ?? Infinity)) {
      // Belly plates: lit top rim, darker lower half, a dark seam to the next plate (still readable in shadow).
      const fs = (((s % o.plate) + o.plate) % o.plate) / o.plate;
      let b = Math.max(2, st + (o.plateLift ?? 0));
      if (fs < 1.15 / o.plate) b = 1;
      else if (fs < 0.45) b = b - 1;
      else if (fs > 1 - 1.2 / o.plate && px.light > 0.3) b = b + 1;
      // The band's edge: a dark line where the plates meet the scales.
      if (Math.abs(a) > o.bellyHalf - 0.1) b = 1;
      return [P.belly, clamp(b - (o.dark ?? 0), 1, 4)];
    }
    // Scales show on the lit side only; the shadow side stays as calm clustered bands.
    if (px.light < 0.4) return clamp(st - (o.dark ?? 0), 1, 4);
    const mk = scaleMark(s, a * r, o.row, o.wid);
    let b = st;
    if (mk < 0) b = st - 1;
    else if (mk > 0 && lit) b = st + 1;
    return clamp(b - (o.dark ?? 0), 1, 4);
  };
}

// --- head -----------------------------------------------------------------------------------

// Head-local coordinates: x forward (toward the snout), h up, d depth (+ away from the viewer).
// Origin = the neck socket. About 59 px (1.03 m) from the back of the skull to the snout tip.
type Prof = [number, number, number, number]; // x, top, bottom, half width
const SKULL: Prof[] = [
  [-8, 3, -4, 4.5],
  [-5, 8.5, -7, 8],
  [0, 11.5, -8, 9.5],
  [6, 12.5, -7, 10],
  [12, 11.5, -5.5, 9.5],
  [18, 9.8, -4.8, 8.6],
  [24, 7.6, -4.3, 7],
  [31, 6.4, -4, 6],
  [38, 5.7, -3.6, 5.3],
  [44, 5.6, -3.2, 4.8],
  [48, 4.4, -2.8, 3.8],
];
const SKULL_TIP: V3 = [51, 1, 0];
const JAW: Prof[] = [
  [-3, -3.5, -9.5, 7],
  [4, -4, -11.5, 8],
  [12, -4.5, -11, 7.5],
  [20, -4.5, -9.8, 6.4],
  [29, -4.2, -8.8, 5.5],
  [38, -3.8, -8, 4.8],
  [45, -3.4, -7.2, 4.2],
];
const JAW_TIP: V3 = [49, -4.6, 0];
const HINGE: V3 = [2, -5, 0];
/** Head center (the engine aims at it) and the mouth tip (venom starts there), head-local. */
const HEAD_CENTER: V3 = [20, 1, 0];

function profAt(tab: Prof[], x: number): [number, number, number] {
  if (x <= tab[0][0]) return [tab[0][1], tab[0][2], tab[0][3]];
  for (let i = 0; i + 1 < tab.length; i++) {
    const a = tab[i], b = tab[i + 1];
    if (x <= b[0]) {
      const t = (x - a[0]) / (b[0] - a[0]);
      return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
    }
  }
  const l = tab[tab.length - 1];
  return [l[1], l[2], l[3]];
}

/** A superellipse ring across the head at x; `brow` bulges the upper sides (brow ridge). */
function headRing(x: number, top: number, bot: number, w: number, n: number, brow: number, e = 0.72): V3[] {
  const hc = (top + bot) / 2, hr = (top - bot) / 2;
  const pts: V3[] = [];
  for (let j = 0; j < n; j++) {
    const a = (j / n) * TAU + Math.PI / n;
    const ca = Math.cos(a), sa = Math.sin(a);
    let d = w * Math.sign(ca) * Math.abs(ca) ** e;
    let h = hc + hr * Math.sign(sa) * Math.abs(sa) ** e;
    if (sa > 0.1 && brow > 0) {
      d *= 1 + brow * 0.16 * sa;
      h += brow * 1.3 * sa * Math.abs(ca);
    }
    pts.push([x, h, d]);
  }
  return pts;
}

interface HeadPose {
  /** Neck socket in the sprite's world space (relative to the neck anchor). */
  O: V3;
  /** Head angle: 0 faces right, positive lifts the snout. */
  th: number;
  /** Jaw opening (radians). */
  jaw: number;
  /** Eye: 1 open and glowing, 0 squeezed shut / dead. */
  eye?: number;
  /** Venom glowing in the mouth (0..1). */
  venom?: number;
  /** Fresh regrown skin, wet and glossy (0..1). */
  fresh?: number;
  /** Head scale (a regrowing head starts small). */
  hs?: number;
  /** Turned 180 degrees about the vertical (a severed head lying the other way); th then counts from facing left. */
  flip?: boolean;
}

interface HeadInfo {
  skull: Mesh;
  jaw: Mesh;
  mouth: Mesh;
  /** Head-local to world. */
  hw: (p: V3) => V3;
  /** Jaw-local to world. */
  jw: (p: V3) => V3;
}

const HEAD_SIDES = 10;
const tagAt = (tris: Tri[], k: number): Tri[] => tris.map((t) => ({ ...t, at: t.v.map((p) => [p[0], p[1], p[2], k] as Attr) as [Attr, Attr, Attr] }));

/** Adds the head meshes (skull, hinged jaw, mouth, horns, crest and cheek spikes) to the scene. */
function buildHead(sc: Scene, hp: HeadPose, seed: number, dark = 0): HeadInfo {
  const hs = hp.hs ?? 1;
  // A flipped head is the same head turned half way round the vertical axis (x and depth mirrored).
  const M = (v: V3): V3 => (hp.flip ? [-v[0], v[1], -v[2]] : v);
  const hw = (p: V3): V3 => add(hp.O, M(rotXH(mul(p, hs), hp.th)));
  const toJaw = (p: V3): V3 => rotXH(p, -hp.jaw, HINGE);
  const jw = (p: V3): V3 => hw(toJaw(p));
  const rotN = (a: number) => (n: V3): V3 => M(rotXH(n, a));
  const anchorHead = (at: Attr): V2 => [at[0], -at[1] - at[2] * 0.4];
  const fresh = hp.fresh ?? 0;
  const wet = (px: PixelInfo, st: number): number => (fresh > 0.3 && px.light > 0.62 ? st + 1 : st);
  // Skull: faceted rings, brow ridge over the eyes.
  const sRings: V3[][] = [];
  const sAttrs: Attr[][] = [];
  for (const [x, top, bot, w] of SKULL) {
    const brow = x >= 4 && x <= 22 ? 1 - Math.abs(x - 13) / 10 : 0;
    const ring = headRing(x, top, bot, w, HEAD_SIDES, brow);
    sRings.push(ring);
    sAttrs.push(ring.map((p) => [p[0], p[1], p[2], 0] as Attr));
  }
  const skullT = transform(loft(sRings, { attrs: sAttrs, capStart: [-10, 0, 0], capEnd: SKULL_TIP, apexAttr: [[-10, 0, 0, 0], [SKULL_TIP[0], SKULL_TIP[1], 0, 0]] }), hw, rotN(hp.th));
  const skull = sc.add(skullT, {
    pal: P.scale,
    seed,
    contrast: 1.15,
    facetVar: 0.06,
    anchor: anchorHead,
    dark,
    shade: (px, st) => {
      const [x, h] = px.at;
      // Plate seams across the top of the snout.
      if (px.n[1] > 0.2 && x > 22 && x < 46 && Math.abs(((x + 2) % 7) - 3.5) < 0.5 && h > 2) return st - 1;
      return wet(px, st);
    },
  });
  // Jaw: hinged under the skull.
  const jRings: V3[][] = [];
  const jAttrs: Attr[][] = [];
  for (const [x, top, bot, w] of JAW) {
    const ring = headRing(x, top, bot, w, HEAD_SIDES, 0, 0.8);
    jRings.push(ring);
    jAttrs.push(ring.map((p) => [p[0], p[1], p[2], 1] as Attr));
  }
  const jawT = transform(loft(jRings, { attrs: jAttrs, capStart: [-5, -6.5, 0], capEnd: JAW_TIP, apexAttr: [[-5, -6.5, 0, 1], [JAW_TIP[0], JAW_TIP[1], 0, 1]] }), jw, rotN(hp.th - hp.jaw));
  const jaw = sc.add(jawT, {
    pal: P.scale,
    seed: seed + 1,
    contrast: 1.15,
    facetVar: 0.06,
    anchor: anchorHead,
    dark,
    shade: (px, st) => {
      const nl = rotXH(M(px.n), -(hp.th - hp.jaw));
      const [x, h] = px.at;
      // The top of the jaw is the floor of the mouth (gums), seen from above when it opens.
      if (nl[1] > 0.5 && h > -6) return [P.mouth, clamp(x < 12 ? 1 : st - 1, 1, 3)];
      // Throat: pale plates under the chin.
      if (nl[1] < -0.55 && x > 2 && x < 40) return [P.belly, clamp(Math.abs(((x + 40) % 5) - 2.5) < 0.6 ? 1 : st, 1, 3)];
      return wet(px, st);
    },
  });
  // Mouth: a membrane behind the jaws (throat, inner cheeks) so the gap reads purple, not empty.
  const mTris: Tri[] = [];
  const NM = 12;
  const back = hp.flip ? -1 : 1;
  const mPts = (x: number): [V3, V3] => {
    const [, sb] = profAt(SKULL, x);
    const [jt] = profAt(JAW, x);
    return [[x, sb + 1.2, 1.5 * back], toJaw([x, jt - 1.2, 1.5 * back])];
  };
  for (let k = 0; k < NM; k++) {
    const x0 = 3 + (k / NM) * 43, x1 = 3 + ((k + 1) / NM) * 43;
    const [u0, l0] = mPts(x0), [u1, l1] = mPts(x1);
    const nn: V3 = M(rotXH([0, 0, -back], hp.th));
    const A = (p: V3): Attr => [p[0], p[1], 1.5, 2];
    const g = 9000 + k;
    mTris.push({ v: [hw(u0), hw(u1), hw(l1)], vn: [nn, nn, nn], n: nn, group: g, at: [A(u0), A(u1), A(l1)] });
    mTris.push({ v: [hw(u0), hw(l1), hw(l0)], vn: [nn, nn, nn], n: nn, group: g, at: [A(u0), A(l1), A(l0)] });
  }
  const mouth = sc.add(mTris, {
    pal: P.mouth,
    seed: seed + 2,
    crest: false,
    castShadow: false,
    anchor: (at) => [at[0], -at[1]],
    shade: (px, st) => {
      const x = px.at[0];
      // Deep in the throat it is dark; toward the front the cheeks catch light.
      const depthStep = x < 10 ? 1 : x < 20 ? 2 : 3;
      return clamp(Math.min(st + 1, depthStep + (px.lit ? 0 : -1)), 1, 3);
    },
  });
  // Crown: a big near horn sweeping back along the skull, a far horn rising higher behind it, and
  // a fan of smaller spikes down the back of the head (the reference's golden frill).
  const goldOpts = (sd: number) => ({ pal: P.gold, seed: sd, contrast: 1.2, facetVar: 0.05, anchor: anchorHead, dark, steps: [1, 2, 3, 4] });
  const horn = (pts0: V3[], r0: number, sd: number) => {
    const { pts } = resample(catmull(pts0, 4), 10);
    const rr = pts.map((_, i) => lerp(r0, 0.45, (i / (pts.length - 1)) ** 0.85));
    sc.add(transform(tagAt(tube(pts, rr, { n: 6, faceted: true, rot: 0.4, ventral: () => [0, -1, 0] }), 3), hw, rotN(hp.th)), goldOpts(seed + sd));
  };
  horn([[4, 10, 5], [-6, 16, 6], [-15, 22, 6.5], [-20, 29, 6.5]], 3.4, 32);
  horn([[3, 9.5, -5], [-8, 12.5, -6], [-19, 14, -6.6], [-29, 18.5, -6.8]], 3.8, 31);
  const spikes: [V3, V3, number][] = [
    [[-4, 6, 0], [-17, 6, 0.5], 3],
    [[-6, 0, 0], [-17, -3, 0.5], 2.8],
    [[-4, -5, 0], [-12, -10, 0.5], 2.4],
  ];
  spikes.forEach(([b0, t, r], k) => sc.add(transform(tagAt(cone(b0, t, r, 5, { rot: 0.3 }), 4), hw, rotN(hp.th)), goldOpts(seed + 40 + k)));
  sc.add(transform(tagAt(cone([-1, -9, -3], [-12, -15, -4], 2.8, 5, { rot: 0.2 }), 5), jw, rotN(hp.th - hp.jaw)), goldOpts(seed + 45));
  return { skull, jaw, mouth, hw, jw };
}

/** Upper teeth along the snout (head-local x) and lower teeth along the jaw (jaw-local x), with lengths. */
const UPPER_TEETH: [number, number][] = [[18, 2.5], [22, 3], [26, 3.5], [30, 3], [34, 5], [38, 3.5], [42, 3], [46, 4.5]];
const LOWER_TEETH: [number, number][] = [[16, 2.5], [20, 3], [24, 3], [28, 3.5], [32, 3], [36, 4.5], [40, 3], [44, 3.5]];

interface HeadMarks {
  /** Screen position of the eye (glow), or null when shut. */
  eye: V2 | null;
  /** Mouth tip and throat (venom glow), screen. */
  mouth: V2;
  throat: V2;
}

/** Paints teeth, eye, brow, nostril and the venom glow in the mouth onto a rendered frame (before compose). */
function paintHead(f: Frame, hp: HeadPose, hi: HeadInfo): HeadMarks {
  const hs = hp.hs ?? 1;
  const proj = (p: V3): V2 => f.proj(p);
  // Teeth: little cream triangles hanging from the lip lines into the mouth.
  // The visible side is local -d, or +d on a flipped head.
  const ns = hp.flip ? -1 : 1;
  const dirOf = (a: V3, b: V3): V2 => {
    const pa = proj(a), pb = proj(b);
    const l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    return [(pb[0] - pa[0]) / l, (pb[1] - pa[1]) / l];
  };
  const down = dirOf(hi.hw([30, 0, 0]), hi.hw([30, -1, 0])); // screen direction of head-local "down"
  const upJ = dirOf(hi.jw([30, 0, 0]), hi.jw([30, 1, 0])); // screen direction of jaw-local "up"
  const tooth = (base: V2, dir: V2, L: number) => {
    const tan: V2 = [-dir[1], dir[0]];
    const tip: V2 = [base[0] + dir[0] * L, base[1] + dir[1] * L];
    const hwid = 1.3 * Math.max(0.6, hs);
    const a: V2 = [base[0] - tan[0] * hwid, base[1] - tan[1] * hwid];
    const b: V2 = [base[0] + tan[0] * hwid, base[1] + tan[1] * hwid];
    const x0 = Math.floor(Math.min(a[0], b[0], tip[0])), x1 = Math.ceil(Math.max(a[0], b[0], tip[0]));
    const y0 = Math.floor(Math.min(a[1], b[1], tip[1])), y1 = Math.ceil(Math.max(a[1], b[1], tip[1]));
    const area = (b[0] - a[0]) * (tip[1] - a[1]) - (tip[0] - a[0]) * (b[1] - a[1]);
    if (Math.abs(area) < 1e-6) return;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((b[0] - px) * (tip[1] - py) - (tip[0] - px) * (b[1] - py)) / area;
        const w1 = ((tip[0] - px) * (a[1] - py) - (a[0] - px) * (tip[1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -0.08 || w1 < -0.08 || w2 < -0.08) continue;
        const i = f.idx(x, y);
        if (i < 0) continue;
        // Lit on the side toward the light, shadowed on the other side.
        const side = (px - base[0]) * tan[0] + (py - base[1]) * tan[1];
        const st = w2 > 0.55 ? 3 : side < -0.2 ? 5 : side > 0.5 ? 3 : 4;
        f.over[i] = C(P.teeth, st);
      }
  };
  if (hs > 0.78) {
    for (const [x, L] of UPPER_TEETH) {
      const [, sb, w] = profAt(SKULL, x);
      tooth(proj(hi.hw([x, sb + 0.9, -w * 0.72 * ns])), down, L * hs);
    }
    for (const [x, L] of LOWER_TEETH) {
      const [jt, , w] = profAt(JAW, x);
      tooth(proj(hi.jw([x, jt - 0.9, -w * 0.72 * ns])), upJ, L * hs);
    }
  }
  // Venom: the throat glows green, the whole mouth when the head is about to spit (the lips stay purple).
  const ven = hp.venom ?? 0;
  for (let i = 0; i < f.w * f.h; i++) {
    if (f.mesh[i] !== hi.mouth.id || f.over[i]) continue;
    const x = f.attr[i * 4];
    const nb = [i - 1, i + 1, i - f.w, i + f.w];
    if (nb.some((j) => f.mesh[j] !== hi.mouth.id)) continue;
    const g = x < 8 ? 0.42 : 0;
    const v = Math.max(g, ven * (1.15 - x / 52));
    if (v > 0.8) f.over[i] = VENOM[x < 22 ? 5 : 4];
    else if (v > 0.55) f.over[i] = VENOM[3];
    else if (v > 0.32) f.over[i] = VENOM[2];
  }
  // Brow: a dark slanted line over the eye (an angry brow), a lit crest above it.
  const [, , we] = profAt(SKULL, 15);
  const eyeC = proj(hi.hw([15, 3.2, -we * 0.95 * ns]));
  const browA = proj(hi.hw([9.5, 7.2, -we * 0.9 * ns]));
  const browB = proj(hi.hw([20.5, 5, -we * 0.86 * ns]));
  const nb = Math.max(2, Math.ceil(Math.hypot(browB[0] - browA[0], browB[1] - browA[1])));
  for (let k = 0; k <= nb; k++) {
    const x = Math.round(lerp(browA[0], browB[0], k / nb)), y = Math.round(lerp(browA[1], browB[1], k / nb));
    const i = f.idx(x, y);
    if (i >= 0 && f.pal[i] >= 0) f.over[i] = C(P.scale, 0);
    const j = f.idx(x, y - 1);
    if (j >= 0 && f.pal[j] === P.scale && !f.over[j]) f.step[j] = Math.max(f.step[j], 4);
  }
  // Eye: a glowing green almond (its halo is added after the outline), a dark slit when shut.
  const eo = hp.eye ?? 1;
  const ex = Math.round(eyeC[0]), ey = Math.round(eyeC[1]);
  const big = hs > 0.75;
  const eyePx: [number, number, number][] =
    eo > 0.5
      ? big
        ? [[-3, 0, 2], [-2, 0, 3], [-1, 0, 4], [0, 0, 5], [1, 0, 5], [2, 0, 3], [-2, 1, 2], [-1, 1, 3], [0, 1, 4], [1, 1, 3], [-3, -1, 1], [-2, -1, 1], [-1, -1, 1], [0, -1, 1], [1, -1, 1], [2, -1, 1]]
        : [[-1, 0, 3], [0, 0, 5], [1, 0, 4], [-1, -1, 1], [0, -1, 1], [1, -1, 1]]
      : [[-2, 0, 0], [-1, 0, 0], [0, 0, 0], [1, 0, 0], [2, 0, 0]];
  for (const [dx, dy, s] of eyePx) {
    const i = f.idx(ex + dx, ey + dy);
    if (i >= 0) f.over[i] = s <= 1 ? C(P.scale, 0) : VENOM[s];
  }
  // Nostril near the snout tip.
  const nos = proj(hi.hw([45, 3.6, -4.2 * ns]));
  for (const [dx, dy] of [[0, 0], [1, 0]]) {
    const i = f.idx(Math.round(nos[0]) + dx, Math.round(nos[1]) + dy);
    if (i >= 0 && f.pal[i] >= 0) f.over[i] = C(P.scale, 0);
  }
  const [, sbTip] = profAt(SKULL, 44);
  const [jtTip] = profAt(JAW, 44);
  const up = hi.hw([47, sbTip, -2]);
  const lo = hi.jw([46, jtTip, -2]);
  return {
    eye: eo > 0.5 ? [eyeC[0] + 0.5, eyeC[1] + 0.5] : null,
    mouth: proj(lerp3(up, lo, 0.5)),
    throat: proj(hi.hw([14, -6 + 0 * hp.jaw, 0])),
  };
}

/** Translucent green glow around a point (eyes, venom): two quantised rings, no outline. */
function halo(c: Canvas, cx: number, cy: number, r: number, strength: number, col: Color = VENOM[4]): void {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d > 1) continue;
      const a = (d < 0.5 ? 0.55 : 0.28) * strength;
      const cur = c.get(x, y);
      if (cur[3] === 0) c.set(x, y, withAlpha(col, Math.round(255 * a * 0.75)));
      else if (cur[3] < 250) c.set(x, y, withAlpha(mix(cur, col, a), Math.max(cur[3], Math.round(255 * a * 0.75))));
      else c.set(x, y, [Math.min(255, cur[0] + col[0] * a * 0.55), Math.min(255, cur[1] + col[1] * a * 0.55), Math.min(255, cur[2] + col[2] * a * 0.45), 255].map(Math.round) as Color);
    }
}

/** Glows of a painted head, after the outline: eye halos and the venom light around the mouth. */
function headGlows(c: Canvas, hp: HeadPose, mk: HeadMarks): void {
  const ven = hp.venom ?? 0;
  if (mk.eye) halo(c, mk.eye[0], mk.eye[1], 4.5 * (hp.hs ?? 1), 0.75);
  if (ven > 0.45) halo(c, lerp(mk.mouth[0], mk.throat[0], 0.25), lerp(mk.mouth[1], mk.throat[1], 0.25), 5 + 5 * ven, 0.35 + 0.45 * ven);
}

// --- neck -----------------------------------------------------------------------------------

/** The cut height: the first 0.6 m of every neck rises straight out of the body (the stump). */
const STUMP_H = m(0.6);
/** Base radius of the stump; every neck is at least this thick at its root so it covers the stump. */
const ROOT_R = 18;

interface NeckPose extends HeadPose {
  /** Bezier handle lengths at the stump top (straight up out of the body) and at the head. */
  l1: number;
  l2: number;
  /** Angle between the head direction and the neck's direction where it enters the skull. */
  beta: number;
}

interface NeckGeo {
  /** Spine from 6 px below the root to the socket, evenly resampled. */
  spine: V3[];
  /** Arc length of each spine point minus 6 (so s = 0 at the root and s = STUMP_H at the cut). */
  arc: number[];
}

function arcOf(pts: V3[], start = -4): number[] {
  const a = [start];
  for (let i = 1; i < pts.length; i++) a.push(a[i - 1] + len(sub(pts[i], pts[i - 1])));
  return a;
}

function neckSpine(np: NeckPose): NeckGeo {
  const B: V3 = [0, -4, 0];
  const S0: V3 = [0, STUMP_H, 0];
  const T: V3 = [Math.cos(np.th + np.beta), Math.sin(np.th + np.beta), 0];
  const P1: V3 = [0, STUMP_H + np.l1, 0];
  const P2: V3 = sub(np.O, mul(T, np.l2));
  // The straight root (the stump) is sampled at fixed heights so it never shimmers while the
  // rest of the neck moves; only the curve above it is resampled.
  const root: V3[] = [];
  const nr = 15;
  for (let k = 0; k < nr; k++) root.push(lerp3(B, S0, k / nr));
  const dense: V3[] = [];
  for (let k = 0; k <= 160; k++) dense.push(bez(S0, P1, P2, np.O, k / 160));
  const L = arcOf(dense, 0).slice(-1)[0];
  const { pts } = resample(dense, Math.max(6, Math.round(L / 2.6)));
  const spine = [...root, ...pts];
  return { spine, arc: arcOf(spine) };
}

/**
 * Skin coordinate s along a neck: true arc length up to just above the cut (so the root and the
 * stump never slide), then stretched so the whole neck always spans [0, restLen] and the scales ride
 * along when it extends.
 */
function skinS(arc: number[], restLen: number): number[] {
  const knee = STUMP_H + 4;
  const L = arc[arc.length - 1];
  return arc.map((a) => (a <= knee || L <= knee + 1 ? a : knee + ((a - knee) * (restLen - knee)) / (L - knee)));
}

interface NeckSpec {
  name: string;
  label: string;
  layer: 'back' | 'front';
  rest: NeckPose;
  rBase: number;
  rTop: number;
  seed: number;
  /** Idle sway phase (0..1) so the seven heads never move in unison. */
  phase: number;
}

const NECK_VENTRAL_TWIST = 0.5; // belly turned toward the viewer (radians)
const neckVentral = (_i: number, t: V3): V3 => unit(add(mul([t[1], -t[0], 0], Math.cos(NECK_VENTRAL_TWIST)), [0, 0, -Math.sin(NECK_VENTRAL_TWIST)]));

/** Neck radius at skin coordinate s: thick root with a flare, tapering to the head. */
function neckRadius(spec: { rBase: number; rTop: number }, s: number, restLen: number): number {
  const u = clamp(s / restLen, 0, 1);
  return lerp(spec.rBase, spec.rTop, smoothstep(u * 1.1)) * (1 + 0.16 * Math.exp(-Math.max(0, s) / 9));
}

/**
 * Raw flesh of a cut (rho = 0 center .. 1 rim, a = angle): a ragged skin rim, purple flesh, a pale
 * vertebra off-center and, when it oozes, venom welling up around it.
 */
function cutFace(rho: number, a: number, light: number, ooze: number): [number, number] {
  const rag = 0.05 * Math.sin(a * 5 + 1) + 0.04 * Math.sin(a * 9 + 2);
  if (rho > 0.86 + rag) return [P.scale, light > 0.5 ? 3 : 2];
  // The vertebra: a small pale ring a little behind the center, with its dark canal.
  const vx = rho * Math.cos(a) - 0.05, vy = rho * Math.sin(a) - 0.2;
  const vr = Math.hypot(vx * 1.3, vy);
  if (vr < 0.17) return [P.teeth, vx + vy < 0 ? 3 : 2];
  // Venom wells up in a lobed pool over the middle, brightest where it bulges.
  const pool = 0.42 + 0.1 * Math.sin(a * 3 + 1.3) + 0.06 * Math.sin(a * 5 + 0.4);
  if (ooze > 0 && rho < pool) return [P.venom, rho < pool - 0.2 ? 4 : 3];
  return [P.mouth, rho > 0.7 + rag ? (light > 0.5 ? 4 : 3) : 2];
}

interface NeckOpts {
  /** Custom spine (a falling piece) with its skin coordinates. */
  geo?: NeckGeo;
  sAt?: number[];
  /** Only the tube between these skin coordinates is built (cuts). */
  from?: number;
  to?: number;
  /** A raw cut face closes the start of the tube. */
  cutStart?: boolean;
  dark?: number;
  /** Fresh regrown skin (wet sheen). */
  fresh?: number;
  /** Radius multiplier at the root and at the head end (a regrowing neck starts thin). */
  thin?: [number, number];
  /** Build the head (default true). */
  head?: boolean;
  /** Belly direction override (a falling piece rolls its belly to the ground). */
  ventral?: (i: number, t: V3) => V3;
}

/** Builds a neck (tube, dorsal spikes, cut face) and its head into a scene. */
function buildNeck(sc: Scene, spec: NeckSpec, np: NeckPose, restLen: number, o: NeckOpts = {}): { head: HeadInfo | null } {
  const geo = o.geo ?? neckSpine(np);
  const sAt = o.sAt ?? skinS(geo.arc, restLen);
  const N = geo.spine.length;
  const thin = (s: number): number => (o.thin ? lerp(o.thin[0], o.thin[1], clamp((s - STUMP_H) / Math.max(1, restLen - STUMP_H), 0, 1)) : 1);
  const radius = sAt.map((s) => neckRadius(spec, s, restLen) * thin(s));
  const from = o.from ?? -Infinity, to = o.to ?? Infinity;
  const idx = sAt.map((s, i) => (s >= from - 1e-6 && s <= to + 1e-6 ? i : -1)).filter((i) => i >= 0);
  const fresh = o.fresh ?? 0;
  const skin = skinShade({ row: 6, wid: 8, plate: 6.5, bellyHalf: 0.72, plateFrom: 8 });
  if (idx.length >= 2) {
    const spine = idx.map((i) => geo.spine[i]);
    sc.add(tube(spine, idx.map((i) => radius[i]), { n: 16, ventral: o.ventral ?? neckVentral, s: idx.map((i) => sAt[i]), roundStart: from > -1e9 ? 0 : 1, roundEnd: to < 1e9 && !o.head ? 3 : 0, openStart: o.cutStart }), {
      pal: P.scale,
      seed: spec.seed,
      bias: -0.13,
      fold: 30,
      anchor: (at) => [at[0], Math.atan2(at[2], at[1]) * at[3]],
      dark: o.dark,
      shade: (px, st) => {
        const r = skin(px, st);
        if (fresh > 0.3 && px.light > 0.6 && !Array.isArray(r)) return r + 1;
        return r;
      },
    });
    if (o.cutStart) {
      const i0 = idx[0];
      const t = unit(sub(geo.spine[Math.min(N - 1, i0 + 1)], geo.spine[i0]));
      sc.add(disk(geo.spine[i0], mul(t, -1), radius[i0] * 0.98), { pal: P.mouth, seed: spec.seed + 3, crest: false, shade: (px) => cutFace(px.at[0], Math.atan2(px.at[2], px.at[1]), px.light, 0) });
    }
  }
  // Dorsal spikes: golden, swept back toward the body, a little longer near the head.
  const at = (s: number): { p: V3; t: V3; e1: V3; r: number } | null => {
    let i = 0;
    while (i < N - 2 && sAt[i + 1] < s) i++;
    if (s < sAt[0] || s > sAt[N - 1]) return null;
    const tt = clamp((s - sAt[i]) / (sAt[i + 1] - sAt[i] || 1), 0, 1);
    const p = lerp3(geo.spine[i], geo.spine[i + 1], tt);
    const t = unit(sub(geo.spine[i + 1], geo.spine[i]));
    return { p, t, e1: unit((o.ventral ?? neckVentral)(0, t)), r: lerp(radius[i], radius[i + 1], tt) };
  };
  for (let s = STUMP_H + 7; s < restLen - 9; s += 9) {
    if (s < from + 3 || s > to - 3) continue;
    const fr = at(s);
    if (!fr) continue;
    const { p, t, e1, r } = fr;
    const dors = mul(e1, -1);
    const u = s / restLen;
    const k = thin(s);
    const L = (10 + 5 * u) * k;
    const base = add(p, mul(dors, r * 0.72));
    const dir = unit(sub(mul(dors, Math.cos(0.85)), mul(t, Math.sin(0.85))));
    sc.add(tagAt(cone(base, add(base, mul(dir, L)), (3.6 + 0.9 * u) * k, 5, { rot: 0.5 }), 7).map((tr) => ({ ...tr, at: tr.at.map(() => [s, 0, 0, 7]) as [Attr, Attr, Attr] })), { pal: P.gold, seed: spec.seed + Math.round(s), contrast: 1.2, facetVar: 0.05, dark: o.dark });
  }
  const head = o.head !== false ? buildHead(sc, np, spec.seed + 100, o.dark ?? 0) : null;
  return { head };
}

// --- body -------------------------------------------------------------------------------------

interface BodyPose {
  /** Chest expansion (-1..1). */
  breathe: number;
  /** Tail tip swing (radians, + curls tighter). */
  tail: number;
  /** Upper body offset (recoil), world px. */
  shift: V3;
  /** Torso lean (radians, + toward the right). */
  lean: number;
  /** 0 standing .. 1 slumped flat on the ground (death). */
  sink: number;
  /** 0 .. 1 the tail curl relaxes onto the ground. */
  limp: number;
}
const BODY_REST: BodyPose = { breathe: 0, tail: 0, shift: [0, 0, 0], lean: 0, sink: 0, limp: 0 };

/** Torso spine control points standing and slumped (death), with radii. */
const TORSO_UP: V3[] = [[0, 22, 10], [4, 60, 4], [10, 94, -2]];
const TORSO_DOWN: V3[] = [[-6, 22, 10], [26, 34, 2], [62, 30, -6]];
/** Torso radius front to back; it is wider across (TORSO_WIDE), a broad chest for seven necks. */
const TORSO_R = [42, 42, 34];
const TORSO_WIDE = 1.3;

function torsoCtrl(bp: BodyPose): V3[] {
  return TORSO_UP.map((p, i) => {
    let q = lerp3(p, TORSO_DOWN[i], smoothstep(bp.sink));
    const w = i / 2; // the top moves most
    q = rotXH(q, -bp.lean * w, [0, 20, 0]);
    q = add(q, mul(bp.shift, w));
    if (i === 2) q = add(q, [0, bp.breathe * 1.2, 0]);
    return q;
  });
}

/** Where the torso's top (the neck roots) sits for a pose, relative to standing. */
function torsoTopOffset(bp: BodyPose): V3 {
  const up = torsoCtrl(BODY_REST)[2], now = torsoCtrl(bp)[2];
  return sub(now, up);
}

/** Serpent body: from inside the torso round the back and out to the left into the curled tail. */
const COIL: V3[] = [
  [25, 26, 18],
  [76, 26, 24],
  [112, 25, 38],
  [110, 26, 60],
  [72, 27, 72],
  [0, 27, 74],
  [-70, 27, 68],
  [-122, 25, 46],
  [-142, 24, 12],
  [-128, 22, -16],
];
const CURL: V3[] = [
  [-142, 30, -22],
  [-160, 62, -24],
  [-154, 100, -24],
  [-128, 116, -24],
  [-102, 102, -24],
  [-104, 80, -24],
  [-120, 76, -24],
  [-126, 89, -24],
];
const CURL_C: V3 = [-128, 88, -24];
/** The tail curl gone slack on the ground (death). */
const CURL_LIMP: V3[] = [
  [-142, 24, -24],
  [-160, 21, -27],
  [-172, 17, -34],
  [-176, 13, -44],
  [-170, 10, -53],
  [-158, 8, -58],
  [-146, 6, -58],
  [-138, 5, -55],
];

const ground = (p: V3): V3 => [p[0], Math.max(0, p[1]), p[2]];

function legIK(S: V3, Wr: V3, l1: number, l2: number, hint: V3): V3 {
  const d = sub(Wr, S);
  const dl = Math.min(len(d), l1 + l2 - 0.5);
  const dir = unit(d);
  const a = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const perp = unit(sub(hint, mul(dir, dot(hint, dir))));
  return add(add(S, mul(dir, a)), mul(perp, h));
}

interface LegSpec {
  S: V3;
  W: V3;
  hint: V3;
  /** Toe tip offsets from the foot pad. */
  toes: V3[];
  dark: number;
  seed: number;
}
const LEGS: LegSpec[] = [
  // Near leg (screen left, in front), the elbow out to the back.
  { S: [-46, 66, -30], W: [-62, 13, -48], hint: [-1, 0.6, -0.1], toes: [[22, -8, -4], [19, -8, -14], [11, -8, -21]], dark: 0, seed: 501 },
  // Far leg (screen right, behind), reaching forward with the claws spread.
  { S: [52, 84, 10], W: [98, 15, -2], hint: [0.15, 1, 0.3], toes: [[22, -9, -2], [20, -9, 8], [12, -9, 15]], dark: -1, seed: 502 },
];

function buildLeg(sc: Scene, leg: LegSpec, bp: BodyPose): void {
  const top = torsoTopOffset(bp);
  const S = add(leg.S, mul(top, 0.7));
  const W = add(leg.W, [0, -6 * bp.sink, 0]);
  const E = legIK(S, W, 42, 40, leg.hint);
  const dk = leg.dark;
  const skin = { pal: P.scale, seed: leg.seed, fold: 20, anchor: (at: Attr): V2 => [at[0], Math.atan2(at[2], at[1]) * at[3]], dark: dk, shade: skinShade({ row: 5, wid: 7, plate: 0, bellyHalf: 0 }) };
  const ventral = (_i: number, t: V3): V3 => unit(add([t[1], -t[0], 0], [0, 0, -0.6]));
  // Shoulder bulge, upper arm, forearm, foot pad.
  const upper = resample(catmull([S, lerp3(S, E, 0.5), E], 6), 12).pts;
  sc.add(tube(upper, upper.map((_, i) => lerp(25, 18, i / (upper.length - 1))), { n: 14, ventral, roundStart: 2, roundEnd: 2 }), skin);
  const F = add(W, [6, -8, -4]);
  const fore = resample(catmull([E, lerp3(E, W, 0.5), W, F], 6), 14).pts;
  sc.add(tube(fore, fore.map((_, i) => lerp(18, 12.5, i / (fore.length - 1))), { n: 14, ventral, roundStart: 2, roundEnd: 2, s: fore.map((_, i) => 60 + i * 3) }), skin);
  // Toes with golden claws curving into the ground.
  leg.toes.forEach((tt, k) => {
    const tip = add(F, tt);
    const mid = add(lerp3(F, tip, 0.5), [0, 3.5, 0]);
    const toe = resample(catmull([F, mid, tip], 6), 8).pts.map(ground);
    sc.add(tube(toe, toe.map((_, i) => lerp(6.6, 4, i / (toe.length - 1))), { n: 10, roundEnd: 1, s: toe.map((_, i) => 120 + k * 20 + i * 2) }), { ...skin, seed: leg.seed + 10 + k });
    const dir = unit([tt[0], 0, tt[2]]);
    sc.add(cone(add(tip, mul(dir, 2)), add(add(tip, mul(dir, 9)), [0, -3, 0]), 3.2, 5, { rot: 0.3, bend: [0, -2, 0] }), { pal: P.gold, seed: leg.seed + 20 + k, contrast: 1.2, dark: dk });
  });
  // A dewclaw at the back of the foot and spikes along the back of the forearm.
  const dew = add(F, [-14, -7, 2]);
  sc.add(cone(add(F, [-6, -3, 0]), dew, 3.4, 5), { pal: P.gold, seed: leg.seed + 30, contrast: 1.2, dark: dk });
  for (let k = 0; k < 3; k++) {
    const p = lerp3(E, W, 0.1 + k * 0.25);
    const fwd = unit(sub(W, E));
    const back = unit(sub(sub(E, S), mul(fwd, dot(sub(E, S), fwd))));
    const b = add(p, mul(back, 11 - k));
    sc.add(cone(b, add(add(b, mul(back, 9 - k * 1.5)), mul(fwd, -4)), 3.4 - k * 0.3, 5, { rot: 0.2 }), { pal: P.gold, seed: leg.seed + 40 + k, contrast: 1.2, dark: dk });
  }
}

function buildBody(sc: Scene, bp: BodyPose): void {
  // Torso: an upright mass with golden belly plates facing forward.
  const tc = torsoCtrl(bp);
  const tsp = resample(catmull(tc, 10), 26).pts;
  const tr = tsp.map((_, i) => {
    const u = i / (tsp.length - 1);
    const r = u < 0.5 ? lerp(TORSO_R[0], TORSO_R[1], u * 2) : lerp(TORSO_R[1], TORSO_R[2], (u - 0.5) * 2);
    return r * (1 + bp.breathe * 0.025 * Math.sin(u * Math.PI)) * (1 - 0.16 * smoothstep(bp.sink));
  });
  // The belly faces forward; slumped in death it rolls onto the ground.
  const tVentral = (): V3 => unit(lerp3([0.45, 0.05, -0.9], [0.25, -1, -0.3], smoothstep(bp.sink)));
  sc.add(transform(tube(tsp, tr, { n: 24, ventral: tVentral, roundStart: 2, roundEnd: 4, flat: TORSO_WIDE }), ground, (n) => n), {
    pal: P.scale,
    seed: 401,
    anchor: (at) => [at[0], Math.atan2(at[2], at[1]) * at[3]],
    shade: skinShade({ row: 7, wid: 9, plate: 9, bellyHalf: 0.5, plateFrom: 16, plateTo: 76 }),
  });
  // Spikes up the torso's back.
  for (let k = 0; k < 4; k++) {
    const u = 0.16 + k * 0.14;
    const i = Math.round(u * (tsp.length - 1));
    const t = unit(sub(tsp[Math.min(tsp.length - 1, i + 1)], tsp[Math.max(0, i - 1)]));
    const dors = unit(sub(mul(tVentral(), -1), mul(t, dot(mul(tVentral(), -1), t))));
    const b = add(tsp[i], mul(dors, tr[i] * 0.86));
    const dir = unit(sub(dors, mul(t, 0.55)));
    sc.add(cone(b, add(b, mul(dir, 15 + (k % 2) * 4)), 4.4, 5, { rot: 0.4 }), { pal: P.gold, seed: 420 + k, contrast: 1.2 });
  }
  // Serpent coil and tail.
  const curl = CURL.map((p, k) => {
    const w = (k / (CURL.length - 1)) ** 1.5;
    let q = rotXH(p, bp.tail * w, CURL_C);
    // Limp: the curl loosens into a slack hook lying on the ground.
    q = lerp3(q, CURL_LIMP[k], smoothstep(bp.limp) * (0.3 + 0.7 * w));
    return q;
  });
  const coilStart = add(COIL[0], mul(torsoTopOffset(bp), 0.2));
  const ctrl = [coilStart, ...COIL.slice(1), ...curl];
  const sp = resample(catmull(ctrl, 10), 150).pts;
  const n = sp.length;
  const curlFrom = (COIL.length - 0.5) / (ctrl.length - 1);
  const rr = sp.map((_, i) => {
    const u = i / (n - 1);
    return u < 0.45 ? 27 : 3 + 24 * (1 - smoothstep((u - 0.45) / 0.55)) ** 0.85;
  });
  const sVentral = (i: number, _t: V3, p: V3): V3 => {
    const u = i / (n - 1);
    const k = smoothstep((u - curlFrom + 0.04) / 0.1) * (1 - smoothstep(bp.limp));
    const toC = unit([CURL_C[0] - p[0], CURL_C[1] - p[1], 0]);
    return unit(lerp3([0, -1, 0.15], toC, k));
  };
  sc.add(transform(tube(sp, rr, { n: 18, ventral: sVentral, roundStart: 2 }), ground, (q) => q), {
    pal: P.scale,
    seed: 402,
    fold: 40,
    anchor: (at) => [at[0], Math.atan2(at[2], at[1]) * at[3]],
    shade: skinShade({ row: 8, wid: 10, plate: 8, bellyHalf: 0.85, plateLift: 1 }),
  });
  // Dorsal spikes along the coil, smaller toward the tail tip.
  for (let i = 6; i < n - 5; i += 3) {
    const u = i / (n - 1);
    const t = unit(sub(sp[Math.min(n - 1, i + 1)], sp[Math.max(0, i - 1)]));
    const v = sVentral(i, t, sp[i]);
    const dors = unit(sub(mul(v, -1), mul(t, dot(mul(v, -1), t))));
    const b = add(sp[i], mul(dors, rr[i] * 0.8));
    const L = 7 + rr[i] * 0.45;
    const dir = unit(sub(dors, mul(t, 0.55)));
    sc.add(transform(cone(b, add(b, mul(dir, L)), 2 + rr[i] * 0.13, 5, { rot: 0.4 }), ground, (q) => q), { pal: P.gold, seed: 430 + i, contrast: 1.2 });
    void u;
  }
  for (const leg of LEGS) buildLeg(sc, leg, bp);
}

// --- the seven necks ---------------------------------------------------------------------------

interface NeckDef {
  n: number;
  /** Where the neck joins the body (body world space; D is a multiple of 3 so it lands on whole pixels). */
  root: V3;
  layer: 'back' | 'front';
  /** Head center target relative to the body's world origin (screen x, screen up). */
  head: V2;
  th: number;
  jaw: number;
  l1: number;
  l2: number;
  beta: number;
  rBase: number;
  rTop: number;
  phase: number;
}

const NECKS: NeckDef[] = [
  // 1: the tall center head, furthest back.
  { n: 1, root: [8, 116, 3], layer: 'back', head: [4, 268], th: -0.12, jaw: 0.36, l1: 66, l2: 62, beta: 1.05, rBase: 20, rTop: 10.5, phase: 0 },
  // 2, 3: the high side heads.
  { n: 2, root: [-22, 110, 6], layer: 'back', head: [-86, 234], th: 0.14, jaw: 0.3, l1: 52, l2: 58, beta: 1.15, rBase: 19, rTop: 10, phase: 0.37 },
  { n: 3, root: [36, 108, 6], layer: 'back', head: [102, 240], th: -0.04, jaw: 0.34, l1: 52, l2: 56, beta: 1.0, rBase: 19, rTop: 10, phase: 0.71 },
  // 4, 5: the middle heads, swinging out wide.
  { n: 4, root: [-40, 98, 9], layer: 'back', head: [-124, 180], th: 0.22, jaw: 0.28, l1: 36, l2: 52, beta: 1.25, rBase: 18.5, rTop: 9.5, phase: 0.18 },
  { n: 5, root: [52, 96, 9], layer: 'back', head: [130, 182], th: -0.18, jaw: 0.3, l1: 36, l2: 48, beta: 0.95, rBase: 18.5, rTop: 9.5, phase: 0.55 },
  // 6, 7: the low heads in front of the chest, one to each side.
  { n: 6, root: [-30, 84, -30], layer: 'front', head: [-66, 136], th: 0.1, jaw: 0.32, l1: 20, l2: 40, beta: 1.25, rBase: 18, rTop: 9.5, phase: 0.86 },
  { n: 7, root: [42, 80, -27], layer: 'front', head: [98, 122], th: -0.26, jaw: 0.38, l1: 20, l2: 40, beta: 0.95, rBase: 18, rTop: 9.5, phase: 0.44 },
];

function neckSpecOf(d: NeckDef): NeckSpec {
  // Head center relative to the neck root, in the root's frame (D = 0 plane).
  const rootUp = d.root[1] + K * d.root[2];
  const hc: V3 = [d.head[0] - d.root[0], d.head[1] - rootUp, 0];
  const O = sub(hc, rotXH(HEAD_CENTER, d.th));
  return {
    name: `hydra_neck_${d.n}`,
    label: `Hydra Head ${d.n}`,
    layer: d.layer,
    rest: { O, th: d.th, jaw: d.jaw, l1: d.l1, l2: d.l2, beta: d.beta },
    rBase: d.rBase,
    rTop: d.rTop,
    seed: 11 + d.n * 37,
    phase: d.phase,
  };
}

/** Idle at frame k of 8: a slow sway that grows toward the head, the jaw opening a little. */
function idlePose(spec: NeckSpec, k: number): NeckPose {
  const r = spec.rest;
  const t = (k / 8 + spec.phase) * TAU;
  return { ...r, O: add(r.O, [2.6 * Math.sin(t), 2.2 * Math.sin(t + 1.3), 0]), th: r.th + 0.05 * Math.sin(t + 0.7), jaw: r.jaw * (0.55 + 0.4 * (0.5 + 0.5 * Math.sin(t - 0.6))) };
}

/** A pose relative to idle frame 0 (so every one-shot starts and ends where the idle loop is). */
function rel(base: NeckPose, dx: number, dy: number, dth: number, jaw: number, extra: Partial<NeckPose> = {}): NeckPose {
  return { ...base, O: add(base.O, [dx, dy, 0]), th: base.th + dth, jaw, ...extra };
}

const NECK_W = 560, NECK_H = 600, NECK_OX = 280, NECK_OY = 340;

interface NeckRender {
  c: Canvas;
  marks: HeadMarks | null;
  /** Head center (screen, work canvas) or null when there is no head. */
  headC: V2 | null;
  f: Frame;
}

function renderNeck(spec: NeckSpec, np: NeckPose, restLen: number, o: NeckOpts = {}): NeckRender {
  resetGroups();
  const sc = new Scene();
  const { head } = buildNeck(sc, spec, np, restLen, o);
  const f = render(sc, NECK_W, NECK_H, NECK_OX, NECK_OY);
  const marks = head ? paintHead(f, np, head) : null;
  const c = f.compose();
  c.outline();
  if (marks) headGlows(c, np, marks);
  return { c, marks, headC: head ? f.proj(head.hw(HEAD_CENTER)) : null, f };
}

/** A venom droplet (2-3 px, glinting), no outline. */
function droplet(c: Canvas, x: number, y: number, big = false): void {
  const px: [number, number, number][] = big ? [[0, 0, 5], [1, 0, 4], [-1, 1, 4], [0, 1, 3], [1, 1, 2], [0, 2, 2]] : [[0, 0, 4], [0, 1, 3], [1, 1, 2]];
  for (const [dx, dy, s] of px) c.set(Math.round(x) + dx, Math.round(y) + dy, VENOM[s]);
}

/** A bright venom ball (the spat gob leaving the mouth, an impact). */
function venomBall(c: Canvas, cx: number, cy: number, r: number): void {
  halo(c, cx, cy, r * 2.4, 0.9);
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r;
      const d = u * u + v * v;
      if (d > 1) continue;
      const l = -u * 0.6 - v * 0.75;
      c.set(x, y, VENOM[d > 0.72 ? (l > 0 ? 3 : 2) : l > 0.35 ? 5 : 4]);
    }
}

/** Every animation of one neck. */
function neckAnims(d: NeckDef, spec: NeckSpec): { anims: Record<string, Anim>; head: V2; mouth: V2 } {
  const restLen = neckSpine(spec.rest).arc.slice(-1)[0];
  const R = (np: NeckPose, o: NeckOpts = {}) => renderNeck(spec, np, restLen, o);
  const i0 = idlePose(spec, 0);
  // Idle (loop).
  const idle = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => R(idlePose(spec, k)));
  const head = idle[0].headC!, mouth = idle[0].marks!.mouth;
  // Bite: rear back, lunge forward-right and down (about 1.7 m), snap shut, recover.
  // The strike: the neck arches up over the diving head and runs straight down into it (a cobra
  // strike), so short necks rear up and tall ones bow forward instead of folding.
  const strike = (dx: number, dy: number, dth: number, jaw: number, w: number): NeckPose => {
    const p = rel(i0, dx, dy, dth, jaw);
    const crest = Math.max(p.O[1] + 26, STUMP_H + 24) - STUMP_H;
    const reach = len(sub(p.O, [0, STUMP_H, 0]));
    return { ...p, l1: lerp(i0.l1, Math.max(crest, i0.l1 * 0.6), w), l2: lerp(i0.l2, reach * 0.42, w), beta: lerp(i0.beta, 0.12, w) };
  };
  const bite = [
    R(rel(i0, -12, 9, 0.2, 0.55)),
    R(rel(i0, -18, 13, 0.3, 0.82)),
    R(strike(44, -34, -0.3, 0.88, 0.75)),
    R(strike(76, -60, -0.42, 0.02, 1)),
    R(strike(30, -22, -0.16, 0.1, 0.45)),
    R(rel(i0, 6, -4, -0.03, i0.jaw * 0.8)),
  ].map((r) => r.c);
  // Spit: rear, the mouth opens on a bright green glow, spit, recover.
  const spitP = [
    rel(i0, -8, 7, 0.22, 0.32, { venom: 0.35 }),
    rel(i0, -13, 11, 0.3, 0.62, { venom: 0.7 }),
    rel(i0, -9, 9, 0.2, 0.86, { venom: 1 }),
    rel(i0, 14, -6, -0.1, 0.92, { venom: 1 }),
    rel(i0, 9, -3, -0.05, 0.55, { venom: 0.4 }),
    rel(i0, 2, 0, 0, i0.jaw, { venom: 0.1 }),
  ];
  const spit = spitP.map((p, k) => {
    const r = R(p);
    const mt = r.marks!.mouth;
    if (k === 3) {
      // The gob leaves the mouth: a bright ball just ahead of the jaws, a spray of droplets.
      const dir = [Math.cos(p.th - p.jaw * 0.5), -Math.sin(p.th - p.jaw * 0.5)];
      venomBall(r.c, mt[0] + dir[0] * 9, mt[1] + dir[1] * 9, 4.5);
      for (let j = 0; j < 4; j++) droplet(r.c, mt[0] + dir[0] * (4 + j * 4) + (j % 2 ? 3 : -2), mt[1] + dir[1] * (4 + j * 4) + (j % 2 ? -4 : 3));
    }
    if (k === 4) for (let j = 0; j < 3; j++) droplet(r.c, mt[0] - 2 + j * 3, mt[1] + 3 + j * 3, j === 0);
    return r.c;
  });
  // Roar: dip, rear up with the jaws wide (a tremor), settle.
  const roar = [
    R(rel(i0, -4, -3, -0.12, 0.12)),
    R(rel(i0, -6, 12, 0.32, 0.62, { venom: 0.15 })),
    R(rel(i0, -5, 17, 0.45, 0.98, { venom: 0.3 })),
    R(rel(i0, -3, 16, 0.42, 0.98, { venom: 0.3 })),
    R(rel(i0, -5, 17, 0.46, 0.92, { venom: 0.25 })),
    R(rel(i0, -1, 5, 0.1, 0.45)),
  ].map((r) => r.c);
  // Hurt: snap back with the eyes squeezed shut, recoil, recover.
  const hurt = [
    R(rel(i0, -14, 6, 0.32, 0.66, { eye: 0 })),
    R(rel(i0, -19, 2, 0.24, 0.5, { eye: 0 })),
    R(rel(i0, -6, 0, 0.08, 0.3)),
  ].map((r) => r.c);
  return {
    anims: {
      idle: { frames: idle.map((r) => r.c), fps: 6 },
      bite: { frames: bite, fps: 10, loop: false },
      spit: { frames: spit, fps: 10, loop: false },
      roar: { frames: roar, fps: 8, loop: false },
      hurt: { frames: hurt, fps: 10, loop: false },
      sever: { frames: severFrames(d, spec, restLen), fps: 10, loop: false },
      regrow: { frames: regrowFrames(spec, restLen), fps: 8, loop: false },
    },
    head,
    mouth,
  };
}

/**
 * Sever: the neck is cut at the stump height (the engine shows hydra_stump from the first frame);
 * the cut part goes limp, drops to the ground, lies there a moment and melts into venom mist. The
 * last frame is empty.
 */
function severFrames(d: NeckDef, spec: NeckSpec, restLen: number): Canvas[] {
  const i0 = idlePose(spec, 0);
  const geo0 = neckSpine(i0);
  const s0 = skinS(geo0.arc, restLen);
  const keep = s0.map((s, i) => (s >= STUMP_H + 2 ? i : -1)).filter((i) => i >= 0);
  const pts0 = keep.map((i) => geo0.spine[i]);
  const ss = keep.map((i) => s0[i]);
  const n = pts0.length;
  const groundH = -d.root[1];
  // Where it ends up: the piece slumps toward its own side (right necks and the center one to the
  // right, left necks to the left) and lies along the ground with gentle bends, belly down.
  const side = i0.O[0] > -40 ? 1 : -1;
  const pile = pts0.map((_, j) => {
    const f = j / (n - 1);
    const r = neckRadius(spec, ss[j], restLen);
    const x = side * (6 + (ss[j] - ss[0]) * 0.82) + 7 * Math.sin(f * TAU * 0.9 + d.n);
    return [x, groundH + r * 0.92, -14 * Math.sin(f * Math.PI * 1.2)] as V3;
  });
  const U = [0, 0.07, 0.3, 0.68, 1, 1, 1];
  const frames: Canvas[] = [];
  for (let k = 0; k < 8; k++) {
    if (k === 7) {
      frames.push(new Canvas(NECK_W, NECK_H));
      continue;
    }
    const u = U[k];
    const pts = pts0.map((p, j) => {
      const f = j / (n - 1);
      const e = smoothstep(clamp(u * (0.88 + 0.24 * f), 0, 1));
      let q = lerp3(p, pile[j], e);
      // Limp: the middle sags before the whole piece drops.
      q = add(q, [0, -12 * Math.sin(Math.PI * f) * Math.sin(Math.PI * clamp(u * 1.3, 0, 1)), 0]);
      if (k === 4) q = [q[0], groundH + (q[1] - groundH) * 0.86, q[2]];
      if (k === 5) q = [q[0], q[1] + 1.5 * f, q[2]];
      if (k === 0) q = add(q, [1, -1, 0]);
      return q;
    });
    const last = pts[n - 1], prev = pts[Math.max(0, n - 4)];
    const tEnd = unit(sub(last, prev));
    // Once it tumbles past the vertical, a left piece's head turns to face its own way (left).
    const flip = side < 0 && k >= 3;
    const tm: V2 = flip ? [-tEnd[0], tEnd[1]] : [tEnd[0], tEnd[1]];
    const thTan = clamp(Math.atan2(tm[1], tm[0]) - 0.35, -0.9, 0.4);
    const th = flip ? lerp(0.1, -0.3, smoothstep((u - 0.5) * 2)) : lerp(i0.th, thTan * 0.5 - 0.25, smoothstep(u));
    const np: NeckPose = { ...i0, O: last, th, jaw: lerp(i0.jaw, 0.45, smoothstep(u)), eye: k === 0 ? 1 : 0, flip };
    const roll = smoothstep(u);
    const ventral = (_i: number, t: V3): V3 => unit(lerp3(neckVentral(0, t), [0, -1, -0.25], roll));
    const r = renderNeck(spec, np, restLen, { geo: { spine: pts, arc: arcOf(pts) }, sAt: ss, from: ss[0], cutStart: true, ventral });
    const c = r.c;
    const proj = (p: V3): V2 => r.f.proj(p);
    if (k === 0) {
      // The cut: a bright slash across the neck at the stump height.
      const a = proj([-spec.rBase - 8, cutH(-spec.rBase - 8, 0) + 2, 0]), b = proj([spec.rBase + 8, cutH(spec.rBase + 8, 0) + 2, 0]);
      const nn = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
      for (let q = 0; q <= nn; q++) {
        const x = Math.round(lerp(a[0], b[0], q / nn)), y = Math.round(lerp(a[1], b[1], q / nn));
        const edge = q < 3 || q > nn - 3;
        c.set(x, y, edge ? VENOM[4] : hex('#f4ffe0'));
        c.set(x, y + 1, edge ? withAlpha(VENOM[3], 160) : VENOM[5]);
      }
      halo(c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 14, 0.5, VENOM[5]);
    }
    if (k <= 3) {
      // Green blood spurting from the stump and from the cut end of the falling piece.
      const top = proj([0, STUMP_H + 2, 0]);
      for (let j = 0; j < 6; j++) {
        const tt = k + 0.6;
        const vx = (j - 2.5) * 1.6, vy = 4.2 + (j % 3);
        droplet(c, top[0] + vx * tt * 2, top[1] - vy * tt * 2 + 1.1 * tt * tt * 2, j % 2 === 0);
      }
      if (k >= 1) {
        const ce = proj(pts[0]);
        for (let j = 0; j < 3; j++) droplet(c, ce[0] + (j - 1) * 3, ce[1] + 3 + j * 2 + k * 2, j === 1);
      }
    }
    if (k === 4) {
      // Impact: a splash of ichor along the ground under the piece.
      for (let j = 0; j < 7; j++) {
        const p = pts[Math.round((j / 6) * (n - 1))];
        const g = proj([p[0], groundH, 0]);
        droplet(c, g[0] + (j % 2 ? 4 : -4), g[1] - 4 - (j % 3) * 3, j % 2 === 0);
      }
    }
    if (k === 6) frames.push(dissolve(c, 61 + d.n));
    else frames.push(c);
  }
  return frames;
}

/** Turns a rendered piece into translucent green mist breaking up in clumps that drift up (no outline). */
function dissolve(c: Canvas, seed: number): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (p[3] < 40) continue;
      const nz = noise(x, y * 0.8, 5, seed);
      if (nz < 0.46) continue;
      const lum = (p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11) / 255;
      const lift = nz > 0.7 ? 3 : nz > 0.58 ? 1 : 0;
      out.set(x, y - lift, withAlpha(VENOM[lum > 0.4 || nz > 0.75 ? 4 : 3], nz > 0.62 ? 175 : 115));
    }
  return out;
}

/**
 * Regrow: from nothing a wet new neck pushes out of the stump (which stays drawn under it), coiled
 * like a fern, then unfolds into idle frame 0 (the last frame).
 */
function regrowFrames(spec: NeckSpec, restLen: number): Canvas[] {
  const i0 = idlePose(spec, 0);
  const top: V3 = [0, STUMP_H, 0];
  const G = [0.05, 0.16, 0.32, 0.52, 0.72, 0.9, 1.03];
  const HS = [0.3, 0.42, 0.56, 0.7, 0.82, 0.93, 1.02];
  const JAWS = [0, 0, 0.02, 0.06, 0.22, 0.75, 0.55];
  const frames: Canvas[] = [];
  for (let k = 0; k < 7; k++) {
    const g = G[k];
    const dir = sub(i0.O, top);
    const side: V3 = [-dir[1], dir[0], 0];
    // The tip travels on an arc (it unfolds rather than slides out).
    const O = add(add(top, mul(dir, g)), mul(unit(side), -len(dir) * 0.22 * Math.sin(Math.PI * Math.min(1, g))));
    const th = lerp(-1.75, i0.th, smoothstep(g)) + (k >= 5 ? 0.2 : 0);
    const np: NeckPose = { ...i0, O, th, jaw: JAWS[k], l1: i0.l1 * g, l2: i0.l2 * Math.max(0.25, g), hs: HS[k], fresh: 1, eye: k >= 3 ? 1 : 0 };
    const o: NeckOpts = { from: STUMP_H - 3, thin: [lerp(0.8, 1, g), lerp(0.55, 1, g)], fresh: 1 - k / 7, head: k >= 1 };
    if (k === 0) {
      o.to = STUMP_H + 7;
      np.O = [0, STUMP_H + 9, 0];
      np.th = Math.PI / 2 - np.beta;
    }
    const r = renderNeck(spec, np, restLen, o);
    // Slime: the new skin is wet; ichor runs down from where it pushes out.
    const base = r.f.proj([0, STUMP_H + 1, 0]);
    if (k <= 4)
      for (let j = 0; j < 3; j++) {
        const x = base[0] - 9 + j * 8 + (j === 1 ? 1 : 0);
        for (let q = 0; q < 2 + ((j + k) % 3); q++) {
          const y = Math.round(base[1] + q);
          if (r.c.alpha(Math.round(x), y) > 200) r.c.set(Math.round(x), y, VENOM[q === 0 ? 4 : 3]);
        }
      }
    frames.push(r.c);
  }
  frames.push(renderNeck(spec, i0, restLen).c);
  return frames;
}

// --- sprites ----------------------------------------------------------------------------------

interface Built {
  sprite: WorldSprite;
  /** Work-canvas position of the sprite frame's (0, 0). */
  crop: V2;
}

/** Crops every frame to the union of their bounds (1 px margin): one canvas size and one anchor. */
function finish(name: string, label: string, meters: [number, number], tags: string[], anims: Record<string, Anim>, ax: number, ay: number): Built {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of Object.values(anims))
    for (const fr of a.frames) {
      const b = fr.bounds();
      if (!b) continue;
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
    }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const crop = (c: Canvas): Canvas => {
    const out = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    out.draw(c, -x0, -y0);
    return out;
  };
  const out: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(anims)) out[k] = { frames: a.frames.map(crop), fps: a.fps, loop: a.loop };
  return { sprite: { name, label, meters, anchor: [ax - x0, ay - y0], tags, anims: out }, crop: [x0, y0] };
}

const BODY_W = 440, BODY_H = 300, BODY_OX = 220, BODY_OY = 230;

function renderBody(bp: BodyPose): Canvas {
  resetGroups();
  const sc = new Scene();
  buildBody(sc, bp);
  const f = render(sc, BODY_W, BODY_H, BODY_OX, BODY_OY);
  const body = f.compose();
  body.outline();
  // A soft contact shadow on the ground under the coils (two translucent steps, no outline).
  const c = new Canvas(BODY_W, BODY_H);
  const cx = BODY_OX - 8, cy = BODY_OY - K * 22, rx = 156, ry = 62 * K + 14;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry) + (noise(x, y, 4, 9) - 0.5) * 0.08;
      if (d <= 1) c.set(x, y, withAlpha(hex('#0c1a12'), d < 0.82 ? 96 : 56));
    }
  c.draw(body, 0, 0);
  return c;
}

function bodyPose(p: Partial<BodyPose>): BodyPose {
  return { ...BODY_REST, ...p };
}

/** Body poses per animation (exported to the rig so necks and stumps can ride along). */
const BODY_ANIMS: Record<string, { poses: BodyPose[]; fps: number; loop?: boolean }> = {
  // Breathing, the tail tip swaying.
  idle: { poses: [0, 1, 2, 3, 4, 5, 6, 7].map((k) => bodyPose({ breathe: Math.sin((k / 8) * TAU), tail: 0.1 * Math.sin((k / 8) * TAU + 0.8) })), fps: 6 },
  // Recoil: the chest jerks back, the tail lashes.
  hurt: {
    // The chest only flinches a few pixels so the necks stay seated even if follow is ignored; the tail lashes.
    poses: [bodyPose({ shift: [-2, -1, 0], lean: -0.025, tail: 0.28, breathe: 0.6 }), bodyPose({ shift: [-3, -2, 0], lean: -0.035, tail: 0.4, breathe: -0.9 }), bodyPose({ shift: [-1, 0, 0], lean: -0.01, tail: 0.12 })],
    fps: 10,
    loop: false,
  },
  // Death: a last heave, the chest collapses forward onto the ground, the tail goes limp.
  death: {
    poses: [
      bodyPose({ lean: -0.06, shift: [-4, 2, 0], breathe: 1 }),
      bodyPose({ lean: -0.1, shift: [-6, 5, 0], breathe: 1, tail: 0.2 }),
      bodyPose({ sink: 0.12, lean: 0.03, breathe: 0.5 }),
      bodyPose({ sink: 0.38, lean: 0.06 }),
      bodyPose({ sink: 0.7, lean: 0.06, limp: 0.3 }),
      bodyPose({ sink: 1, limp: 0.6 }),
      bodyPose({ sink: 0.93, limp: 0.75 }),
      bodyPose({ sink: 1, limp: 0.9 }),
      bodyPose({ sink: 1, limp: 1 }),
      bodyPose({ sink: 1, limp: 1, breathe: -1 }),
    ],
    fps: 8,
    loop: false,
  },
};

function bodySprite(): { built: Built; follow: Record<string, V2[]> } {
  const anims: Record<string, Anim> = {};
  const follow: Record<string, V2[]> = {};
  for (const [k, a] of Object.entries(BODY_ANIMS)) {
    anims[k] = { frames: a.poses.map(renderBody), fps: a.fps, loop: a.loop };
    follow[k] = a.poses.map((p) => {
      const o = torsoTopOffset(p);
      return [Math.round(o[0]), Math.round(-o[1] - K * o[2])];
    });
  }
  // Anchor: the base center (x of the torso axis), y = the lowest row that touches the floor.
  const b = anims.idle.frames[0].bounds(200)!;
  return { built: finish('hydra_body', 'Hydra Body', [5.5, 2.6], ['creature', 'boss'], anims, BODY_OX, b[3]), follow };
}

// --- stump ----------------------------------------------------------------------------------

const STUMP_W = 100, STUMP_HH = 130, STUMP_OX = 50, STUMP_OY = 100;

/** The sword cut of every stump: a slanted plane through (0, STUMP_H, 0), facing up-left-front so the raw face catches the light. */
const CUT_N: V3 = unit([-0.34, 1, -0.3]);
const cutH = (x: number, d: number): number => STUMP_H - (CUT_N[0] * x + CUT_N[2] * d) / CUT_N[1];

function stumpFrame(burnt: boolean, t: number): Canvas {
  resetGroups();
  const sc = new Scene();
  const restLen = 220;
  const spec = { rBase: ROOT_R, rTop: 10 };
  const n = 18;
  const e1 = unit(neckVentral(0, [0, 1, 0]));
  const e2 = unit(cross([0, 1, 0], e1));
  // Rings up the stump; every vertex above the cut plane is pressed down onto it.
  const rings: V3[][] = [];
  const attrs: Attr[][] = [];
  for (let k = 0; k <= 18; k++) {
    const h = -4 + ((STUMP_H + 12 + 4) * k) / 18;
    const r = neckRadius(spec, Math.min(h, STUMP_H), restLen);
    const ring: V3[] = [];
    const at: Attr[] = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU;
      const x = (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * r, d = (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * r;
      const hh = Math.min(h, cutH(x, d));
      ring.push([x, hh, d]);
      at.push([hh, Math.cos(a), Math.sin(a), r]);
    }
    rings.push(ring);
    attrs.push(at);
  }
  const skin = skinShade({ row: 6, wid: 8, plate: 6.5, bellyHalf: 0.72, plateFrom: 8 });
  sc.add(loft(rings, { attrs, smooth: true }), {
    pal: P.scale,
    seed: 801,
    anchor: (at) => [at[0], Math.atan2(at[2], at[1]) * at[3]],
    shade: (px, st) => {
      const r = skin(px, st);
      if (!burnt) return r;
      // Scorched skin under the burnt cut: charred black fading into burnt scales.
      const dd = cutH(px.p[0], px.p[2]) - px.p[1] + (hash(Math.round(px.x), 3, 77) - 0.5) * 6;
      if (dd < 5) return [P.charred, clamp(st - 1, 1, 3)];
      if (dd < 11) return [P.charred, clamp(st, 2, 4)];
      return r;
    },
  });
  // The cut face: a fan over the top ring, flat on the cut plane.
  const top: V3 = [0, STUMP_H, 0];
  const rim = rings[rings.length - 1];
  const faceTris: Tri[] = rim.map((p, j) => {
    const q = rim[(j + 1) % n];
    const a0 = (j / n) * TAU, a1 = ((j + 1) / n) * TAU;
    return { v: [top, p, q], vn: [CUT_N, CUT_N, CUT_N], n: CUT_N, group: 7000, at: [[0, 0, 0, -1], [1, Math.cos(a0), Math.sin(a0), -1], [1, Math.cos(a1), Math.sin(a1), -1]] as [Attr, Attr, Attr] };
  });
  const faceId = sc.add(faceTris, {
    pal: P.mouth,
    seed: 802,
    crest: false,
    shade: (px) => {
      const rho = px.at[0];
      if (!burnt) return cutFace(rho, Math.atan2(px.at[2], px.at[1]), px.light, 1);
      // Fire sealed it: a charred crust with a few cracks.
      if (rho > 0.88) return [P.charred, 2];
      const crack = Math.abs(Math.sin(Math.atan2(px.at[2], px.at[1]) * 3 + rho * 4)) < 0.12 && rho > 0.25;
      return [P.charred, crack ? 1 : rho < 0.4 ? 2 : 3];
    },
  }).id;
  const f = render(sc, STUMP_W, STUMP_HH, STUMP_OX, STUMP_OY);
  const c = f.compose();
  c.outline();
  const ct = f.proj(top);
  if (!burnt) {
    // Ooze: venom welling up in the middle, a bubble, drips running down the front.
    const bub = [[0, 0, 0], [1, 2, 1], [2, 3, 2], [3, 0, 0]][t];
    if (bub[1] > 0) {
      const bx = Math.round(ct[0]) - 2, by = Math.round(ct[1]) - 1;
      for (const [dx, dy] of [[0, -1], [1, -1], [-1, 0], [2, 0], [0, 1], [1, 1]]) c.set(bx + dx, by + dy - (bub[1] > 1 ? 1 : 0), VENOM[bub[2] > 1 ? 5 : 4]);
    }
    const drips: [number, number][] = [[-9, 0], [-1, 2], [8, 1]];
    for (const [dx, ph] of drips) {
      const x = Math.round(ct[0]) + dx;
      // The front rim of the cut face at this x, then down the skin.
      let y = Math.round(ct[1]);
      while (y < c.h - 1 && f.mesh[f.idx(x, y + 1)] !== -1 && f.mesh[f.idx(x, y)] !== 0) y++;
      const L = [2, 5, 8, 11][(t + ph) % 4];
      for (let q = 0; q < L; q++) {
        if (c.alpha(x, y + q) < 200 || c.alpha(x + 1, y + q) < 200) break;
        c.set(x, y + q, VENOM[q === L - 1 ? 3 : 4]);
        c.set(x + 1, y + q, VENOM[q === L - 1 ? 2 : 3]);
      }
      if (L === 11 && c.alpha(x, y + L + 2) > 200) c.set(x, y + L + 2, VENOM[3]);
    }
    halo(c, ct[0], ct[1] - 1, 9, 0.35);
  } else {
    // A thin smoke wisp curling up from the sealed cut, and one dim ember.
    if (t % 2 === 0) c.set(Math.round(ct[0]) + 3, Math.round(ct[1]) + 1, mix(R.fire[2], R.charred[2], 0.3));
    else c.set(Math.round(ct[0]) - 4, Math.round(ct[1]) + 2, mix(R.fire[1], R.charred[2], 0.5));
    for (let q = 1; q < 34; q++) {
      const tt = q / 34;
      const x = ct[0] + Math.sin(q * 0.3 - (t * Math.PI) / 2) * (1 + 4 * tt) + tt * 4;
      const y = ct[1] - 2 - q;
      const a = Math.round(200 * (1 - tt) ** 0.7);
      if (a < 40) continue;
      const col = withAlpha(mix(R.charred[4], R.charred[5], 0.3 + tt * 0.7), a);
      c.plot(Math.round(x), Math.round(y), col);
      if (q > 5 && (q + t) % 4 !== 0) c.plot(Math.round(x) + 1, Math.round(y), withAlpha(col, Math.round(a * 0.55)));
    }
  }
  return c;
}

function stumpSprite(): Built {
  const anims: Record<string, Anim> = {
    raw: { frames: [0, 1, 2, 3].map((t) => stumpFrame(false, t)), fps: 6 },
    burnt: { frames: [0, 1, 2, 3].map((t) => stumpFrame(true, t)), fps: 6 },
  };
  return finish('hydra_stump', 'Severed Stump', [0.7, 0.6], ['creature', 'boss'], anims, STUMP_OX, STUMP_OY);
}

// --- venom ----------------------------------------------------------------------------------

function venomSprite(): Built {
  const W = 44, H = 36, cx = 24, cy = 18;
  const frames = [0, 1, 2, 3].map((t) => {
    const c = new Canvas(W, H);
    const ph = (t / 4) * TAU;
    // Trailing droplets (it flies right), then the wobbling gob.
    for (let j = 0; j < 3; j++) {
      const x = cx - 10 - j * 4 - ((t + j) % 2), y = cy + Math.round(Math.sin(ph + j * 1.7) * 1.2);
      c.set(x, y, VENOM[j === 0 ? 4 : 3]);
      if (j < 2) c.set(x - 1, y, VENOM[2]);
    }
    const rx = 8 + 0.8 * Math.sin(ph), ry = 6.6 - 0.6 * Math.sin(ph);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        // A teardrop: the back (left) stretches into a short tail.
        const back = u < 0 ? u / (1.5 + 0.2 * Math.cos(ph)) : u;
        const d = back * back + v * v;
        if (d > 1) continue;
        const l = -back * 0.62 - v * 0.78;
        const s = d > 0.78 ? (l > 0.1 ? 3 : 1) : l > 0.5 ? 5 : l > 0.05 ? 4 : d > 0.5 ? 2 : 3;
        c.set(x, y, VENOM[s]);
      }
    // A white-hot glint.
    c.set(cx - 3, cy - 3, hex('#f6ffe6'));
    c.set(cx - 2, cy - 3, VENOM[5]);
    halo(c, cx, cy, 11.5, 0.75);
    return c;
  });
  return finish('hydra_venom', 'Venom Gob', [0.4, 0.4], ['ambient'], { fly: { frames, fps: 12 } }, cx, cy);
}

function splashSprite(): Built {
  const W = 130, H = 110, ox = 65, oy = 80;
  const RX = [11, 24, 33, 39, 42, 42];
  // A crown of drops thrown up and out (ballistic), landing as little splats around the puddle.
  const drops = Array.from({ length: 12 }, (_, j) => ({ a: (j / 12) * TAU + hash(j, 1, 91) * 0.4, vh: 15 + hash(j, 2, 91) * 9, vv: 20 + hash(j, 3, 91) * 12, big: j % 3 !== 1 }));
  const T = [0, 0.4, 0.95, 1.6, 2.6, 9];
  const frames = [0, 1, 2, 3, 4, 5].map((k) => {
    const c = new Canvas(W, H);
    const rx = RX[k], ry = rx * 0.62;
    // The puddle: an irregular ground ellipse; on impact a spiky splat, later round lobes.
    const spike = k <= 2 ? [0.55, 0.42, 0.18][k] : 0;
    const shape = (an: number) => 1 + 0.12 * Math.sin(an * 3 + 1) + 0.08 * Math.sin(an * 5 + 2) + spike * Math.max(0, Math.sin(an * 7 + 0.5)) ** 6;
    for (let y = oy - 40; y < oy + 30; y++)
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5 - ox) / rx, v = (y + 0.5 - oy) / ry;
        const an = Math.atan2(v, u);
        const d = Math.hypot(u, v) / shape(an);
        if (d > 1) continue;
        const l = -u * 0.5 - v * 0.8;
        let st = d > 0.86 ? 1 : d > 0.45 ? 2 : 3;
        if (l > 0.4 && d < 0.72 && d > 0.3 && noise(x, y, 3, 31 + k) > 0.45) st = 4;
        if (k === 0 && d < 0.6) st = 5;
        else if (k === 1 && d < 0.35) st = 4;
        c.set(x, y, VENOM[st]);
      }
    // Glints and bubbles on the settling puddle.
    if (k >= 3) {
      for (const [gx, gy] of [[-14, -6], [-10, -7], [6, -9]] as V2[]) c.set(ox + gx, oy + gy, VENOM[5]);
      const bubbles: [number, number, number][] = [[-6, 2, 1], [12, -2, 2], [20, 5, 0], [-22, 3, 2]];
      for (const [bx, by, ph] of bubbles) {
        const age = (k + ph) % 3;
        if (age === 0) continue;
        for (let q = 0; q < 8; q++) {
          const an = (q / 8) * TAU;
          c.set(Math.round(ox + bx + Math.cos(an) * age), Math.round(oy + by + Math.sin(an) * age * 0.7), VENOM[an > Math.PI ? 5 : 3]);
        }
      }
    }
    // The gob squashed flat on impact.
    if (k === 0)
      for (let y = -4; y <= 1; y++)
        for (let x = -7; x <= 7; x++) if ((x / 7.5) ** 2 + ((y + 1.5) / 3) ** 2 <= 1) c.set(ox + x, oy - 3 + y, VENOM[y < -2 ? 5 : y < 0 ? 4 : 3]);
    const tt = T[k];
    for (const d of drops) {
      const tl = (2 * d.vv) / 24; // landing time (g = 24 px per unit squared)
      const t = Math.min(tt, tl);
      if (tt === 0) continue;
      const dist = 6 + d.vh * t;
      const gx = ox + Math.cos(d.a) * dist, gy = oy + Math.sin(d.a) * dist * 0.62;
      const hgt = d.vv * t - 12 * t * t;
      const x = Math.round(gx);
      if (tt >= tl) {
        // Landed: a little splat on the ground.
        if (k <= 4) for (let q = -1; q <= (d.big ? 2 : 1); q++) c.set(x + q, Math.round(gy), VENOM[q === 0 ? 3 : 2]);
        continue;
      }
      // In flight: a fat drop, stretched along its motion while it is fast.
      const y = Math.round(gy - hgt);
      const vy = d.vv - 24 * t;
      const shape: [number, number, number][] = d.big ? [[0, -1, 5], [-1, 0, 4], [0, 0, 4], [1, 0, 3], [-1, 1, 3], [0, 1, 3], [1, 1, 2], [0, 2, 2]] : [[0, 0, 4], [1, 0, 3], [0, 1, 3], [1, 1, 2]];
      for (const [dx, dy, st] of shape) c.set(x + dx, y + dy, VENOM[st]);
      if (Math.abs(vy) > 8) c.set(x, vy > 0 ? y + (d.big ? 3 : 2) : y - 2, VENOM[2]);
    }
    c.outline();
    // Flash on impact, then a faint breath of vapour over the settled puddle.
    if (k === 0) halo(c, ox, oy - 3, 16, 0.9, VENOM[5]);
    if (k === 1) halo(c, ox, oy - 4, 20, 0.5);
    if (k >= 4)
      for (let q = 0; q < 10; q++) {
        const x = ox - 10 + q * 2 + Math.round(Math.sin(q + k) * 1.5), y = oy - 8 - q - (k - 4) * 3;
        c.plot(x, y, withAlpha(VENOM[3], 70));
      }
    return c;
  });
  return finish('hydra_splash', 'Venom Splash', [1.5, 0.6], ['ambient'], { splash: { frames, fps: 12, loop: false } }, ox, oy);
}

// ================================================================================================
// checks
// ================================================================================================

/** Pixels that differ between two frames inside rows [y0, y1). */
function diffRows(a: Canvas, b: Canvas, y0 = 0, y1 = a.h): number {
  let n = 0;
  for (let y = Math.max(0, y0); y < Math.min(a.h, y1); y++)
    for (let x = 0; x < a.w; x++) {
      const p = a.get(x, y), q = b.get(x, y);
      if (p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2] || p[3] !== q[3]) n++;
    }
  return n;
}

/**
 * Prints the art-direction checks that can be measured: one canvas size per sprite, loops whose
 * seam (last -> first) is no bigger than their ordinary steps, rooted bases that never move, and
 * empty/non-empty one-shot ends.
 */
function lint(list: WorldSprite[]): void {
  for (const s of list) {
    const all = Object.values(s.anims).flatMap((a) => a.frames);
    const sizes = new Set(all.map((f) => `${f.w}x${f.h}`));
    const notes: string[] = [sizes.size === 1 ? `one canvas ${[...sizes][0]}` : `SIZES DIFFER ${[...sizes].join(' ')}`];
    for (const [k, a] of Object.entries(s.anims)) {
      if (a.frames.length < 2) continue;
      const steps = a.frames.slice(1).map((f, i) => diffRows(a.frames[i], f));
      if (a.loop !== false) {
        const seam = diffRows(a.frames[a.frames.length - 1], a.frames[0]);
        notes.push(`${k}: seam ${seam} px vs steps ${Math.min(...steps)}-${Math.max(...steps)}${seam > Math.max(...steps) * 1.25 ? ' SEAM JUMP' : ''}`);
      } else {
        const last = a.frames[a.frames.length - 1].bounds();
        notes.push(`${k}: steps ${Math.min(...steps)}-${Math.max(...steps)}, last frame ${last ? 'drawn' : 'EMPTY'}`);
      }
    }
    // Rooted: the rows around the anchor (the neck root, the body's ground contact) never change in the idle loop.
    const idle = s.anims.idle;
    if (idle && s.name.startsWith('hydra_neck')) {
      const moved = idle.frames.slice(1).reduce((t, f) => t + diffRows(idle.frames[0], f, s.anchor[1] - 12, s.anchor[1] + 4), 0);
      notes.push(`root rows ${moved === 0 ? 'fixed' : `MOVE (${moved} px)`}`);
    }
    if (idle && s.name === 'hydra_body') {
      const moved = idle.frames.slice(1).reduce((t, f) => t + diffRows(idle.frames[0], f, s.anchor[1] - 8, s.anchor[1] + 1), 0);
      notes.push(`ground rows ${moved === 0 ? 'fixed' : `MOVE (${moved} px)`}`);
    }
    // Value budget of the first frame: share of each ramp step over the lit materials (outline excluded).
    const fr = Object.values(s.anims)[0].frames[0];
    const cnt = [0, 0, 0, 0, 0, 0];
    const key = new Map<number, number>();
    for (const ramp of [R.scale, R.gold, R.belly, R.mouth, R.teeth, R.charred]) ramp.forEach((c, i) => key.set((c[0] << 16) | (c[1] << 8) | c[2], i));
    for (let y = 0; y < fr.h; y++)
      for (let x = 0; x < fr.w; x++) {
        const c = fr.get(x, y);
        if (c[3] < 250) continue;
        const st = key.get((c[0] << 16) | (c[1] << 8) | c[2]);
        if (st !== undefined) cnt[st]++;
      }
    const tot = cnt.slice(1).reduce((a, b) => a + b, 0) || 1;
    notes.push(`steps 1-5: ${cnt.slice(1).map((v) => Math.round((v / tot) * 100) + '%').join(' ')}`);
    const solid = fr.bounds(200);
    if (solid) notes.push(`solid ${solid[2] - solid[0] + 1}x${solid[3] - solid[1] + 1} px`);
    console.log(`check ${s.name}: ${notes.join('; ')}`);
  }
}

// ================================================================================================
// main
// ================================================================================================

const OUT = previewDir();
const ROOT = process.env.WORLD_OUT ?? join(import.meta.dirname, '../../src/assets/world');

const t0 = Date.now();
const body = bodySprite();
const necks = NECKS.map((d) => {
  const spec = neckSpecOf(d);
  const na = neckAnims(d, spec);
  const built = finish(spec.name, spec.label, [0, 0], ['creature', 'boss'], na.anims, NECK_OX, NECK_OY);
  const idle0 = built.sprite.anims.idle.frames[0].bounds()!;
  built.sprite.meters = [+((idle0[2] - idle0[0] + 1) / PX_PER_M).toFixed(2), +((idle0[3] - idle0[1] + 1) / PX_PER_M).toFixed(2)];
  return { d, spec, built, head: na.head, mouth: na.mouth };
});
const stump = stumpSprite();
const venom = venomSprite();
const splash = splashSprite();
const sprites: WorldSprite[] = [body.built.sprite, ...necks.map((n) => n.built.sprite), stump.sprite, venom.sprite, splash.sprite];
writeGroup('creatures', sprites);

// The rig: where each neck joins the body (relative to the body's anchor), its layer, and where its
// head center and mouth tip are in idle frame 0 (relative to the neck's anchor).
const bodyAnchorWork: V2 = [body.built.sprite.anchor[0] + body.built.crop[0], body.built.sprite.anchor[1] + body.built.crop[1]];
const rig = {
  body: 'hydra_body',
  stump: 'hydra_stump',
  venom: 'hydra_venom',
  splash: 'hydra_splash',
  heads: necks.map(({ d, spec, head, mouth }) => {
    const rx = BODY_OX + d.root[0], ry = BODY_OY - d.root[1] - K * d.root[2];
    return {
      sprite: spec.name,
      attach: [Math.round(rx - bodyAnchorWork[0]), Math.round(ry - bodyAnchorWork[1])],
      layer: d.layer,
      head: [Math.round(head[0] - NECK_OX), Math.round(head[1] - NECK_OY)],
      mouth: [Math.round(mouth[0] - NECK_OX), Math.round(mouth[1] - NECK_OY)],
    };
  }),
  // Body frames move the neck roots: add follow[anim][frame] to every attach point.
  follow: body.follow,
};
writeFileSync(join(ROOT, 'creatures', 'hydra.json'), JSON.stringify(rig, null, 1) + '\n');
// The kit preview: the lineup and strips of the body, the tall center neck and the small sprites
// (all seven necks' strips would make a 250-megapixel sheet; see hydra-anims*.png for every one).
preview([body.built.sprite, necks[0].built.sprite, stump.sprite, venom.sprite, splash.sprite], join(OUT, 'creatures.png'), { scale: 2 });
console.log(`rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const s of sprites) {
  const fr = Object.values(s.anims)[0].frames[0];
  const b = fr.bounds()!;
  console.log(`${s.name.padEnd(14)} frame ${fr.w}x${fr.h} anchor ${s.anchor} opaque ${b[2] - b[0] + 1}x${b[3] - b[1] + 1} (${((b[2] - b[0] + 1) / PX_PER_M).toFixed(2)} x ${((b[3] - b[1] + 1) / PX_PER_M).toFixed(2)} m)`);
}
lint(sprites);
deliverables(ROOT, OUT);
