// --- blast: a pillar of chakra over a seal circle -----------------------------------------------------

/** The least-squares axis-aligned ellipse through some points: [cx, cy, rx, ry]. */
function fitEllipse(pts: [number, number][]): [number, number, number, number] {
  // A x^2 + C y^2 + D x + E y = 1, by the normal equations.
  const N = range(4).map(() => [0, 0, 0, 0, 0]);
  for (const [x, y] of pts) {
    const r = [x * x, y * y, x, y];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) N[i][j] += r[i] * r[j];
      N[i][4] += r[i];
    }
  }
  for (let i = 0; i < 4; i++) {
    let p = i;
    for (let j = i + 1; j < 4; j++) if (Math.abs(N[j][i]) > Math.abs(N[p][i])) p = j;
    [N[i], N[p]] = [N[p], N[i]];
    for (let j = 0; j < 4; j++) {
      if (j === i) continue;
      const f = N[j][i] / N[i][i];
      for (let c = i; c < 5; c++) N[j][c] -= f * N[i][c];
    }
  }
  const [A, Cc, D, E] = N.map((row, i) => row[4] / row[i]);
  const cx = -D / (2 * A), cy = -E / (2 * Cc), F = 1 + A * cx * cx + Cc * cy * cy;
  return [cx, cy, Math.sqrt(F / A), Math.sqrt(F / Cc)];
}

/** The bright gold pixels of `ix` (pixel centres) where pred holds: what a ring is fitted to. */
function brightGold(ix: Ix, minLum: number, pred: (x: number, y: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      const v = ix.d[y * ix.w + x];
      if (v && KIND[v - 1] === 'gold' && lumOf(PAL[v - 1]) > minLum && pred(x, y)) out.push([x + 0.5, y + 0.5]);
    }
  return out;
}

/** His blue light (the haze), as against the light of his gold (gold-hued and pale glow, warm). */
const blueLight = (v: number): boolean => v > 0 && KIND[v - 1] === 'glow' && CK_PAL[v - 1].hue <= 6;

/**
 * The seal circle, sorted for the frames where it is not all lit (the lead-in and the settle), so
 * it never breaks into pieces. His picture (frame 4) is unchanged by any of it.
 *   - Light goes with what it lights: the blue haze round his gold rings (which the extractor gave
 *     the circle) fades with the haze, and the top of his outer ring (gold, its dark edge and its
 *     pale halo, which his circle's outline cut off into the haze) goes with the circle.
 *   - His third, inner gold ring is rebuilt whole along its own ellipse (fitted to his visible
 *     arcs), from his ring's cross-section, under the hexagram and the pillar: drawn where the
 *     pillar of a frame does not hide it, and beside and under the hexagram lines as they fade.
 *   - The far arcs behind the pillar are his near arcs turned half a turn about the circle's own
 *     centre (fitted to his two outer lines; it lies 2.5 px above the anchor, the ground point),
 *     so they meet his visible ends; the third ring's far half comes from the rebuilt ring.
 */
