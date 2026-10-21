// --- walls ----------------------------------------------------------------------------------------

/** Per column, the lowest drawn pixel of a layer (-1 where the column is empty). */
function feet(L: Layer): number[] {
  const f = new Array<number>(L.w).fill(-1);
  for (let x = 0; x < L.w; x++) for (let y = L.h - 1; y >= 0; y--) if (L.get(x, y)) {
    f[x] = y;
    break;
  }
  return f;
}
/** Per column, the highest drawn pixel of a layer (L.h where the column is empty). */
function tops(L: Layer): number[] {
  const f = new Array<number>(L.w).fill(L.h);
  for (let x = 0; x < L.w; x++) for (let y = 0; y < L.h; y++) if (L.get(x, y)) {
    f[x] = y;
    break;
  }
  return f;
}

/**
 * Enclosed see-through pixels of a frame (alpha under 128 that the outside cannot reach, 4-way,
 * through other such pixels), as a mask.
 */
function enclosed(c: Canvas): Uint8Array {
  const { w, h } = c;
  const open = new Uint8Array(w * h), seen = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) open[i] = c.px[i * 4 + 3] < 128 ? 1 : 0;
  const st: number[] = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (open[y * w + x] && !seen[y * w + x]) (seen[y * w + x] = 1), st.push(y * w + x);
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (open[y * w + x] && !seen[y * w + x]) (seen[y * w + x] = 1), st.push(y * w + x);
  while (st.length) {
    const i = st.pop()!, x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const u = x + dx, v = y + dy;
      if (u < 0 || v < 0 || u >= w || v >= h) continue;
      const j = v * w + u;
      if (open[j] && !seen[j]) (seen[j] = 1), st.push(j);
    }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = open[i] && !seen[i] ? 1 : 0;
  return out;
}

/**
 * His stone is solid: every enclosed see-through pixel on or next to the stone frame (`near`), and
 * any enclosed pinhole of 12 px or less elsewhere, takes the commonest opaque colour round it
 * (repeated inward). Returns the frame and how many pixels were sealed.
 */
function sealFrame(c: Canvas, near: (x: number, y: number) => boolean): [Canvas, number] {
  const out = c.clone();
  const { w, h } = c;
  const hole = enclosed(c);
  // (the pockets: 4-connected groups of enclosed pixels)
  const seen = new Uint8Array(w * h);
  let todo: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!hole[i] || seen[i]) continue;
    const pc: number[] = [], st = [i];
    seen[i] = 1;
    let touches = false;
    while (st.length) {
      const j = st.pop()!, x = j % w, y = (j / w) | 0;
      pc.push(j);
      if (near(x, y)) touches = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const k = v * w + u;
        if (hole[k] && !seen[k]) (seen[k] = 1), st.push(k);
      }
    }
    if (touches || pc.length <= 12) todo = todo.concat(pc);
  }
  const n = todo.length;
  let guard = 0;
  while (todo.length && guard++ < 64) {
    const next: number[] = [], fills: [number, Color][] = [];
    for (const j of todo) {
      const x = j % w, y = (j / w) | 0;
      const votes = new Map<string, [number, Color]>();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const col = out.get(x + dx, y + dy);
        if (col[3] < 200) continue;
        const key = col.join(',');
        const e = votes.get(key);
        votes.set(key, [(e?.[0] ?? 0) + 1, col]);
      }
      let best: [number, Color] | null = null;
      for (const [, e] of [...votes.entries()].sort((p, q) => (p[0] < q[0] ? -1 : 1))) if (!best || e[0] > best[0]) best = e;
      if (best) fills.push([j, best[1]]);
      else next.push(j);
    }
    for (const [j, col] of fills) out.set(j % w, (j / w) | 0, col);
    if (!fills.length) break;
    todo = next;
  }
  return [out, n];
}

/** Holes left in the stone after sealing, per wall frame (the build fails on any). */
const WALL_HOLES: string[] = [];

/**
 * His framed slime barrier (straight or 3/4). `idle`: a soft light runs across his hexagon cells
 * (one ramp step up where it passes), the dripping slime on top churns and licks, the bubbles and
 * drops bob, his runes pulse. `rise`: the stone frame pushes up out of the ground block by block
 * (each post whole, and the base beam whole along its own foot line, so nothing comes up broken),
 * the slime filling it from the beam up and riding with the beam; the bubbling top and the drops
 * come up last, with the glow round the top; his light on the ground grows with it; the last frame
 * is his picture (idle frame 0). His stone is solid on every frame (enclosed see-through pixels are
 * sealed, and the build fails if any remain).
 */
