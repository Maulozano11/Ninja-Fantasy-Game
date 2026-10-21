def drake():
    """His BEAST panel on the earth sheet: a four-legged stone drake in two poses (prowl, lunge).

    His left picture (the prowl) is fly frame 0 and his right one (the lunge, dust kicking up behind the
    hind legs) is frame 5. Both are placed on one anchor, the middle of the torso (between the shoulder
    and the hip), so the loop does not jitter. The in-betweens are a morph built from his own pixels:
    a similarity transform fitted on his landmarks (eyes, snout, horns, tail root) carries the body of
    one drawing toward the other, and the legs and the tail segments turn rigidly about their joints
    toward their angles in the other drawing. Frames 1, 2 and 7 are his prowl moved part of the way to
    the lunge, frames 3, 4 and 6 his lunge moved part of the way back, so the switch between his two
    drawings happens between two nearly identical poses. His dust grows behind the hind feet around the
    lunge, then drifts back and fades.
    """
    PANEL = (502, 1544, 1758, 1975)  # the panel's border lines
    SPLIT = 1118  # between his two pictures
    # Where the torso centre (the anchor) is in his two pictures.
    TORSO = {0: (792, 1755), 5: (1458, 1735)}
    WAX, WAY, CW, CH = 350, 205, 680, 440  # working canvas (his pixels) around each torso centre
    LUMW = np.array([0.3, 0.55, 0.15], np.float32)
    # Our character's height against his, measured on his WALL panel: that sets the scale.
    c = ref[960:1240, 765:900]
    bgc = np.median(np.concatenate([c[:4].reshape(-1, 3), c[-4:].reshape(-1, 3)]), 0)
    cm = np.abs(c - bgc).sum(2) > 60
    rows = [y for y in range(cm.shape[0]) if cm[y].sum() >= 2]
    his_char_h = max(rows) - min(rows) + 1
    S = CHAR_H / his_char_h
    pn = ref[PANEL[1] + 6:PANEL[3] - 6, PANEL[0] + 6:PANEL[2] - 6]
    BG = np.median(np.concatenate([pn[:6].reshape(-1, 3), pn[:, :6].reshape(-1, 3)]), 0)
    print('drake: his character', his_char_h, 'px tall, scale', round(S, 4), 'panel bg', BG.astype(int).tolist())
    size, oanchor = canvas_for([(WAX, WAY)], CW, CH, S)
    OW, OH = size
    print('drake canvas', size, 'anchor', oanchor)
    # The head (its eyes and glints are warm like the dust, but they are the drake's).
    HEAD = {
        0: [(915, 1640), (1100, 1640), (1100, 1860), (915, 1860)],
        5: [(1580, 1600), (1745, 1600), (1745, 1800), (1580, 1800)],
    }

    def erode(m, n):
        return ~dilate(~m, n)

    def key(k):
        """His picture k on the working canvas (torso centre at WAX, WAY): colour and layers."""
        ax, ay = TORSO[k]
        ox, oy = ax - WAX, ay - WAY
        crop = np.empty((CH, CW, 3), np.float32)
        crop[:] = BG
        sx0, sy0 = max(0, ox), max(0, oy)
        sx1, sy1 = min(ref.shape[1], ox + CW), min(ref.shape[0], oy + CH)
        crop[sy0 - oy:sy1 - oy, sx0 - ox:sx1 - ox] = ref[sy0:sy1, sx0:sx1]
        ys, xs = np.mgrid[0:CH, 0:CW]
        gx, gy = xs + ox, ys + oy
        inside = (gx >= PANEL[0] + 5) & (gx < PANEL[2] - 5) & (gy >= PANEL[1] + 5) & (gy < PANEL[3] - 5)
        inside &= (gx < SPLIT) if k == 0 else (gx >= SPLIT)
        crop[~inside] = BG
        diff = np.abs(crop - BG).sum(2)
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        head = poly_mask(HEAD[k], (CH, CW), (ox, oy))
        fg = (diff > 22) & inside
        # Dust and flying dirt (the lunge only): saturated orange-brown (his stone is a greyer brown).
        warm = (r - b > 0.42 * r) & (r > g + 12) & (diff > 40) & ~head & (k == 5)
        # Specks of it inside the body are his shading, not dust.
        for p in components(warm):
            if len(p) < 8:
                p = np.array(p)
                warm[p[:, 0], p[:, 1]] = False
        solid = fg & ~warm

        def biggest(m):
            out = np.zeros((CH, CW), bool)
            pts = np.array(max(components(m), key=len))
            out[pts[:, 0], pts[:, 1]] = True
            return out

        def fill_holes(m):
            # Holes inside the body: his dark seams and shadows (not background) belong to it.
            for p in components(~m):
                p = np.array(p)
                if p[:, 0].min() == 0 or p[:, 1].min() == 0 or p[:, 0].max() == CH - 1 or p[:, 1].max() == CW - 1:
                    continue
                if len(p) < 60 or diff[p[:, 0], p[:, 1]].mean() > 14:
                    m[p[:, 0], p[:, 1]] = True
            return m

        body = fill_holes(biggest(solid))
        # His dark edging on the dust streaks that touch the drake is not the drake's (it would be left
        # floating when the dust moves): the dark pixels next to dust go with the dust.
        lum = crop @ LUMW
        body = fill_holes(biggest(body & ~(dilate(warm, 3) & (lum < 62))))
        # His deep plum shadows between the legs and under the chest, about (47, 36, 50), are close to the
        # navy panel (34, 34, 44) but lighter and redder: they are the body's far side, not background.
        # (An opening keeps the 1-2 px JPEG halo along the outline out.)
        shade = (diff > 10) & inside & ~body & ~dilate(warm, 4)
        shade &= dilate(erode(shade, 2), 2)
        touch = dilate(body, 1)
        for p in components(shade):
            p = np.array(p)
            if touch[p[:, 0], p[:, 1]].any():
                body[p[:, 0], p[:, 1]] = True
        body = fill_holes(body)
        rest = fg & ~body
        return crop, body, rest, diff, (ox, oy)

    keys = {k: key(k) for k in (0, 5)}
    for k, (crop, body, rest, diff, off) in keys.items():
        print('key', k, 'body px', int(body.sum()), 'rest px', int(rest.sum()))
    # His palette: the stone and moss, plus his eye and glint yellows (too few pixels for the median cut).
    body_px = np.concatenate([keys[k][0][keys[k][1]] for k in keys])
    r_, g_, b_ = body_px[:, 0], body_px[:, 1], body_px[:, 2]
    green = (g_ > r_ + 6) & (g_ > b_ + 20)
    glow = (r_ - b_ > 0.42 * r_) & (r_ > g_ + 12) & (r_ > 120)  # the eyes and the glints over them
    horn = (np.abs(r_ - b_) < 12) & (r_ > 110)  # the cool grey of the horns and the brightest plates
    stone = ~green & ~glow & ~horn
    PAL = np.concatenate([median_palette(body_px[stone], 28), median_palette(body_px[green], 8), median_palette(body_px[horn], 5), median_palette(body_px[glow], 5)])
    # His highlights (the horn tips, the claws, the lit tops of the plates) are too rare for a median-cut
    # box: they are sampled from his pictures at game scale (the top 1 %), cool grey and ivory apart.
    lit = []
    for k in keys:
        A_, C_ = shrink(keys[k][0], keys[k][1].astype(np.float32), (WAX, WAY), S, size, oanchor)
        lit.append(C_[A_ >= 0.5])
    lit = np.concatenate(lit)
    lr, lg, lb = lit[:, 0], lit[:, 1], lit[:, 2]
    lit = lit[~((lr - lb > 0.42 * lr) & (lr > lg + 12))]
    top = lit[lit @ LUMW >= np.percentile(lit @ LUMW, 97)]
    cool = np.abs(top[:, 0] - top[:, 2]) < 16
    PAL = np.concatenate([PAL, median_palette(top[cool], 3), median_palette(top[~cool], 3)])
    # His outline: the median of his darkest brown pixels (a deep brown, not black).
    lum_px = body_px @ LUMW
    dark = body_px[(lum_px < 30) & (r_ > b_ + 6) & (r_ >= g_)]
    OUTLINE = np.round(np.median(dark, 0))
    # On lit edges and on parts only a pixel or two wide his contour is thinner than a game pixel and
    # reads lighter: there the outline takes his dark shadow brown instead.
    OUTLINE_LIT = np.round(np.median(body_px[(lum_px > 42) & (lum_px < 62) & (r_ >= b_)], 0))
    print('drake palette', len(PAL), 'outline', OUTLINE.astype(int).tolist(), OUTLINE_LIT.astype(int).tolist(), 'highlights', np.round(PAL[-6:]).astype(int).tolist())
    # The dust: his solid clods and streaks, in his own colours (sampled from his saturated dust, plus his
    # brightest clods and the dark edging of his streaks).
    crop5, body5, rest5, diff5, off5 = keys[5]
    r5, b5 = crop5[..., 0], crop5[..., 2]
    l5 = crop5 @ LUMW
    dsat = rest5 & (diff5 > 70) & (r5 - b5 > 0.42 * r5)
    dl = crop5[dsat] @ LUMW
    DUST = np.concatenate([
        median_palette(crop5[dsat], 9),
        median_palette(crop5[dsat][dl >= np.percentile(dl, 96)], 1),
        median_palette(crop5[rest5 & (diff5 > 25) & (r5 - b5 > 12) & (l5 < 62)], 2),
    ])
    # (The fading dust of the other frames: fewer colours and two alpha levels, to fit the format's 78.)
    DUST_SOFT = median_palette(crop5[dsat], 5)
    print('dust palette', np.round(DUST).astype(int).tolist())

    # --- the rig -------------------------------------------------------------------------------------------
    # Landmarks his two drawings share (his sheet's coordinates: prowl, lunge, weight). The near eyes are
    # measured (the centre of the biggest glow spot in each head). A similarity transform (scale, turn,
    # move) fitted on them carries one drawing's body onto the other's.
    def eye_of(k):
        crop, body, rest, diff, (ox, oy) = keys[k]
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        hot = (r > 200) & (g > 140) & (b < 120) & poly_mask(HEAD[k], (CH, CW), (ox, oy))
        p = np.array(max(components(hot), key=len), np.float64)
        return (float(p[:, 1].mean() + ox), float(p[:, 0].mean() + oy))

    LANDMARKS = [
        (eye_of(0), eye_of(5), 5.0),  # near eye
        ((1082, 1797), (1727, 1745), 3.0),  # snout tip
        ((1060, 1845), (1705, 1779), 2.0),  # chin
        ((955, 1828), (1617, 1762), 1.0),  # throat
        ((1001, 1650), (1655, 1617), 2.0),  # far horn tip
        ((924, 1661), (1597, 1626), 2.0),  # near horn tip
        ((907, 1615), (1573, 1605), 1.0),  # the back's last plate before the neck
        ((800, 1615), (1478, 1610), 1.0),  # the middle of the back
        ((702, 1650), (1393, 1670), 1.0),  # the back over the hips
        ((652, 1680), (1348, 1697), 1.0),  # the back at the tail root
        ((850, 1815), (1533, 1765), 0.5),  # under the chest, by the near front leg
        # The joints of the pieces, so a joint is in the same place in both drawings' in-betweens.
        ((649, 1743), (1343, 1734), 0.5),  # tail root
        ((660, 1797), (1360, 1787), 0.5),  # near hind leg
        ((800, 1811), (1510, 1766), 0.5),  # near front leg
        ((928, 1827), (1578, 1763), 0.5),  # far front leg
    ]
    pa = np.array([l[0] for l in LANDMARKS], np.float64)
    qa = np.array([l[1] for l in LANDMARKS], np.float64)
    wa = np.array([l[2] for l in LANDMARKS], np.float64)
    mp = (pa * wa[:, None]).sum(0) / wa.sum()
    mq = (qa * wa[:, None]).sum(0) / wa.sum()
    zp = (pa[:, 0] - mp[0]) + 1j * (pa[:, 1] - mp[1])
    zq = (qa[:, 0] - mq[0]) + 1j * (qa[:, 1] - mq[1])
    za = (wa * np.conj(zp) * zq).sum() / (wa * np.abs(zp) ** 2).sum()
    SC, TH = float(np.abs(za)), float(np.degrees(np.angle(za)))
    offP, offL = np.array(keys[0][4], np.float64), np.array(keys[5][4], np.float64)
    CP = mp - offP  # the fit's centre in the prowl's working canvas
    CL = mq - offL  # and in the lunge's
    DV = CL - CP
    res = np.abs((mq[0] + 1j * mq[1]) + za * zp - (qa[:, 0] + 1j * qa[:, 1]))
    print('drake morph: scale', round(SC, 4), 'turn', round(TH, 2), 'move', np.round(DV, 1).tolist(), 'residuals (his px)', np.round(res, 1).tolist())

    def rot(p, deg, s=1.0):
        """Forward affine (3x3): turn by deg degrees (clockwise on screen) and scale by s about p."""
        a = np.deg2rad(deg)
        cc, ss = np.cos(a) * s, np.sin(a) * s
        return np.array([[cc, -ss, p[0] - cc * p[0] + ss * p[1]], [ss, cc, p[1] - ss * p[0] - cc * p[1]], [0, 0, 1]], np.float64)

    def move(dx, dy):
        return np.array([[1, 0, dx], [0, 1, dy], [0, 0, 1]], np.float64)

    def core(k, t):
        """The fitted similarity at morph fraction t (0 = his prowl, 1 = his lunge) for a frame drawn from key k."""
        if k == 0:
            return move(*(t * DV)) @ rot(CP, t * TH, SC ** t)
        u = 1.0 - t
        return move(*(-u * DV)) @ rot(CL, -u * TH, SC ** -u)

    # The body between his two drawings: the similarity carries the landmarks most of the way and a
    # thin-plate spline through them takes up the rest (his prowl's high hump flattens into his lunge's
    # sloped back), so every landmark moves on a straight line from one drawing to the other.
    PW = pa - offP
    QW = qa - offL

    def marks_at(t):
        h = np.hstack([PW, np.ones((len(PW), 1))])
        sim_t = (core(0, t) @ h.T).T[:, :2]
        sim_1 = (core(0, 1.0) @ h.T).T[:, :2]
        return sim_t + t * (QW - sim_1)

    def tps(src, dst):
        """Thin-plate spline through the landmarks: a function (x, y) -> (x', y') with src -> dst."""
        n = len(src)
        def U(x, y, i):
            r2 = (x - src[i, 0]) ** 2 + (y - src[i, 1]) ** 2
            return np.where(r2 > 0, 0.5 * r2 * np.log(np.maximum(r2, 1e-12)), 0.0)
        K = np.array([[U(src[j, 0], src[j, 1], i) for i in range(n)] for j in range(n)], np.float64)
        Pm = np.hstack([np.ones((n, 1)), src])
        L = np.zeros((n + 3, n + 3))
        L[:n, :n] = K
        L[:n, n:] = Pm
        L[n:, :n] = Pm.T
        rhs = np.zeros((n + 3, 2))
        rhs[:n] = dst
        par = np.linalg.solve(L, rhs)

        def f(x, y):
            ox = par[n, 0] + par[n + 1, 0] * x + par[n + 2, 0] * y
            oy = par[n, 1] + par[n + 1, 1] * x + par[n + 2, 1] * y
            for i in range(n):
                u = U(x, y, i)
                ox = ox + par[i, 0] * u
                oy = oy + par[i, 1] * u
            return ox, oy
        return f

    # His pieces that move (his sheet's coordinates). Each leg is cut from the body along its joint and
    # turns rigidly about `pivot`; `aim` is its foot, so the turn that takes one drawing's leg to the
    # other's is measured (less the body's turn). Far legs go behind the body, near legs over it. The tail
    # is a chain of segments, each turning about its joint, so his prowl's curl opens into his lunge's
    # straight tail. Every moving piece leaves its root (a disc about its joint, unturned) under it, so
    # the joint never opens.
    RIG = {
        0: {
            'legs': {
                'ff': {'far': True, 'pivot': (928, 1827), 'aim': (1000, 1873), 'disc': 16,
                       'poly': [(892, 1824), (965, 1830), (990, 1853), (1058, 1853), (1058, 1904), (892, 1904)]},
                # (His prowl's far hind leg is hidden behind the near haunch: it stays in the body, and only
                # gives the angle the lunge's far hind leg turns back to.)
                'fh': {'far': True, 'still': True, 'pivot': (740, 1798), 'aim': (735, 1850), 'disc': 14,
                       'poly': [(714, 1796), (768, 1800), (752, 1812), (749, 1856), (712, 1856)]},
                'nh': {'pivot': (660, 1797), 'aim': (668, 1886), 'disc': 20,
                       'poly': [(624, 1794), (667, 1792), (674, 1826), (690, 1842), (706, 1846), (714, 1870), (714, 1904), (618, 1904)]},
                'nf': {'pivot': (800, 1811), 'aim': (852, 1935), 'disc': 22,
                       'poly': [(750, 1802), (848, 1820), (858, 1862), (898, 1898), (898, 1955), (745, 1955)]},
            },
            'tail': {
                'poly': [(652, 1680), (646, 1802), (626, 1797), (560, 1806), (515, 1790), (515, 1650), (640, 1650)],
                'joints': [(649, 1743), (604, 1763), (556, 1770), (540, 1740)],
                'tip': (580, 1693),
                # Segments as polygons (the curl's tip lies over its own root, so nearest-segment would mix them).
                'segs': [
                    [(660, 1640), (660, 1815), (604, 1815), (604, 1640)],
                    [(604, 1722), (604, 1815), (556, 1815), (556, 1733)],
                    [(556, 1733), (556, 1815), (505, 1815), (505, 1745)],
                    [(505, 1745), (556, 1733), (604, 1722), (604, 1640), (505, 1640)],
                ],
                'disc': [22, 20, 18, 14],
            },
        },
        5: {
            'legs': {
                'ff': {'far': True, 'pivot': (1578, 1763), 'aim': (1590, 1832), 'disc': 14,
                       'poly': [(1550, 1768), (1606, 1758), (1616, 1800), (1614, 1838), (1558, 1838), (1556, 1798)]},
                'fh': {'far': True, 'pivot': (1397, 1802), 'aim': (1400, 1850), 'disc': 12,
                       'poly': [(1376, 1806), (1418, 1798), (1424, 1852), (1372, 1852)]},
                'nh': {'pivot': (1360, 1787), 'aim': (1336, 1868), 'disc': 18,
                       'poly': [(1333, 1774), (1388, 1800), (1368, 1842), (1356, 1892), (1292, 1892), (1296, 1840), (1318, 1800)]},
                'nf': {'pivot': (1510, 1766), 'aim': (1524, 1840), 'disc': 16,
                       'poly': [(1478, 1765), (1543, 1768), (1560, 1798), (1558, 1852), (1488, 1852), (1486, 1800)]},
            },
            'tail': {
                'poly': [(1348, 1692), (1338, 1776), (1312, 1796), (1290, 1830), (1235, 1870), (1195, 1890), (1150, 1890), (1150, 1845), (1240, 1745), (1300, 1686)],
                'joints': None,  # spread along the straight tail at the prowl's segment lengths (below)
                'root': (1343, 1734),
                'tip': (1187, 1865),
                'disc': [18, 14, 12, 10],
            },
        },
    }
    # The lunge's straight tail is cut at the same lengths along it as the prowl's chain.
    tp = RIG[0]['tail']
    chainP = [np.array(p, np.float64) for p in tp['joints']] + [np.array(tp['tip'], np.float64)]
    lens = [float(np.hypot(*(chainP[i + 1] - chainP[i]))) for i in range(4)]
    tl = RIG[5]['tail']
    root, tip = np.array(tl['root'], np.float64), np.array(tl['tip'], np.float64)
    U = (tip - root) / np.hypot(*(tip - root))
    cum = np.cumsum([0.0] + lens)
    scale_len = np.hypot(*(tip - root)) / cum[-1]
    chainL = [root + U * cl * scale_len for cl in cum]
    tl['joints'] = [tuple(p) for p in chainL[:4]]

    def heading(v):
        return float(np.degrees(np.arctan2(v[1], v[0])))

    # Turns from the prowl's leg (and tail segment) headings to the lunge's. The tail's headings are
    # unwrapped along the chain, so the curl opens the way it is wound.
    PHI = {}
    for n in RIG[0]['legs']:
        a0, a5 = RIG[0]['legs'][n], RIG[5]['legs'][n]
        d = heading(np.subtract(a5['aim'], a5['pivot'])) - heading(np.subtract(a0['aim'], a0['pivot']))
        PHI[n] = (d + 180.0) % 360.0 - 180.0
    hP = [heading(chainP[i + 1] - chainP[i]) for i in range(4)]
    for i in range(1, 4):
        while hP[i] < hP[i - 1] - 180:
            hP[i] += 360
        while hP[i] > hP[i - 1] + 180:
            hP[i] -= 360
    hL = heading(U)
    while hL > hP[0] + 180:
        hL -= 360
    while hL < hP[0] - 180:
        hL += 360
    TAIL_ABS = [hL - h for h in hP]
    TAIL_REL = [TAIL_ABS[0]] + [TAIL_ABS[i] - TAIL_ABS[i - 1] for i in range(1, 4)]
    # His lunge's near front leg is folded (much shorter than the prowl's straight one): each leg also
    # shortens or lengthens along its own axis between the two drawings (it folds toward the viewer).
    STRETCH = {}
    for n in RIG[0]['legs']:
        a0, a5 = RIG[0]['legs'][n], RIG[5]['legs'][n]
        STRETCH[n] = float(np.hypot(*np.subtract(a5['aim'], a5['pivot'])) / (np.hypot(*np.subtract(a0['aim'], a0['pivot'])) * SC))
    print('drake morph: legs', {n: round(v, 1) for n, v in PHI.items()}, 'stretch', {n: round(v, 3) for n, v in STRETCH.items()}, 'tail', [round(v, 1) for v in TAIL_ABS])

    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float64)

    def to_work(k, pt):
        ox, oy = keys[k][4]
        return (pt[0] - ox, pt[1] - oy)

    # Each key split into its pieces and the rest of the body (working canvas).
    parts = {}
    for k in (0, 5):
        crop, body, rest, diff, off = keys[k]
        rg = RIG[k]
        legs = {}
        for n, pc in rg['legs'].items():
            if pc.get('still'):
                continue
            m = poly_mask(pc['poly'], (CH, CW), off) & body
            pv = to_work(k, pc['pivot'])
            legs[n] = (m, m & ((xx - pv[0]) ** 2 + (yy - pv[1]) ** 2 <= pc['disc'] ** 2), pv)
        tm = poly_mask(rg['tail']['poly'], (CH, CW), off) & body
        joints = [to_work(k, p) for p in rg['tail']['joints']]
        if k == 0:
            seg_id = np.full((CH, CW), -1, np.int32)
            for i, poly in enumerate(rg['tail']['segs']):
                seg_id[poly_mask(poly, (CH, CW), off) & (seg_id < 0)] = i
        else:
            r0 = to_work(5, root)
            proj = (xx - r0[0]) * U[0] + (yy - r0[1]) * U[1]
            seg_id = np.searchsorted(cum[1:4] * scale_len, proj, side='right').astype(np.int32)
        segs = []
        for i in range(4):
            m = tm & (seg_id == i)
            jx, jy = joints[i]
            segs.append((m, m & ((xx - jx) ** 2 + (yy - jy) ** 2 <= rg['tail']['disc'][i] ** 2), joints[i]))
        # Where each tail pixel lies along the chain (segment index + fraction), for the smooth bend.
        chain = joints + [to_work(k, rg['tail']['tip'] if k == 0 else tuple(root + U * cum[-1] * scale_len))]
        sp = np.full((CH, CW), -1.0)
        for i in range(4):
            (ax_, ay_), (bx_, by_) = chain[i], chain[i + 1]
            vx, vy = bx_ - ax_, by_ - ay_
            f = np.clip(((xx - ax_) * vx + (yy - ay_) * vy) / (vx * vx + vy * vy), 0.0, 1.0)
            sel = tm & (seg_id == i)
            sp[sel] = i + f[sel]
        base = body.copy()
        for m, _, _ in list(legs.values()) + segs:
            base &= ~m
        parts[k] = (legs, segs, base, sp)
    if DEBUG:
        cols = {'ff': (255, 128, 0), 'fh': (0, 255, 0), 'nh': (0, 255, 255), 'nf': (255, 255, 0)}
        scol = [(255, 0, 255), (160, 0, 255), (255, 0, 120), (120, 60, 255)]
        for k in (0, 5):
            legs, segs, base, _ = parts[k]
            vis = (keys[k][0] * 0.5).astype(np.uint8)
            vis[base] = keys[k][0][base].astype(np.uint8)
            for n, (m, disc, pv) in legs.items():
                vis[m] = (keys[k][0][m] * 0.5 + np.array(cols[n]) * 0.5).astype(np.uint8)
                vis[disc] = (vis[disc] * 0.6).astype(np.uint8)
            for i, (m, disc, pv) in enumerate(segs):
                vis[m] = (keys[k][0][m] * 0.5 + np.array(scol[i]) * 0.5).astype(np.uint8)
                vis[disc] = (vis[disc] * 0.6).astype(np.uint8)
            Image.fromarray(vis).save(os.path.join(DEBUG, f'drake-pieces-{k}.png'))

    def sample(arr, M):
        """arr (H x W or H x W x C, zero outside) moved by the forward affine M, bilinear."""
        Mi = np.linalg.inv(M)
        return sample_at(arr, Mi[0, 0] * xx + Mi[0, 1] * yy + Mi[0, 2], Mi[1, 0] * xx + Mi[1, 1] * yy + Mi[1, 2])

    def sample_at(arr, sx, sy):
        """arr (zero outside) read at (sx, sy) for every pixel of the working canvas, bilinear."""
        H, W = arr.shape[:2]
        x0 = np.floor(sx).astype(np.int64)
        y0 = np.floor(sy).astype(np.int64)
        fx = (sx - x0).astype(np.float32)
        fy = (sy - y0).astype(np.float32)
        if arr.ndim == 3:
            fx, fy = fx[..., None], fy[..., None]
        out = 0
        for oy, wy in ((0, 1 - fy), (1, fy)):
            for ox, wx in ((0, 1 - fx), (1, fx)):
                X, Y = x0 + ox, y0 + oy
                ok = (X >= 0) & (X < W) & (Y >= 0) & (Y < H)
                v = arr[np.clip(Y, 0, H - 1), np.clip(X, 0, W - 1)]
                v = np.where(ok[..., None] if arr.ndim == 3 else ok, v, 0)
                out = out + v * wx * wy
        return out.astype(np.float32)

    def bend(crop, sp, Ts, sub=3, blend=0.3):
        """The tail pixels (sp >= 0: segment + fraction along it) carried by the segments' transforms Ts,
        each pixel by a blend of its segment's and the neighbour's near a joint; splatted at sub x sub
        samples per pixel. Returns premultiplied colour and coverage on the working canvas."""
        ys, xs = np.nonzero(sp >= 0)
        s_ = sp[ys, xs]
        i0 = np.clip(np.floor(s_).astype(np.int64), 0, 3)
        f = s_ - i0
        w = np.zeros((len(s_), 4))
        a_lo = np.where((f < blend) & (i0 > 0), 0.5 + 0.5 * f / blend, 1.0)
        a_hi = np.where((f > 1 - blend) & (i0 < 3), 0.5 + 0.5 * (1 - f) / blend, 1.0)
        a = np.minimum(a_lo, a_hi)
        idx = np.arange(len(s_))
        w[idx, i0] = a
        lo = (a_lo < 1.0)
        hi = (a_hi < 1.0)
        w[idx[lo], i0[lo] - 1] = 1.0 - a[lo]
        w[idx[hi], i0[hi] + 1] = 1.0 - a[hi]
        col = crop[ys, xs].astype(np.float64)
        acc = np.zeros((CH * CW, 3))
        accw = np.zeros(CH * CW)
        offs = (np.arange(sub) + 0.5) / sub - 0.5
        for oy in offs:
            for ox in offs:
                px, py = xs + ox, ys + oy
                X = np.zeros(len(px))
                Y = np.zeros(len(px))
                for i, M in enumerate(Ts):
                    X += w[:, i] * (M[0, 0] * px + M[0, 1] * py + M[0, 2])
                    Y += w[:, i] * (M[1, 0] * px + M[1, 1] * py + M[1, 2])
                x0 = np.floor(X).astype(np.int64)
                y0 = np.floor(Y).astype(np.int64)
                fx, fy = X - x0, Y - y0
                for dy, wy in ((0, 1 - fy), (1, fy)):
                    for dx, wx in ((0, 1 - fx), (1, fx)):
                        Xi, Yi = x0 + dx, y0 + dy
                        ok = (Xi >= 0) & (Xi < CW) & (Yi >= 0) & (Yi < CH)
                        ww = (wx * wy)[ok]
                        j = Yi[ok] * CW + Xi[ok]
                        np.add.at(accw, j, ww)
                        for c in range(3):
                            np.add.at(acc[:, c], j, ww * col[ok, c])
        cv = np.clip(accw / (sub * sub), 0, 1).reshape(CH, CW)
        rgb = (acc / np.maximum(accw, 1e-9)[:, None]).reshape(CH, CW, 3)
        return (rgb * cv[..., None]).astype(np.float32), cv.astype(np.float32)

    # His dust (the lunge picture only), in his colours. His pile sits on the ground (its flat bottom) and
    # was cut by his frame box on the left: that edge is kept as he drew it, with only its top corner rounded.
    gx5, gy5 = xx + off5[0], yy + off5[1]
    DUST_CORNER = (1137, 1831)
    R_ = 8.0
    corner = (gx5 - DUST_CORNER[0] < R_) & (gy5 - DUST_CORNER[1] < R_) & ((gx5 - DUST_CORNER[0] - R_) ** 2 + (gy5 - DUST_CORNER[1] - R_) ** 2 > R_ * R_)
    dust_m = (rest5 & ~corner).astype(np.float32)
    dust_c = crop5 * dust_m[..., None]
    DUST_ORIGIN = (1310, 1950)  # where it bursts from: on the ground, behind the hind feet
    edge_fade = None

    def place_dust(scale, dx, alpha):
        """His dust scaled about DUST_ORIGIN (on the ground) and moved dx game px; rgba at game scale."""
        ox_, oy_ = to_work(5, DUST_ORIGIN)
        M = move(dx / S, 0.0) @ rot((ox_, oy_), 0.0, scale)
        # The dust is his lunge's: on the lunge's canvas (the same anchor as every frame).
        A, C = shrink(sample(dust_c, M) / np.maximum(sample(dust_m, M), 1e-4)[..., None], sample(dust_m, M), (WAX, WAY), S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        if alpha >= 1.0:
            g = A >= 0.5
            out[g, :3] = snap(C, DUST)[g]
            out[g, 3] = 255
        else:
            a = A * alpha * edge_fade
            g = a > 0.15
            out[g, :3] = snap(C, DUST_SOFT)[g]
            out[g, 3] = np.where(a[g] > 0.5, 190, 105).astype(np.uint8)
        return out

    gyo, gxo = np.mgrid[0:OH, 0:OW]
    dist_edge = np.minimum(np.minimum(gxo, OW - 1 - gxo), np.minimum(gyo, OH - 1 - gyo)).astype(np.float32)
    edge_fade = np.clip((dist_edge - 1) / 8.0, 0, 1)

    def pose(k, t, bob=0.0, push=0.0, extra=None, dust=None, metrics=None):
        """Frame drawn from key k at morph fraction t, moved bob px down and push px forward (game px),
        with extra turns (degrees) on top of the morph: legs by name, the tail as 'tail' (each segment)."""
        crop = keys[k][0]
        legs, segs, base, sp = parts[k]
        extra = extra or {}
        sgn = t if k == 0 else -(1.0 - t)  # the share of the turns from this key toward the other
        src = PW if k == 0 else QW
        dst = marks_at(t) + np.array([push / S, bob / S])
        fwd = tps(src, dst)
        inv = tps(dst, src)
        sc = SC ** t if k == 0 else SC ** -(1.0 - t)

        def at(pv, ang, axis=None, f=1.0):
            """A rigid piece: turned by ang and scaled with the body about its joint pv, which goes where the
            body's warp takes it (a leg can also be shortened by f along its axis)."""
            nx, ny = fwd(np.float64(pv[0]), np.float64(pv[1]))
            M = rot(pv, ang, sc)
            if axis is not None and f != 1.0:
                a = np.asarray(axis, np.float64) / np.hypot(*axis)
                A = np.eye(3)
                A[:2, :2] += (f - 1.0) * np.outer(a, a)
                M = M @ move(pv[0], pv[1]) @ A @ move(-pv[0], -pv[1])
            return move(float(nx) - pv[0], float(ny) - pv[1]) @ M

        far, mid, near = [], [], []
        flat = base.copy()  # the body, warped; the pieces' roots (unturned) go with it
        for n, (m, disc, pv) in legs.items():
            flat |= disc
            pc = RIG[k]['legs'][n]
            f = STRETCH[n] ** t if k == 0 else STRETCH[n] ** -(1.0 - t)
            M = at(pv, sgn * PHI[n] + extra.get(n, 0.0), np.subtract(pc['aim'], pc['pivot']), f)
            (far if pc.get('far') else near).append((m, M))
        flat |= segs[0][1]
        # The tail: a chain of segments turned about their joints, blended across each joint (so it bends
        # smoothly instead of breaking into blocks).
        tail_turn = extra.get('tail', 0.0)
        Ts, r_prev = [], None
        for i, (m, disc, jv) in enumerate(segs):
            r_i = sgn * TAIL_ABS[i] + tail_turn * (1.0 + 0.6 * i)
            Ts.append(at(jv, r_i) if i == 0 else Ts[-1] @ rot(jv, r_i - r_prev))
            r_prev = r_i
        prem = np.zeros((CH, CW, 3), np.float32)
        cov = np.zeros((CH, CW), np.float32)

        def over(pr, a):
            nonlocal prem, cov
            prem = pr + prem * (1 - a[..., None])
            cov = a + cov * (1 - a)

        for m, M in far:
            mf = m.astype(np.float32)
            over(sample(crop * mf[..., None], M), sample(mf, M))
        over(*bend(crop, sp, Ts))
        mf = flat.astype(np.float32)
        if t in (0.0, 1.0) and not bob and not push:
            over(crop * mf[..., None], mf)
        else:
            sx, sy = inv(xx, yy)
            over(sample_at(crop * mf[..., None], sx, sy), sample_at(mf, sx, sy))
        for m, M in near:
            mf = m.astype(np.float32)
            over(sample(crop * mf[..., None], M), sample(mf, M))
        rgb = prem / np.maximum(cov, 1e-4)[..., None]
        A, C = shrink(rgb, cov, (WAX, WAY), S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        if dust is not None:
            out = place_dust(*dust)
        op = A >= 0.5
        if t not in (0.0, 1.0):
            # Bits a moved piece leaves detached.
            for pts in components(op):
                if len(pts) < 20:
                    op[tuple(np.array(pts).T)] = False
        op, edge = outline_clean(op)
        out[op, :3] = snap(C, PAL)[op]
        # His glowing eyes and glints are smaller than the averaging footprint: where they cover a good
        # part of a pixel, the pixel takes their colour (so they keep glowing instead of turning muddy).
        hot = (rgb[..., 0] > 200) & (rgb[..., 1] > 140) & (rgb[..., 2] < 120) & (cov > 0.5)
        Ah, Ch = shrink(rgb, hot.astype(np.float32), (WAX, WAY), S, size, oanchor)
        hm = (Ah > 0.25) & op
        out[hm, :3] = snap(Ch, PAL)[hm]
        out[op, 3] = 255
        inner = op & ~edge
        thick = np.zeros_like(op)
        for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            thick |= np.roll(np.roll(inner, oy, 0), ox, 1)
        lit = (C @ LUMW >= 75) | ~thick
        out[edge & ~lit, :3] = OUTLINE
        out[edge & lit, :3] = OUTLINE_LIT
        out[edge, 3] = 255
        if metrics is not None:
            e = dst[0]
            metrics.append({'op': op.copy(), 'eye': ((e[0] - WAX) * S + oanchor[0], (e[1] - WAY) * S + oanchor[1])})
        return out

    # The run (a heavy bounding charge): 0 his prowl, gathered; 1-2 the body rises and stretches toward the
    # lunge, the hind legs push back, the front legs lift and the tail's curl opens; 3-4 his lunge, still
    # partly gathered, springing into 5, his lunge, with his dust bursting behind the hind feet; 6 the
    # front legs reach down for the landing and the tail starts to curl; 7 landing on his prowl, the body
    # settling, the dust drifting back and fading.
    FRAMES = [
        (0, 0.0, {}),
        (0, 0.2, dict(bob=-1.0, extra={'nh': 5.0, 'fh': 3.0})),
        (0, 0.42, dict(bob=-2.0, extra={'nh': 8.0, 'nf': -4.0})),
        (5, 0.58, dict(bob=-1.5, dust=(0.5, 2.0, 0.55), extra={'nh': 5.0})),
        (5, 0.8, dict(bob=-1.0, dust=(0.8, 1.0, 1.0))),
        (5, 1.0, dict(dust=(1.0, 0.0, 1.0))),
        (5, 0.6, dict(bob=-1.0, dust=(1.0, -5.0, 0.6), extra={'nf': -8.0, 'ff': -6.0, 'nh': -6.0})),
        (0, 0.38, dict(bob=1.5, dust=(1.0, -11.0, 0.3), extra={'nf': -5.0, 'nh': -8.0, 'fh': -4.0})),
    ]
    metrics = []
    frames = {'fly': [pose(k, t, metrics=metrics, **kw) for k, t, kw in FRAMES]}
    n = len(metrics)
    for i in range(n):
        a, b = metrics[i]['op'], metrics[(i + 1) % n]['op']
        fa, fb = frames['fly'][i][..., 3] > 128, frames['fly'][(i + 1) % n][..., 3] > 128
        xs = np.nonzero(a.any(0))[0]
        print(f'  frame {i}: eye ({metrics[i]["eye"][0]:.1f}, {metrics[i]["eye"][1]:.1f})  right x {xs.max()}  '
              f'change to next: body {100 * (a ^ b).sum() / (a.sum() + b.sum()):.1f}%, with dust {100 * (fa ^ fb).sum() / (fa.sum() + fb.sum()):.1f}%')
    if DEBUG:
        # How close the keys are to his pictures at game scale (his colour under his body / dust masks).
        for k in (0, 5):
            crop, body, rest = keys[k][0], keys[k][1], keys[k][2]
            ours = frames['fly'][k]
            A_, C_ = shrink(crop, body.astype(np.float32), (WAX, WAY), S, size, oanchor)
            Af, Cf = shrink(crop, np.ones(body.shape, np.float32), (WAX, WAY), S, size, oanchor)
            hb = A_ >= 0.5
            ob = (ours[..., 3] == 255)
            if k == 5:
                Ad, Cd = shrink(crop, rest.astype(np.float32), (WAX, WAY), S, size, oanchor)
                hd = (Ad >= 0.5) & ~hb
                od = np.isin(ours[..., :3].reshape(-1, 3).view([('', np.uint8)] * 3), np.round(DUST).astype(np.uint8).view([('', np.uint8)] * 3)).reshape(OH, OW) & ob
                ob = ob & ~od
                print(f'  key 5 dust: his {hd.sum()} px, lum {float((Cd[hd] @ LUMW).mean()):.1f}; ours {od.sum()} px, lum {float((ours[od][:, :3] @ LUMW).mean()):.1f}; his dust missing in ours {int((hd & ~od).sum())}')
            lo, lh = ours[..., :3].astype(np.float32) @ LUMW, Cf @ LUMW
            print(f'  key {k} body: his {hb.sum()} px, ours {ob.sum()}; holes (his body, ours clear) {int((hb & (ours[..., 3] == 0)).sum())}; '
                  f'lum>140 his {int((hb & (lh > 140)).sum())} ours {int((ob & (lo > 140)).sum())}; '
                  f'lum<35 his {int((hb & (lh < 35)).sum())} ours {int((ob & (lo < 35)).sum())}; mean rgb his {np.round(Cf[hb].mean(0), 1).tolist()} ours {np.round(ours[ob][:, :3].mean(0), 1).tolist()}')
    f0 = frames['fly'][0]
    feet = int(np.nonzero((f0[..., 3] == 255).any(1))[0].max())
    print('drake: feet line (lowest claw of frame 0) at y', feet, 'of', OH, '; anchor', oanchor)
    note = [
        "The stone drake (vfx_beasts/earth), copied from his earth sheet's BEAST panel: his left picture",
        "(the prowl) is frame 0 and his right one (the lunge, dust kicking up) is frame 5, both on one",
        "anchor (the middle of the torso). 1, 2 and 7 move his prowl part of the way to the lunge, 3, 4",
        "and 6 his lunge part of the way back (body, legs and tail segments turned rigidly about their",
        "joints), and his dust grows and drifts. Scale: his character is " + f"{his_char_h} px tall in that sheet, ours {CHAR_H:.0f}.",
    ]
    write_module(frames, size, oanchor, note)
    sidecar('earth', {'ref': os.path.basename(REF), 'scale': S, 'panel': list(PANEL),
                      'keys': {str(k): {'torso': list(TORSO[k]), 'origin': list(keys[k][4])} for k in (0, 5)},
                      'work': [WAX, WAY, CW, CH], 'feet': feet,
                      'morph': {'scale': SC, 'turn': TH, 'move': DV.tolist(), 't': [f[1] for f in FRAMES], 'key': [f[0] for f in FRAMES]}})
    if DEBUG:
        for k, (crop, body, rest, diff, off) in keys.items():
            vis = (crop * 0.35).astype(np.uint8)
            vis[body] = crop[body].astype(np.uint8)
            vis[rest] = [255, 0, 255]
            Image.fromarray(vis).save(os.path.join(DEBUG, f'drake-seg-{k}.png'))
        # His picture box-filtered to game scale beside ours, on his panel colour, x3.
        rows = []
        for i, k in enumerate((0, 5)):
            crop = keys[k][0]
            ones = np.ones(crop.shape[:2], np.float32)
            _, his = shrink(crop, ones, (WAX, WAY), S, size, oanchor)
            ours = Image.new('RGBA', size, tuple(int(v) for v in BG) + (255,))
            ours.alpha_composite(Image.fromarray(frames['fly'][k], 'RGBA'))
            row = Image.new('RGB', (OW * 2 + 4, OH), (0, 0, 0))
            row.paste(Image.fromarray(np.clip(his, 0, 255).astype(np.uint8)), (0, 0))
            row.paste(ours.convert('RGB'), (OW + 4, 0))
            rows.append(row)
        sheet = Image.new('RGB', (rows[0].width, OH * 2 + 4))
        sheet.paste(rows[0], (0, 0))
        sheet.paste(rows[1], (0, OH + 4))
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(os.path.join(DEBUG, 'drake-keys.png'))
        # Consecutive frames as onion skins (red: this frame only, cyan: the next only, grey: both).
        fr = frames['fly']
        strip = np.full((OH, OW * len(fr), 3), 255, np.uint8)
        for i in range(len(fr)):
            a, b = metrics[i]['op'], metrics[(i + 1) % len(fr)]['op']
            on = np.full((OH, OW, 3), 255, np.uint8)
            on[a & b] = (90, 90, 90)
            on[a & ~b] = (230, 40, 40)
            on[b & ~a] = (40, 120, 230)
            on[:, -1] = 0
            strip[:, i * OW:(i + 1) * OW] = on
        Image.fromarray(strip).resize((strip.shape[1] * 2, OH * 2), Image.NEAREST).save(os.path.join(DEBUG, 'drake-onion-pairs.png'))
    debug(frames, size, 'drake')


