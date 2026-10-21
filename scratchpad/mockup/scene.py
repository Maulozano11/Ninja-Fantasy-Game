"""Pixel-art battle stage for the mockup: forest, river with a bridge, a hill (3 levels), bushes, rocks.
Side-view 2.5D, native 960x540. paint() returns (rgb uint8 HxWx3, props list for depth sorting, info dict)."""
import math
import numpy as np
from PIL import Image, ImageDraw

W, H = 960, 540
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
rng = np.random.default_rng(7)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def pal(*hexes):
    return np.array([hexrgb(h) for h in hexes])


# palettes, dark -> light
GRASS = pal('#1f3a24', '#2a5230', '#386b37', '#4a853e', '#62a046', '#82bb52', '#a6d16a')
GRASS_FAR = pal('#2c4a3a', '#36594a', '#436b52', '#53805a', '#689563', '#80aa6e')
ROCK = pal('#262330', '#3a3442', '#504655', '#685c66', '#827578', '#a19189', '#c2b29f')
DIRT = pal('#3a2a22', '#523a2a', '#6b4d34', '#86633f', '#a07c50', '#bd9a66')
WATER = pal('#123048', '#173f5c', '#1d5070', '#256487', '#2f7b9e', '#4596b4', '#6fb8cc', '#a8dde2')
WOOD = pal('#2a1a14', '#43291c', '#5e3b25', '#7a4f30', '#97663d', '#b5834f')
LEAF = pal('#14281d', '#1c3a26', '#26502f', '#336a37', '#448442', '#5b9e4c', '#7cb85c', '#a2d071')
LEAF_FAR = pal('#1f3330', '#264238', '#2f5240', '#3b6449', '#4a7653', '#5d8a5d')
BARK = pal('#21160f', '#3a2618', '#553722', '#6e4a2d', '#8a6038')
SKY = pal('#5f8fcf', '#73a2d8', '#8ab5e0', '#a3c7e6', '#bdd7ea', '#d6e6ec', '#ecefe3')
MOUNT_FAR = pal('#7d97bf', '#8ea7c9', '#a1b7d2')
MOUNT_NEAR = pal('#566f97', '#647ea4', '#7590b2', '#88a1bf')


def quant(v, palette, x0=0, y0=0):
    """v in [0,1] (HxW) -> colors with ordered dithering between palette steps."""
    n = len(palette)
    hh, ww = v.shape
    th = BAYER[(np.arange(hh)[:, None] + y0) % 4, (np.arange(ww)[None, :] + x0) % 4]
    idx = np.clip(np.floor(v * (n - 1) + th * 0.999), 0, n - 1).astype(int)
    return palette[idx]


def mask_poly(pts, w=W, h=H):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).polygon([tuple(map(float, p)) for p in pts], fill=255)
    return np.array(im) > 0


def mask_ellipse(cx, cy, rx, ry, w=W, h=H):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return np.array(im) > 0