function wall(kind: 'wall' | 'wall_diag', label: string, seed: number): WorldSprite {
  const K = key(kind);
  const blocks = [K.part('frame0'), K.part('frame1'), K.part('frame2')];
  const slime = K.part('main'), drops = K.part('drops'), light = K.part('glow');
  // (what of his slime lies above a post's stone in its column is slime, not post: it must not
  // rise with the post)
  for (const k of [0, 1]) {
    const Bk = blocks[k];
    for (let x = 0; x < K.w; x++) {
      let st = -1;
      for (let y = 0; y < K.h && st < 0; y++) if (Bk.get(x, y) && FAM[Bk.get(x, y) - 1] === 'neutral') st = y;
      for (let y = 0; y < st; y++) if (Bk.get(x, y)) {
        slime.set(x, y, Bk.get(x, y));
        Bk.set(x, y, 0);
      }
    }
  }
  // (his slime's own colours on a post where it touches the slime: the slime spilling over the
  // capitals; up to 3 px in from the slime, saturated green only, so his runes stay stone)
  const satGreen = (v: number) => v > 0 && FAM[v - 1] === 'green' && (KIND[v - 1] === 'outline' || Math.max(...PAL[v - 1].slice(0, 3)) - Math.min(...PAL[v - 1].slice(0, 3)) >= 45);
  for (const k of [0, 1]) {
    const Bk = blocks[k];
    for (let step = 0; step < 3; step++) {
      const mv: number[] = [];
      for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
        if (!satGreen(Bk.get(x, y))) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isKind(slime.get(x + dx, y + dy), 'body') && FAM[slime.get(x + dx, y + dy) - 1] === 'green')) mv.push(y * K.w + x);
      }
      for (const j of mv) {
        slime.v[j] = Bk.v[j];
        Bk.v[j] = 0;
      }
    }
  }
  // (small loose bits of his slime and light inside the frame's outline, not touching its stone:
  // they come up with his light on the ground, not with the stone)
  const bits = slime.empty();
  for (const Bk of blocks) {
    const ps = pieces(Bk).sort((a, b) => b.length - a.length);
    for (const pc of ps.slice(1)) {
      if (pc.length > 40 || pc.some((j) => FAM[Bk.v[j] - 1] === 'neutral')) continue;
      for (const j of pc) {
        bits.v[j] = Bk.v[j];
        Bk.v[j] = 0;
      }
    }
  }
  const frame = union(...blocks);
  /**
   * His stone is lit green by the slime (his mossy green-grey stone): until the slime has come up,
   * the stone is its own grey (the nearest stone colour by brightness); the green light on it comes
   * in with the slime, in patches. His glowing runes (saturated green) keep their colour.
   */
  const unlit = (() => {
    const map = new Int16Array(PAL.length + 1);
    for (let v = 1; v <= PAL.length; v++) {
      map[v] = v;
      const c = PAL[v - 1];
      if (KIND[v - 1] !== 'body' || FAM[v - 1] !== 'green' || Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) >= 45) continue;
      let best = 1e9;
      for (let w = 1; w <= PAL.length; w++) {
        if (KIND[w - 1] !== 'body' || FAM[w - 1] !== 'neutral') continue;
        const dl = Math.abs(lumOf(PAL[w - 1]) - lumOf(c));
        if (dl < best) {
          best = dl;
          map[v] = w;
        }
      }
    }
    return (L: Layer, lit: number): Layer => {
      if (lit >= 1) return L;
      const out = L.clone();
      for (let i = 0; i < out.v.length; i++) if (out.v[i] && grain(i % L.w, (i / L.w) | 0, seed + 9) >= lit) out.v[i] = map[out.v[i]];
      return out;
    };
  })();
  const top = tops(slime);
  // Smoothed top line of the slime: the bubbling top is the band below it.
  const topS = top.map((_, x) => {
    let s = 0, n = 0;
    for (let k = -6; k <= 6; k++) {
      const v = top[clamp(x + k, 0, K.w - 1)];
      if (v < K.h) {
        s += v;
        n++;
      }
    }
    return n ? s / n : K.h;
  });
  const topBand = (x: number, y: number) => 1 - smooth(topS[x] + 10, topS[x] + 18, y);
  const dir: [number, number] = kind === 'wall' ? [1, 0.35] : [1, -0.2];
  const idleAt = (t: number) => {
    let s = shimmer(slime, t, { period: 46, dir, width: 0.16, where: (x, y) => 1 - topBand(x, y) });
    s = churn(s, t, { amp: 1.4, ampY: 1.2, cell: 6, seed, where: topBand, flow: [0, -0.8] });
    s = wobble(s, t, 0.9, 9, seed + 1, (x, y) => topBand(x, y) * smooth(topS[x] + 6, topS[x] - 4, y));
    const runes = union(tone(frame, (x, y) => {
      const v = frame.get(x, y);
      return FAM[v - 1] === 'green' ? Math.round(0.5 - 0.5 * Math.cos(t * TAU)) : 0;
    }), bits);
    const d = moveDrops(drops, (k) => {
      const ph = rr(seed + 2, k, 0, TAU);
      return bob(t, ph, 1.2);
    });
    return { s, runes, d };
  };
  // The stone's footprint (grown by 2): enclosed see-through pockets there are sealed.
  const near = (L: Layer) => (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (L.get(x + dx, y + dy)) return true;
    return false;
  };
  const sealed = (c: Canvas, fr: Layer, tag: string): Canvas => {
    const [out, n] = sealFrame(c, near(fr));
    const left = enclosed(out);
    let bad = 0;
    const nr = near(fr);
    for (let i = 0; i < left.length; i++) if (left[i] && nr(i % out.w, (i / out.w) | 0)) bad++;
    if (bad) WALL_HOLES.push(`${kind} ${tag}: ${bad} see-through px in the stone`);
    if (process.env.POISON_LIGHT && n) console.log(`seal ${kind} ${tag}: ${n} px`);
    return out;
  };
  const idle = range(IDLE).map((i) => {
    const { s, runes, d } = idleAt(i / IDLE);
    return sealed(stackC(K.w, K.h, light, runes, s, d), frame, `idle[${i}]`);
  });
  // The rise: each block of the frame pushes up out of the ground over frames 0-4 (by its own
  // height, cut at its own foot line); from frame 2 the slime fills it from the beam up at an even
  // pace, riding with the beam while the beam is still coming up; the drops and the glow round
  // the bubbling top come up with the top over 8-10; his light on the ground grows evenly over
  // frames 2-10. Frame 11 is his picture.
  const blk = blocks.map((B) => {
    const f = feet(B), t = tops(B);
    let hmax = 0;
    for (let x = 0; x < K.w; x++) if (f[x] >= 0) hmax = Math.max(hmax, f[x] - t[x]);
    return { B, f, hmax };
  });
  const raw = feet(slime);
  // The beam's foot line (a straight line under its lowest feet) and its thickness above it.
  let fa = 0, fb = 0;
  {
    let pts = blk[2].f.map((f, x) => [x, f] as [number, number]).filter((p) => p[1] >= 0);
    for (let it = 0; it < 4; it++) {
      const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
      const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
      fb = sxx ? sxy / sxx : 0;
      fa = my - fb * mx;
      pts = pts.filter((p) => p[1] >= fa + fb * p[0] - 2);
    }
    fa += Math.max(0, ...blk[2].f.map((f, x) => (f < 0 ? 0 : f - (fa + fb * x))));
  }
  const beamFoot = (x: number) => fa + fb * x;
  const beamT = tops(blk[2].B);
  const beamTh = beamT.map((t, x) => (blk[2].f[x] < 0 ? -1 : beamFoot(x) - t)).filter((v) => v >= 0).sort((a, b) => a - b);
  const beamH = beamTh[Math.floor(beamTh.length * 0.9)], beamMed = beamTh[beamTh.length >> 1];
  // The beam as stone all along, for the rise: where his slime drips over its top edge (hidden
  // under the slime in his picture), its edge is carried on from the nearest columns along its
  // foot line, so before the slime comes up the beam's top edge is whole.
  const beamFull = blk[2].B.clone();
  for (let x = 0; x < K.w; x++) {
    if (blk[2].f[x] < 0) continue;
    for (let y = Math.ceil(beamFoot(x) - beamMed); y <= beamFoot(x); y++) {
      if (blk[2].B.get(x, y) || !slime.get(x, y)) continue;
      const off = beamFoot(x) - y;
      for (let k = 1; k <= 24; k++) {
        const v = [x - k, x + k].map((u) => blk[2].B.get(u, Math.round(beamFoot(u) - off))).find((w) => w > 0);
        if (v) {
          beamFull.set(x, y, v);
          break;
        }
      }
    }
  }
  // The ground line under the slime: a straight line through the feet of its columns (the
  // highest feet, where the slime only shows above the posts, are dropped and the line refitted).
  let ga = 0, gb = 0;
  {
    let pts = raw.map((f, x) => [x, f] as [number, number]).filter((p) => p[1] >= 0);
    for (let it = 0; it < 4; it++) {
      const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
      const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
      gb = sxx ? sxy / sxx : 0;
      ga = my - gb * mx;
      pts = pts.filter((p) => p[1] >= ga + gb * p[0] - 4);
    }
  }
  const ground = (x: number) => ga + gb * x;
  const hMax = Math.max(...top.map((tp, x) => (tp >= K.h ? 0 : ground(x) - tp))) + 4;
  // His glow round the bubbling top (above the band's foot) comes up with the top; the rest of his
  // light lies on the ground.
  const topGlow = light.empty(), groundGlow = light.empty();
  for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
    const v = light.get(x, y);
    if (!v) continue;
    (topS[x] < K.h && y < topS[x] + 20 && y < ground(x) - 10 ? topGlow : groundGlow).set(x, y, v);
  }
  // The posts as stone all along, for the rise: in each row, where his slime lay over a post (its
  // capital's top, between its own pixels), the stone is carried on from the nearest stone in the row.
  const postFull = [0, 1].map((k) => {
    const Bk = blk[k].B, out = Bk.clone();
    for (let y = 0; y < K.h; y++) {
      let x0 = -1, x1 = -1;
      for (let x = 0; x < K.w; x++) if (Bk.get(x, y)) {
        if (x0 < 0) x0 = x;
        x1 = x;
      }
      for (let x = x0 + 1; x < x1; x++) {
        if (Bk.get(x, y) || !slime.get(x, y)) continue;
        for (let k2 = 1; k2 < K.w; k2++) {
          const v = Bk.get(x - k2, y) || Bk.get(x + k2, y);
          if (v) {
            out.set(x, y, v);
            break;
          }
        }
      }
    }
    // (and in each column, where his slime ran across the post's neck between its stone)
    for (let x = 0; x < K.w; x++) {
      let y0 = -1, y1 = -1;
      for (let y = 0; y < K.h; y++) if (Bk.get(x, y)) {
        if (y0 < 0) y0 = y;
        y1 = y;
      }
      for (let y = y0 + 1; y < y1; y++) {
        if (out.get(x, y) || !slime.get(x, y)) continue;
        for (let k2 = 1; k2 < K.h; k2++) {
          const v = Bk.get(x, y - k2) || Bk.get(x, y + k2);
          if (v) {
            out.set(x, y, v);
            break;
          }
        }
      }
    }
    return out;
  });
  const full = [postFull[0], postFull[1], beamFull];
  // Per block, its pixels next to his slime (and on which side), for the rise.
  const slimeEdge = full.map((Bf) => {
    const out: [number, number, [number, number][]][] = [];
    for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
      if (!Bf.get(x, y)) continue;
      const offs = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]).filter(([dx, dy]) => slime.get(x + dx, y + dy) && !full.some((F) => F.get(x + dx, y + dy)));
      if (offs.length) out.push([x, y, offs]);
    }
    return out;
  });
  const ease = (u: number) => 1 - Math.pow(1 - clamp(u, 0, 1), 1.6);
  const rise = range(RISE).map((i) => {
    if (i === RISE - 1) return idle[0];
    const pf = ease((i + 1) / 5), ps = clamp((i - 1.5) / 9.5, 0, 1), pt = clamp((i - 7) / 3, 0, 1);
    const dB = blk.map((b) => Math.round((1 - pf) * (b.hmax + 2)));
    // (the base beam: cut at each column's own (ragged) foot it would come up in dashes, so it is
    // pushed up whole out of one straight foot line along its length (along the diagonal for the
    // 3/4 wall), and its top edge comes up at once, unbroken)
    const push = (b: (typeof blk)[number]) => {
      const d = Math.round((1 - pf) * (beamH + 2));
      return remap(beamFull, (x, y) => (b.f[x] < 0 || y > beamFoot(x) + 0.5 ? null : [x, y - d]));
    };
    const shift = blk.map((b, k) => (k === 2 ? Math.round((1 - pf) * (beamH + 2)) : dB[k]));
    const fr = unlit(union(...blk.map((b, k) => (k === 2 ? (shift[2] === 0 ? beamFull : push(b)) : remap(full[k], (x, y) => (b.f[x] < 0 || y > b.f[x] ? null : [x, y - dB[k]]))))), clamp((i - 3) / 7, 0, 1));
    // (the slime rides on the beam while the beam is still coming up)
    dB[2] = shift[2];
    let sl: Layer | null = null;
    if (ps > 0) {
      const { s } = idleAt(fract((i - (RISE - 1)) / IDLE));
      sl = cut(s, (x, y) => ground(x) - y <= ps * hMax + 2.5 * (pnoise(x, i * 3, 6, 0, 0, seed + 4) - 0.5) * 2, 4);
      if (dB[2]) {
        // (it rides with the beam, never below the ground it stands on)
        const bf = blk[2].f;
        sl = remap(sl, (x, y) => (y > Math.max(raw[x], bf[x]) ? null : [x, y - dB[2]]));
      }
    }
    const d = pt > 0 ? cut(drops, (x, y) => grain(x, y, seed + 6) < pt, 0, false) : null;
    // (the glow round the bubbling top only where the top already is: within 3 px of the slime)
    const tg = pt > 0 && sl ? remap(glowMul(topGlow, pt), (x, y) => {
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (isKind(sl!.get(x + dx, y + dy), 'body')) return [x, y];
      return null;
    }) : null;
    const gk = clamp((i - 1) / 9, 0, 1);
    const lt = union(glowMul(groundGlow, gk), tg);
    const bt = gk > 0 ? cut(bits, (x, y) => grain(x, y, seed + 8) < gk, 0, false) : null;
    // (where his slime covered the stone's edge and it has not come up yet, the stone ends in his
    // dark stone rim, so a capital or a post is never left open on the side the slime hid)
    const frR = fr.clone();
    blk.forEach((b, k) => {
      for (const [x, y, offs] of slimeEdge[k]) {
        const yo = y + shift[k];
        if (fr.get(x, yo) === 0 || !isKind(fr.get(x, yo), 'body')) continue;
        if (offs.some(([dx, dy]) => !fr.get(x + dx, yo + dy) && !(sl && sl.get(x + dx, yo + dy)))) frR.set(x, yo, RIM.neutral);
      }
    });
    return sealed(stackC(K.w, K.h, lt, frR, bt, sl, d), fr, `rise[${i}]`);
  });
  return vfxSprite(kind, label, [K.ax, K.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 10, loop: true } });
}

