def erode(m, n):
    return ~dilate(~m, n)


def drake():
    """His BEAST panel on the earth sheet: a four-legged stone drake in two poses (prowl, lunge).

    His left picture (the prowl) is fly frame 0 and his right one (the lunge, dust kicking up behind the
    hind legs) is frame 5. Both stand on his one ground line: the prowl's claws and the lunge's dust pile
    rest on it, so the lunge is a leap (his lunge sits higher than his prowl) and the dust stays on the
    ground. Their eyes keep one x. The in-betweens move his own pieces: the legs and the tail turn about
    their joints, the whole body pitches and rises or falls along a smooth arc from his prowl to his
    lunge and back, and his dust grows behind the hind feet around the lunge, then drifts back and fades.
    """
    PANEL = (502, 1544, 1758, 1975)  # the panel's border lines
    SPLIT = 1118  # between his two pictures
    GROUND = 1948  # his ground under both pictures (the prowl's lowest claw, the lunge's flat dust bottom)
    EYE = {0: (1014, 1781), 5: (1670, 1728)}  # his near eyes (the middle of the yellow glow)
    # Where each picture sits on our anchor (his sheet's coordinates). Frame 0: the middle of his prowl's
    # torso, between the shoulder and the hip. Frame 5: on the same ground line, and with the eye at the
    # same x, so the lunge rises 53 of his px (22 game px) over the prowl as he drew it.
    TORSO = {0: (792, 1755)}
    TORSO[5] = (TORSO[0][0] + EYE[5][0] - EYE[0][0], TORSO[0][1] + GROUND - GROUND)
    WAX, WAY, CW, CH = 420, 215, 760, 450  # working canvas (his pixels) around each placement point
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
    # The head (its eyes and glints are warm like the dust, but they are the drake's).
    HEAD = {
        0: [(915, 1640), (1100, 1640), (1100, 1860), (915, 1860)],
        5: [(1580, 1600), (1745, 1600), (1745, 1800), (1580, 1800)],
    }

    def key(k):
        """His picture k on the working canvas (placement point at WAX, WAY): colour and layers."""
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
        lum = crop @ np.array([0.3, 0.55, 0.15], np.float32)
        near_dust = dilate(warm, 4) & (lum < 70)
        body = fill_holes(biggest(body & ~near_dust))
        # His dark under-body shadow (the belly, under the chin and the neck, the far legs) is barely lighter
        # than the panel but warmer (red - blue about -2 against the panel's -10): where it joins the body it
        # is the body's, so the battlefield does not show through the drake.
        shade = inside & ~warm & ~near_dust & ((r - b) >= (BG[0] - BG[2]) + 5) & (diff > 8) & (lum < 80)
        body = fill_holes(biggest(body | shade))
        rest = fg & ~body
        return crop, body, rest, diff, (ox, oy), shade & body

    keys = {k: key(k) for k in (0, 5)}
    for k, (crop, body, rest, diff, off, shade) in keys.items():
        print('key', k, 'body px', int(body.sum()), 'rest px', int(rest.sum()), 'shadow px', int(shade.sum()))
    # His palette: the stone and moss, plus his eye and glint yellows (too few pixels for the median cut).
    body_px = np.concatenate([keys[k][0][keys[k][1]] for k in keys])
    r_, g_, b_ = body_px[:, 0], body_px[:, 1], body_px[:, 2]
    lum_px = body_px @ np.array([0.3, 0.55, 0.15], np.float32)
    green = (g_ > r_ + 6) & (g_ > b_ + 20)
    glow = (r_ - b_ > 0.42 * r_) & (r_ > g_ + 12) & (r_ > 120)  # the eyes and the glints over them
    horn = (np.abs(r_ - b_) < 12) & (r_ > 110)  # the cool grey of the horns and the brightest plates
    stone = ~green & ~glow & ~horn
    # His near-white horn highlight (the top edge of the big horn) and the orange-amber surround of his
    # eyes are too few pixels for the median cut: they are added as they are.
    hl = horn & (lum_px >= np.percentile(lum_px[horn], 96))
    HORN_HI = np.round(np.median(body_px[hl], 0))
    amb = (r_ > 150) & (r_ - g_ > 40) & (g_ > 80) & (b_ < 100)
    EYE_AMBER = np.round(np.median(body_px[amb], 0))
    PAL = np.concatenate([median_palette(body_px[stone], 30), median_palette(body_px[green], 8),
                          median_palette(body_px[horn], 5), median_palette(body_px[glow], 5), HORN_HI[None], EYE_AMBER[None]])
    # His outline: the median of the dark pixels on his silhouette (a cool deep brown, not black).
    ring = np.concatenate([keys[k][0][keys[k][1] & ~erode(keys[k][1], 2)] for k in keys])
    ring = ring[ring @ np.array([0.3, 0.55, 0.15], np.float32) < 34]
    OUTLINE = np.round(np.median(ring, 0))
    # His under-body shadow colour (it fills what a turned leg uncovers next to its joint).
    SHADOW = np.round(np.median(np.concatenate([keys[k][0][keys[k][5]] for k in keys]), 0))
    print('drake palette', len(PAL), 'outline', OUTLINE.astype(int).tolist(), 'shadow', SHADOW.astype(int).tolist(),
          'horn highlight', HORN_HI.astype(int).tolist(), 'eye amber', EYE_AMBER.astype(int).tolist())

    # His pieces that move in the in-betweens (his sheet's coordinates). Each is cut from the body along
    # `cut` (its joint) and turned about `pivot`; the turn eases in over `bend` px from the cut, so the
    # piece stays joined to the body there. Far pieces go behind the body, the others over it.
    PIECES = {
        0: {
            'ff': {'far': True, 'cut': [(892, 1824), (965, 1830)], 'pivot': (928, 1827), 'bend': 16,
                   'poly': [(892, 1824), (965, 1830), (990, 1853), (1058, 1853), (1058, 1904), (892, 1904)]},
            'tail': {'cut': [(652, 1686), (646, 1800)], 'pivot': (649, 1743), 'bend': 22,
                     'poly': [(652, 1680), (646, 1802), (626, 1797), (560, 1806), (515, 1790), (515, 1650), (640, 1650)]},
            'nh': {'cut': [(624, 1794), (692, 1800)], 'pivot': (660, 1797), 'bend': 18,
                   'poly': [(624, 1794), (692, 1800), (696, 1848), (714, 1858), (714, 1904), (618, 1904)]},
            'nf': {'cut': [(750, 1802), (848, 1820)], 'pivot': (800, 1811), 'bend': 20,
                   'poly': [(750, 1802), (848, 1820), (858, 1862), (898, 1898), (898, 1955), (745, 1955)]},
            # The far hind leg: the dark limb in the shadow between the haunch and the near front leg.
            'fh': {'far': True, 'cut': [(714, 1796), (768, 1800)], 'pivot': (740, 1798), 'bend': 12,
                   'poly': [(714, 1796), (768, 1800), (752, 1812), (749, 1856), (712, 1856)]},
        },
        5: {
            'ff': {'far': True, 'cut': [(1550, 1768), (1606, 1758)], 'pivot': (1578, 1763), 'bend': 14,
                   'poly': [(1550, 1768), (1606, 1758), (1616, 1800), (1614, 1838), (1558, 1838), (1556, 1798)]},
            'fh': {'far': True, 'cut': [(1376, 1806), (1418, 1798)], 'pivot': (1397, 1802), 'bend': 12,
                   'poly': [(1376, 1806), (1418, 1798), (1424, 1852), (1372, 1852)]},
            'tail': {'cut': [(1348, 1692), (1338, 1776)], 'pivot': (1343, 1734), 'bend': 26,
                     'poly': [(1348, 1692), (1338, 1776), (1312, 1796), (1290, 1830), (1235, 1870), (1195, 1890), (1150, 1890), (1150, 1845), (1240, 1745), (1300, 1686)]},
            'nh': {'cut': [(1333, 1774), (1388, 1800)], 'pivot': (1360, 1787), 'bend': 18,
                   'poly': [(1333, 1774), (1388, 1800), (1368, 1842), (1356, 1892), (1292, 1892), (1296, 1840), (1318, 1800)]},
            'nf': {'cut': [(1478, 1765), (1543, 1768)], 'pivot': (1510, 1766), 'bend': 16,
                   'poly': [(1478, 1765), (1543, 1768), (1560, 1798), (1558, 1852), (1488, 1852), (1486, 1800)]},
        },
    }
    # The body pitches about the shoulders (the head stays steady; the hindquarters rise and fall).
    PITCH = {0: (880, 1745), 5: (1540, 1715)}
    DUST_ORIGIN = (1330, GROUND)  # where it bursts from: the ground behind the hind feet

    size, oanchor = canvas_for([(WAX, WAY)], CW, CH, S)
    OW, OH = size
    print('drake canvas', size, 'anchor', oanchor)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)

    def to_work(k, pt):
        ox, oy = keys[k][4]
        return (pt[0] - ox, pt[1] - oy)

    def cut_dist(k, pc):
        """Signed distance (his px) from a piece's cut line, positive toward the piece."""
        (x0, y0), (x1, y1) = [to_work(k, p) for p in pc['cut']]
        tx, ty = x1 - x0, y1 - y0
        L = float(np.hypot(tx, ty))
        nx, ny = -ty / L, tx / L
        cx = float(np.mean([to_work(k, p)[0] for p in pc['poly']]))
        cy = float(np.mean([to_work(k, p)[1] for p in pc['poly']]))
        if (cx - x0) * nx + (cy - y0) * ny < 0:
            nx, ny = -nx, -ny
        return x0, y0, nx, ny

    def bend_field(k, pc, deg):
        """Inverse displacement (for warp) that turns piece pc by deg degrees, easing in from its cut."""
        x0, y0, nx, ny = cut_dist(k, pc)
        px, py = to_work(k, pc['pivot'])
        R0 = pc['bend']

        def disp(qx, qy):
            t = np.clip(((qx - x0) * nx + (qy - y0) * ny) / R0, 0, 1)
            a = np.deg2rad(deg) * t * t * (3 - 2 * t)
            rx, ry = qx - px, qy - py
            return px + rx * np.cos(a) - ry * np.sin(a) - qx, py + rx * np.sin(a) + ry * np.cos(a) - qy

        qx, qy = xx, yy
        for _ in range(5):
            dx, dy = disp(qx, qy)
            qx, qy = xx - dx, yy - dy
        t = np.clip(((qx - x0) * nx + (qy - y0) * ny) / R0, 0, 1)
        return dx.astype(np.float32), dy.astype(np.float32), t.astype(np.float32)

    def rigid(k, deg, bob_px):
        """Inverse displacement for the whole body: pitched deg about PITCH[k], then moved down bob_px (game px)."""
        px, py = to_work(k, PITCH[k])
        ty = bob_px / S
        a = np.deg2rad(deg)
        rx, ry = xx - px, yy - ty - py
        sx = px + rx * np.cos(a) + ry * np.sin(a)
        sy = py - rx * np.sin(a) + ry * np.cos(a)
        return (xx - sx).astype(np.float32), (yy - sy).astype(np.float32)

    # Each key split into its pieces and the rest of the body; `under` is the joint zone of every piece
    # (the first stretch from its cut), which a turned leg must not uncover as a see-through gap.
    split = {}
    for k in (0, 5):
        crop, body, rest, diff, off, shade = keys[k]
        masks = {n: poly_mask(pc['poly'], (CH, CW), off) & body for n, pc in PIECES[k].items()}
        base = body.copy()
        for m in masks.values():
            base &= ~m
        under = np.zeros((CH, CW), bool)
        for n, pc in PIECES[k].items():
            x0, y0, nx, ny = cut_dist(k, pc)
            d = (xx - x0) * nx + (yy - y0) * ny
            under |= masks[n] & (d < pc['bend'] * 1.6)
        under = erode(under | base, 3) & under
        split[k] = (masks, base, under)
    if DEBUG:
        cols = {'ff': (255, 128, 0), 'fh': (0, 255, 0), 'tail': (255, 0, 255), 'nh': (0, 255, 255), 'nf': (255, 255, 0)}
        for k in (0, 5):
            masks, base, under = split[k]
            vis = (keys[k][0] * 0.5).astype(np.uint8)
            vis[base] = keys[k][0][base].astype(np.uint8)
            for n, m in masks.items():
                vis[m] = (keys[k][0][m] * 0.5 + np.array(cols[n]) * 0.5).astype(np.uint8)
            vis[under & ~dilate(~under, 1)] = (255, 255, 255)
            Image.fromarray(vis).save(os.path.join(DEBUG, f'drake-pieces-{k}.png'))

    # His dust (his lunge picture only), in his own colours and opaque, as he painted it: the pile is a solid
    # mound of cream boulders on dark soil whose flat bottom is his ground; the streaks and specks flying off
    # it are kept too, and only where they are thinner than a game pixel do they keep a partial alpha.
    crop5, body5, rest5, diff5, off5, _ = keys[5]
    gx5, gy5 = xx + off5[0], yy + off5[1]
    dust = rest5.copy()
    lum5 = crop5 @ np.array([0.3, 0.55, 0.15], np.float32)
    # The pile's left side is a straight line (x 1137) where his picture's box cut it. It ends instead along
    # his boulders there: each cream boulder the line cuts is rounded off, the darker soil between them stays
    # a few px further in, and the pile's foot spreads out to the line on the ground.
    CUT_X = 1137
    col = (lum5 > 150) & dust
    xc = int(round(CUT_X + 2 - off5[0]))
    rows_l = [int(y) for y in range(CH) if col[y, xc]]
    spans = []
    for y in rows_l:
        if spans and y <= spans[-1][1] + 2:
            spans[-1][1] = y
        else:
            spans.append([y, y])
    spans = [(a + off5[1], b + off5[1]) for a, b in spans if b - a >= 6]
    gyv = gy5[:, 0]
    depth = np.minimum((GROUND - gyv) * 0.55, 15.0)
    for ya, yb in spans:
        cy_, h = (ya + yb) / 2.0, (yb - ya) / 2.0 + 1.0
        R = min(h, 11.0)
        u = np.abs(gyv - cy_) / h
        dd = np.where(u <= 1, R * (1 - np.sqrt(np.clip(1 - u * u, 0, 1))), R + (np.abs(gyv - cy_) - h) * 1.1)
        depth = np.minimum(depth, dd)
    dust &= ~(gx5 < (CUT_X + depth)[:, None])
    print('dust: boulders cut by his frame line at y', spans)
    # The pile is the biggest piece of it; thin streaks and loose specks are the parts an opening removes.
    comps = sorted(components(dust), key=len, reverse=True)
    pile = np.zeros((CH, CW), bool)
    pts = np.array(comps[0])
    pile[pts[:, 0], pts[:, 1]] = True
    core = dilate(erode(dust, 3), 3)
    # Colour from his solid dust pixels (the edge pixels he shares with the dark panel would darken it).
    wcol = np.clip((diff5 - 30.0) / 50.0, 0.05, 1.0) * dust
    sat = dust & (diff5 > 70)
    DUST = median_palette(crop5[sat], 10)
    print('dust palette', DUST.astype(int).tolist(), 'pile px', int(pile.sum()), 'dust px', int(dust.sum()))

    def pose(k, pitch=0.0, bob=0.0, legs=None, dust_at=None):
        """Frame from key k: pieces turned by legs[name] degrees, body pitched and bobbed, dust placed.

        dust_at = (scale, dx, alpha) in game px about DUST_ORIGIN (on the ground), or None for no dust."""
        crop = keys[k][0]
        masks, base, under = split[k]
        legs = legs or {}
        far, near = [], []
        moved = False
        for n, pc in PIECES[k].items():
            m = masks[n].astype(np.float32)
            if legs.get(n, 0.0):
                moved = True
                dx, dy, t = bend_field(k, pc, legs[n])
                lay = (warp(crop * m[..., None], dx, dy), warp(m, dx, dy), warp(m, dx, dy) * t)
            else:
                lay = (crop * m[..., None], m, np.zeros_like(m))
            (far if pc.get('far') else near).append(lay)
        b = base.astype(np.float32)
        layers = far + [(crop * b[..., None], b, np.zeros_like(b))] + near
        if moved:
            u = under.astype(np.float32)
            layers = [(SHADOW[None, None] * u[..., None], u, np.zeros_like(u))] + layers
        prem = np.zeros((CH, CW, 3), np.float32)
        cov = np.zeros((CH, CW), np.float32)
        free = np.zeros((CH, CW), np.float32)  # near pieces away from their joint (they get an edge line)
        for pr, a, w in layers:
            prem = pr + prem * (1 - a[..., None])
            cov = a + cov * (1 - a)
            free = w + free * (1 - a)
        if pitch or bob:
            dx, dy = rigid(k, pitch, bob)
            prem, cov, free = warp(prem, dx, dy), warp(cov, dx, dy), warp(free, dx, dy)
        rgb = prem / np.maximum(cov, 1e-4)[..., None]
        A, C = shrink(rgb, cov, (WAX, WAY), S, size, oanchor)
        Af, _ = shrink(rgb, free, (WAX, WAY), S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        if dust_at is not None:
            s_, ddx, alpha = dust_at
            # (The dust lives on the ground: it does not follow the body's pitch and bob. Every key's working
            # canvas has its placement point at (WAX, WAY), so key 5's dust lands on any frame as it is.)
            gox, goy = to_work(5, DUST_ORIGIN)
            qx = gox + (xx - gox - ddx / S) / s_
            qy = goy + (yy - goy) / s_
            fx_, fy_ = xx - qx, yy - qy
            Ad, _ = shrink(crop5, warp(dust.astype(np.float32), fx_, fy_), (WAX, WAY), S, size, oanchor)
            _, Cd = shrink(warp(crop5, fx_, fy_), warp(wcol.astype(np.float32), fx_, fy_), (WAX, WAY), S, size, oanchor)
            Ac, _ = shrink(crop5, warp(core.astype(np.float32), fx_, fy_), (WAX, WAY), S, size, oanchor)
            solid_px = Ad >= 0.5
            thin_px = (Ad >= 0.22) & ~solid_px & (Ac < 0.1)
            a_px = np.where(solid_px, 1.0, 0.6) * alpha
            g = solid_px | thin_px
            levels = np.where(a_px > 0.8, 255, np.where(a_px > 0.47, 160, np.where(a_px > 0.2, 95, 0)))
            g &= levels > 0
            out[g, :3] = snap(Cd, DUST)[g]
            out[g, 3] = levels[g].astype(np.uint8)
        op = A >= 0.5
        if legs or pitch or bob:
            # Slivers left at a joint where a piece turned away.
            for pts in components(op):
                if len(pts) < 6:
                    op[tuple(np.array(pts).T)] = False
        op, edge = outline_clean(op)
        out[op, :3] = snap(C, PAL)[op]
        # His glowing eyes and glints are smaller than the averaging footprint: where they cover a good
        # part of a pixel, the pixel takes their colour (so they keep glowing instead of turning muddy),
        # and where only his orange-amber surround of the eye does, it takes his amber.
        hot = (rgb[..., 0] > 200) & (rgb[..., 1] > 140) & (rgb[..., 2] < 120) & (cov > 0.5)
        amber = (rgb[..., 0] > 150) & (rgb[..., 0] - rgb[..., 1] > 40) & (rgb[..., 1] > 80) & (rgb[..., 2] < 100) & (cov > 0.5)
        Ah, Ch = shrink(rgb, hot.astype(np.float32), (WAX, WAY), S, size, oanchor)
        Aa, _ = shrink(rgb, (hot | amber).astype(np.float32), (WAX, WAY), S, size, oanchor)
        hm = (Ah > 0.25) & op
        am = (Aa > 0.25) & ~hm & op & dilate(hm, 1)
        out[hm, :3] = snap(Ch, PAL)[hm]
        out[am, :3] = EYE_AMBER
        out[op, 3] = 255
        out[edge, :3] = OUTLINE
        out[edge, 3] = 255
        # A moved piece keeps its own edge where it lies over the body (away from its joint).
        fm = (Af >= 0.5) & op
        fe = np.zeros_like(fm)
        for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            fe |= fm & op & ~np.roll(np.roll(Af >= 0.25, oy, 0), ox, 1)
        out[fe, :3] = OUTLINE
        return out

    def key_frame(k):
        return pose(k, dust_at=(1.0, 0.0, 1.0) if k == 5 else None)

    # The run (a bounding gallop along one arc): 0 his prowl, gathered on the ground; 1-2 the hind legs push
    # back, the front legs lift and tuck, the tail drops and the body starts to rise; 3-4 springing into 5,
    # his lunge at the top of the leap, with his dust bursting off the ground behind the hind feet; 6 the
    # front legs reach down as the body comes down; 7 about to land, the dust drifting back and fading.
    # Leg angles in degrees (+ turns a hanging limb's foot backward); bob in game px (+ is down).
    FLY = [
        None,
        dict(k=0, pitch=-2.0, bob=-4.0, legs={'nf': 8, 'ff': -8, 'nh': 10, 'fh': 6, 'tail': -6}),
        dict(k=0, pitch=-4.0, bob=-8.0, legs={'nf': 16, 'ff': -16, 'nh': 20, 'fh': 12, 'tail': -12}),
        dict(k=5, pitch=6.0, bob=6.0, legs={'nf': -4, 'ff': 6, 'nh': -12, 'fh': -10, 'tail': 8}, dust_at=(0.45, 2.0, 1.0)),
        dict(k=5, pitch=3.0, bob=3.0, legs={'nf': -2, 'ff': 3, 'nh': -6, 'fh': -5, 'tail': 4}, dust_at=(0.75, 1.0, 1.0)),
        None,
        dict(k=5, pitch=4.0, bob=4.0, legs={'nf': -14, 'ff': -10, 'nh': -16, 'fh': -12, 'tail': 6}, dust_at=(1.04, -5.0, 0.62)),
        dict(k=0, pitch=2.0, bob=-8.0, legs={'nf': -8, 'ff': 4, 'nh': -10, 'fh': -6, 'tail': -8}, dust_at=(1.08, -10.0, 0.3)),
    ]
    frames = {'fly': [key_frame(0) if i == 0 else key_frame(5) if i == 5 else
                      pose(f['k'], f['pitch'], f['bob'], f['legs'], f.get('dust_at')) for i, f in enumerate(FLY)]}
    f0 = frames['fly'][0]
    feet = int(np.nonzero((f0[..., 3] == 255).any(1))[0].max())
    print('drake: feet line (lowest claw of frame 0) at y', feet, 'of', OH, '; anchor', oanchor)
    for i, f in enumerate(frames['fly']):
        e = (f[..., 0] > 200) & (f[..., 1] > 150) & (f[..., 2] < 130) & (f[..., 3] == 255)
        ys_, xs_ = np.nonzero(e)
        sel = xs_ > np.percentile(xs_, 40) if len(xs_) else xs_
        solid_rows = np.nonzero((f[..., 3] == 255).any(1))[0]
        dust_rows = np.nonzero(((f[..., 3] > 0) & (f[..., 3] < 255)).any(1))[0]
        print(f'  frame {i}: eye ~({xs_[sel].mean():.1f}, {ys_[sel].mean():.1f}) n={len(xs_)}; lowest solid y {solid_rows.max()},'
              f' lowest soft y {dust_rows.max() if len(dust_rows) else "-"}')
    note = [
        "The stone drake (vfx_beasts/earth), copied from his earth sheet's BEAST panel: his left picture",
        "(the prowl) is frame 0 and his right one (the lunge, dust kicking up) is frame 5, both standing on",
        "his one ground line with the eye at one x. 1-4, 6 and 7 turn his legs and tail about their joints,",
        "pitch the body and carry it along the leap between his two pictures, and move his dust.",
        "Scale: his character is " + f"{his_char_h} px tall in that sheet, ours {CHAR_H:.0f}.",
    ]
    write_module(frames, size, oanchor, note)
    sidecar('earth', {'ref': os.path.basename(REF), 'scale': S, 'panel': list(PANEL), 'ground': GROUND,
                      'keys': {str(k): {'torso': list(TORSO[k]), 'origin': list(keys[k][4]), 'eye': list(EYE[k])} for k in (0, 5)},
                      'work': [WAX, WAY, CW, CH], 'feet': feet})
    if DEBUG:
        for k, (crop, body, rest, diff, off, shade) in keys.items():
            vis = (crop * 0.35).astype(np.uint8)
            vis[body] = crop[body].astype(np.uint8)
            vis[shade] = (vis[shade] * 0.5 + np.array([0, 160, 255]) * 0.5).astype(np.uint8)
            vis[rest] = [255, 0, 255]
            if k == 5:
                vis[dust & ~pile] = [255, 255, 0]
                vis[rest & ~dust] = [255, 0, 0]
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
        # Onion skin of the two keys (red: frame 0, cyan: frame 5).
        on = np.zeros((OH, OW, 3), np.uint8)
        on[frames['fly'][0][..., 3] > 0, 0] = 255
        on[frames['fly'][5][..., 3] > 0, 1:] = 200
        on[oanchor[1], :, 2] = 255
        on[:, oanchor[0], 2] = 255
        Image.fromarray(on).resize((OW * 3, OH * 3), Image.NEAREST).save(os.path.join(DEBUG, 'drake-onion.png'))
        # Consecutive frames as onion skins (red: this frame, cyan: the next).
        fr = frames['fly']
        strip = np.zeros((OH, OW * len(fr), 3), np.uint8)
        for i in range(len(fr)):
            on = np.zeros((OH, OW, 3), np.uint8)
            on[fr[i][..., 3] > 128, 0] = 255
            on[fr[(i + 1) % len(fr)][..., 3] > 128, 1:] = 200
            strip[:, i * OW:(i + 1) * OW] = on
        Image.fromarray(strip).save(os.path.join(DEBUG, 'drake-onion-pairs.png'))
    debug(frames, size, 'drake')
