# Kirin: cuts the owner's reference (art2/REF-kirin-owner.jpg) into game-scale layers.
#
#   python3 -I vfx-kirin-extract.py <art2 dir>
#
# For each panel (normal, enhanced):
#   - removes his character and the background (navy #080f2c),
#   - separates the effect into layers: cloud, kanji, bolt (normal) or dragon (enhanced), ground,
#     plus the flying debris chunks (enhanced),
#   - maps them to game scale with one uniform scale per panel, chosen so his outer ground ring
#     spans our circle (3 m normal, 4.5 m enhanced): 0.60 and 0.72, which puts his character at
#     86 and 104 px against our 98 px; his composition and perspective are kept as drawn,
#   - downsamples with an area filter, quantizes to a palette sampled from his image and steps
#     the glow alpha.
# Writes <art2>/vfx-kirin-src/<version>-<layer>.png and <version>.json (frame, anchor, eye,
# kanji stroke map, debris). vfx-sig-kirin.ts animates them. Deterministic.

import json, sys, os
import numpy as np
from PIL import Image, ImageDraw

ART2 = sys.argv[1]
SRC = os.path.join(ART2, 'REF-kirin-owner.jpg')
OUT = os.path.join(ART2, 'vfx-kirin-src')
BG = np.array([8.0, 15.0, 44.0])
S_UP = 0.68
PPM, DPM = 57.0, 38.0
MARGIN = 10

IMG = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float64)
H_IMG, W_IMG = IMG.shape[:2]

# ---------------------------------------------------------------------------------------------

def poly_mask(pts, shape=(H_IMG, W_IMG)):
    im = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    return np.asarray(im) > 0

def ellipse_mask(cx, cy, rx, ry):
    yy, xx = np.mgrid[0:H_IMG, 0:W_IMG]
    return ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1

def corridor_mask(pts, half):
    im = Image.new('L', (W_IMG, H_IMG), 0)
    d = ImageDraw.Draw(im)
    d.line([tuple(p) for p in pts], fill=255, width=int(half * 2))
    for p in pts:
        d.ellipse([p[0] - half, p[1] - half, p[0] + half, p[1] + half], fill=255)
    return np.asarray(im) > 0

def shift(m, dx, dy):
    o = np.zeros_like(m)
    H, W = m.shape
    o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return o

def dilate(m, r):
    for _ in range(r):
        m = m | shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)
    return m

def erode(m, r):
    return ~dilate(~m, r)

def fill_holes(m):
    """Fills regions of ~m not connected to the image border."""
    inv = Image.fromarray(((~m) * 255).astype(np.uint8)).copy()
    H, W = m.shape
    seeds = [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]
    for s in seeds:
        if inv.getpixel(s) == 255:
            ImageDraw.floodfill(inv, s, 128)
    a = np.asarray(inv)
    return m | (a == 255)

def components(m):
    """Connected components (4-neighbour) of a boolean mask: list of (ys, xs)."""
    H, W = m.shape
    seen = np.zeros_like(m)
    out = []
    ys0, xs0 = np.nonzero(m)
    for y0, x0 in zip(ys0, xs0):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        cy, cx = [], []
        while stack:
            y, x = stack.pop()
            cy.append(y)
            cx.append(x)
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    stack.append((yy, xx))
        out.append((np.array(cy), np.array(cx)))
    return out

def hash2(x, y, seed):
    h = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0x1000000)

def vnoise(shape, cell, seed):
    H, W = shape
    gy, gx = H // cell + 2, W // cell + 2
    g = np.array([[hash2(i, j, seed) for i in range(gx)] for j in range(gy)])
    yy, xx = np.mgrid[0:H, 0:W] / float(cell)
    x0, y0 = np.floor(xx).astype(int), np.floor(yy).astype(int)
    tx, ty = xx - x0, yy - y0
    sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    a, b, c, d = g[y0, x0], g[y0, x0 + 1], g[y0 + 1, x0], g[y0 + 1, x0 + 1]
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy

# ---------------------------------------------------------------------------------------------

def inpaint_rows(rgb, hole, keep):
    """Fills `hole` from its rim inward (onion peel): each pass gives the hole pixels touching known
    pixels the average of those neighbours."""
    out = rgb.copy()
    known = keep & ~hole
    todo = hole.copy()
    for _ in range(200):
        if not todo.any():
            break
        acc = np.zeros_like(out)
        cnt = np.zeros(hole.shape)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = shift(known, dx, dy)
            acc += np.where(k[..., None], np.roll(np.roll(out, dy, 0), dx, 1), 0)
            cnt += k
        ring = todo & (cnt > 0)
        out[ring] = acc[ring] / cnt[ring, None]
        known |= ring
        todo &= ~ring
    return out