// --- the end-on wall: OURS (vfx-b-poison.ts), kept as the owner asked -----------------------------
// Copied from vfx-b-poison.ts (unchanged there): its palettes, drops, bubbles, fumes and the mist
// curtain volume, with the same seeds, so idle frame 0 is our wall exactly.

/** 0 outline, 1 very dark green, 2 deep green, 3 forest, 4 green, 5 toxic green, 6 acid yellow-green, 7 pale lime, 8 white-lime. */
const OP = B.pal('#0a1f0e', '#123e18', '#1b5e22', '#247e2a', '#36a42c', '#58c82a', '#9ee22c', '#d6f772', '#f6ffd4');
/** Sickly purple accent: 0 outline .. 5 light. */
const OPUR = B.pal('#1e0a28', '#3e1656', '#642a86', '#8c44ae', '#b474d6', '#dcaaf0');
const OWW = 272, OWALL_H = 103, OWALL_W = 257, MIST_HALF = 15;

function oBubbles(c: Canvas, list: [number, number, number][], o: { purple?: boolean; alpha?: number } = {}): void {
  const l = new B.L(c.w, c.h);
  for (const [x, y, r] of list) {
    if (r < 1) {
      l.set(x, y, 7);
      continue;
    }
    l.disc(x, y, r, 4);
    l.erase((px, py) => Math.hypot(px + 0.5 - x, py + 0.5 - y) < r - 1);
    l.set(x - r * 0.4, y - r * 0.4, 8);
  }
  if (o.purple) l.map((v) => (v === 4 ? 4 : 5));
  l.render(c, o.purple ? OPUR : OP, { outline: null, alpha: o.alpha });
}
function oDrop(l: B.L, x: number, y: number, r: number, len: number, ang = Math.PI / 2): void {
  const tail = B.polar(x, y, len, ang + Math.PI);
  l.tube([tail, [x, y]], [0.3, r * 0.75], 1);
  l.disc(x, y, r, 1);
}
function oDrops(c: Canvas, list: [number, number, number, number][], o: { purple?: boolean; alpha?: number } = {}): void {
  const l = new B.L(c.w, c.h);
  for (const [x, y, r, len] of list) oDrop(l, x, y, Math.max(1.5, r), len);
  l.bands([1, 2], [6, 7, 8]);
  for (const [x, y, r] of list) if (r >= 1.5) l.set(x - r * 0.4, y - r * 0.4, 8);
  l.render(c, o.purple ? OPUR : OP, { alpha: o.alpha, outlineAlpha: o.alpha });
}
function oFumes(c: Canvas, list: B.Puff[], o: { seed?: number; alpha?: number; purple?: boolean; steps?: number[]; wrapX?: boolean } = {}): void {
  const l = new B.L(c.w, c.h);
  B.puffs(l, list, { steps: o.steps ?? (o.purple ? [1, 2, 3, 4, 5] : [2, 3, 4, 5, 6, 7]), rim: o.purple ? 1 : 2, seed: o.seed ?? 3, wobble: 0.45, wrapX: o.wrapX });
  l.clean(1, o.wrapX);
  l.render(c, o.purple ? OPUR : OP, { alpha: o.alpha, outlineAlpha: o.alpha, wrapX: o.wrapX });
}
const orange = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** Our mist curtain as a gas volume, seen end-on (vfx-b-poison.ts `mist3d`, unchanged). */
function mist3d(o: Orient, hk: number, t: number): Canvas {
  const c = new Canvas(o.w, o.h);
  const hu = new Float32Array(LEN + 41);
  for (let i = 0; i < hu.length; i++) {
    const x = i - 20 + (OWW - OWALL_W) / 2;
    hu[i] = Math.max(1, OWALL_H * hk * (0.68 + 0.24 * B.pnoise(x, 0, 20, OWW, 141) + 0.1 * Math.abs(Math.sin((x / OWW) * TAU * 7 + t * TAU))));
  }
  const D = (u: number, s: number, v: number): number => {
    if (u < -20 || u > LEN + 20 || v < -2) return 0;
    const k = v / hu[Math.round(u) + 20];
    if (k > 1.08) return 0;
    const half = (MIST_HALF + 5 * (1 - B.smooth(0, 12, v))) * (1 - 0.45 * B.smooth(0.25, 1, k));
    const as = Math.abs(s);
    if (as > half) return 0;
    const ends = B.smooth(-4, 16, u) * (1 - B.smooth(LEN - 16, LEN + 4, u));
    return ends * (1 - B.smooth(half * 0.55, half, as)) * (1 - B.smooth(0.62, 1.08, k)) * (0.85 + 0.25 * (1 - B.smooth(0, 0.25, k)));
  };
  const N2 = o.w * o.h;
  const sd = new Float32Array(N2), ua = new Float32Array(N2).fill(-99);
  const uB = (o.dz * PPM) / DPM, sB = (o.nz * PPM) / DPM, vMax = HGT * 1.12;
  for (let py = 0; py < o.h; py++)
    for (let px = 0; px < o.w; px++) {
      const x = (px + 0.5 - o.ax) / PPM, Y = py + 0.5 - o.ay;
      const u0 = ((x - o.ox) * o.dx + (Y / DPM - o.oz) * o.dz) * PPM;
      const s0 = ((x - o.ox) * o.nx + (Y / DPM - o.oz) * o.nz) * PPM;
      let mx = 0, acc = 0, um = -99;
      for (let v = -2; v <= vMax; v += 1) {
        const d = D(u0 + uB * v, s0 + sB * v, v);
        acc += d;
        if (d > mx) {
          mx = d;
          um = u0 + uB * v;
        }
      }
      const i = py * o.w + px;
      sd[i] = mx * (0.82 + 0.22 * (1 - Math.exp(-acc / 10)));
      ua[i] = um;
    }
  const dens = (x: number, y: number): number => (x < 0 || y < 0 || x >= o.w || y >= o.h ? 0 : sd[y * o.w + x]);
  const g = B.gasLayer(o.w, o.h, dens, t, { seed: 142, thr: 0.34, steps: [2, 3, 3, 4, 5, 6, 7], lx: 0 });
  g.map((st, x, y) => {
    const u = ua[y * o.w + x];
    if (u > LEN * 0.66) return Math.max(2, st - 1);
    if (u < LEN * 0.2 && st >= 6) return st + 1;
    return st;
  });
  g.render(c, OP, { alpha: 235, outlineAlpha: 235 });
  oFumes(c, orange(4).map((k) => {
    const ph = B.fract(B.rnd(145, k) + t);
    const q = proj(o, 22 + k * 64 + Math.sin(ph * TAU) * 6, 0, 22 + (B.rnd(146, k) * 0.5 + ph * 0.4) * OWALL_H * hk * 0.8);
    return { x: q[0], y: q[1], r: 6 * (1 - ph * 0.35) };
  }), { purple: true, seed: 147, alpha: 205 });
  return c;
}