function sealCircle(k: Key) {
  const MAIN = piece(k, 'main'), SEAL0 = piece(k, 'seal'), P = piece(k, 'pillar'), LN = piece(k, 'lines');
  const at0 = (ix: Ix, x: number, y: number) => ix.d[y * ix.w + x];
  // How far out on his circle (84 x 53 px about the anchor) a pixel is.
  const r0 = (x: number, y: number) => Math.hypot((x + 0.5 - k.ax) / 84, (y + 0.5 - k.ay) / 53);
  const ringTop = keep(MAIN, (x, y, v) => !blueLight(v) && r0(x, y) > 0.8 && r0(x, y) < 1.2);
  const HZ = union(keep(MAIN, (x, y) => !at0(ringTop, x, y)), keep(SEAL0, (_, __, v) => blueLight(v)));
  const SEAL = union(keep(SEAL0, (_, __, v) => !blueLight(v)), ringTop);
  const U = keep(piece(k, 'under'), (x, y) => !at0(HZ, x, y));
  const OUTER = keep(SEAL, (x, y) => r0(x, y) >= 0.58), INNER = keep(SEAL, (x, y) => r0(x, y) < 0.58);
  // The circle's centre: the mean of the centres of his two outer lines.
  const e1 = fitEllipse(brightGold(OUTER, 170, (x, y) => r0(x, y) >= 0.83));
  const e2 = fitEllipse(brightGold(OUTER, 170, (x, y) => r0(x, y) < 0.83));
  const cx = (e1[0] + e2[0]) / 2, cy = (e1[1] + e2[1]) / 2;
  const hidden = (x: number, y: number) => at0(P, x, y) !== 0;
  const mirror = (ix: Ix, into: (x: number, y: number) => boolean) => {
    const out = blank(k.w, k.h);
    for (let y = 0; y < k.h; y++)
      for (let x = 0; x < k.w; x++) if (into(x, y)) out.d[y * k.w + x] = at(ix, Math.floor(2 * cx - x - 0.5), Math.floor(2 * cy - y - 0.5));
    return out;
  };
  const SB = mirror(OUTER, (x, y) => hidden(x, y) && !at0(SEAL, x, y));
  const LB = mirror(keep(LN, (_, __, v) => !isLine(v)), (x, y) => hidden(x, y) && !at0(LN, x, y));
  // The third ring: its ellipse, and his cross-section (the commonest of his values in each half
  // pixel across it).
  const [c3x, c3y, r3x, r3y] = fitEllipse(brightGold(INNER, 150, () => true));
  const across = (x: number, y: number) => {
    const X = x + 0.5 - c3x, Y = y + 0.5 - c3y, th = Math.atan2(Y / r3y, X / r3x);
    return (Math.hypot(X / r3x, Y / r3y) - 1) * Math.hypot(r3x * Math.cos(th), r3y * Math.sin(th));
  };
  const BIN = 0.5, DMAX = 2.25;
  const binOf = (d: number) => Math.floor((d + DMAX) / BIN);
  const votes: Map<number, number>[] = range(binOf(DMAX) + 1).map(() => new Map());
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++) {
      const v = at0(INNER, x, y), d = across(x, y);
      if (v && Math.abs(d) <= DMAX) votes[binOf(d)].set(v, (votes[binOf(d)].get(v) ?? 0) + 1);
    }
  const profile = votes.map((m) => [...m].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0);
  // Where the rebuilt ring may show: behind the pillar, and beside and under the hexagram lines
  // (his ring runs on under them; at his picture's full strength they hide it). Elsewhere his own
  // arcs are kept as they are; inside his ring's gold line his pale glow gives way to the gold.
  const nearLines = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (at(LN, x + dx, y + dy)) return true;
    return false;
  };
  const RING = remap(blank(k.w, k.h), () => 0);
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++) {
      const d = across(x, y);
      if (Math.abs(d) > DMAX || at0(OUTER, x, y)) continue;
      const v = profile[binOf(d)], his = at0(INNER, x, y);
      if (!v || (his && !(KIND[his - 1] === 'glow' && KIND[v - 1] === 'gold'))) continue;
      if (hidden(x, y) || nearLines(x, y)) RING.d[y * k.w + x] = v;
    }
  const RP = keep(RING, hidden), RL = keep(RING, (x, y) => !hidden(x, y));
  return { HZ, U, SEAL, SB, LB, RP, RL, center: [cx, cy] as [number, number], ring3: [c3x, c3y, r3x, r3y] };
}

/** The pillar's top, where it fades out (his panel cut it), cools toward his saturated blues as it goes: faint, it reads as blue haze, not as a grey cap. */
function coolTop(P: Ix, fadeTop: number): Ix {
  return cool(P, (_, y) => (y < fadeTop ? Math.ceil(3 * (1 - y / fadeTop)) : 0));
}