def mirror_fill(rgb, hole, keep, c):
    """Fills `hole` with the swirl from the opposite side of the eye `c` (a two-armed vortex looks
    the same turned half a turn), then any rest from the rim inward."""
    out = rgb.copy()
    ys, xs = np.nonzero(hole)
    my, mx = (2 * c[1] - ys).astype(int), (2 * c[0] - xs).astype(int)
    ok = (my >= 0) & (my < H_IMG) & (mx >= 0) & (mx < W_IMG)
    ok[ok] = keep[my[ok], mx[ok]]
    out[ys[ok], xs[ok]] = rgb[my[ok], mx[ok]]
    rest = np.zeros_like(hole)
    rest[ys[~ok], xs[~ok]] = True
    return inpaint_rows(out, rest, keep | (hole & ~rest)) if rest.any() else out

def ring_fill(rgb, a_src, hole, keep, c, r, steps=(0.5, -0.5, 0.9, -0.9, 1.3, -1.3)):
    """Fills `hole` on the ground from the same ring further round: each pixel takes the pixel at
    its elliptical radius turned by a step about the rings' centre `c` (half-axes `r`), so the
    concentric rings and their crackle run on unbroken. Returns (colours, filled mask)."""
    out = rgb.copy()
    ys, xs = np.nonzero(hole)
    u, v = (xs + 0.5 - c[0]) / r[0], (ys + 0.5 - c[1]) / r[1]
    rad, th = np.hypot(u, v), np.arctan2(v, u)
    done = np.zeros(len(ys), bool)
    for dt in steps:
        sx = np.floor(c[0] + rad * np.cos(th + dt) * r[0]).astype(int)
        sy = np.floor(c[1] + rad * np.sin(th + dt) * r[1]).astype(int)
        ok = ~done & (sx >= 0) & (sx < W_IMG) & (sy >= 0) & (sy < H_IMG)
        ok[ok] = keep[sy[ok], sx[ok]]
        out[ys[ok], xs[ok]] = rgb[sy[ok], sx[ok]]
        done |= ok
    filled = np.zeros_like(hole)
    filled[ys[done], xs[done]] = True
    return out, filled

def swirl_fill(rgb, hole, keep, c):
    """Fills the hole the bolt leaves in the vortex from the same swirl band further round the eye
    (the bands are concentric squashed ellipses), so the rings run on unbroken."""
    out, filled = ring_fill(rgb, None, hole, keep, c, (100.0, 46.0), steps=(0.7, -0.7, 1.1, -1.1, 1.5, -1.5, 2.0, -2.0))
    rest = hole & ~filled
    return inpaint_rows(out, rest, keep | filled) if rest.any() else out

def strokes(pts, dx=0, dy=0):
    return [[(x + dx, y + dy) for x, y in s] for s in pts]

KANJI_N = [
    [(150, 320), (335, 318)],
    [(122, 362), (108, 405), (98, 445)],
    [(130, 385), (395, 378), (372, 400), (345, 412)],
    [(240, 330), (242, 490)],
    [(160, 408), (215, 430)],
    [(158, 447), (215, 470)],
    [(290, 405), (345, 422)],
    [(295, 447), (345, 468)],
    [(130, 515), (150, 640)],
    [(135, 515), (365, 528), (345, 640)],
    [(195, 578), (330, 575)],
    [(240, 535), (248, 640)],
    [(160, 625), (345, 628)],
]
KANJI_E = [
    [(1160, 322), (1340, 318)],
    [(1100, 365), (1094, 405), (1088, 440)],
    [(1120, 385), (1390, 385), (1360, 410), (1330, 418)],
    [(1240, 330), (1240, 495)],
    [(1150, 405), (1215, 425)],
    [(1150, 450), (1215, 470)],
    [(1290, 400), (1350, 420)],
    [(1280, 445), (1340, 470)],
    [(1135, 515), (1150, 645)],
    [(1135, 515), (1345, 530), (1335, 645)],
    [(1180, 575), (1320, 575)],
    [(1240, 535), (1240, 645)],
    [(1160, 630), (1340, 630)],
]

PANELS = {
    'kirin': dict(
        box=(0, 56, 992, 1085), area=3 * PPM,
        origin=(585.0, 932.0), ring=(285.0, 72.0), eye=(632, 348), eye_r=(105, 48), eye_low=(625, 380, 125, 58), close=6,
        char=[(28, 808), (228, 808), (228, 1018), (28, 1018)],
        cloud_box=[(262, 56), (980, 56), (980, 498), (262, 498)],
        kanji_poly=[(40, 232), (446, 232), (446, 600), (402, 600), (402, 714), (40, 714)],
        ground=(590.0, 945.0, 400.0, 150.0, 812),
        main=dict(start=(630, 352), end=(585, 930)),
        strokes=KANJI_N, cut=[],
    ),
    'kirin_enh': dict(
        # Trimmed so a 12-frame row stays under 8192 px: a few ray tips on the left, the far right
        # of the cloud (re-edged with billows) and of the crater (frayed).
        box=(1022, 56, 1910, 1085), area=4.5 * PPM,
        origin=(1600.0, 958.0), ring=(355.0, 82.0), eye=(1688, 300), eye_r=(120, 52), eye_low=(1680, 335, 150, 70), close=9,
        char=[(1036, 826), (1224, 826), (1224, 962), (1208, 1016), (1036, 1016)],
        cloud_box=[(1030, 56), (2000, 56), (2000, 500), (1030, 500)],
        kanji_poly=[(1012, 200), (1452, 200), (1452, 714), (1012, 714)],
        ground=(1600.0, 952.0, 430.0, 168.0, 742),
        dragon_body=[(1688, 305), (1690, 380), (1640, 400), (1575, 415), (1600, 455), (1700, 490), (1790, 545), (1770, 600), (1720, 640)],
        dragon_head=[(1428, 700), (1500, 596), (1600, 556), (1700, 576), (1764, 650), (1744, 780), (1684, 862), (1604, 906), (1520, 906), (1458, 862), (1428, 780)],
        mouth=(1545, 880),
        strokes=KANJI_E, cut=['top', 'right', 'left'],
    ),
}