/**
 * Our end-on mist curtain with the new frame counts, made of our own frames. `idle` (8 at 10 fps):
 * the even frames 0, 2, 4, 6 are our old idle frames 0-3 pixel for pixel (t = f / 8 runs the same
 * churn); the odd frames lie halfway in time, their bubbles halfway in size. `rise` (12 at 12 fps):
 * our old rise frame 0 was already 73 % of the wall's light, so it now comes up out of the ground
 * first (frames 0-2: pushed up whole, its round top carried along, 15 / 47 / 72 % of its height);
 * frames 3, 5, 7, 9, 10, 11 are our old rise frames 0-5 pixel for pixel, and frames 4, 6, 8 lie
 * halfway between the old frames round them. The last rise frame runs into idle frame 0 as before.
 */
function wallDepth(): WorldSprite {
  const o = orientations().wall_depth;
  const at = (u: number, s: number, v: number): B.Pt => proj(o, u, s, v);
  const HK = [0.2, 0.45, 0.7, 0.92, 1.02, 1];
  /** Bubble k's radius on old idle frame f (every third one big, as before). */
  const bubbleR = (k: number, f: number) => ((k + f) % 3 === 0 ? 2 : 1.2);
  const idle = range(IDLE).map((i) => {
    const t = i / IDLE;
    const c = mist3d(o, 1, t);
    oDrops(c, orange(8).map((k) => {
      const ph = B.fract(B.rnd(143, k) + t);
      const q = at(8 + B.rnd(144, k) * 240, MIST_HALF * 0.6, 60 - ph * 56);
      return [q[0], q[1], 1.6, 2 + ph * 2] as [number, number, number, number];
    }));
    const f0 = Math.floor(i / 2), f1 = (Math.ceil(i / 2)) % (IDLE / 2);
    oBubbles(c, orange(8).map((k) => {
      const q = at(8 + B.rnd(145, k) * 240, (k % 2 ? 1 : -1) * (MIST_HALF + 2 + B.rnd(148, k) * 4), 3 + B.fract(B.rnd(146, k) + t) * 12);
      return [q[0], q[1], (bubbleR(k, f0) + bubbleR(k, f1)) / 2] as [number, number, number];
    }));
    return c;
  });
  /** Our old rise frame f (heights HK, time f / 6, its own drops), exactly as vfx-b-poison.ts drew it. */
  const oldRise = (hk: number, t: number, df: number): Canvas => {
    const c = mist3d(o, hk, t);
    oDrops(c, orange(10).map((k) => {
      const q = at(4 + B.rnd(141, k, df) * 248, MIST_HALF * 0.6, 10 + B.rnd(142, k, df) * 90 * Math.min(1, hk));
      return [q[0], q[1], 1.6, 2] as [number, number, number, number];
    }));
    return c;
  };
  const old0 = oldRise(HK[0], 0, 0);
  // (old frame 0's extent: each column's foot, and the whole curtain's height)
  const foot = new Array<number>(old0.w).fill(-1);
  let yTop = old0.h, yBot = -1;
  for (let x = 0; x < old0.w; x++) for (let y = 0; y < old0.h; y++) if (old0.alpha(x, y)) {
    foot[x] = y;
    yTop = Math.min(yTop, y);
    yBot = Math.max(yBot, y);
  }
  /** Old frame 0 coming up out of the ground: pushed up from below, its round top carried along, each column cut at its own foot. */
  const reveal = (k: number): Canvas => {
    const d = Math.round((1 - k) * (yBot - yTop + 1));
    const c = new Canvas(old0.w, old0.h);
    for (let x = 0; x < old0.w; x++) for (let y = 0; y <= foot[x]; y++) if (y - d >= 0) c.set(x, y, old0.get(x, y - d));
    return c;
  };
  // The rise, re-timed so it starts from (almost) nothing: frames 0-2 push old frame 0 up out of
  // the ground (15 %, 47 %, 72 % of its height), frame 3 is old frame 0, then old frames 1-5 with
  // halfway in-betweens where the old steps were big: 3 old 0, 4 half, 5 old 1, 6 half, 7 old 2,
  // 8 half, 9 old 3, 10 old 4, 11 old 5. Every frame named "old" is our old frame pixel for pixel.
  const plan: (number | [number, number] | { reveal: number })[] = [{ reveal: 0.15 }, { reveal: 0.47 }, { reveal: 0.72 }, 0, [0, 1], 1, [1, 2], 2, [2, 3], 3, 4, 5];
  const rise = plan.map((pl) => {
    if (typeof pl === 'number') return pl === 0 ? old0.clone() : oldRise(HK[pl], pl / 6, pl);
    if (Array.isArray(pl)) return oldRise((HK[pl[0]] + HK[pl[1]]) / 2, (pl[0] + pl[1]) / 12, pl[0]);
    return reveal(pl.reveal);
  });
  return vfxSprite('wall_depth', 'Poison wall (depth): mist curtain (ours, kept)', [o.ax, o.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 10, loop: true } });
}