function blast(): WorldSprite {
  const k = key('blast', pads(4));
  const P = coolTop(piece(k, 'pillar'), k.fade.top ?? 0), LN = piece(k, 'lines'), SP = piece(k, 'loose');
  const { HZ, U, SEAL, SB, LB, RP, RL } = sealCircle(k);
  const alphaAt = (a: Alpha, x: number, y: number) => (typeof a === 'number' ? a : a(x, y));
  // What the pillar hides in his picture (the haze, rebuilt from the haze round it; the far arcs of
  // the circle and the hexagram, the far half of the third ring): drawn only where the pillar of a
  // frame is not opaque (its soft front and foot and its fading body show them through), so his
  // picture is unchanged. The pillar piece holds its own halo, so the halo goes with it.
  const behind = (cur: Ix, ix: Ix, a: Alpha = 1) => keep(ix, (x, y) => at(P, x, y) !== 0 && (at(cur, x, y) === 0 || alphaAt(a, x, y) < 1));
  // The haze under whatever of the circle, its lines, the pillar and the sparks a frame leaves out
  // or draws see-through (only what is drawn at full strength hides it, as in his picture).
  const haze = (...cover: [Ix, Alpha][]) => keep(U, (x, y) => cover.every(([c, a]) => at(c, x, y) === 0 || alphaAt(a, x, y) < 1));
  // The far arcs sit IN the haze (as his own arcs beside the pillar do): only their solid gold
  // hides it; their glow lies over it.
  const solid = (ix: Ix) => keep(ix, (_, __, v) => !isLight(v - 1));
  const BACK = union(SB, RP), BACKsolid = solid(BACK);
  const circle = (cur: Ix, a: Alpha = 1) => union(SEAL, behind(cur, BACK, a));
  const sealCover = (cur: Ix, a: Alpha = 1) => union(SEAL, behind(cur, BACKsolid, a));
  const lines = (cur: Ix, a: Alpha = 1) => union(LN, behind(cur, LB, a));
  // The third ring beside and under the hexagram shows as the lines fade (at his picture's full
  // strength they hide it, as in his picture).
  const ringA = (sealA: Alpha, linesA: Alpha): Alpha => (x, y) => alphaAt(sealA, x, y) * clamp((1 - alphaAt(linesA, x, y)) / 0.25, 0, 1);
  const foot = k.ay + 14; // the pillar's foot, in the middle of the circle
  const top = bounds(P)![1];
  const H = foot - top;
  // On the ground the circle is seen at a slant (it is 1.6 times wider than tall). ang: how far
  // round the circle a point is from its front (0) to its back (0.5), either way.
  const ang = (x: number, y: number) => {
    const a = fract(Math.atan2((y + 0.5 - k.ay) * 1.6, x + 0.5 - k.ax) / TAU - 0.25);
    return Math.min(a, 1 - a);
  };
  // The circle lights at its front and draws itself round both ways to the back: drawn up to f,
  // its two leading edges feathered over ~3 px (alpha) and a step hot just behind them. (Lit both
  // ways from a point, it has no start line to cut across it.)
  const FEATHER = 0.01, DONE = 0.5 + FEATHER;
  const wipe = (f: number, a = 1): Alpha => (f >= DONE ? a : (x, y) => a * clamp((f - ang(x, y)) / FEATHER, 0, 1));
  const hotEdge = (ix: Ix, f: number) => (f >= DONE ? ix : level(ix, (x, y) => (ang(x, y) > f - 0.035 && ang(x, y) <= f ? 1 : 0)));
  // A ragged edge across the pillar: irregular (two scales of noise), 1 to 6 px deep.
  const ragged = (x: number, seed: number) => 1 + 3.2 * noise(x, 0, 7, seed) + 1.8 * noise(x, 0, 2.5, seed + 1);
  const thin = (w: number) => (w === 1 ? P : scaleAbout(P, k.ax, 0, w, 1));
  const up = (ix: Ix, dy: number) => displace(ix, () => [0, -dy]);
  const fr: Canvas[] = [];
  const frame = (hz: number, cur: Ix, curA: Alpha, sealF: number, sealA: Alpha, linesA: Alpha, sp: Ix, spA: number, hot = false) => {
    const seal = hot ? hotEdge(circle(cur, curA), sealF) : circle(cur, curA);
    const ln = lines(cur, curA), rA = ringA(sealA, linesA);
    const under = haze([sealCover(cur, curA), sealA], [RL, rA], [ln, linesA], [cur, curA], [sp, spA]);
    return render(k.w, k.h, [[HZ, hz], [under, hz], [seal, sealA], [RL, rA], [ln, linesA], [cur, curA], [sp, spA]], k.fade);
  };

  // 0-3: anticipation. The seal circle lights at its front and draws itself round both ways, the
  //      hexagram following it, while the haze gathers (by alpha). The pillar stays down until
  //      frame 2, then climbs out of the circle with a ragged front, soft (alpha over 4 px) and a
  //      step hot.
  const sealF = [0.2, 0.4, DONE, DONE], lineF = [0.06, 0.26, 0.45, DONE], lineK = [0.55, 0.75, 0.95, 1];
  const hazeK = [0.18, 0.42, 0.6, 0.8];
  const pillarF = [0, 0, 0.34, 0.76], pillarW = [0, 0, 0.72, 0.9];
  for (let i = 0; i < 4; i++) {
    let cur = none(k);
    let curA: Alpha = 0;
    if (pillarF[i] > 0) {
      const front = (x: number) => foot - H * pillarF[i] - ragged(x, 931 + i);
      cur = level(keep(thin(pillarW[i]), (x, y) => y >= front(x) - 1), (x, y) => (y < front(x) + 6 ? 1 : 0), ['blue']);
      curA = (x, y) => clamp((y - front(x) + 1) / 4, 0, 1);
    }
    const sp = i >= 2 ? twinkle(SP, i / 8, 0.5, 905) : none(k);
    fr.push(frame(hazeK[i], cur, curA, sealF[i], wipe(sealF[i]), wipe(lineF[i], lineK[i]), sp, i === 3 ? 0.8 : 0.4, true));
  }
  // 4: his picture. 5-6: it holds; the pillar's light shimmers and the sparks begin to rise.
  fr.push(render(k.w, k.h, [[HZ], [SEAL], [LN], [P], [SP]], k.fade));
  const hold = (x: number, y: number) => smooth(4, 16, Math.abs(x - k.ax)) * smooth(0, 10, foot - y);
  for (const i of [5, 6]) {
    const t = (i - 4) / 12;
    const cur = shimmer(churn(P, t, 1.2, 9, 913, hold), t, 917, 12);
    const sp = twinkle(up(SP, (i - 4) * 2), t, 0.15, 921);
    const f = frame(1, cur, 1, DONE, 1, 1, sp, 1);
    // (a glint runs round the circle)
    fr.push(render(k.w, k.h, [[glint(circle(cur), (i - 4) / 10, k.ax, k.ay, 0.9, Math.PI / 2)], [LN], [cur], [sp]], k.fade, f));
  }
  // 7-15: the long settle. The pillar thins and draws up off the circle into the sky, its foot
  //       ragged but soft (alpha over 4 px), fading by alpha and cooling to cyan and blue (not
  //       dimmed to grey), gone by frame 14; for a few frames it leaves a soft glow pool where it
  //       stood, over the haze it hid (rebuilt at the level of the haze round it, so no pit opens
  //       in the circle). The haze thins, the hexagram goes out (the third ring showing whole as
  //       it does) and the gold fades last (by alpha, never darker); the sparks float up and go out.
  for (let j = 0; j < 9; j++) {
    const u = (j + 1) / 9, t = (7 + j - 4) / 12;
    const cut = foot + 6 - (H * 0.85 + 6) * smooth(0.2, 1, u) ** 1.2;
    const cutR = (x: number) => cut - ragged(x, 941 + j);
    const cur = cool(shimmer(churn(thin(1 - 0.5 * smooth(0, 1, u)), t, 1.2, 9, 913, hold), t, 917, 12), () => Math.round(u * 3));
    const pa = 1 - smooth(0.12, 0.88, u);
    const pool = 0.5 * clamp(1 - (foot + 6 - cut) / 40, 0, 1);
    const curA: Alpha = (x, y) => pa * (y < cutR(x) - 4 ? 1 : y < cutR(x) ? Math.max(pool, (cutR(x) - y) / 4) : pool);
    const hz = 1 - 0.95 * u, sa = 1 - smooth(0.35, 1, u), la = 1 - smooth(0, 0.7, u);
    const sp = twinkle(up(SP, 4 + j * 3), t, 0.15 + u * 0.4, 921);
    fr.push(frame(hz, pa > 0 ? cur : none(k), curA, DONE, sa, la, sp, 1 - u * 0.9));
  }
  return sprite(k, 'Chakra blast: pillar of light over a gold seal circle', { blast: { frames: fr, fps: BLAST_FPS, loop: false } });
}