# ---------------------------------------------------------------------------------------------

def trace_main(start, end):
    """Centre line of the bolt's main channel: the whitest run in a window that follows it down."""
    x = float(start[0])
    pts = []
    mn = IMG.min(-1)
    for y in range(int(start[1]), int(end[1]) + 1):
        lo, hi = int(x - 26), int(x + 26)
        row = mn[y, lo:hi]
        cand = np.nonzero(row > 205)[0]
        if len(cand):
            # Keep the cluster nearest the current x.
            xs = lo + cand
            near = xs[np.abs(xs - x) <= np.abs(xs - x).min() + 10]
            x = 0.6 * x + 0.4 * near.mean()
        pts.append((x, y))
    # Smooth.
    xs = np.array([p[0] for p in pts])
    k = 7
    sm = np.convolve(np.pad(xs, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k]
    return [(float(sm[i]), float(pts[i][1])) for i in range(len(pts))]

def build(key, P):
    x0, y0, x1, y1 = P['box']
    panel = np.zeros((H_IMG, W_IMG), bool)
    panel[y0:y1, x0:x1] = True
    rgb = IMG.copy()
    char = poly_mask(P['char'])
    rgb[char] = BG
    d = np.sqrt(((rgb - BG) ** 2).sum(-1))
    fg = (d > 16) & panel
    # Alpha: solid where the material is opaque, stepped glow elsewhere.
    alpha = np.clip((d - 10) / 90.0, 0, 1)
    cloud_box = poly_mask(P['cloud_box'])
    # The cloud's material is violet to grey (red at least close to green); its lightning, the
    # kanji and their blue halos are not, so they never grow the silhouette.
    r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    material = (d > 14) & (r_ > g_ * 0.85) & (rgb.max(-1) < 205) & cloud_box & panel
    # The kanji's own halo is not cloud, even where it sits over the smoke.
    kanji_core = ((rgb.min(-1) > 190) | ((g_ > 170) & (b_ > 200))) & poly_mask(P['kanji_poly'])
    material &= ~dilate(kanji_core, 10)
    ex, ey_ = P['eye']
    rc = P['close']
    el = P['eye_low']
    eye_area = ellipse_mask(ex, ey_, P['eye_r'][0], P['eye_r'][1]) & panel
    eye_low = ellipse_mask(el[0], el[1], el[2], el[3]) & panel
    cloud_sil = fill_holes(erode(dilate(material, rc), rc) | eye_area) & cloud_box & panel
    dim_px = rgb.mean(-1) < 170
    # Only the cloud mass itself (and big pieces of it), not halos that happen to be violet.
    comps = components(cloud_sil)
    big = max(len(c[0]) for c in comps)
    cloud_sil = np.zeros_like(cloud_sil)
    for ys_, xs_ in comps:
        if len(ys_) >= 0.02 * big:
            cloud_sil[ys_, xs_] = True
    gx, gy, grx, gry, gtop = P['ground']
    ground_reg = ellipse_mask(gx, gy, grx, gry) & panel
    ground_reg[:gtop] = False
    ground_solid = fill_holes(erode(dilate((d > 12) & ground_reg, 3), 3)) & ground_reg
    kanji_reg = poly_mask(P['kanji_poly']) & panel & ~cloud_sil
    meta = {}
    layers = {}
    if key == 'kirin':
        main = trace_main(P['main']['start'], P['main']['end'])
        corr = corridor_mask(main, 15)
        ey = P['eye'][1]
        yy = np.mgrid[0:H_IMG, 0:W_IMG][0]
        corr_below = corr & (yy >= ey)
        # The cloud keeps its eye: the channel inside it is painted over with the swirl around it.
        bolt_px = dilate(corr_below & (rgb.mean(-1) > 140), 4)
        hole = bolt_px & (cloud_sil | eye_low) & (yy > ey + 14)
        cloud_rgb = swirl_fill(rgb, hole, cloud_sil & ~hole, P['eye'])
        cloud_sil = cloud_sil | hole
        layers['cloud'] = cloud_sil.copy()
        meta['cloud_rgb'] = cloud_rgb
        layers['kanji'] = fg & kanji_reg & ~corr_below
        foot = P['main']['end']
        # Over the ground the bolt is only its white channel and his blinding point; the rings
        # under it are painted in, so the ground stays whole when the bolt dims.
        lum_g = rgb.mean(-1)
        wide = corridor_mask(main, 34) & (yy >= ey)
        bolt_on_ground = wide & ground_reg & (lum_g > 175) & (corr | (np.hypot(np.mgrid[0:H_IMG, 0:W_IMG][1] - foot[0], yy - foot[1]) < 40))
        bolt_on_ground = erode(dilate(bolt_on_ground, 1), 1) & wide
        under = wide & ground_reg
        solid_g = fill_holes(erode(dilate((d > 12) & ground_reg & ~under, 3), 3)) & ground_reg
        src4, filled = ring_fill(np.dstack([rgb, alpha * 255]), None, under, (d > 12) & ground_reg & ~under, P['origin'], P['ring'])
        meta['ground_rgb'], meta['ground_alpha'] = src4[..., :3], np.where(filled, src4[..., 3] / 255, alpha)
        solid_g = (solid_g & ~under) | (filled & shift(solid_g, 0, 0))
        rest = under & ~filled & ellipse_mask(P['origin'][0], P['origin'][1], 40, 20)
        if rest.any():
            meta['ground_rgb'] = inpaint_rows(meta['ground_rgb'], rest, (filled | (ground_reg & ~under)) & ~rest)
            meta['ground_alpha'] = np.where(rest, 1.0, meta['ground_alpha'])
            filled = filled | rest
        layers['ground'] = (fg & ground_reg & ~under) | filled
        layers['bolt'] = (fg & ~cloud_sil & ~kanji_reg & ~ground_reg) | (fg & corr_below & ~ground_reg) | bolt_on_ground
        meta['main'] = main
        solid = {'cloud': cloud_sil, 'ground': solid_g}
    else:
        body = corridor_mask(P['dragon_body'], 60)
        head = poly_mask(P['dragon_head'])
        dragon_reg = (body | head) & panel & ~cloud_sil
        dragon_reg &= ~kanji_reg
        inner = corridor_mask(P['dragon_body'][:6], 34)
        yy = np.mgrid[0:H_IMG, 0:W_IMG][0]
        # Halo hanging under the eye along the body belongs to the dragon, not the cloud.
        hang = poly_mask([(1530, 382), (1790, 382), (1790, 505), (1530, 505)])
        cloud_sil &= ~(hang & ~erode(dilate(material, 2), 2))
        bolt_px = dilate(inner & (rgb.mean(-1) > 140), 5)
        hole = bolt_px & (cloud_sil | eye_low) & (yy > P['eye'][1] + 16)
        meta['cloud_rgb'] = swirl_fill(rgb, hole, cloud_sil & ~hole, P['eye'])
        cloud_sil = cloud_sil | hole
        layers['cloud'] = cloud_sil.copy()
        layers['kanji'] = fg & kanji_reg
        layers['dragon'] = fg & (dragon_reg | hole)
        ground_solid = fill_holes(erode(dilate((d > 12) & ground_reg & ~dragon_reg, 3), 3)) & ground_reg
        # Solid only from the ring's far edge down (the crater); the burst above it keeps its glow.
        ground_solid &= yy > P['origin'][1] - P['ring'][1] * 0.85
        # Everything the dragon covers on the ground (the crater and the burst behind its head) is
        # painted in from further round the rings, so nothing opens when the dragon fades.
        under = dragon_reg & ground_reg
        src4, filled = ring_fill(np.dstack([rgb, alpha * 255]), None, under, (d > 12) & ground_reg & ~dragon_reg, P['origin'], P['ring'], steps=(0.45, -0.45, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6))
        meta['ground_rgb'], meta['ground_alpha'] = src4[..., :3], np.where(filled, src4[..., 3] / 255, alpha)
        rest = under & ~filled
        if rest.any():
            meta['ground_rgb'] = inpaint_rows(meta['ground_rgb'], rest, ground_solid & ~rest)
        layers['ground'] = (fg & ground_reg & ~dragon_reg) | under
        # Everything left over (sparks and far arcs around the burst) is its own upright layer.
        layers['sparks'] = fg & ~(layers['cloud'] | layers['kanji'] | layers['dragon'] | layers['ground'])
        # The dragon's solid crystal: the bright body.
        solid = {'cloud': cloud_sil, 'ground': ground_solid, 'dragon': fill_holes(erode(dilate((d > 60) & dragon_reg, 3), 3)) & dragon_reg}
        # Flying debris: warm rock chunks outside the crater body.
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        warm = panel & (r > b + 8) & (r > 60) & (r > g)
        crater_core = ellipse_mask(gx, gy + 20, grx * 0.86, gry * 0.62)
        cand = warm & ~crater_core & ~dragon_reg
        meta['debris_full'] = []
        for ys, xs in components(dilate(cand, 2)):
            if 25 <= len(ys) <= 1400:
                meta['debris_full'].append((ys, xs))
                layers['ground'][ys, xs] = False
    # Clean cores: his strokes and the bolt's channel are solid white-cyan; JPEG specks and keyed
    # holes inside them become white.
    lum_ = rgb.mean(-1)
    for name in ('kanji', 'bolt'):
        if name not in layers:
            continue
        bright = layers[name] & (lum_ > 190)
        core = erode(dilate(bright, 2), 2) & dilate(layers[name], 1)
        src = meta.get(name + '_rgb', rgb).copy()
        fix = core & (lum_ < 205)
        src[fix] = np.array([236.0, 251.0, 255.0])
        meta[name + '_rgb'] = src
        layers[name] = layers[name] | core
        solid[name] = core
    # Cut panel edges fade out raggedly so nothing ends on a straight line.
    fade = np.ones((H_IMG, W_IMG))
    nz = vnoise((H_IMG, W_IMG), 9, 77)
    yy, xx = np.mgrid[0:H_IMG, 0:W_IMG]
    if 'top' in P['cut']:
        fade = np.minimum(fade, np.clip((yy - y0 - 4) / 46.0 + (nz - 0.5) * 0.7, 0, 1))
    if 'right' in P['cut']:
        fade = np.minimum(fade, np.clip((x1 - 1 - xx - 4) / 46.0 + (nz - 0.5) * 0.7, 0, 1))
    if 'left' in P['cut']:
        fade = np.minimum(fade, np.clip((xx - x0 - 2) / 20.0 + (nz - 0.5) * 0.5, 0, 1))
    return rgb, d, alpha, layers, solid, fade, meta

# ---------------------------------------------------------------------------------------------

def to_sprite(rgb, a, x0, y0, x1, y1, sx, sy, origin):
    """Premultiplied area resample of the panel region into sprite scale, with its offset (sprite px
    of the region's top-left relative to the origin)."""
    sub = np.concatenate([rgb[y0:y1, x0:x1] * a[y0:y1, x0:x1, None], a[y0:y1, x0:x1, None] * 255], -1)
    im = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8), 'RGBA')
    W2, H2 = max(1, round((x1 - x0) * sx)), max(1, round((y1 - y0) * sy))
    res = np.asarray(im.resize((W2, H2), Image.BOX)).astype(np.float64)
    off = ((x0 - origin[0]) * sx, (y0 - origin[1]) * sy)
    return res, off