// --- aura -----------------------------------------------------------------------------------------

/**
 * The tint his aura lays over the figure, as a soft field round the body (not the shape of any one
 * character, so it sits right on every figure): an ellipse centred 50 px above the feet, 46 x 110
 * px, his violet flame colour at the strength fitted on his figure, full out to 60 % of its radius
 * and falling to nothing at its edge (smoothstep, full alpha precision: no rim, no ring, no green
 * edge). It breathes with the frames (alpha +-12 %, size +-2 %), twice a loop.
 */
function veil(w: number, h: number, ax: number, ay: number, frame: number): Canvas {
  const c = new Canvas(w, h);
  const deep = hex(PV3_VEIL.deep);
  const ph = (frame / AURA) * TAU * 2;
  const breathe = 1 + 0.12 * Math.sin(ph), size = 1 + 0.02 * Math.sin(ph);
  const cx = ax, cy = ay - 50, rx = 23 * size, ry = 55 * size;
  const a0 = PV3_VEIL.alpha;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const a = Math.round(a0 * (1 - smooth(0.6, 1, r)) * breathe * 255);
      if (a < 1) continue;
      c.set(x, y, [deep[0], deep[1], deep[2], a]);
    }
  return c;
}

/**
 * His aura in two frame-synchronized layers with the same size and anchor (the feet): `aura_back`
 * goes BEHIND the character (his violet flames rising all round the figure, the green flame
 * strands, the motes and the far half of his pool); `aura` goes OVER it (his tint over the figure
 * and the near half of his pool). The flames lick upward (a rising warp that comes round), the
 * motes drift up, the pool shimmers and the tint breathes.
 */
