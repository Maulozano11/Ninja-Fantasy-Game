/**
 * A flight wing, rasterized from its planform: span s (0 shoulder .. 1 tip) by chord c (+ toward
 * the leading edge, in chords). The arm (s < 0.45) and hand rotate separately; the span projects
 * through the camera onto screen y, the chord runs along screen x with the tip swept back. Each
 * pixel center is mapped back to (s, c), so the feathers land on whole pixels:
 *  - top side: a lit sheen rim on the leading edge, a lighter covert band, darker flight feathers
 *    with seams between the secondaries;
 *  - underside: one or two steps darker, a faint rim;
 *  - the hand splits into `fingers` tapered primaries that fan apart toward their tips.
 */
function drawWing(b: Buf, st: BirdStyle, root: P2, len: number, chord: number, wf: WingFrame, near: boolean, layer?: number): void {
  const sw = 0.45;
  let kA = wingDir(wf.arm, near) * len * wf.span, kH = wingDir(wf.hand, near) * len * wf.span;
  // Edge-on panels keep a sliver of thickness.
  if (Math.abs(kA * sw) < 1.6) kA = (kA >= 0 ? 1.6 : -1.6) / sw;
  if (Math.abs(kH * (1 - sw)) < 1.6) kH = (kH >= 0 ? 1.6 : -1.6) / (1 - sw);
  const A = wingLight(wf.arm, near), Hh = wingLight(wf.hand, near);
  const far = near ? 0 : 1;
  const part = b.newPart({ line: 0, layer });
  const n = st.fingers;
  const le = (s: number): number => (s < 0.84 ? 0.3 + 0.06 * Math.sin((Math.PI * s) / 0.84) : 0.3 - 0.3 * ((s - 0.84) / 0.16) ** 2);
  const te = (s: number): number => (s < 0.5 ? -0.72 : -0.72 + st.wingTaper * ((s - 0.5) / 0.5) ** 1.2);
  const xA = wingDx(wf.arm, near) * len * wf.span, xH = wingDx(wf.hand, near) * len * wf.span;
  const sweep = (s: number): number => ((wf.sweep * Math.max(0, s - sw)) / (1 - sw)) * 1.4 - (s < sw ? xA * s : xA * sw + xH * (s - sw));
  const yW = root[1] + kA * sw;
  const ys = [root[1], yW, yW + kH * (1 - sw)];
  const y0 = Math.floor(Math.min(...ys)) - 1, y1 = Math.ceil(Math.max(...ys)) + 1;
  const x0 = Math.floor(root[0] - chord * 1.2 - wf.sweep * 1.5 - Math.abs(xA) - Math.abs(xH)) - 1, x1 = Math.ceil(root[0] + chord * 0.6 + Math.abs(xA) + Math.abs(xH)) + 1;
  const fingerStart = 0.62;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const py = y + 0.5, px = x + 0.5;
      // Hand first (the outer, overlapping panel), then arm.
      let s = -1, hand = false;
      const sh = sw + (py - yW) / kH;
      if (sh >= sw && sh <= 1) {
        s = sh;
        hand = true;
      } else {
        const sa = (py - root[1]) / kA;
        if (sa >= 0 && sa < sw) s = sa;
      }
      if (s < 0) continue;
      const c = (px - root[0] + sweep(s)) / chord;
      const c0 = te(s), c1 = le(s);
      if (c < c0 || c > c1) continue;
      const u = (c - c0) / Math.max(1e-3, c1 - c0); // 0 trailing .. 1 leading
      const side = hand ? Hh : A;
      // Primaries: `n` feathers side by side, each narrowing toward its own tip so they fan apart.
      let seam = false;
      if (hand && n > 1 && s > fingerStart) {
        const fi = Math.min(n - 1, Math.floor(u * n));
        const fr = u * n - fi;
        const tipS = 1 - 0.07 * (n - 1 - fi);
        if (s > tipS) continue;
        const k = (s - fingerStart) / (tipS - fingerStart);
        const wFrac = 1 - 0.5 * k * k; // the feather's share of its slot
        if (fr > wFrac) continue;
        seam = fr > wFrac - 0.22 && fi < n - 1;
      } else if (hand && n > 1) {
        const fr = (u * n) % 1;
        seam = fr > 0.8 && u < (n - 1) / n;
      }
      let step: number;
      if (!side.under) {
        step = quant(side.light + (st.wingBias ?? 0), x - root[0], y - root[1], st.cuts, st.jitter, 3, 5);
        if (u > 0.86 && s < 0.9) step = Math.max(step, 4); // sheen along the leading edge
        else if (u > 0.5 && s < fingerStart) step = Math.min(4, step + 1); // coverts
        else step = Math.min(step, 3); // flight feathers
        if (!hand && Math.abs(u - 0.5) < 0.07) step = Math.max(1, step - 1); // covert seam
        if (!hand && u < 0.5 && Math.abs(((s * len * 0.5) % 2.4) - 1.2) < 0.3) step = Math.max(1, step - 1); // secondary seams
      } else {
        step = u > 0.86 && s < 0.9 ? 3 : quant(side.light - 0.15, x - root[0], y - root[1], st.cuts, st.jitter, 3, 5) >= 3 ? 2 : 1;
        if (!hand && u < 0.5 && Math.abs(((s * len * 0.5) % 2.4) - 1.2) < 0.3) step = 1;
      }
      if (seam) step = Math.max(1, step - 1);
      b.put(x, y, st.wing, clamp(step - far, 1, 5), part);
    }
}