def to_sprite_ground(rgb, a, x0, y0, x1, y1, sx, sy, origin, ybreak):
    """The ground decal: below `ybreak` (the far edge of his ring) stretched onto our circle's
    ellipse (sx, sy); above it, what rises off the ground keeps the upright scale, joined without
    a seam."""
    ybreak = int(round(min(max(ybreak, y0 + 1), y1 - 1)))
    top, _ = to_sprite(rgb, a, x0, y0, x1, ybreak, sx, S_UP, origin)
    bot, _ = to_sprite(rgb, a, x0, ybreak, x1, y1, sx, sy, origin)
    w = min(top.shape[1], bot.shape[1])
    res = np.concatenate([top[:, :w], bot[:, :w]], 0)
    off = ((x0 - origin[0]) * sx, (ybreak - origin[1]) * sy - top.shape[0])
    return res, off

def ground_y(y, oy, ry, sy):
    yb = oy - ry
    return (y - oy) * sy if y >= yb else (yb - oy) * sy - (yb - y) * S_UP

def scallop(n, length, seed):
    """A billowy edge profile (0..1) along `length` px: overlapping round bumps."""
    prof = np.zeros(length)
    y = -10
    k = 0
    while y < length + 20:
        r = 12 + 12 * hash2(k, 1, seed)
        ys = np.arange(length)
        bump = np.sqrt(np.clip(1 - ((ys - y) / r) ** 2, 0, 1)) * (0.6 + 0.4 * hash2(k, 2, seed))
        prof = np.maximum(prof, bump)
        y += r * 1.7
        k += 1
    return prof