function aura(): WorldSprite[] {
  const KB = key('aura_back'), KF = key('aura'), seed = 7900;
  const bm = KB.part('main'), bd = KB.part('drops'), bg = KB.part('glow');
  const fm = KF.part('main');
  const back: Canvas[] = [], front: Canvas[] = [];
  for (let i = 0; i < AURA; i++) {
    const t = i / AURA;
    const up = (y: number) => 0.35 + 0.65 * smooth(KB.ay - 4, KB.ay - 80, y);
    // (the tips lick up 2-3 px; the flames' feet barely move)
    const b = wobble(churn(bm, t, { amp: 1.3, ampY: 2.6, cell: 7, seed, flow: [0, -1.8], where: (_x, y) => up(y) }), t, 2.4, 10, seed + 1, (_x, y) => up(y) ** 1.5);
    const d = moveDrops(bd, (k) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return [Math.sin(u * TAU + k) * 1 - Math.sin(k), -6 * u];
    });
    back.push(stackC(KB.w, KB.h, bg, b, d));
    const f = shimmer(fm, t, { period: 30, dir: [1, 0], width: 0.2 });
    front.push(stackC(KF.w, KF.h, veil(KF.w, KF.h, KF.ax, KF.ay, i), f));
  }
  return [
    vfxSprite('aura', 'Poison aura, front layer (draw OVER the character): venom tint and the near pool', [KF.ax, KF.ay], { idle: { frames: front, fps: AURA_FPS, loop: true } }),
    vfxSprite('aura_back', 'Poison aura, back layer (draw BEHIND the character): violet flames and green light', [KB.ax, KB.ay], { idle: { frames: back, fps: AURA_FPS, loop: true } }),
  ];
}

