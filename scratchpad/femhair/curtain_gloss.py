p = '/home/user/Ninja-Fantasy-Game/src/sprite/items/hair.ts'
src = open(p).read()
def rep(a, b):
    global src
    assert a in src, a[:80]
    src = src.replace(a, b)
rep("""  o: { ty: number; out?: number; spread?: number; n?: number; w?: number; jag?: number; top?: number; front?: number; back?: number; tipW?: number; bulge?: number; hold?: number },
): [Vec, Vec] {""", """  o: {
    ty: number;
    out?: number;
    spread?: number;
    n?: number;
    w?: number;
    jag?: number;
    top?: number;
    front?: number;
    back?: number;
    tipW?: number;
    bulge?: number;
    hold?: number;
    /** Gloss band [t0, t1] down the lit side of the locks, with the outermost lock pushed back a shade (depth). */
    gloss?: [number, number];
  },
): [Vec, Vec] {""")
rep("""    if (i === 0) edge = [root, end];
    lock(L, root, ctrl, end, w, pen, { hold: o.hold ?? 0.65, tipW: o.tipW ?? 1.5, form, clumps: 3.4, seed: i * 3 + 1 });""", """    if (i === 0) edge = [root, end];
    const lp = o.gloss && i === 0 && n > 2 ? { ...pen, bias: (pen.bias || 0) - 1 } : pen;
    lock(L, root, ctrl, end, w, lp, { hold: o.hold ?? 0.65, tipW: o.tipW ?? 1.5, form, clumps: 3.4, seed: i * 3 + 1, sheen: o.gloss && i > 0 ? o.gloss : false });""")
rep("""    curtain(g, g.L('hairBack'), P.t, { ty: 3, out: 1.5, spread: 3, n: 5, w: 5.5, tipW: 1.2, jag: 1.5, bulge: 1, hold: 0.7 });""", """    curtain(g, g.L('hairBack'), P.t, { ty: 3, out: 1.5, spread: 3, n: 5, w: 5.5, tipW: 1.2, jag: 1.5, bulge: 1, hold: 0.7, gloss: [0.3, 0.42] });""")
rep("""    curtain(g, g.L('hairBack'), P.t, { ty: g.bp.torsoLen - 9, out: 0.6, spread: 1.2, n: 3, w: 5.5, tipW: 4.5, bulge: 0, hold: 0.9, top: -4, front: -1.5, back: -4.2 });""", """    curtain(g, g.L('hairBack'), P.t, { ty: g.bp.torsoLen - 9, out: 0.6, spread: 1.2, n: 3, w: 5.5, tipW: 4.5, bulge: 0, hold: 0.9, top: -4, front: -1.5, back: -4.2, gloss: [0.12, 0.3] });""")
rep("""      curtain(g, g.L('hairBack'), { mat, part: 'back', bias: -1 }, { ty: 3, out: 1.3, spread: 2.6, n: 5, w: 5.5, tipW: 1.4, jag: 1.4, bulge: 1, hold: 0.72 });""", """      curtain(g, g.L('hairBack'), { mat, part: 'back', bias: -1 }, { ty: 3, out: 1.3, spread: 2.6, n: 5, w: 5.5, tipW: 1.4, jag: 1.4, bulge: 1, hold: 0.72, gloss: [0.3, 0.42] });""")
open(p, 'w').write(src)
print('curtain gloss applied')