def extend_cloud(rgb, a, box, ext_r, ext_t):
    """His cloud runs off the right and top of the panel: continue it past the cut by mirroring and
    end it in rounded billows with a dark rim, like his other edges."""
    x0, y0, x1, y1 = box
    carve = ext_r
    ext_r = 1
    Hs, Ws = y1 - y0 + ext_t, x1 - x0 + ext_r
    R = np.zeros((Hs, Ws, 3))
    A = np.zeros((Hs, Ws))
    R[ext_t:, :x1 - x0] = rgb[y0:y1, x0:x1]
    A[ext_t:, :x1 - x0] = a[y0:y1, x0:x1]
    c = x1 - x0 - 1
    for k in range(1, ext_r):
        R[:, c + k] = R[:, c - k]
        A[:, c + k] = A[:, c - k]
    for k in range(1, ext_t + 1):
        R[ext_t - k] = R[ext_t - 1 + k]
        A[ext_t - k] = A[ext_t - 1 + k]
    yy, xx = np.mgrid[0:Hs, 0:Ws]
    keep = np.ones((Hs, Ws), bool)
    pr = scallop(0, Hs, 31) * (carve - 4)
    keep &= xx <= c - carve + pr[yy]
    pt = scallop(0, Ws, 37) * (ext_t - 6)
    keep &= ~((yy < ext_t) & (ext_t - yy > pt[xx]))
    A = np.where(keep, A, 0)
    on = A > 0.5
    rim = on & ~erode(on, 3) & ((xx > c - carve - 2) | (yy < ext_t + 2))
    R[rim] = R[rim] * 0.5 + np.array([18.0, 12.0, 40.0])
    return R, A, (x0, y0 - ext_t)

