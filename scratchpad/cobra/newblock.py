def features(P):
    """His spine's landmarks, as fractions of the body from the tail tip: the low point of the tail, the top
    of the hump, the low point of the coil under the neck (found in order along the body)."""
    y = P[:, 1]
    n = len(P)
    neck = int(np.argmax(y[int(n * 0.6):int(n * 0.95)])) + int(n * 0.6)
    hump = int(np.argmin(y[int(n * 0.3):neck - 10])) + int(n * 0.3)
    tail = int(np.argmax(y[int(n * 0.1):hump - 10])) + int(n * 0.1)
    return [0.0, tail / (n - 1), hump / (n - 1), neck / (n - 1), 1.0]


FEAT = {k: features(c['P']) for k, c in C.items()}
SIG = np.mean([FEAT[k] for k in C], 0)  # the common landmarks
print('landmarks along the body (tail low, hump top, coil under the neck):', {k: [round(v, 3) for v in f[1:4]] for k, f in FEAT.items()})
SIGMA = np.linspace(0.0, 1.0, M)
for k, c in C.items():
    # Picture k's spine on the common parameter: the same landmark at the same index in both pictures.
    c['s_of_sigma'] = np.interp(SIGMA, SIG, FEAT[k])
    c['Pm'], c['Nm'] = along(c, c['s_of_sigma'] * (M - 1))
    c['wlm'] = interp_profile(c['wl'], c['s_of_sigma'] * (M - 1))
    c['wrm'] = interp_profile(c['wr'], c['s_of_sigma'] * (M - 1))
    c['segm'] = float(np.hypot(*np.diff(c['Pm'], axis=0).T).mean())


def target_spine(a, b, t, src, top):
    """The spine between his picture a (t=0) and b (t=1): every point of the body moves from its place in
    a to its place in b (his hump to his hump, his coils to his coils), the neck first and the tail a
    little later (a wave running down the body); then the neck bends so its top meets the head piece at
    `top`, square to the cut."""
    ca, cb, cs = C[a], C[b], C[src]
    w = smoothstep(t * (1 + WAVE) - WAVE * (1 - SIGMA))
    P = ca['Pm'] * (1 - w)[:, None] + cb['Pm'] * w[:, None]
    sn = SIG[3]
    ramp = smoothstep((SIGMA - sn) / (1 - sn))
    P = P + (np.asarray(top, np.float64) - P[-1])[None] * ramp[:, None]
    # The last px under the cut: the source picture's own neck, moved with the head piece.
    length = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
    keep = smoothstep((length - (length[-1] - NECK_KEEP)) / NECK_KEEP)
    own = cs['Pm'] + (np.asarray(top, np.float64) - cs['Pm'][-1])[None]
    return P * (1 - keep)[:, None] + own * keep[:, None]


def render_coils(src, Pt):
    """His coils of picture `src` carried onto the spine Pt (on the common parameter): every pixel keeps its
    place along and across the body (nearest pixel, so they stay his)."""
    c = C[src]
    x0 = int(max(0, np.floor(Pt[:, 0].min()) - 16))
    x1 = int(min(CW, np.ceil(Pt[:, 0].max()) + 17))
    y0 = int(max(0, np.floor(Pt[:, 1].min()) - 16))
    y1 = int(min(CH, np.ceil(Pt[:, 1].max()) + 17))
    yy, xx = np.mgrid[y0:y1, x0:x1]
    Q = np.stack([xx.ravel(), yy.ravel()], 1).astype(np.float64)
    s_, v_, dist = project(Pt, Q)
    u = to_index(s_, Pt)  # index on the common parameter
    pt, nm = along(dict(P=c['Pm'], N=c['Nm'], seg=c['segm']), u)
    q = pt + nm * v_[:, None]
    ix = np.round(q[:, 0]).astype(int)
    iy = np.round(q[:, 1]).astype(int)
    inb = (ix >= 0) & (ix < CW) & (iy >= 0) & (iy < CH)
    ix, iy = np.clip(ix, 0, CW - 1), np.clip(iy, 0, CH - 1)
    w = np.where(v_ > 0, interp_profile(c['wrm'], u), interp_profile(c['wlm'], u))
    ok = inb & (np.abs(v_) <= w + 1.0) & c['coil_src'][iy, ix]
    # The sample must come from the same stretch of his body (not from a coil lying next to it).
    want = np.interp(np.clip(u, 0, M - 1), np.arange(M), c['s_of_sigma']) * (M - 1)
    want = np.where(u < 0, u * c['segm'] / c['seg'], np.where(u > M - 1, M - 1 + (u - M + 1) * c['segm'] / c['seg'], want))
    us = np.where(np.isnan(c['u'][iy, ix]), want, c['u'][iy, ix])
    ok &= np.abs(us - want) * c['seg'] < 5
    mask = np.zeros((CH, CW), bool)
    col = np.zeros((CH, CW, 3), np.float32)
    mask[yy.ravel()[ok], xx.ravel()[ok]] = True
    col[yy.ravel()[ok], xx.ravel()[ok]] = c['coil_col'][iy[ok], ix[ok]]
    # Pinholes where two samples landed on one pixel: filled from their neighbours.
    holes = np.zeros((CH, CW), bool)
    for p in components(~mask, conn8=False):
        if len(p) <= 6 and p[:, 0].min() > 0 and p[:, 1].min() > 0 and p[:, 0].max() < CH - 1 and p[:, 1].max() < CW - 1:
            holes[p[:, 0], p[:, 1]] = True
    mask, col = fill_from_neighbours(mask, col, holes)
    return mask, col