// --- the group ------------------------------------------------------------------------------------

/**
 * No loose bit may be cut by its frame (a droplet that drifts onto the border is dropped). The
 * stream tile wraps by design and the head's left edge is its joint with the tile.
 */
function edgeClean(s: WorldSprite): WorldSprite {
  if (s.name === 'stream') return s;
  const sides = s.name === 'stream_head' ? 'trb' : 'ltrb';
  const anims = Object.fromEntries(Object.entries(s.anims).map(([k, a]) => [k, { ...a, frames: a.frames.map((f) => clearEdgeBits(f, 64, sides)) }]));
  return { ...s, anims };
}

/** No frame may have art on its border (except the stream tile's sides and the head's joint). */
function borderCheck(s: WorldSprite): string[] {
  const bad: string[] = [];
  for (const [an, a] of Object.entries(s.anims))
    a.frames.forEach((f, i) => {
      const sides = { top: 0, bottom: 0, left: 0, right: 0 };
      for (let x = 0; x < f.w; x++) {
        if (f.alpha(x, 0)) sides.top++;
        if (f.alpha(x, f.h - 1)) sides.bottom++;
      }
      for (let y = 0; y < f.h; y++) {
        if (f.alpha(0, y)) sides.left++;
        if (f.alpha(f.w - 1, y)) sides.right++;
      }
      if (s.name === 'stream') sides.left = sides.right = 0;
      if (s.name === 'stream_head') sides.left = 0;
      for (const [side, nPx] of Object.entries(sides)) if (nPx) bad.push(`${s.name} ${an}[${i}] ${side}: ${nPx} px`);
    });
  return bad;
}

