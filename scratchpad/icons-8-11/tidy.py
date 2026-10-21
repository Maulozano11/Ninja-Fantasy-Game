"""Small tidy-ups of tools/ui/ui-icons-23.ts (comments, an unused field, miraiArt's branches). Run from the worktree root."""
p = 'tools/ui/ui-icons-23.ts'
s = open(p, encoding='utf8').read()
reps = [
    ("""// windows (127 to 139 of his pixels across): too big to keep one to one at 88, so there the 88 is
// made as the 44 is (area mean of his pixels, his thin lines and specks kept in their own colour,
// bilateral, palette, clean-up). Two icons carry an edit the owner asked for (2026-10-21, to keep""",
     """// windows (127 to 139 of his pixels across): too big to keep one to one at 88, so there the 88 is
// made as the 44 is (area mean of his pixels, his thin lines and specks kept in their own colour,
// palette, clean-up; no bilateral filter on sheets 8 to 11). Two icons carry an edit the owner asked for (2026-10-21, to keep"""),
    (""" * A compass rose of the four cardinal points, drawn as his Submission star is: four long points
 * (north, east, south, west: length `L`, half as wide as `w` where they meet) and four short thin
 * ones between them (`l`, `wl`), each point split along its axis into two facets lit from his upper""",
     """ * A compass rose of the four cardinal points, drawn as his Submission star is: four long points
 * (north, east, south, west: length `L`, `w` to each side of the axis where they meet) and four short
 * thin ones between them (`l`, `wl`), each point split along its axis into two facets lit from his upper"""),
    ("""  W: F;
  /** His window as cropped, before the owner's edit (the same as W when there is none). */
  W0: F;
  cols: number[];""", """  W: F;
  cols: number[];"""),
    ("""  const W0 = F.of(prepWin(loadRef(`${spec.id}.png`), spec.sheet === '2'));
  // The owner's edit (Command, Premonition) is made on his pixels first, so the palette, the 88 and
  // the 44 are all made from his window as he wants it.
  const W = W0.clone();""", """  const W = F.of(prepWin(loadRef(`${spec.id}.png`), spec.sheet === '2'));
  // The owner's edit (Command, Premonition) is made on his pixels first, so the palette, the 88 and
  // the 44 are all made from his window as he wants it."""),
    ("""  return { spec, pal, out, red, W, W0, cols: h88.cols""", """  return { spec, pal, out, red, W, cols: h88.cols"""),
    ("""/** The pupil and highlight again at 88 and 44, crisp and round at that size. */
function miraiArt(pt: Paint, ctx: Ctx): void {
  const big = pt.N === 88;
  const [mx, my] = ctx.map(MIRAI.cx, MIRAI.cy);
  const k = big ? 1 : pt.N / ctx.W.w;
  const rIn = MIRAI.inner * (big ? (pt.N / ctx.W.w) : k);
  const rp = MIRAI.pupil * (big ? 0.95 : k);
  // At 88 the iris is his pixels; at 44 his iris is redrawn with the same ramp, so its bands stay clean.
  if (!big)
    for (let y = Math.floor(my - rIn - 1); y <= Math.ceil(my + rIn + 1); y++)
      for (let x = Math.floor(mx - rIn - 1); x <= Math.ceil(mx + rIn + 1); x++) {
        const dx = x + 0.5 - mx, dy = y + 0.5 - my;
        if (Math.hypot(dx, dy) > rIn) continue;
        pt.px(x, y, MIRAI_RAMP[miraiStep(dx / rIn, dy / rIn)]);
      }
  if (!big) {
    // At 44 the pupil is two by two (the roundest at that size), the highlight one pixel at its upper left.
    const px0 = Math.round(mx) - 1, py0 = Math.round(my) - 1;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pt.px(px0 + dx, py0 + dy, MIRAI_PUPIL);
    pt.px(px0 - 1, py0 - 1, MIRAI_SHINE);
    return;
  }
  for (let y = Math.floor(my - rp - 1); y <= Math.ceil(my + rp + 1); y++)""",
     """/** The pupil and highlight again at 88 and 44, crisp and round at that size (at 44 the iris too). */
function miraiArt(pt: Paint, ctx: Ctx): void {
  const [mx, my] = ctx.map(MIRAI.cx, MIRAI.cy);
  if (pt.N === 44) {
    // His iris redrawn with the same ramp, so its bands stay clean; the pupil two by two (the
    // roundest at that size) and the highlight one pixel at its upper left.
    const rIn = (MIRAI.inner * pt.N) / ctx.W.w;
    for (let y = Math.floor(my - rIn - 1); y <= Math.ceil(my + rIn + 1); y++)
      for (let x = Math.floor(mx - rIn - 1); x <= Math.ceil(mx + rIn + 1); x++) {
        const dx = x + 0.5 - mx, dy = y + 0.5 - my;
        if (Math.hypot(dx, dy) > rIn) continue;
        pt.px(x, y, MIRAI_RAMP[miraiStep(dx / rIn, dy / rIn)]);
      }
    const px0 = Math.round(mx) - 1, py0 = Math.round(my) - 1;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pt.px(px0 + dx, py0 + dy, MIRAI_PUPIL);
    pt.px(px0 - 1, py0 - 1, MIRAI_SHINE);
    return;
  }
  // At 88 the iris is his pixels (one to one): the pupil a disc a little under his radius, as a
  // dropped column or row may pass through it.
  const rp = MIRAI.pupil * 0.95;
  for (let y = Math.floor(my - rp - 1); y <= Math.ceil(my + rp + 1); y++)"""),
]
for a, b in reps:
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
open(p, 'w', encoding='utf8').write(s)
print('ok')