def to_sprite_arr(R, A, X0, Y0, s, origin):
    sub = np.concatenate([R * A[..., None], A[..., None] * 255], -1)
    im = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8), 'RGBA')
    res = np.asarray(im.resize((max(1, round(R.shape[1] * s)), max(1, round(R.shape[0] * s))), Image.BOX)).astype(np.float64)
    return res, ((X0 - origin[0]) * s, (Y0 - origin[1]) * s)

def main():
    os.makedirs(OUT, exist_ok=True)
    built = {}
    for key, P in PANELS.items():
        rgb, d, alpha, layers, solid, fade, meta = build(key, P)
        x0, y0, x1, y1 = P['box']
        ox, oy = P['origin']
        rx, ry = P['ring']
        area = P['area']
        sxg = syg = area / rx
        out = {}
        for name, m in layers.items():
            a = np.where(m, meta.get(name + '_alpha', alpha), 0.0)
            if name in solid:
                a = np.where(m & solid[name], 1.0, a)
            src = meta.get(name + '_rgb', rgb)
            if name == 'cloud' and P['cut']:
                R_, A_, (X0, Y0) = extend_cloud(src, a, P['box'], 46, 44)
                res, off = to_sprite_arr(R_, A_, X0, Y0, sxg, (ox, oy))
            else:
                a = a * fade
                res, off = to_sprite(src, a, x0, y0, x1, y1, sxg, sxg, (ox, oy))
            out[name] = (res, off)
        # Kanji stroke map at full res: nearest stroke, progress along it; far pixels are sparks.
        km = layers['kanji']
        ys, xs = np.nonzero(km)
        sid = np.full(len(ys), 14, np.int32)
        prog = np.zeros(len(ys))
        best = np.full(len(ys), 1e9)
        for k, st in enumerate(P['strokes']):
            acc = 0.0
            seglen = [np.hypot(st[i + 1][0] - st[i][0], st[i + 1][1] - st[i][1]) for i in range(len(st) - 1)]
            total = sum(seglen)
            for i in range(len(st) - 1):
                ax, ay = st[i]
                bx, by = st[i + 1]
                vx, vy = bx - ax, by - ay
                L2 = vx * vx + vy * vy
                t = np.clip(((xs - ax) * vx + (ys - ay) * vy) / L2, 0, 1)
                dd = np.hypot(xs - (ax + vx * t), ys - (ay + vy * t))
                better = dd < best
                best = np.where(better, dd, best)
                sid = np.where(better, k + 1, sid)
                prog = np.where(better, (acc + t * seglen[i]) / total, prog)
                acc += seglen[i]
        sid = np.where(best > 24, 14, sid)
        kmap = np.zeros((H_IMG, W_IMG, 4))
        kmap[ys, xs, 0] = sid
        kmap[ys, xs, 1] = np.round(prog * 255)
        kmap[ys, xs, 3] = 255
        built[key] = dict(P=P, out=out, kmap=kmap, meta=meta, sxg=sxg, syg=syg, rgb=rgb, alpha=alpha, fade=fade)

    # Frame per version: union of every layer's footprint, plus a margin; the anchor is the origin.
    for key, B in built.items():
        lo_x = lo_y = 1e9
        hi_x = hi_y = -1e9
        for name, (res, off) in B['out'].items():
            ys, xs = np.nonzero(res[..., 3] > 20)
            if len(xs):
                lo_x, hi_x = min(lo_x, off[0] + xs.min()), max(hi_x, off[0] + xs.max())
                lo_y, hi_y = min(lo_y, off[1] + ys.min()), max(hi_y, off[1] + ys.max())
        AX, AY = int(np.ceil(-lo_x)) + MARGIN, int(np.ceil(-lo_y)) + MARGIN
        W, H = AX + int(np.ceil(hi_x)) + MARGIN + 1, AY + int(np.ceil(hi_y)) + MARGIN + 1
        B['frame'] = (W, H, AX, AY)

    # One palette for both versions, sampled from his effect pixels.
    samples = []
    for key, B in built.items():
        for name, (res, off) in B['out'].items():
            a = res[..., 3]
            m = a > 128
            col = res[..., :3][m] / (a[m, None] / 255.0)
            samples.append(np.clip(col, 0, 255))
    allc = np.concatenate(samples).astype(np.uint8)
    strip = Image.fromarray(allc.reshape(1, -1, 3), 'RGB')
    pal_img = strip.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(pal_img.getpalette()[:64 * 3]).reshape(-1, 3).astype(np.float64)
    pal = pal[np.lexsort((pal[:, 2], pal.mean(1)))]

    def quant(res):
        a = res[..., 3] / 255.0
        col = np.where(a[..., None] > 0, res[..., :3] / np.maximum(a[..., None], 1e-6), 0)
        col = np.clip(col, 0, 255)
        flat = col.reshape(-1, 3)
        idx = np.empty(len(flat), np.int32)
        for i in range(0, len(flat), 200000):
            ch = flat[i:i + 200000]
            idx[i:i + 200000] = ((ch[:, None, :] - pal[None, :, :]) ** 2).sum(-1).argmin(1)
        q = pal[idx].reshape(col.shape)
        lv = np.array([0, 0.3, 0.55, 0.8, 1.0])
        aq = lv[np.abs(a[..., None] - lv[None, None, :]).argmin(-1)]
        aq = np.where(a < 0.14, 0, aq)
        # Drop lonely faint pixels.
        on = aq > 0
        nb = sum(shift(on, dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy)
        aq = np.where(on & (nb == 0), 0, aq)
        aq = np.where(on & (nb <= 1) & (aq < 0.6), 0, aq)
        def nearest(cols):
            return pal[((cols[:, None, :] - pal[None, :, :]) ** 2).sum(-1).argmin(1)]
        for _ in range(2):
            on = aq > 0
            # Pinholes: a clear pixel with three or four solid neighbours takes their colour.
            n4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]
            cnt = sum(shift(on, dx, dy) for dx, dy in n4)
            hole = ~on & (cnt >= 3)
            if hole.any():
                acc = sum(np.where(shift(on, dx, dy)[..., None], np.roll(np.roll(q, dy, 0), dx, 1), 0) for dx, dy in n4)
                aacc = sum(np.where(shift(on, dx, dy), np.roll(np.roll(aq, dy, 0), dx, 1), 0) for dx, dy in n4)
                q[hole] = nearest(acc[hole] / cnt[hole, None])
                aq[hole] = aacc[hole] / cnt[hole]
            # Dark specks inside bright areas.
            on = aq > 0
            L = q.mean(-1)
            n8 = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
            c8 = sum(shift(on, dx, dy) for dx, dy in n8)
            s8 = sum(np.where(shift(on, dx, dy), np.roll(np.roll(L, dy, 0), dx, 1), 0) for dx, dy in n8)
            m8 = s8 / np.maximum(c8, 1)
            speck = on & (c8 >= 7) & (m8 > 140) & (L < m8 * 0.55)
            if speck.any():
                acc = sum(np.where(shift(on, dx, dy)[..., None], np.roll(np.roll(q, dy, 0), dx, 1), 0) for dx, dy in n8)
                q[speck] = nearest(acc[speck] / c8[speck, None])
        return np.concatenate([q, (aq * 255)[..., None]], -1).astype(np.uint8)

    for key, B in built.items():
        W, H, AX, AY = B['frame']
        info = {'frame': [W, H], 'anchor': [AX, AY], 'palette': pal.astype(int).tolist(), 'layers': []}
        for name, (res, off) in B['out'].items():
            q = quant(res)
            if name == 'cloud':
                # Crumbs left where the kanji and the bolt were cut away.
                for ys, xs in components(q[..., 3] > 0):
                    if len(ys) < 40:
                        q[ys, xs, 3] = 0
            if name == 'kanji':
                # Any dark speck left inside the white strokes takes its neighbours' colour.
                on = q[..., 3] > 0
                L = q[..., :3].mean(-1)
                n8 = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
                c8 = sum(shift(on, dx, dy) for dx, dy in n8)
                m8 = sum(np.where(shift(on, dx, dy), np.roll(np.roll(L, dy, 0), dx, 1), 0) for dx, dy in n8) / np.maximum(c8, 1)
                speck = on & (c8 >= 6) & (m8 > 170) & (L < m8 * 0.72)
                if speck.any():
                    acc = sum(np.where(shift(on, dx, dy)[..., None], np.roll(np.roll(q[..., :3].astype(np.float64), dy, 0), dx, 1), 0) for dx, dy in n8)
                    flat = acc[speck] / c8[speck, None]
                    q[speck, :3] = pal[((flat[:, None, :] - pal[None, :, :]) ** 2).sum(-1).argmin(1)].astype(np.uint8)
            # Dead holes: small clear pockets fully enclosed by the layer are filled from their rim.
            limit = {'cloud': 900, 'ground': 300, 'dragon': 120, 'kanji': 6, 'bolt': 12, 'sparks': 0}.get(name, 0)
            if limit:
                on = q[..., 3] > 0
                enclosed = fill_holes(on) & ~on
                pockets = np.zeros_like(on)
                for ys, xs in components(enclosed):
                    if len(ys) <= limit:
                        pockets[ys, xs] = True
                if pockets.any():
                    rgbq = inpaint_rows(q[..., :3].astype(np.float64), pockets, on)
                    flat = rgbq[pockets]
                    q[pockets, :3] = pal[((flat[:, None, :] - pal[None, :, :]) ** 2).sum(-1).argmin(1)].astype(np.uint8)
                    q[pockets, 3] = 255
            canvas = np.zeros((H, W, 4), np.uint8)
            px, py = int(round(AX + off[0])), int(round(AY + off[1]))
            hh, ww = q.shape[:2]
            cx0, cy0 = max(0, px), max(0, py)
            cx1, cy1 = min(W, px + ww), min(H, py + hh)
            canvas[cy0:cy1, cx0:cx1] = q[cy0 - py:cy1 - py, cx0 - px:cx1 - px]
            Image.fromarray(canvas, 'RGBA').save(os.path.join(OUT, f'{key}-{name}.png'))
            info['layers'].append(name)
        # Kanji stroke map, nearest-sampled the same way as the kanji layer.
        P = B['P']
        x0, y0, x1, y1 = P['box']
        ox, oy = P['origin']
        km = Image.fromarray(B['kmap'][y0:y1, x0:x1].astype(np.uint8), 'RGBA')
        km = np.asarray(km.resize((round((x1 - x0) * B['sxg']), round((y1 - y0) * B['sxg'])), Image.NEAREST))
        canvas = np.zeros((H, W, 4), np.uint8)
        px, py = int(round(AX + (x0 - ox) * B['sxg'])), int(round(AY + (y0 - oy) * B['sxg']))
        hh, ww = km.shape[:2]
        cx0, cy0, cx1, cy1 = max(0, px), max(0, py), min(W, px + ww), min(H, py + hh)
        canvas[cy0:cy1, cx0:cx1] = km[cy0 - py:cy1 - py, cx0 - px:cx1 - px]
        Image.fromarray(canvas, 'RGBA').save(os.path.join(OUT, f'{key}-kanjimap.png'))
        sc = B['sxg']
        up = lambda p: [round(AX + (p[0] - ox) * sc, 1), round(AY + (p[1] - oy) * sc, 1)]
        info['eye'] = up(P['eye'])
        info['strokes'] = [[up(p) for p in st] for st in P['strokes']]
        info['scale'] = sc
        info['ring'] = [P['ring'][0] * sc, P['ring'][1] * sc]
        if 'main' in B['meta']:
            info['main'] = [up(p) for p in B['meta']['main'][::4]]
        if key == 'kirin_enh':
            info['mouth'] = up(P['mouth'])
            info['dragonPath'] = [up(p) for p in P['dragon_body']]
            # Debris chunks as their own small sprites (upright scale), taken out of the ground layer.
            deb = []
            rgb, alpha, fade = B['rgb'], B['alpha'], B['fade']
            for n, (ys, xs) in enumerate(B['meta']['debris_full']):
                bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
                m = np.zeros((H_IMG, W_IMG), bool)
                m[ys, xs] = True
                a = np.where(m, np.maximum(alpha, 0.0), 0) * fade
                a = np.where(m & (np.sqrt(((rgb - BG) ** 2).sum(-1)) > 22), 1.0, a)
                res, off = to_sprite(rgb, a, bx0, by0, bx1, by1, sc, sc, (ox, oy))
                q = quant(res)
                if (q[..., 3] > 0).sum() < 6:
                    continue
                fn = f'{key}-debris{len(deb)}.png'
                Image.fromarray(q, 'RGBA').save(os.path.join(OUT, fn))
                # Where it sits on the ground decal (the decal is stretched; the chunk is not).
                cxs, cys = (bx0 + bx1) / 2, (by0 + by1) / 2
                gpos = [AX + (cxs - ox) * sc, AY + (cys - oy) * sc]
                deb.append({'file': fn, 'x': round(AX + off[0]), 'y': round(AY + off[1]), 'w': q.shape[1], 'h': q.shape[0], 'ground': [round(gpos[0], 1), round(gpos[1], 1)]})
            info['debris'] = deb
        with open(os.path.join(OUT, f'{key}.json'), 'w') as f:
            json.dump(info, f)
        print(key, 'frame', W, H, 'anchor', AX, AY, 'layers', info['layers'], 'debris', len(info.get('debris', [])))
    # His two panels at our scale, side by side, for the before/after sheet.
    ims = []
    for key, B in built.items():
        x0, y0, x1, y1 = B['P']['box']
        sc = B['sxg']
        ims.append(Image.fromarray(IMG[y0:y1, x0:x1].astype(np.uint8)).resize((round((x1 - x0) * sc), round((y1 - y0) * sc)), Image.BOX))
    gap = 10
    ref = Image.new('RGB', (sum(i.width for i in ims) + gap, max(i.height for i in ims)), (20, 18, 26))
    xx = 0
    for i in ims:
        ref.paste(i, (xx, ref.height - i.height))
        xx += i.width + gap
    ref.save(os.path.join(OUT, 'ref-scaled.png'))

main()
