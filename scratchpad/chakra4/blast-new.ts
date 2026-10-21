function blast(): WorldSprite {
  const k = key('blast', pads(4));
  const HZ = piece(k, 'main'), SEAL = piece(k, 'seal'), P = piece(k, 'pillar'), LN = piece(k, 'lines'), SP = piece(k, 'loose');
  // What the pillar hides in his picture (the haze, rebuilt from the haze round it; the far arcs of
  // the circle and the hexagram): drawn only where the pillar of a frame does not cover them, so
  // his picture is unchanged. The pillar piece holds its own halo, so the halo goes with it.
  const U = piece(k, 'under'), SB = piece(k, 'sealback'), LB = piece(k, 'linesback');
  const behind = (cur: Ix, ix: Ix) => keep(ix, (x, y) => at(P, x, y) !== 0 && at(cur, x, y) === 0);
  const alphaAt = (a: Alpha, x: number, y: number) => (typeof a === 'number' ? a : a(x, y));
  // The haze under whatever of the circle, its lines, the pillar and the sparks a frame leaves out
  // or draws see-through (only what is drawn at full strength hides it, as in his picture).
  const haze = (...cover: [Ix, Alpha][]) => keep(U, (x, y) => cover.every(([c, a]) => at(c, x, y) === 0 || alphaAt(a, x, y) < 1));
  const foot = k.ay + 14; // the pillar's foot, in the middle of the circle
  const top = bounds(P)![1];
  const H = foot - top;
  // On the ground the circle is seen at a slant (it is 1.6 times wider than tall). ang: 0 at the
  // front, going round clockwise on screen (left, back, right) to 1.
  const ang = (x: number, y: number) => fract(Math.atan2((y + 0.5 - k.ay) * 1.6, x + 0.5 - k.ax) / TAU - 0.25);
  // The circle draws itself round from the front: drawn up to f of the way round, its leading edge
  // feathered over ~4 px (alpha) and a step hot just behind it.
  const FEATHER = 0.01;
  const wipe = (f: number, a = 1): Alpha => (f >= 1 + FEATHER ? a : (x, y) => a * clamp((f - ang(x, y)) / FEATHER, 0, 1));
  const hotEdge = (ix: Ix, f: number) => (f >= 1 ? ix : level(ix, (x, y) => (ang(x, y) > f - 0.07 && ang(x, y) <= f ? 1 : 0)));
  const ragged = (x: number, seed: number) => noise(x, 0, 3, seed) * 7;
  const thin = (w: number) => (w === 1 ? P : scaleAbout(P, k.ax, 0, w, 1));
  const up = (ix: Ix, dy: number) => displace(ix, () => [0, -dy]);
  const fr: Canvas[] = [];

  // 0-3: anticipation. The seal circle draws itself round from the front and the hexagram follows
  //      it while the haze gathers (by alpha). The pillar stays down until frame 2, then climbs
  //      out of the circle with a ragged front, soft (alpha over 4 px) and a step hot.
  const sealF = [0.4, 0.75, 1 + FEATHER, 1 + FEATHER], lineF = [0.12, 0.5, 0.9, 1 + FEATHER], lineK = [0.55, 0.75, 0.95, 1];
  const hazeK = [0.16, 0.34, 0.55, 0.78];
  const pillarF = [0, 0, 0.42, 0.82], pillarW = [0, 0, 0.75, 0.9];
  for (let i = 0; i < 4; i++) {
    let cur = none(k);
    let curA: Alpha = 0;
    if (pillarF[i] > 0) {
      const front = (x: number) => foot - H * pillarF[i] - ragged(x, 931);
      cur = level(keep(thin(pillarW[i]), (x, y) => y >= front(x) - 1), (x, y) => (y < front(x) + 6 ? 1 : 0), ['blue']);
      curA = (x, y) => clamp((y - front(x) + 1) / 4, 0, 1);
    }
    const seal = hotEdge(union(SEAL, behind(cur, SB)), sealF[i]), sealA = wipe(sealF[i]);
    const lines = union(LN, behind(cur, LB)), linesA = wipe(lineF[i], lineK[i]);
    const sp = i >= 2 ? twinkle(SP, i / 8, 0.5, 905) : none(k);
    const spA = i === 3 ? 0.8 : 0.4;
    fr.push(
      render(
        k.w,
        k.h,
        [[HZ, hazeK[i]], [haze([seal, sealA], [lines, linesA], [cur, curA], [sp, spA]), hazeK[i]], [seal, sealA], [lines, linesA], [cur, curA], [sp, spA]],
        k.fade,
      ),
    );
  }
  // 4: his picture. 5-6: it holds; the pillar's light shimmers and the sparks begin to rise.
  fr.push(render(k.w, k.h, [[HZ], [SEAL], [LN], [P], [SP]], k.fade));
  const hold = (x: number, y: number) => smooth(4, 16, Math.abs(x - k.ax)) * smooth(0, 10, foot - y);
  for (const i of [5, 6]) {
    const t = (i - 4) / 12;
    const cur = shimmer(churn(P, t, 1.2, 9, 913, hold), t, 917, 12);
    const seal = glint(union(SEAL, behind(cur, SB)), (i - 4) / 10, k.ax, k.ay, 0.9, Math.PI / 2);
    const lines = union(LN, behind(cur, LB)), sp = twinkle(up(SP, (i - 4) * 2), t, 0.15, 921);
    fr.push(render(k.w, k.h, [[HZ], [haze([seal, 1], [lines, 1], [cur, 1], [sp, 1])], [seal], [lines], [cur], [sp]], k.fade));
  }
  // 7-15: the long settle. The pillar thins and draws up off the circle into the sky, its foot
  //       ragged but soft (alpha over 4 px), fading by alpha in its own blue (not dimmed to grey);
  //       for a few frames it leaves a soft glow pool where it stood, over the haze it hid (rebuilt
  //       at the level of the haze round it, so no pit opens in the circle). The haze thins, the
  //       circle's lines go out and the gold fades last (by alpha, never darker); the sparks float
  //       up and go out.
  for (let j = 0; j < 9; j++) {
    const u = (j + 1) / 9, t = (7 + j - 4) / 12;
    const cut = foot + 6 - (H * 0.85 + 6) * smooth(0.2, 1, u) ** 1.2;
    const cutR = (x: number) => cut - ragged(x, 941 + j);
    const cur = shimmer(churn(thin(1 - 0.5 * smooth(0, 1, u)), t, 1.2, 9, 913, hold), t, 917, 12);
    const pa = 1 - smooth(0.15, 1, u);
    const pool = 0.5 * clamp(1 - (foot + 6 - cut) / 40, 0, 1);
    const curA: Alpha = (x, y) => pa * (y < cutR(x) - 4 ? 1 : y < cutR(x) ? Math.max(pool, (cutR(x) - y) / 4) : pool);
    const hz = 1 - 0.95 * u, sa = 1 - smooth(0.35, 1, u), la = 1 - smooth(0, 0.7, u);
    const seal = union(SEAL, behind(keep(cur, (x, y) => curA(x, y) >= 1), SB)), lines = union(LN, behind(keep(cur, (x, y) => curA(x, y) >= 1), LB));
    const sp = twinkle(up(SP, 4 + j * 3), t, 0.15 + u * 0.4, 921);
    const spA = 1 - u * 0.9;
    fr.push(render(k.w, k.h, [[HZ, hz], [haze([seal, sa], [lines, la], [cur, curA], [sp, spA]), hz], [seal, sa], [lines, la], [cur, curA], [sp, spA]], k.fade));
  }
  return sprite(k, 'Chakra blast: pillar of light over a gold seal circle', { blast: { frames: fr, fps: BLAST_FPS, loop: false } });
}