/** The sprites in the order of the vfx_poison manifest (beast copied through), then aura_back. */
const ORDER = ['bolt', 'beast', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'aura', 'aura_back', 'wall_diag', 'wall_depth'];

export function poisonV3Sprites(): WorldSprite[] {
  return [
    bolt(), ...stream(), breath(), sphere(), slash(), multi(), hit(), blast(),
    wall('wall', 'Poison wall: slime barrier of hexagon cells in a stone frame with runes', 8000),
    ...aura(),
    wall('wall_diag', 'Poison wall (3/4): framed slime barrier on its lit ground', 8100),
    wallDepth(),
  ].map(edgeClean);
}

function main(): void {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const worldOut = process.env.WORLD_OUT;
  if (!worldOut) throw new Error('vfx-poison-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const beastSrc = join(worldOut, 'vfx_poison', 'beast.png');
  const oldManifest = join(worldOut, 'vfx_poison', 'manifest.json');
  if (!existsSync(beastSrc) || !existsSync(oldManifest)) throw new Error(`vfx-poison-v3: the approved cobra is copied from ${beastSrc}; it is missing`);
  const sprites = poisonV3Sprites();
  if (WALL_HOLES.length) throw new Error('vfx-poison-v3: see-through stone:\n  ' + WALL_HOLES.join('\n  '));
  const bad = sprites.flatMap(borderCheck);
  if (bad.length) throw new Error('vfx-poison-v3: art on the frame border:\n  ' + bad.join('\n  '));
  for (const s of sprites)
    for (const [k, a] of Object.entries(s.anims)) {
      const rowW = a.frames.length * a.frames[0].w;
      if (rowW >= 8192) throw new Error(`vfx-poison-v3: ${s.name}.${k} row is ${rowW} px wide (limit 8192)`);
    }
  // Every file is written whole under a temp folder, then moved in: PNGs first, the manifest last.
  const tmpRoot = join(worldOut, '.vfx-poison-v3-tmp');
  rmSync(tmpRoot, { recursive: true, force: true });
  writeGroup(GROUP, sprites, tmpRoot);
  const tmpDir = join(tmpRoot, GROUP);
  copyFileSync(beastSrc, join(tmpDir, 'beast.png'));
  const ours = JSON.parse(readFileSync(join(tmpDir, 'manifest.json'), 'utf8'));
  const old = JSON.parse(readFileSync(oldManifest, 'utf8'));
  const all: Record<string, unknown> = { ...ours.sprites, beast: old.sprites.beast };
  const manifest = { group: GROUP, pxPerMeter: PX_PER_M, sprites: Object.fromEntries(ORDER.filter((n) => all[n]).map((n) => [n, all[n]])) };
  writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  const dest = join(worldOut, GROUP);
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(tmpDir).sort((a, b) => Number(a === 'manifest.json') - Number(b === 'manifest.json') || (a < b ? -1 : a > b ? 1 : 0));
  for (const f of files) renameSync(join(tmpDir, f), join(dest, f));
  rmSync(tmpRoot, { recursive: true, force: true });
  for (const s of sprites) {
    const f0 = Object.values(s.anims)[0].frames[0];
    const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? ' once' : ''}`).join(' ');
    console.log(`${GROUP} ${s.name.padEnd(12)} ${f0.w}x${f0.h} anchor ${s.anchor} ${anims}`);
  }
  // POISON_LIGHT=1: each frame's light (mean alpha x brightness, per mille), for the flash check.
  if (process.env.POISON_LIGHT)
    for (const s of sprites)
      for (const [k, a] of Object.entries(s.anims)) {
        const e = a.frames.map((f) => {
          let sum = 0;
          for (let i = 0; i < f.px.length; i += 4) sum += (f.px[i + 3] / 255) * ((0.3 * f.px[i] + 0.59 * f.px[i + 1] + 0.11 * f.px[i + 2]) / 255);
          return (sum / (f.w * f.h)) * 1000;
        });
        const peak = Math.max(...e);
        const steps = e.map((v, i) => (i ? Math.abs(v - e[i - 1]) : a.loop !== false ? Math.abs(v - e[e.length - 1]) : 0));
        console.log(`light ${s.name.padEnd(12)} ${k.padEnd(5)} max step ${((Math.max(...steps) / peak) * 100).toFixed(1).padStart(5)} %  [${e.map((v) => v.toFixed(1)).join(' ')}]`);
      }
}

if (process.argv[1] && /vfx-poison-v3\.ts$/.test(process.argv[1])) main();