def blur(a, r):
    """box blur (separable) via cumulative sums."""
    if r <= 0:
        return a
    k = 2 * r + 1
    p = np.pad(a, ((r, r), (r, r)), mode='edge')
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def vnoise(h, w, scale, seed):
    r = np.random.default_rng(seed)
    a = r.random((h // scale + 3, w // scale + 3))
    im = Image.fromarray((a * 255).astype(np.uint8)).resize(((w // scale + 3) * scale, (h // scale + 3) * scale), Image.BICUBIC)
    return np.array(im)[:h, :w] / 255.0


def outline(mask, img, color, where=None):
    """dark 1px outline just inside the mask edge."""
    m = mask
    e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    if where is not None:
        e &= where
    img[e] = color
    return e


# ------------------------------------------------------------------ layout (native px)
BACK_Y = 196            # where the battlefield meets the far forest
LEVEL = 40              # one elevation level, in px
RIVER_DROP = 10         # water surface below the ground


def river_x(y):
    """centre and half width of the river at screen row y (back -> front)."""
    t = (y - BACK_Y) / (H - BACK_Y)
    cx = 528 - 70 * t + 18 * math.sin(t * 3.2)
    hw = 30 + 26 * t
    return cx, hw


BRIDGE_Y = 352           # deck top row
BRIDGE_X0, BRIDGE_X1 = 416, 600
HILL_X0 = 640            # hill plateau left edge (top)
HILL_FRONT = 318         # plateau front edge (top surface), the cliff below runs to +LEVEL


def paint():
    img = np.zeros((H, W, 3), float)
    yy, xx = np.mgrid[0:H, 0:W]

    # --- sky
    t = np.clip(yy / 200.0, 0, 1)
    img[:] = quant(1 - t * 0.95, SKY)
    # clouds
    cl = np.zeros((H, W), bool)
    for (cx, cy, s) in [(150, 52, 1.0), (420, 30, 0.8), (720, 64, 1.2), (900, 26, 0.7)]:
        for k in range(7):
            ox = (k - 3) * 16 * s + rng.normal(0, 4)
            oy = -abs(k - 3) * 3 * s + rng.normal(0, 2)
            cl |= mask_ellipse(cx + ox, cy + oy, 18 * s, 11 * s)
        cl &= ~(yy > cy + 6 * s) | ~mask_ellipse(cx, cy + 40, 400, 34)
    cv = np.clip(0.55 + (60 - yy) / 160.0 + vnoise(H, W, 6, 3) * 0.25, 0, 1)
    cloud_col = quant(cv, pal('#b9cbe0', '#d3dfea', '#eef1ef', '#ffffff'))
    img[cl] = cloud_col[cl]

    # --- mountains (two layers)
    for layer, (base, amp, pl, seed) in enumerate([(150, 70, MOUNT_FAR, 11), (176, 56, MOUNT_NEAR, 12)]):
        ridge = np.zeros(W)
        r = np.random.default_rng(seed)
        pts = np.cumsum(r.normal(0, 1, W // 8 + 2))
        pts = np.interp(np.arange(W), np.arange(0, W + 16, 8)[:len(pts)], pts)
        pts = (pts - pts.min()) / (np.ptp(pts) + 1e-6)
        ridge = base - amp * (0.35 + 0.65 * pts) + 10 * np.sin(np.arange(W) / 37.0 + seed)
        m = yy > ridge[None, :]
        lit = np.clip(0.75 - (yy - ridge[None, :]) / 90.0 + (np.arange(W)[None, :] - 480) / -4000.0, 0, 1)
        col = quant(lit, pl)
        img[m] = col[m]
        rim = m & ~np.roll(m, 1, 0)
        img[rim] = pl[-1] + 18

    # --- far forest band (silhouette canopies)
    ff = np.zeros((H, W), bool)
    for x in range(-20, W + 20, 13):
        r = rng.uniform(14, 24)
        cy = BACK_Y - 18 - rng.uniform(0, 22)
        ff |= mask_ellipse(x, cy, r * 0.9, r)
    ff |= yy >= BACK_Y - 18
    v = np.clip(0.55 - (yy - (BACK_Y - 50)) / 120.0 + vnoise(H, W, 5, 21) * 0.35, 0, 1)
    col = quant(v, LEAF_FAR)
    img[ff & (yy < BACK_Y + 4)] = col[ff & (yy < BACK_Y + 4)]
    outline(ff, img, LEAF_FAR[0] - 6, where=(yy < BACK_Y))
    # trunks hints
    for x in range(8, W, 23):
        h0 = BACK_Y - 6
        img[h0:BACK_Y + 2, x:x + 2] = BARK[1]

    # --- ground level 1 (everything from BACK_Y down)
    ground = yy >= BACK_Y
    depth = np.clip((yy - BACK_Y) / (H - BACK_Y), 0, 1)
    # big soft patches (posterized), lighter meadow and darker clover
    patch = vnoise(H, W, 26, 31) * 0.65 + vnoise(H, W, 11, 33) * 0.35
    # three crisp patch levels; the edge between levels gets a 2px dithered seam only
    lvl = np.digitize(patch, [0.42, 0.6])
    edge_d = np.abs(patch - 0.42).clip(0, 1) < 0.012
    edge_d |= np.abs(patch - 0.6).clip(0, 1) < 0.012
    gv = 0.30 + 0.38 * np.round((1 - depth) * 5) / 5 + (lvl - 1) * 0.15 + edge_d * 0.04
    gv += np.round((420 - xx) / 5000.0 * 10) / 10
    # shade under the far forest edge
    gv -= np.clip(1 - (yy - BACK_Y) / 26.0, 0, 1) * 0.35
    gnear = quant(np.clip(gv, 0, 1), GRASS)
    gfar = quant(np.clip(gv * 0.9 + 0.08, 0, 1), GRASS_FAR)
    farmix = np.clip(1 - depth * 2.4, 0, 1)
    pick = np.random.default_rng(5).random((H, W)) < farmix
    img[ground] = gnear[ground]
    img[ground & pick] = gfar[ground & pick]
    info0 = {'gv': gv}

    # dirt path: from the left edge to the bridge, then from the bridge to the hill ramp
    path = np.zeros((H, W), bool)
    for x in range(0, BRIDGE_X0 + 20, 2):
        t = x / (BRIDGE_X0 + 20)
        cy = 392 - 34 * t + 8 * math.sin(t * 5)
        hw = 16 - 6 * t
        path |= mask_ellipse(x, cy, 9, hw)
    for x in range(BRIDGE_X1 - 20, HILL_X0 + 40, 2):
        t = (x - BRIDGE_X1 + 20) / (HILL_X0 + 60 - BRIDGE_X1)
        cy = 362 - 28 * t
        path |= mask_ellipse(x, cy, 9, 11 - 3 * t)
    pv = 0.45 + (vnoise(H, W, 5, 41) - 0.5) * 0.6 + depth * 0.15
    pc = quant(np.clip(pv, 0, 1), DIRT)
    img[path & ground] = pc[path & ground]
    pe = outline(path, img, DIRT[1])
    # pebbles
    r = np.random.default_rng(42)
    for _ in range(90):
        x, y = r.integers(0, W), r.integers(BACK_Y, H)
        if path[y, x]:
            img[y, x] = DIRT[5]
            if y + 1 < H:
                img[y + 1, x] = DIRT[1]

    # grass marks: far = short horizontal dashes, mid = little tufts, near = blade clusters
    r = np.random.default_rng(9)
    for _ in range(3800):
        y = int(BACK_Y + 4 + (H - BACK_Y - 4) * r.random() ** 0.85)
        x = int(r.integers(0, W))
        if path[y, x]:
            continue
        d = (y - BACK_Y) / (H - BACK_Y)
        base = gv[y, x]
        lt = GRASS[min(6, int(np.clip(base, 0, 1) * 6) + 2)]
        dk = GRASS[max(0, int(np.clip(base, 0, 1) * 6) - 2)]
        if d < 0.25:
            ln = r.integers(2, 4)
            img[y, x:x + ln] = lt if r.random() < 0.6 else dk
        elif d < 0.6:
            for (dx, dy) in [(0, 0), (-1, -1), (1, -1), (0, -2)][: r.integers(2, 5)]:
                if 0 <= x + dx < W:
                    img[y + dy, x + dx] = lt
            img[y, x] = dk
        else:
            n = r.integers(3, 6)
            for k in range(n):
                bx = x + r.integers(-3, 4)
                hgt = r.integers(3, 4 + int(d * 6))
                lean = r.choice([-1, 0, 1])
                for j in range(hgt):
                    py_, px_ = y - j, bx + (lean if j > hgt * 0.6 else 0)
                    if 0 <= py_ < H and 0 <= px_ < W and not path[py_, px_]:
                        img[py_, px_] = lt if j >= hgt - 2 else (GRASS[3] if j > 0 else dk)
    # tiny flowers in the meadow patches
    for _ in range(160):
        y, x = int(r.integers(BACK_Y + 10, H)), int(r.integers(0, W))
        if not path[y, x] and patch[y, x] > 0.55:
            img[y, x] = hexrgb(r.choice(['#f4e27a', '#f2f2ea', '#e7a1c0', '#b9a7f0']))
            if y + 1 < H:
                img[y + 1, x] = GRASS[2]

    info = {'path': path}
    props = []

    # --- river: irregular banks, lighter shallow edges, a deep centre, stones and foam
    rr_ = np.random.default_rng(17)
    def wobble(n, amp, k):
        a_ = rr_.normal(0, 1, n + 2 * k)
        a_ = np.convolve(a_, np.ones(k) / k, mode='same')[k:-k]
        return a_ / (np.abs(a_).max() + 1e-6) * amp
    offL, offR = wobble(H, 5, 9), wobble(H, 5, 9)
    river = np.zeros((H, W), bool)
    across = np.zeros((H, W))
    for y in range(BACK_Y - 2, H):
        cx, hw = river_x(y)
        l, rgt = int(cx - hw + offL[y]), int(cx + hw + offR[y])
        river[y, max(0, l):min(W, rgt)] = True
        across[y] = (xx[y] - (l + rgt) / 2) / max(1, (rgt - l) / 2)
    wd = np.clip((yy - BACK_Y) / (H - BACK_Y), 0, 1)
    deep = np.clip(1 - np.abs(across), 0, 1)
    wv = 0.78 - 0.55 * deep ** 0.8 + 0.12 * (1 - wd) + (vnoise(H, W, 6, 51) - 0.5) * 0.18
    wcol = quant(np.clip(wv, 0, 1), WATER)
    img[river] = wcol[river]
    # shallow edges show the sandy bottom
    shallow = river & (np.abs(across) > 0.78)
    sand = quant(np.clip(0.55 + (vnoise(H, W, 3, 52) - 0.5) * 0.4, 0, 1), pal('#3d6a6a', '#4f8278', '#679a86', '#86b394'))
    img[shallow] = sand[shallow]
    # ripples: light dashes, longer toward the front; sky glints in the far part
    for _ in range(520):
        y = int(rr_.integers(BACK_Y, H))
        cx, hw = river_x(y)
        x = int(cx + rr_.uniform(-hw * 0.7, hw * 0.7))
        ln = 2 + int(((y - BACK_Y) / (H - BACK_Y)) * 10 * rr_.random())
        tone = rr_.choice([5, 6, 7], p=[0.45, 0.4, 0.15])
        for k in range(ln):
            if 0 <= x + k < W and river[y, x + k] and not shallow[y, x + k]:
                img[y, x + k] = WATER[tone]
    # banks: wet earth lip, then stones along the water
    lip = river & ~(np.roll(river, 1, 1) & np.roll(river, -1, 1))
    lip2 = river & ~(np.roll(river, 2, 1) & np.roll(river, -2, 1))
    img[lip2] = DIRT[1]
    img[lip] = DIRT[0]
    for _ in range(140):
        y = int(rr_.integers(BACK_Y + 2, H - 2))
        cx, hw = river_x(y)
        side = rr_.choice([-1, 1])
        x = int(cx + side * (hw + (offR[y] if side > 0 else offL[y])) - side * rr_.integers(0, 3))
        s = 1 + int(((y - BACK_Y) / (H - BACK_Y)) * 3 * rr_.random())
        for dy in range(-s, 1):
            for dx in range(-s, s + 1):
                if 0 <= x + dx < W and 0 <= y + dy < H and dx * dx + (dy * 1.6) ** 2 <= s * s + 0.5:
                    img[y + dy, x + dx] = ROCK[5] if (dy == -s or dx == -s) else ROCK[3]
        if 0 <= x + s + 1 < W:
            img[y, x + s + 1] = WATER[7]
    info['river'] = river

    # --- hill plateau (level 2) on the right: curvy front edge, a blocky rock cliff, a ramp to the bridge path
    LV = LEVEL + 6
    frontY = lambda x: HILL_FRONT + 7 * math.sin((x - HILL_X0) / 46.0) + 4 * math.sin((x - HILL_X0) / 17.0 + 1)
    ex = np.arange(HILL_X0, W + 3, 3)
    edge = [(int(x), frontY(x)) for x in ex]
    top_pts = [(HILL_X0 - 14, BACK_Y), (W + 2, BACK_Y), (W + 2, frontY(W))] + edge[::-1] + [(HILL_X0 - 14, HILL_FRONT - 26)]
    plateau = mask_poly(top_pts)
    lvx = lambda x: LV * min(1.0, max(0.0, (x - HILL_X0 - 6) / 46.0)) ** 0.7
    cliff = mask_poly(edge + [(W + 2, frontY(W) + LV)] + [(x, y + lvx(x)) for (x, y) in edge[::-1]])
    # plateau grass: the ground recipe, a little brighter (closer to the light)
    pv2 = gv + 0.08 - np.clip((HILL_X0 + 40 - xx) / 60.0, 0, 1) * 0.05
    pcol = quant(np.clip(pv2, 0, 1), GRASS)
    img[plateau] = pcol[plateau]
    # rock face: voronoi blocks, lit top-left, dark crevices
    cys, cxs = np.nonzero(cliff)
    r = np.random.default_rng(64)
    NS = 34
    seeds = np.stack([r.uniform(HILL_X0, W, NS), r.uniform(HILL_FRONT - 8, HILL_FRONT + LV + 8, NS)], 1)
    P = np.stack([cxs, cys], 1).astype(float)
    d = np.sqrt(((P[:, None, :] - seeds[None, :, :]) ** 2 * np.array([0.35, 1.6])).sum(-1))
    order = np.argsort(d, 1)
    d1 = d[np.arange(len(P)), order[:, 0]]
    d2 = d[np.arange(len(P)), order[:, 1]]
    cell = order[:, 0]
    base = r.uniform(0.45, 0.75, NS)[cell]
    rel = P - seeds[cell]
    yloc = (cys - np.array([frontY(x) for x in cxs])) / LV
    lit = base - rel[:, 0] * 0.006 - rel[:, 1] * 0.02 - yloc * 0.42
    noise = vnoise(H, W, 2, 66)[cys, cxs]
    v = np.clip(lit + (noise - 0.5) * 0.18, 0, 1)
    crev = ((d2 - d1) < 0.9) & (noise > 0.3)
    cols = quant(v[None, :], ROCK)[0]
    cols[crev] = ROCK[1]
    img[cys, cxs] = cols
    # lit lip under each crevice (the top of the block below it catches the light)
    lipm = np.zeros((H, W), bool)
    lipm[cys[crev], cxs[crev]] = True
    below = np.roll(lipm, 1, 0) & cliff & ~lipm
    img[below] = np.minimum(img[below] + 26, 255)
    # cast shadow at the cliff foot, grass lip and a few vines hanging over the edge
    foot = mask_poly([(x, y + lvx(x)) for (x, y) in edge] + [(W + 2, frontY(W) + LV + 8)] + [(x, y + lvx(x) + 9 * (lvx(x) / LV)) for (x, y) in edge[::-1]])
    img[foot & ~cliff] = img[foot & ~cliff] * 0.68
    for (x, y) in edge:
        for xi in range(x, x + 3):
            dl = r.integers(1, 6)
            for k in range(dl):
                yk = int(y) + k
                if 0 <= xi < W and yk < H:
                    img[yk, xi] = GRASS[[5, 4, 3, 2, 1, 1][k]] if k < dl - 1 else GRASS[1]
    for _ in range(9):
        vx = int(r.uniform(HILL_X0 + 20, W - 10))
        vy = int(frontY(vx))
        for k in range(int(r.integers(10, LV - 6))):
            img[min(H - 1, vy + k), vx + (1 if (k // 4) % 2 else 0)] = GRASS[2] if k % 3 else GRASS[4]
    rim = plateau & ~np.roll(plateau, -1, 0)
    img[rim & (yy > BACK_Y + 2)] = GRASS[6]
    # ramp: a worn dirt slope from the plateau down to the path beyond the bridge, with stone steps
    # hillside: the plateau's left end slopes down to the ground (lit, it faces the light)
    slope = mask_poly([(HILL_X0 - 14, BACK_Y), (HILL_X0 + 30, BACK_Y), (HILL_X0 + 30, frontY(HILL_X0 + 30) + LV), (HILL_X0 - 70, HILL_FRONT + LV + 4), (HILL_X0 - 60, HILL_FRONT + 10), (HILL_X0 - 34, BACK_Y + 40)])
    # blend from the plateau's tone (right, top) to the ground's (left, bottom), dithered so no edge shows
    blend = np.clip((xx - (HILL_X0 - 70)) / 100.0, 0, 1) * np.clip(1 - (yy - (HILL_FRONT - 10)) / 70.0, 0, 1)
    sv = gv + 0.08 * blend + 0.03
    img[slope] = quant(np.clip(sv, 0, 1), GRASS)[slope]
    # a worn dirt path climbing from beyond the bridge to the plateau
    ramp = np.zeros((H, W), bool)
    for k in range(60):
        t = k / 59
        px_ = BRIDGE_X1 + 8 + (HILL_X0 + 40 - BRIDGE_X1 - 8) * t
        py_ = BRIDGE_Y + 6 - (BRIDGE_Y + 6 - (HILL_FRONT - 22)) * (t ** 0.8)
        ramp |= mask_ellipse(px_, py_, 9, 6)
    rampv = 0.46 + (vnoise(H, W, 4, 72) - 0.5) * 0.5
    img[ramp] = quant(np.clip(rampv, 0, 1), DIRT)[ramp]
    outline(ramp, img, DIRT[1])
    ramp |= slope
    info['plateau'] = plateau
    info['cliff'] = cliff
    info['ramp'] = ramp
    info['frontY'] = frontY

    # --- bridge (deck seen from the front-top), after the river
    deck_top, deck_h, face_h = BRIDGE_Y, 14, 7
    deck = mask_poly([(BRIDGE_X0, deck_top), (BRIDGE_X1, deck_top - 4), (BRIDGE_X1, deck_top - 4 + deck_h), (BRIDGE_X0, deck_top + deck_h)])
    face = mask_poly([(BRIDGE_X0, deck_top + deck_h), (BRIDGE_X1, deck_top - 4 + deck_h), (BRIDGE_X1, deck_top - 4 + deck_h + face_h), (BRIDGE_X0, deck_top + deck_h + face_h)])
    # shadow on the water under the bridge
    sh = mask_poly([(BRIDGE_X0, deck_top + deck_h + face_h), (BRIDGE_X1, deck_top + deck_h + face_h - 4), (BRIDGE_X1 - 10, deck_top + deck_h + face_h + 10), (BRIDGE_X0 - 6, deck_top + deck_h + face_h + 14)])
    img[sh & river] = img[sh & river] * 0.55
    # planks: vertical slats across the deck
    planks = ((xx - BRIDGE_X0) // 6) % 2
    dv = 0.55 + planks * 0.12 + (vnoise(H, W, 3, 81) - 0.5) * 0.3 - (yy - deck_top) / 60.0
    dcol = quant(np.clip(dv, 0, 1), WOOD)
    img[deck] = dcol[deck]
    seams = deck & (((xx - BRIDGE_X0) % 6) == 0)
    img[seams] = WOOD[1]
    img[face] = quant(np.clip(0.35 + (vnoise(H, W, 4, 82) - 0.5) * 0.3 + np.zeros((H, W)), 0, 1), WOOD)[face]
    outline(deck | face, img, WOOD[0])
    # posts and rails (front rail drawn later as a prop so characters on the deck sit behind it? keep it low)
    for px in range(BRIDGE_X0 + 2, BRIDGE_X1, 30):
        py = deck_top + deck_h + face_h + 18 - int((px - BRIDGE_X0) / (BRIDGE_X1 - BRIDGE_X0) * 4)
        img[deck_top + deck_h:py, px:px + 4] = WOOD[2]
        img[deck_top + deck_h:py, px] = WOOD[1]
        img[deck_top + deck_h:py, px + 3] = WOOD[0]
    info['deck'] = deck
    info['bridge_rail'] = [(BRIDGE_X0, deck_top - 13), (BRIDGE_X1, deck_top - 17)]

    return img, props, info


# ------------------------------------------------------------------ props (drawn after/among sprites)

def tree(x, y, s=1.0, seed=1, dark=False):
    """a broadleaf tree: root flare, a forked trunk, and a crown of lumpy leaf clusters lit from the upper left."""
    r = np.random.default_rng(seed)
    w, h = int(170 * s), int(250 * s)
    canvas = np.zeros((h, w, 4), float)
    yy, xx = np.mgrid[0:h, 0:w]
    bx, by = w // 2, h - 6
    pal_ = LEAF_FAR if dark else LEAF
    # trunk with root flare and two limbs
    tw = 10 * s
    trunk = mask_poly([(bx - tw * 2.0, by + 1), (bx - tw * 0.9, by - 8 * s), (bx - tw * 0.6, by - 80 * s), (bx - tw * 1.6, by - 120 * s), (bx - tw * 1.1, by - 124 * s),
                       (bx, by - 98 * s), (bx + tw * 1.3, by - 128 * s), (bx + tw * 1.8, by - 122 * s), (bx + tw * 0.6, by - 82 * s), (bx + tw * 0.9, by - 8 * s), (bx + tw * 2.2, by + 1)], w, h)
    tv = 0.72 - (xx - (bx - tw)) / (2.4 * tw) * 0.55 + (vnoise(h, w, 2, seed + 3) - 0.5) * 0.3
    bark_lines = ((xx + (np.sin(yy / 7.0) * 1.5).astype(int)) % 4) == 0
    tv -= bark_lines * 0.2
    canvas[trunk, :3] = quant(np.clip(tv, 0, 1), BARK)[trunk]
    canvas[trunk, 3] = 255
    e = trunk & ~(np.roll(trunk, 1, 0) & np.roll(trunk, -1, 0) & np.roll(trunk, 1, 1) & np.roll(trunk, -1, 1))
    canvas[e, :3] = BARK[0]
    # crown: clusters in three tiers (back -> front), each a lumpy blob
    ccx, ccy = bx, by - 150 * s
    clusters = []
    for tier, (n, spread, rad, dim) in enumerate([(7, 1.0, 30, 0.12), (7, 0.8, 27, 0.04), (5, 0.55, 23, -0.04)]):
        for k in range(n):
            a = r.uniform(0, 2 * math.pi)
            rr = r.uniform(0.2, 1.0) ** 0.7
            cx = ccx + math.cos(a) * 52 * s * spread * rr
            cy = ccy + math.sin(a) * 40 * s * spread * rr + tier * 6 * s
            clusters.append((cx, cy, r.uniform(0.75, 1.15) * rad * s, dim, r.uniform(0, 6.28)))
    can = np.zeros((h, w), bool)
    for (cx, cy, R, dim, ph) in clusters:
        ang = np.arctan2(yy - cy, xx - cx)
        rad = np.hypot(xx - cx, yy - cy)
        Rb = R * (1 + 0.1 * np.sin(5 * ang + ph) + 0.07 * np.sin(11 * ang + 2 * ph))
        m = rad < Rb
        dx, dy = (xx - cx) / R, (yy - cy) / R
        nz = np.sqrt(np.clip(1 - dx * dx - dy * dy, 0, 1))
        lam = -0.55 * dx - 0.6 * dy + 0.5 * nz
        # whole-crown light: brighter toward the top-left of the crown
        lam += -((xx - ccx) / (70 * s)) * 0.18 - ((yy - ccy) / (60 * s)) * 0.22 - dim
        lam += (vnoise(h, w, 2, int(cx * 3 + cy * 7)) - 0.5) * 0.32
        col = quant(np.clip(lam * 0.75 + 0.35, 0, 1), pal_)
        # ambient occlusion where this cluster overlaps the ones behind: darken a rim just outside it
        ao = (rad >= Rb) & (rad < Rb + 3) & can & (dy > -0.2)
        canvas[ao, :3] = canvas[ao, :3] * 0.72
        canvas[m, :3] = col[m]
        canvas[m, 3] = 255
        rim = m & (rad > Rb - 1.2)
        canvas[rim & (dx + dy > 0), :3] = pal_[1]
        can |= m
    e = can & ~(np.roll(can, 1, 0) & np.roll(can, -1, 0) & np.roll(can, 1, 1) & np.roll(can, -1, 1))
    canvas[e, :3] = pal_[0] - 4
    # leaf tufts poking out of the silhouette
    te = np.argwhere(e)
    for k in r.choice(len(te), size=min(80, len(te)), replace=False):
        py, px = te[k]
        up = py < ccy
        for d in range(1, 3):
            q = (py - d if up else py + d, px + int(r.integers(-1, 2)))
            if 0 <= q[0] < h and 0 <= q[1] < w and not can[q]:
                canvas[q[0], q[1], :3] = pal_[2] if up else pal_[1]
                canvas[q[0], q[1], 3] = 255
    return canvas.clip(0, 255).astype(np.uint8), (x - bx, y - by)


def shadow(img, cx, cy, rx, ry, k=0.62):
    """soft dark ellipse on the ground (pixel-art: two steps)."""
    m1 = mask_ellipse(cx, cy, rx, ry)
    m2 = mask_ellipse(cx, cy, rx * 0.72, ry * 0.7)
    img[m1] = img[m1] * (k + (1 - k) * 0.45)
    img[m2] = img[m2] * 0.88


def bush(x, y, w=70, h=34, seed=3, tone=0.0):
    r = np.random.default_rng(seed)
    cw, ch = w + 12, h + 16
    canvas = np.zeros((ch, cw, 4), float)
    yy, xx = np.mgrid[0:ch, 0:cw]
    can = np.zeros((ch, cw), bool)
    val = np.full((ch, cw), -1.0)
    for k in range(9):
        cx = 6 + r.uniform(0.1, 0.9) * w
        cy = ch - 8 - r.uniform(0.2, 0.75) * h
        rad = r.uniform(0.28, 0.42) * h
        m = mask_ellipse(cx, cy, rad * 1.15, rad, cw, ch)
        dx, dy = (xx - cx) / rad, (yy - cy) / rad
        nz = np.sqrt(np.clip(1 - dx * dx - dy * dy, 0, 1))
        lam = np.clip(-0.5 * dx - 0.65 * dy + 0.5 * nz, 0, 1) + (vnoise(ch, cw, 2, seed * 13 + k) - 0.5) * 0.4
        val[m & ~can] = lam[m & ~can]
        val[m & can] = np.maximum(val[m & can], lam[m & can] - 0.12)
        can |= m
    can &= yy < ch - 6
    cc = quant(np.clip(val * 0.9 + tone, 0, 1), LEAF)
    canvas[can, :3] = cc[can]
    canvas[can, 3] = 255
    e = can & ~(np.roll(can, 1, 0) & np.roll(can, -1, 0) & np.roll(can, 1, 1) & np.roll(can, -1, 1))
    canvas[e, :3] = LEAF[0]
    # little flowers
    for _ in range(int(w / 14)):
        py, px = r.integers(4, ch - 10), r.integers(4, cw - 4)
        if can[py, px]:
            canvas[py, px, :3] = hexrgb(r.choice(['#f2d36b', '#e8eef2', '#e88aa8']))
    return canvas.clip(0, 255).astype(np.uint8), (x - cw // 2, y - (ch - 6))


def rock(x, y, w=46, h=30, seed=5):
    r = np.random.default_rng(seed)
    cw, ch = w + 6, h + 6
    canvas = np.zeros((ch, cw, 4), float)
    yy, xx = np.mgrid[0:ch, 0:cw]
    pts = []
    for k in range(9):
        a = math.pi + k / 8 * math.pi
        rr = r.uniform(0.8, 1.0)
        pts.append((cw / 2 + math.cos(a) * w / 2 * rr, ch - 4 + math.sin(a) * h * rr))
    pts += [(cw / 2 + w / 2, ch - 4), (cw / 2 - w / 2, ch - 4)]
    m = mask_poly(pts, cw, ch)
    dx = (xx - cw / 2) / (w / 2)
    dy = (yy - (ch - 4)) / h
    v = 0.75 - dx * 0.3 + dy * 0.45 + (vnoise(ch, cw, 3, seed) - 0.5) * 0.35
    facet = (xx - cw * 0.55) * 0.6 + (yy - ch * 0.4) > 0
    v -= facet * 0.15
    cc = quant(np.clip(v, 0, 1), ROCK)
    canvas[m, :3] = cc[m]
    canvas[m, 3] = 255
    e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    canvas[e, :3] = ROCK[0]
    # moss on top
    moss = m & (yy < ch - h * 0.55) & (vnoise(ch, cw, 2, seed + 9) > 0.55) & ~e
    canvas[moss, :3] = GRASS[3]
    return canvas.clip(0, 255).astype(np.uint8), (x - cw // 2, y - (ch - 4))


def tall_grass(x, y, w=40, seed=8):
    r = np.random.default_rng(seed)
    cw, ch = w + 4, 30
    canvas = np.zeros((ch, cw, 4), float)
    for k in range(int(w * 0.9)):
        bx = r.uniform(2, cw - 2)
        hgt = r.uniform(10, 26)
        lean = r.uniform(-0.35, 0.35)
        tone = r.choice([2, 3, 4, 5, 6])
        for j in range(int(hgt)):
            px_ = int(bx + lean * j)
            py_ = ch - 2 - j
            if 0 <= px_ < cw and 0 <= py_ < ch:
                canvas[py_, px_, :3] = GRASS[max(1, tone - (1 if j < 3 else 0))]
                canvas[py_, px_, 3] = 255
    return canvas.clip(0, 255).astype(np.uint8), (x - cw // 2, y - (ch - 2))


def reeds(x, y, n=6, seed=4):
    r = np.random.default_rng(seed)
    cw, ch = 24, 34
    canvas = np.zeros((ch, cw, 4), float)
    for k in range(n):
        bx = r.uniform(3, cw - 3)
        hgt = r.uniform(16, 30)
        for j in range(int(hgt)):
            py_ = ch - 2 - j
            px_ = int(bx + (j / hgt) ** 2 * r.uniform(-3, 3))
            canvas[py_, px_, :3] = GRASS[2] if j < hgt - 6 else hexrgb('#7a5b3a')
            canvas[py_, px_, 3] = 255
    return canvas.clip(0, 255).astype(np.uint8), (x - cw // 2, y - (ch - 2))
