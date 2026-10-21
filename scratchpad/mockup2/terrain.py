"""Real-scale battle map for the second mockup round: a 60 m wide forest stage with a river, a bridge,
a hill camp (level 2) and a rock lookout (level 3).

Native px at 1x: 57 px per meter across, 28 px per meter of depth, one elevation level = 1.5 m = 86 px.
paint() -> (rgba uint8 MHxMWx4 with the sky left transparent for the painted backdrop, info dict)."""
import math
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/mockup')
from scene import BAYER, pal, hexrgb, quant, GRASS, GRASS_FAR, ROCK, DIRT, WATER, WOOD, LEAF_FAR, BARK  # noqa: E402

MW, MH = 3456, 1200
PXM, PZM, LV = 57, 38, 86   # a steep camera: lots of ground depth on screen
BACK_Y = 360            # back edge of the walkable ground (level 1)
DEPTH_M = 20.0
FRONT_Y = BACK_Y + int(DEPTH_M * PZM)   # 1120: front edge; below it a non-walkable foreground lip


def gp(xm, zm, lvl=0):
    """ground point (meters across, meters of depth from the back edge, level) -> native px."""
    return xm * PXM, BACK_Y + zm * PZM - lvl * LV


def noise(h, w, cell, seed, squash=1.0):
    """smooth value noise in [0,1]; squash < 1 flattens features vertically (ground perspective)."""
    r = np.random.default_rng(seed)
    gh, gw = int(h * squash / cell) + 3, int(w / cell) + 3
    a = r.random((gh, gw))
    im = Image.fromarray((a * 255).astype(np.uint8)).resize((gw * cell, int(gh * cell / squash)), Image.BICUBIC)
    return np.array(im)[:h, :w] / 255.0


def mpoly(pts, w=MW, h=MH):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).polygon([tuple(map(float, p)) for p in pts], fill=255)
    return np.array(im) > 0


def mell(cx, cy, rx, ry, w=MW, h=MH):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return np.array(im) > 0


def edge(m):
    return m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))


# ------------------------------------------------------------------ layout (meters)
def river_c(z):
    """river centre and half width (m) at depth z: it runs from the far forest toward the viewer."""
    return 29.6 - 2.4 * z / DEPTH_M + 0.5 * math.sin(z * 0.44), 2.3 + 0.7 * z / DEPTH_M


BRIDGE_Z = 9.5          # deck front edge depth (m)
BRIDGE_DEPTH = 2.4      # deck depth (m)
HILL_X = 37.5           # plateau starts (m)
LOOK_X = 50.0           # level-3 lookout starts (m)


def hill_front(xm):
    """plateau front edge depth (m) at x."""
    return 10.75 + 0.45 * math.sin((xm - HILL_X) / 2.6) + 0.25 * math.sin((xm - HILL_X) / 0.9 + 1)


def look_front(xm):
    return 4.25 + 0.25 * math.sin((xm - LOOK_X) / 1.3)


def path_pts():
    """path centreline (m): from the left edge through the clearing to the bridge, then up the ramp."""
    a = [(-1, 14.8), (4, 14.0), (9, 13.0), (14, 13.2), (19, 12.4), (23.5, 11.2), (26.4, BRIDGE_Z + 1.0)]
    b = [(33.0, BRIDGE_Z + 1.0), (34.6, 12.0), (36.0, 11.8), (37.4, 10.0), (38.6, 8.0), (40.5, 7.0), (44, 6.8), (47, 6.2)]
    return a, b


def smooth_path(pts, n=400):
    xs, zs = zip(*pts)
    t = np.linspace(0, 1, len(pts))
    tt = np.linspace(0, 1, n)
    return np.interp(tt, t, xs), np.interp(tt, t, zs)


