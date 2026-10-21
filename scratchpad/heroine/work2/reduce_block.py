def sample(which, seg, Q, mask, fig, box):
    """One part of her brought down onto our box: (cov, col, dark), each (h, w). cov is how much of
    each of our pixels the part covers (of SAMPLES x SAMPLES samples); col its colour there, her
    commonest colour under it shaded by the colours of hers under it near that one (their mean, then
    her nearest colour: her ramps stay smooth, and two colours of different stuff, her line and her
    cloth or the cloth and the gold on it, are never mixed into a third), -1 where cov is 0; dark how
    much of the pixel her line covers, whatever part it is (for the line between parts)."""
    x0, y0, x1, y1 = box
    h, w = y1 - y0, x1 - x0
    H, W = Q.shape
    S = SAMPLES
    offs = (np.arange(S) + 0.5) / S
    oy, ox = np.meshgrid(offs, offs, indexing='ij')
    yy, xx = np.mgrid[y0:y1, x0:x1]
    q = np.stack([(xx[..., None, None] + ox).ravel(), (yy[..., None, None] + oy).ravel()], 1)
    p = R.backward(seg, q)
    px = np.floor(p[:, 0]).astype(int)
    py = np.floor(p[:, 1]).astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    hit = np.zeros(len(q), bool)
    hit[ok] = mask[py[ok], px[ok]]
    P = R.rgb(which)
    Ld = R.luma(P) <= DARK
    dk = np.zeros(len(q), bool)
    dk[ok] = fig[py[ok], px[ok]] & Ld[Q[py[ok], px[ok]]]
    col = np.full(len(q), -1)
    col[hit] = Q[py[hit], px[hit]]
    hit = hit.reshape(h, w, S * S)
    col = col.reshape(h, w, S * S)
    cov = hit.mean(-1)
    out = np.full((h, w), -1)
    n = len(P)
    for j, i in zip(*np.nonzero(cov > 0)):
        c = col[j, i][col[j, i] >= 0]
        top = np.bincount(c, minlength=n).argmax()
        near = c[R.colour_distance(P[c], P[top]) < NEAR]
        out[j, i] = int(R.quantize(P[near].mean(0), which))
    return cov, out, dk.reshape(h, w, S * S).mean(-1)


def splat(which, seg, Q, mask, keep, box):
    """Her pixels of the colours `keep` laid forward onto our box, each on the pixel of ours its
    middle lands in: her thin lines stay unbroken. (h, w) indices, -1 elsewhere; where several of
    hers land on one of ours the commonest wins, the brighter on a tie."""
    x0, y0, x1, y1 = box
    ys, xs = np.nonzero(mask & np.isin(Q, list(keep)))
    out = np.full((y1 - y0, x1 - x0), -1)
    if not len(xs):
        return out
    q = R.forward(seg, np.stack([xs + 0.5, ys + 0.5], 1).astype(float))
    u = np.floor(q[:, 0]).astype(int) - x0
    v = np.floor(q[:, 1]).astype(int) - y0
    L = R.luma(R.rgb(which))
    votes = {}
    for i, j, c in zip(u, v, Q[ys, xs]):
        if 0 <= i < x1 - x0 and 0 <= j < y1 - y0:
            votes.setdefault((int(j), int(i)), []).append(int(c))
    for (j, i), cs in sorted(votes.items()):
        out[j, i] = max(sorted(set(cs)), key=lambda c: (cs.count(c), L[c]))
    return out


def layers(which, N, Q, M):
    """Her parts on our box: (lay, own, dark). lay: each part alone, (h, w) palette indices, -1 where
    it is not; own: which part each pixel of the figure is ('' off it); dark: her line's cover under
    each pixel by the map of the part that owns it. A pixel is the figure's where her parts cover
    half of it between them; it is the front-most part's that covers half of it (COVER_OF), else the
    part that covers most of it."""
    box = BOX
    h, w = box[3] - box[1], box[2] - box[0]
    seg = R.SEGMENTS[which]
    fig = np.zeros(Q.shape, bool)
    for m in M.values():
        fig |= m
    cov, col, drk = {}, {}, {}
    for name in BACK_TO_FRONT:
        if name not in M:
            continue
        cov[name], col[name], drk[name] = sample(which, seg[SEG_OF[name]], Q, M[name], fig, box)
        keep = [ci(which, c) for c in SPLAT.get(which, {}).get(name, [])]
        if keep:
            sp = splat(which, seg[SEG_OF[name]], Q, M[name], keep, box)
            on = (sp >= 0) & (col[name] >= 0)
            col[name][on] = sp[on]
    names = list(cov)
    total = np.minimum(sum(cov.values()), 1)
    own = np.full((h, w), '', dtype='<U9')
    best = np.zeros((h, w))
    for name in names:
        more = cov[name] > best
        own[more] = name
        best = np.maximum(best, cov[name])
    for name in names:
        own[cov[name] >= COVER_OF.get(name, COVER)] = name
    own[total < COVER] = ''
    for name in names:
        solo = cov[name] >= COVER_OF.get(name, COVER)
        own[(own == '') & solo] = name
    lay = {name: np.full((h, w), -1) for name in BACK_TO_FRONT}
    dark = np.zeros((h, w))
    for name in names:
        mine = (cov[name] >= COVER_OF.get(name, COVER)) | (own == name)
        lay[name][mine] = col[name][mine]
        dark[own == name] = drk[name][own == name]
    return lay, own, dark


def outline(which, idx, part, dark):
    """Her dark line round the figure, and round each part where it lies on a part behind it where
    her picture has her line (LINE_COVER of the pixel; not between the NO_LINE pairs): every such
    edge pixel that is not already as dark."""
    L = R.luma(R.rgb(which))
    line = ci(which, LINE[which])
    order = {n: k for k, n in enumerate(BACK_TO_FRONT)}
    h, w = idx.shape
    out = idx.copy()
    for j in range(h):
        for i in range(w):
            v = idx[j, i]
            if v < 0 or L[v] <= DARK:
                continue
            me = part[j, i]
            for jj, ii in ((j - 1, i), (j + 1, i), (j, i - 1), (j, i + 1)):
                if not (0 <= jj < h and 0 <= ii < w) or idx[jj, ii] < 0:
                    out[j, i] = line
                    break
                other = part[jj, ii]
                if (other != me and order[other] < order[me] and frozenset((me, other)) not in NO_LINE
                        and dark[j, i] >= LINE_COVER):
                    out[j, i] = line
                    break
    return out


def build(which):
    N, Q, M = her(which)
    lay, own, dark = layers(which, N, Q, M)
    h, w = BOX[3] - BOX[1], BOX[2] - BOX[0]
    idx = np.full((h, w), -1)
    for name in BACK_TO_FRONT:
        put = own == name
        idx[put] = lay[name][put]
    part = own.copy()
    idx = outline(which, idx, part, dark)
    part[idx < 0] = ''
    return N, Q, M, idx, part, lay