# ------------------------------------------------------------------ painter
def paint():
    rng = np.random.default_rng(7)
    yy, xx = np.mgrid[0:MH, 0:MW]
    img = np.zeros((MH, MW, 3), float)
    alpha = np.zeros((MH, MW), bool)
    info = {}

    # --- far tree line hugging the back edge (dark teal canopies and trunks, fades into the backdrop)
    # the back edge rises with the hill (level 2) and the lookout (level 3)
    def back_level(xm):
        if xm >= LOOK_X:
            return 2.0
        return float(np.clip((xm - (HILL_X - 1.6)) / 1.8, 0, 1))
    backline = np.array([BACK_Y - LV * back_level(x / PXM) for x in range(MW)])
    info['backline'] = backline
    ff = np.zeros((MH, MW), bool)
    x = -30
    while x < MW + 30:
        r = rng.uniform(26, 46)
        bl = backline[min(MW - 1, max(0, int(x)))]
        cy = bl - 30 - rng.uniform(0, 46)
        ff |= mell(x, cy, r * 0.9, r)
        x += rng.uniform(18, 30)
    ff |= (yy >= backline[None, :] - 34) & (yy < backline[None, :] + 6)
    v = np.clip(0.6 - (yy - (backline[None, :] - 110)) / 200.0 + noise(MH, MW, 7, 21) * 0.35, 0, 1)
    img[ff] = quant(v, LEAF_FAR)[ff]
    alpha |= ff
    for x in range(10, MW, 37):
        w = int(rng.integers(3, 6))
        bl = int(backline[x])
        top = int(bl - 40 - rng.integers(0, 30))
        img[top:bl + 2, x:x + w] = BARK[1]
        img[top:bl + 2, x] = BARK[2]
        alpha[top:bl + 2, x:x + w] = True

    # --- level 1 ground (to the bottom of the map; the foreground lip is painted over later)
    ground = yy >= BACK_Y
    depth = np.clip((yy - BACK_Y) / (FRONT_Y - BACK_Y), 0, 1)
    patch = noise(MH, MW, 70, 31, 0.5) * 0.62 + noise(MH, MW, 26, 33, 0.5) * 0.38
    lvl = np.digitize(patch, [0.42, 0.6])
    seam = (np.abs(patch - 0.42) < 0.01) | (np.abs(patch - 0.6) < 0.01)
    gv = 0.33 + 0.30 * (1 - depth) + (lvl - 1) * 0.07 + seam * 0.03
    gv -= np.clip(1 - (yy - BACK_Y) / 40.0, 0, 1) * 0.35          # shade under the far trees
    gv += noise(MH, MW, 160, 35, 0.5) * 0.12 - 0.06                  # broad light pools
    gnear = quant(np.clip(gv, 0, 1), GRASS)
    gfar = quant(np.clip(gv * 0.9 + 0.08, 0, 1), GRASS_FAR)
    farmix = np.clip(1 - depth * 2.6, 0, 1)
    pick = np.random.default_rng(5).random((MH, MW)) < farmix
    img[ground] = gnear[ground]
    img[ground & pick] = gfar[ground & pick]
    alpha |= ground
    info['gv'] = gv

    # --- dirt path
    pa, pb = path_pts()
    path = np.zeros((MH, MW), bool)
    for seg in (pa, pb):
        xs, zs = smooth_path(seg)
        for xm, zm in zip(xs, zs):
            lv = 0
            px, py = gp(xm, zm, 0)
            if xm > 36.0:      # the ramp climbs to level 2 between 36 and 38.6 m
                lv = min(1.0, (xm - 36.0) / 2.6)
                py -= lv * LV
            path |= mell(px, py, 30, 13 + 3 * (zm / DEPTH_M))
    info['path_raw'] = path.copy()

    # --- river
    river = np.zeros((MH, MW), bool)
    across = np.zeros((MH, MW))
    offL = np.convolve(rng.normal(0, 1, MH + 40), np.ones(15) / 15, 'same')[20:-20] * 18
    offR = np.convolve(rng.normal(0, 1, MH + 40), np.ones(15) / 15, 'same')[20:-20] * 18
    for y in range(BACK_Y - 4, MH):
        z = (y - BACK_Y) / PZM
        c, hw = river_c(z)
        l, r_ = int((c - hw) * PXM + offL[y]), int((c + hw) * PXM + offR[y])
        river[y, max(0, l):min(MW, r_)] = True
        across[y] = (xx[y] - (l + r_) / 2) / max(1, (r_ - l) / 2)
    deep = np.clip(1 - np.abs(across), 0, 1)
    wd = depth
    wv = 0.78 - 0.55 * deep ** 0.8 + 0.12 * (1 - wd) + (noise(MH, MW, 9, 51, 0.5) - 0.5) * 0.16
    img[river] = quant(np.clip(wv, 0, 1), WATER)[river]
    shallow = river & (np.abs(across) > 0.8)
    sand = quant(np.clip(0.55 + (noise(MH, MW, 4, 52) - 0.5) * 0.4, 0, 1), pal('#3d6a6a', '#4f8278', '#679a86', '#86b394'))
    img[shallow] = sand[shallow]
    # current streaks: long light dashes that lengthen toward the front
    for _ in range(2600):
        y = int(rng.integers(BACK_Y, MH))
        z = (y - BACK_Y) / PZM
        c, hw = river_c(z)
        x = int((c + rng.uniform(-hw * 0.75, hw * 0.75)) * PXM)
        ln = 3 + int(((y - BACK_Y) / (MH - BACK_Y)) * 22 * rng.random())
        tone = rng.choice([5, 6, 7], p=[0.5, 0.38, 0.12])
        for k in range(ln):
            if 0 <= x + k < MW and river[y, x + k] and not shallow[y, x + k]:
                img[y, x + k] = WATER[tone]
    lip = river & ~(np.roll(river, 1, 1) & np.roll(river, -1, 1))
    lip2 = river & ~(np.roll(river, 3, 1) & np.roll(river, -3, 1))
    img[lip2] = DIRT[1]
    img[lip] = DIRT[0]
    # bank pebbles
    for _ in range(520):
        y = int(rng.integers(BACK_Y + 2, MH - 3))
        z = (y - BACK_Y) / PZM
        c, hw = river_c(z)
        side = rng.choice([-1, 1])
        x = int((c + side * hw) * PXM + (offR[y] if side > 0 else offL[y]) - side * rng.integers(0, 6))
        s = 1 + int(((y - BACK_Y) / (MH - BACK_Y)) * 5 * rng.random())
        for dy in range(-s, 1):
            for dx in range(-s - 1, s + 2):
                if 0 <= x + dx < MW and 0 <= y + dy < MH and dx * dx + (dy * 1.7) ** 2 <= (s + 0.6) ** 2:
                    img[y + dy, x + dx] = ROCK[5] if (dy == -s or dx < -s + 1) else (ROCK[2] if dx > s - 1 else ROCK[3])
        if 0 <= x + s + 2 < MW:
            img[y, x + s + 2] = WATER[7]
    info['river'] = river
    info['shallow'] = shallow

    # path over grass (not over water)
    pth = path & ~river
    pv = 0.45 + (noise(MH, MW, 6, 41) - 0.5) * 0.55 + depth * 0.12
    img[pth] = quant(np.clip(pv, 0, 1), DIRT)[pth]
    pe = edge(pth)
    img[pe] = DIRT[1]
    for _ in range(900):
        x, y = int(rng.integers(0, MW)), int(rng.integers(BACK_Y, MH - 1))
        if pth[y, x] and not pe[y, x]:
            img[y, x] = DIRT[5]
            img[y + 1, x] = DIRT[1]

    # --- hill plateau (level 2) with a rock cliff, then the level-3 lookout
    def plateau_and_cliff(x0, x1, frontf, lvl, z_back=-0.3, seed=64, slope_left=True):
        xs = np.arange(x0, x1 + 0.05, 0.05)
        edge_pts = [gp(xm, frontf(xm), lvl) for xm in xs]
        top = [gp(x0 - (0.4 if slope_left else 0), z_back, lvl), gp(x1, z_back, lvl)] + edge_pts[::-1]
        plateau = mpoly(top)
        # the cliff face drops one level (LV px) under the front edge; it eases in on the left end
        ease = lambda xm: min(1.0, max(0.0, (xm - x0 - 0.1) / 0.9)) ** 0.7 if slope_left else 1.0
        cl = mpoly(edge_pts + [(p[0], p[1] + LV * ease(xm)) for p, xm in zip(edge_pts[::-1], xs[::-1])])
        # plateau grass: the ground recipe, a little brighter (closer to the light)
        pv2 = gv + 0.03 * lvl
        img[plateau] = quant(np.clip(pv2, 0, 1), GRASS)[plateau]
        alpha[plateau] = True
        # rock face: voronoi blocks lit from the upper left, dark crevices
        cys, cxs = np.nonzero(cl)
        r = np.random.default_rng(seed)
        NS = int((x1 - x0) * 5)
        y_lo, y_hi = cys.min(), cys.max()
        seeds = np.stack([r.uniform(x0 * PXM, x1 * PXM, NS), r.uniform(y_lo - 10, y_hi + 10, NS)], 1)
        P = np.stack([cxs, cys], 1).astype(float)
        dd = np.sqrt(((P[:, None, :] - seeds[None, :, :]) ** 2 * np.array([0.35, 1.5])).sum(-1))
        order = np.argsort(dd, 1)
        d1 = dd[np.arange(len(P)), order[:, 0]]
        d2 = dd[np.arange(len(P)), order[:, 1]]
        cell = order[:, 0]
        basev = r.uniform(0.45, 0.75, NS)[cell]
        rel = P - seeds[cell]
        front_y = np.interp(cxs / PXM, xs, [p[1] for p in edge_pts])
        yloc = (cys - front_y) / LV
        lit = basev - rel[:, 0] * 0.004 - rel[:, 1] * 0.012 - yloc * 0.42
        nz = noise(MH, MW, 3, seed + 2)[cys, cxs]
        vv = np.clip(lit + (nz - 0.5) * 0.18, 0, 1)
        crev = ((d2 - d1) < 1.2) & (nz > 0.28)
        cols = quant(vv[None, :], ROCK)[0]
        cols[crev] = ROCK[1]
        img[cys, cxs] = cols
        alpha[cys, cxs] = True
        lipm = np.zeros((MH, MW), bool)
        lipm[cys[crev], cxs[crev]] = True
        below = np.roll(lipm, 1, 0) & cl & ~lipm
        img[below] = np.minimum(img[below] + 26, 255)
        # cast shadow at the foot, grass lip spilling over the edge and hanging vines
        foot = mpoly([(p[0], p[1] + LV * ease(xm)) for p, xm in zip(edge_pts, xs)] + [(p[0], p[1] + LV * ease(xm) + 14 * ease(xm)) for p, xm in zip(edge_pts[::-1], xs[::-1])])
        img[foot & ~cl] *= 0.66
        for (px, py) in edge_pts[::2]:
            for xi in range(int(px), int(px) + 3):
                dl = int(r.integers(1, 8))
                for k in range(dl):
                    yk = int(py) + k
                    if 0 <= xi < MW and yk < MH:
                        img[yk, xi] = GRASS[[5, 4, 3, 2, 2, 1, 1, 1][k]] if k < dl - 1 else GRASS[1]
        for _ in range(int((x1 - x0) * 1.6)):
            vx = r.uniform(x0 + 1, x1 - 0.5)
            px, py = gp(vx, frontf(vx), lvl)
            for k in range(int(r.integers(14, LV - 10))):
                img[min(MH - 1, int(py) + k), int(px) + (1 if (k // 5) % 2 else 0)] = GRASS[2] if k % 3 else GRASS[4]
                if k % 7 == 3:
                    img[min(MH - 1, int(py) + k), int(px) - 1] = GRASS[3]
        rim = plateau & ~np.roll(plateau, -1, 0)
        img[rim] = GRASS[6]
        return plateau, cl

    plat, cliff = plateau_and_cliff(HILL_X, MW / PXM + 0.2, hill_front, 1)
    # hillside slope from the plateau's left end down to level 1 (it faces the light)
    sl = mpoly([gp(HILL_X - 0.6, -0.3, 1), gp(HILL_X + 0.4, -0.3, 1), gp(HILL_X + 0.4, hill_front(HILL_X + 0.4), 0),
                gp(HILL_X - 2.6, 12.4, 0), gp(HILL_X - 2.4, 7.5, 0.6), gp(HILL_X - 1.4, 1.9, 0.9)])
    blend = np.clip((xx - (HILL_X - 2.6) * PXM) / 170.0, 0, 1) * np.clip(1 - (yy - (BACK_Y + 120)) / 160.0, 0, 1)
    img[sl] = quant(np.clip(gv + 0.08 * blend + 0.03, 0, 1), GRASS)[sl]
    alpha[sl] = True
    foot_sl = edge(sl) & ~plat & (yy > BACK_Y)
    for k, f in enumerate([0.62, 0.8, 0.9]):
        m_ = np.roll(foot_sl, k + 1, 0) & ~sl & ~plat
        img[m_] *= f
    img[foot_sl] = GRASS[1]
    look, lcliff = plateau_and_cliff(LOOK_X, MW / PXM + 0.2, look_front, 2, seed=91, slope_left=False)
    # stone steps from the plateau up to the lookout: drawn top step first so lower ones overlap it
    steps_m = np.zeros((MH, MW), bool)
    N = 7
    for k in reversed(range(N)):
        t = (k + 1) / N
        xm = LOOK_X - 1.5 + 1.25 * t
        zm = look_front(LOOK_X) + 1.75 - 1.75 * t
        px, py = gp(xm, zm, 1 + t)
        rise = LV / N
        topf = mpoly([(px - 40, py - 5), (px + 34, py - 5), (px + 38, py + 1), (px - 36, py + 1)])
        front = mpoly([(px - 36, py + 1), (px + 38, py + 1), (px + 38, py + 1 + rise), (px - 36, py + 1 + rise)])
        tv = 0.72 + (noise(MH, MW, 3, 95 + k) - 0.5) * 0.25
        fv = 0.40 + (noise(MH, MW, 3, 120 + k) - 0.5) * 0.25
        img[front] = quant(np.clip(fv, 0, 1), ROCK)[front]
        img[topf] = quant(np.clip(tv, 0, 1), ROCK)[topf]
        img[edge(front | topf)] = ROCK[0]
        img[topf & (yy == int(py - 5) + 1)] = ROCK[6]
        steps_m |= front | topf
    alpha |= steps_m
    # path over the plateau (re-paint the part of the path that climbs onto it)
    pp = info['path_raw'] & (plat | sl) & ~cliff
    img[pp] = quant(np.clip(pv, 0, 1), DIRT)[pp]
    img[edge(pp) & (plat | sl)] = DIRT[1]
    info.update(plateau=plat, cliff=cliff, slope=sl, lookout=look, lcliff=lcliff)

    # depth (m) of every ground pixel, so grass marks keep the right size on the raised levels
    lvlmap = np.zeros((MH, MW))
    lvlmap[sl] = np.clip((xx[sl] / PXM - (HILL_X - 2.6)) / 3.0, 0, 1)
    lvlmap[plat] = 1
    lvlmap[look] = 2
    zmap = (yy - BACK_Y + lvlmap * LV) / PZM
    nomark = path | river | cliff | lcliff | steps_m
    # grass marks: far dashes, mid tufts, near blade clusters (bigger now: real scale)
    for _ in range(34000):
        y = int(BACK_Y - 2 * LV + (FRONT_Y + 40 - BACK_Y + 2 * LV) * rng.random() ** 0.9)
        x = int(rng.integers(0, MW))
        if y >= MH or y < 0 or nomark[y, x] or not alpha[y, x] or zmap[y, x] < 0.15 or (lvlmap[y, x] == 0 and y < backline[x] + 4):
            continue
        d = np.clip(zmap[y, x] / DEPTH_M, 0, 1)
        base = gv[y, x]
        lt = GRASS[min(6, int(np.clip(base, 0, 1) * 6) + 2)]
        dk = GRASS[max(0, int(np.clip(base, 0, 1) * 6) - 2)]
        if d < 0.2:
            img[y, x:x + rng.integers(2, 5)] = lt if rng.random() < 0.6 else dk
        elif d < 0.5:
            for (dx, dy) in [(0, 0), (-1, -1), (1, -1), (0, -2), (0, -3)][: rng.integers(2, 6)]:
                if 0 <= x + dx < MW:
                    img[y + dy, x + dx] = lt
            img[y, x] = dk
        else:
            for k in range(rng.integers(3, 7)):
                bx = x + rng.integers(-4, 5)
                hgt = rng.integers(4, 6 + int(d * 9))
                lean = rng.choice([-1, 0, 1])
                for j in range(hgt):
                    py_, px_ = y - j, bx + (lean if j > hgt * 0.55 else 0) + (lean if j > hgt * 0.85 else 0)
                    if 0 <= py_ < MH and 0 <= px_ < MW and not nomark[py_, px_]:
                        img[py_, px_] = lt if j >= hgt - 2 else (GRASS[3] if j > 0 else dk)
    # tiny flowers in the meadow patches
    for _ in range(900):
        y, x = int(rng.integers(BACK_Y - LV, FRONT_Y)), int(rng.integers(0, MW))
        if alpha[y, x] and not nomark[y, x] and zmap[y, x] > 0.6 and patch[y, x] > 0.56:
            img[y, x] = hexrgb(rng.choice(['#f4e27a', '#f2f2ea', '#e7a1c0', '#b9a7f0']))
            img[y + 1, x] = GRASS[2]


    # --- bridge across the river (deck from the front-top, posts in the water)
    zl, zr = BRIDGE_Z, BRIDGE_Z
    cL, hwL = river_c(BRIDGE_Z)
    bx0, bx1 = (cL - hwL - 1.0) * PXM, (cL + hwL + 1.0) * PXM
    dy_top = BACK_Y + (BRIDGE_Z - BRIDGE_DEPTH) * PZM
    dy_bot = BACK_Y + BRIDGE_Z * PZM
    face_h = 16
    deck = mpoly([(bx0, dy_top), (bx1, dy_top), (bx1, dy_bot), (bx0, dy_bot)])
    face = mpoly([(bx0, dy_bot), (bx1, dy_bot), (bx1, dy_bot + face_h), (bx0, dy_bot + face_h)])
    sh = mpoly([(bx0, dy_bot + face_h), (bx1, dy_bot + face_h), (bx1 - 20, dy_bot + face_h + 26), (bx0 - 10, dy_bot + face_h + 30)])
    img[sh & river] *= 0.55
    planks = ((xx - int(bx0)) // 12) % 2
    dv = 0.52 + planks * 0.1 + (noise(MH, MW, 4, 81) - 0.5) * 0.3 - (yy - dy_top) / 140.0
    img[deck] = quant(np.clip(dv, 0, 1), WOOD)[deck]
    img[deck & (((xx - int(bx0)) % 12) == 0)] = WOOD[1]
    img[deck & (yy == int(dy_top))] = WOOD[5]
    img[face] = quant(np.clip(0.34 + (noise(MH, MW, 5, 82) - 0.5) * 0.3 + np.zeros((MH, MW)), 0, 1), WOOD)[face]
    img[edge(deck | face)] = WOOD[0]
    for px in np.arange(bx0 + 6, bx1, 64):
        py0, py1 = int(dy_bot + face_h), int(dy_bot + face_h + 34)
        img[py0:py1, int(px):int(px) + 8] = WOOD[2]
        img[py0:py1, int(px)] = WOOD[1]
        img[py0:py1, int(px) + 7] = WOOD[0]
        img[py1 - 1:py1 + 1, int(px) - 3:int(px) + 11] = WATER[6]
    alpha |= deck | face
    info.update(deck=deck, bridge=(bx0, bx1, dy_top, dy_bot))

    # --- foreground lip: a darker band of big grass and fern silhouettes in front of the stage
    lipm = yy >= FRONT_Y + 6
    wav = FRONT_Y + 6 + 10 * np.sin(xx / 47.0) + 7 * np.sin(xx / 13.0 + 1)
    lipm = yy >= wav
    fv = 0.22 + (noise(MH, MW, 8, 101) - 0.5) * 0.3 - np.clip((yy - FRONT_Y) / 300.0, 0, 0.2)
    img[lipm] = quant(np.clip(fv, 0, 1), GRASS)[lipm] * 0.72
    for _ in range(2200):
        x = int(rng.integers(0, MW))
        y0 = int(wav[0, x] + rng.integers(4, 30))
        hgt = int(rng.integers(14, 46))
        lean = rng.uniform(-0.5, 0.5)
        for j in range(hgt):
            px_, py_ = int(x + lean * j * j / hgt), y0 - j
            if 0 <= px_ < MW and 0 <= py_ < MH:
                img[py_, px_] = GRASS[1] if j < hgt - 4 else GRASS[2]
    info['front'] = lipm

    rgba = np.zeros((MH, MW, 4), np.uint8)
    rgba[..., :3] = img.clip(0, 255).astype(np.uint8)
    rgba[..., 3] = alpha * 255
    return rgba, info


def ground_y(xm, zm, info=None):
    """screen y of the ground surface at (x, z), taking the plateau and lookout into account."""
    lvl = 0
    if xm >= LOOK_X and zm <= look_front(xm):
        lvl = 2
    elif xm >= HILL_X and zm <= hill_front(xm):
        lvl = 1
    return gp(xm, zm, lvl)


if __name__ == '__main__':
    import time
    t = time.time()
    rgba, info = paint()
    Image.fromarray(rgba).save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/mockup2/terrain.png')
    print('ok', time.time() - t)
