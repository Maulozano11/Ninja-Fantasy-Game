"""Cuts the owner's paint-over of the genjutsu sheet (genjutsu-set-owner-reference.jpg) into
game-scale key frames for the genjutsu set, v3 (tools/world-sprites/vfx-genjutsu-v3.ts).

    python3 -I tools/refs/genjutsu-from-ref.py <REF-genjutsu-set-owner.jpg> \
        tools/world-sprites/vfx-genjutsu-v3-refdata.ts <refmap.json> [previewDir]

The owner asked for his reference to be copied as exactly as possible, so every key frame is HIS
pixels:
  * Scale. His sheet is our 2x kit sheet re-arranged into a square at about 0.65 of its size, so
    his art is about 1.3 of his pixels per game pixel. Measured by fitting our character
    (characterRef, 96 px tall) onto his: 1.30 beside the blast and the straight wall and in the
    aura (where the anchor, the feet, is registered on his figure), 1.27 beside the 3/4 wall and
    1.25 beside the end-on wall; each of those panels uses its own factor. The projectile panels
    (the hit's too) have no character: their inside (86-87 px) is our 64 px frame. The stream's
    braid repeats every 84 of his pixels, so the tile is exactly one braid period (64 px).
  * Clean-up. His panel fill (#20202a), his character, the labels and the panel borders are
    removed (what his character hid of the 3/4 wall's shadow is filled in from around it). The
    JPEG is smoothed (gaussian) before every decision, so its ringing and blocks are not copied.
  * Classes. Each of his pixels is one of:
      body    - his painted shapes (violets, magentas, pinks, lavender crystal, whites): opaque;
      dark    - darker than his fill. Next to a body it is his dark rim (opaque); away from bodies
                it is dark smoke, kept SEMI-TRANSPARENT (alpha 0.85 floor) where the sprite has
                smoke, or opaque where his art is truly black (feathers, thorns, vines);
      glow    - faint colour over his fill (soft halos, the column's veils, the aura's flame
                edges): colour-to-alpha against his fill, so it composites back to his look;
      ground  - the 3/4 wall's long shadow (and the thin strip of it above): colour-to-alpha
                with an alpha floor (0.6), so it reads as a violet stain on any map; what his
                character hid of it is filled in along the shadow's own slant;
      weed    - the olive brambles of the 3/4 wall (their own small palette);
      eye     - his eyes (hand-set ellipses): no hue smoothing, quantized by lightness first.
  * Game scale. Every class is area-averaged (box filter) down to game scale; each game pixel
    takes its strongest class (bodies weighted up a little so his thin bright lines survive)
    and that class's mean colour.
  * Colour. Within a body, each pixel's hue (Lab a, b; not its lightness, so his 1 px cracks and
    highlights stay crisp) is averaged with its near-alike neighbours: the JPEG's colour speckle
    goes, his flat planes keep one hue.
  * Palette. One palette for the set (230 entries), from his own pixels of each class (k-means in
    Lab); each pixel takes the nearest entry of its class, hue weighted up (eyes: lightness).
  * Thin lines. His 1-3 px bright and dark lines (the walls' cracks and seams, the blast's
    sparkle arms) are found at his resolution and written as 1 px lines after the palette.
  * Edges. Where a body meets the empty background his 1 px deep-violet outline is restored (it
    is lost in the downscale); dark rims he painted are kept. Tiny bright sparkles get none.
  * Pieces. Each key frame is split into the parts the generator animates (the orb, the spiral,
    the pool, the column, the crystals, the vines...).
The result is written as indexed run-length data that the generator decodes, so the build needs
no image files. Deterministic.
"""
import base64, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

REF, OUT, REFMAP = sys.argv[1], sys.argv[2], sys.argv[3]
PREVIEW = sys.argv[4] if len(sys.argv) > 4 else None
IM0 = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
BG = np.array([32.0, 32.0, 42.0])  # his panel fill
PADSRC = 80                          # clear margin round his image, so every resample box is inside
IM = np.zeros((IM0.shape[0] + 2 * PADSRC, IM0.shape[1] + 2 * PADSRC, 3)) + BG
IM[PADSRC:-PADSRC, PADSRC:-PADSRC] = IM0

# --- small image tools -------------------------------------------------------------------------

def gauss(a, s, wrap=False):
    """Separable gaussian blur (edges clamped, or wrapped in x)."""
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim; pad[ax] = (r, r)
        p = np.pad(out, pad, mode='wrap' if (wrap and ax == 1) else 'edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim; sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out

def median3(C, wrap=False):
    """3x3 median per channel (edges clamped, or wrapped in x): takes out the JPEG's speckle
    without blurring his edges."""
    p = np.pad(C, ((1, 1), (1, 1), (0, 0)), mode='edge')
    if wrap:
        p[:, 0] = p[:, -3]; p[:, -1] = p[:, 2]
    H, W = C.shape[:2]
    st = np.stack([p[dy:dy + H, dx:dx + W] for dy in range(3) for dx in range(3)], 0)
    return np.median(st, 0)

def denoise(C, wrap=False):
    """His colours for game scale: the brightness lightly smoothed (his 1 px cracks and highlight
    lines survive), the colour (chroma) through a 3x3 median and a blur, where the JPEG's speckle
    and 4:2:0 smear live."""
    m = np.array([[0.299, 0.587, 0.114], [-0.168736, -0.331264, 0.5], [0.5, -0.418688, -0.081312]])
    Y = C @ m.T
    Yl = gauss(Y[..., :1], 0.35, wrap)
    Yc = gauss(median3(Y, wrap)[..., 1:], 0.6, wrap)
    out = np.concatenate([Yl, Yc], -1) @ np.linalg.inv(m).T
    return np.clip(out, 0, 255)

def lum(c):
    return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]

def lab(c):
    """sRGB (0-255) to CIE Lab, for colour distances that keep hues apart."""
    c = np.asarray(c, np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    X = (c[..., 0] * 0.4124 + c[..., 1] * 0.3576 + c[..., 2] * 0.1805) / 0.95047
    Y = c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722
    Z = (c[..., 0] * 0.0193 + c[..., 1] * 0.1192 + c[..., 2] * 0.9505) / 1.08883
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], -1)

def lab2rgb(L):
    """CIE Lab back to sRGB (0-255)."""
    fy = (L[..., 0] + 16) / 116
    fx, fz = fy + L[..., 1] / 500, fy - L[..., 2] / 200
    inv = lambda t: np.where(t ** 3 > 0.008856, t ** 3, (t - 16 / 116) / 7.787)
    X, Y, Z = inv(fx) * 0.95047, inv(fy), inv(fz) * 1.08883
    r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z
    g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z
    b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z
    c = np.clip(np.stack([r, g, b], -1), 0, 1)
    c = np.where(c > 0.0031308, 1.055 * c ** (1 / 2.4) - 0.055, 12.92 * c)
    return np.clip(c * 255, 0, 255)

def c2a(c, floor=0.0):
    """Colour-to-alpha against his fill, both ways (lighter or darker channels): the least alpha a
    with c = a*F + (1-a)*BG, F in [0,255]; with `floor`, at least that (F then further from BG)."""
    up = np.maximum(c - BG, 0) / (255 - BG)
    dn = np.maximum(BG - c, 0) / BG
    a = np.maximum(np.maximum(up, dn).max(-1), floor)
    F = BG + (c - BG) / np.maximum(a, 1e-6)[..., None]
    return np.clip(a, 0, 1), np.clip(F, 0, 255)

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))

def shift(m, dy, dx, wrap=False):
    """out[y, x] = m[y - dy, x - dx]; clear at the edges (or wrapped in x)."""
    H, W = m.shape[:2]
    if wrap:
        m = np.roll(m, dx, 1); dx = 0
    out = np.zeros_like(m)
    out[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return out

def dilate(m, n=1, wrap=False, nb=N4):
    for _ in range(n):
        o = m.copy()
        for dy, dx in nb: o |= shift(m, dy, dx, wrap)
        m = o
    return m

def components(m, nb=N4, wrap=False):
    H, W = m.shape
    lab = np.zeros((H, W), np.int32); n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n
                while st:
                    a, b = st.pop()
                    for dy, dx in nb:
                        u, v = a + dy, b + dx
                        if wrap: v %= W
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                            lab[u, v] = n; st.append((u, v))
    return lab, n

def poly_mask(h, w, x0, y0, polys, sx=1.0, sy=None):
    """Polygons in his coordinates -> mask of an h x w grid whose (0, 0) is his (x0, y0), with
    sx (sy) grid pixels per his pixel."""
    sy = sx if sy is None else sy
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([((x - x0) * sx, (y - y0) * sy) for x, y in p], fill=255)
    return np.asarray(m) > 0

def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

def ellipse(cx, cy, rx, ry=None, n=40):
    ry = rx if ry is None else ry
    return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]

def resample(a, box, size):
    """Area (box-filter) resample of a float HxW array: `box` (his coords, in the padded image's
    frame of reference) onto a grid of `size` = (W, H)."""
    l, t, r, b = box
    img = Image.fromarray(a.astype(np.float32), mode='F')
    return np.asarray(img.resize(size, Image.BOX, box=(l + PADSRC, t + PADSRC, r + PADSRC, b + PADSRC)), np.float64)

# --- classification at his resolution -----------------------------------------------------------

CLEAR, GLOW, DARK, BODY, GROUND = 0, 1, 2, 3, 4
T_ART = 10.0   # colour distance from his fill below which a pixel is his fill
A_GLOW = 0.15  # lighter than his fill by less than this (colour-to-alpha) = soft glow
T_DARK = 6.0   # darker than his fill by more than this (luminance) = dark

def classify(src, cfg):
    """src: (C, x0, y0) his colours with the region's origin. Returns the class map and colours."""
    C, x0, y0 = src
    H, W = C.shape[:2]
    wrap = bool(cfg.get('wrap'))
    m = lambda key: poly_mask(H, W, x0, y0, cfg.get(key, []))
    D = gauss(C, 0.8, wrap)     # decisions
    M = denoise(C, wrap)        # colours (the box filter to game scale averages the rest)
    dist = np.sqrt(((D - BG) ** 2).sum(-1))
    dl = lum(D) - lum(BG)
    a, _ = c2a(D)
    up = (np.maximum(D - BG, 0) / (255 - BG)).max(-1)
    art = dist >= T_ART
    cls = np.zeros((H, W), np.int8)
    cls[art] = BODY
    cls[art & (up < A_GLOW) & (dl >= -T_DARK)] = GLOW
    cls[art & (dl < -T_DARK)] = DARK
    if 'glow_lum' in cfg:
        # Parts where a soft veil is lighter (the blast column's smoky top): faint body is glow.
        gm = m('glow_poly')
        cls[gm & (cls == BODY) & (lum(D) < cfg['glow_lum'])] = GLOW
    black = m('black')
    cls[black & (cls == GLOW)] = BODY      # feather / vine highlights are part of the shape
    gr = m('ground')
    cls[gr & art & (cls != BODY)] = GROUND
    if cfg.get('ground_violet'):
        # His long shadow is a flat violet field: a stain on the ground (translucent), while the
        # crystal shards lying on it (lavender to white) stay solid.
        cls[gr & art & (lum(D) < 120) & (D[..., 2] > D[..., 1] + 40)] = GROUND
        # Its darker edges and the gaps between the shadow and the strip above it (dull dark
        # violets) are the same stain, darker: never an opaque rim round it.
        cls[gr & art & (cls == BODY) & (lum(D) < 95)] = GROUND
        # His magenta splash where it spills onto the shadow (red near blue) is the splash: solid.
        cls[gr & art & (D[..., 0] > D[..., 2] - 22) & (lum(D) > 70)] = BODY
    if cfg.get('ground_all'):
        cls[gr & art] = GROUND
    keep = m('keep') if cfg.get('keep') else np.ones((H, W), bool)
    if cfg.get('pink'):
        # Petals over his character: only their pink (and their dark rim) is kept.
        pm = m('pink')
        pink = (D[..., 0] > D[..., 1] + 45) & (D[..., 2] > D[..., 1] + 25) & (lum(D) > 70)
        keep &= ~pm | dilate(pink, 1)
    cls[~keep] = CLEAR
    cls[m('drop')] = CLEAR
    return cls, M, dist

def fill_along(C, hole, src_mask, slope):
    """Fills `hole` along his shadow's own slant (direction (1, slope)): each hidden pixel takes
    the colours where its line leaves the hole on either side (his ground where src_mask, his
    fill elsewhere), mixed by distance, so the shadow's bands run on straight under his character."""
    base = np.where(src_mask[..., None], C, BG)
    H, W = hole.shape
    res = C.copy()
    n = math.hypot(1, slope)
    ux, uy = 1 / n, slope / n
    for y, x in zip(*np.nonzero(hole)):
        found = []
        for sgn in (-1, 1):
            t = 0.0
            while True:
                t += 0.5
                u, v = int(round(x + sgn * ux * t)), int(round(y + sgn * uy * t))
                if not (0 <= u < W and 0 <= v < H):
                    break
                if not hole[v, u]:
                    found.append((t, base[v, u])); break
        if not found:
            res[y, x] = BG
        elif len(found) == 1:
            res[y, x] = found[0][1]
        else:
            (t0, c0), (t1, c1) = found
            res[y, x] = (c0 * t1 + c1 * t0) / (t0 + t1)
    return res

def fill_from(C, hole, src_mask):
    """Fills `hole` from the src_mask pixels only (normalised diffusion: colour and weight spread
    together, so the gap takes the colour of the nearest of those pixels, not of anything else
    round it)."""
    cw = np.where(src_mask[..., None], C, 0.0); w = src_mask.astype(np.float64)
    free = ~src_mask
    for _ in range(400):
        pc = np.pad(cw, ((1, 1), (1, 1), (0, 0)), mode='edge'); pw = np.pad(w, 1, mode='edge')
        ac = (pc[:-2, 1:-1] + pc[2:, 1:-1] + pc[1:-1, :-2] + pc[1:-1, 2:]) / 4
        aw = (pw[:-2, 1:-1] + pw[2:, 1:-1] + pw[1:-1, :-2] + pw[1:-1, 2:]) / 4
        cw[free] = ac[free]; w[free] = aw[free]
    res = C.copy()
    ok = hole & (w > 1e-9)
    res[ok] = cw[ok] / w[ok][:, None]
    return res

def fill_vertical(C, hole, src_mask):
    """Fills `hole` with vertical flame streaks: in each column, every hidden run takes the mean of
    the src_mask pixels just above it and just below it (up to 3 px) and runs from one to the
    other (one side only: that side's colour), so his flames run on straight up behind the figure,
    a streak per column, instead of a blur. What has neither is left to fill_from."""
    res = C.copy()
    H, W = hole.shape
    left = np.zeros_like(hole)
    for x in range(W):
        y = 0
        while y < H:
            if not hole[y, x]:
                y += 1; continue
            y0 = y
            while y < H and hole[y, x]: y += 1
            y1 = y - 1
            up = [C[v, x] for v in range(max(0, y0 - 3), y0) if src_mask[v, x]]
            dn = [C[v, x] for v in range(y1 + 1, min(H, y1 + 4)) if src_mask[v, x]]
            if not up and not dn:
                left[y0:y1 + 1, x] = True; continue
            cu = np.mean(up, 0) if up else np.mean(dn, 0)
            cd = np.mean(dn, 0) if dn else cu
            n = y1 - y0 + 2
            for v in range(y0, y1 + 1):
                t = (v - y0 + 1) / n
                res[v, x] = cu * (1 - t) + cd * t
    if left.any():
        res = fill_from(res, left, src_mask | (hole & ~left))
    return res

# His plain character beside the blast is the same drawing as his figure in the aura panel, at
# (+294, -229) his px from it (registered by luminance correlation, best at (0, 0)).
AURA_PLAIN = (294, -229)
BLAST_CHAR = [(786, 280), (834, 280), (843, 320), (843, 425), (792, 425), (784, 410), (765, 404), (760, 380),
              (764, 356), (776, 330)]

def aura_figure(C, x0, y0):
    """Which of the aura panel's pixels are his figure: his plain character laid over it. A pixel
    within 2 px of that silhouette also counts as figure unless it has his flames' colour (his
    tinted figure is drawn a touch wider than the plain one). Everything else is his flame art."""
    H, W = C.shape[:2]
    dx, dy = AURA_PLAIN
    P = IM[y0 + dy + PADSRC:y0 + dy + H + PADSRC, x0 + dx + PADSRC:x0 + dx + W + PADSRC]
    G = gauss(P, 0.8)
    m = (np.sqrt(((G - BG) ** 2).sum(-1)) >= 14) & poly_mask(H, W, x0 + dx, y0 + dy, [BLAST_CHAR])
    lab_, n = components(m, N8)
    if n:
        sizes = np.bincount(lab_.ravel(), minlength=n + 1); sizes[0] = 0
        m = sizes[lab_] >= 40
    # His figure's own small gaps (a pixel or two) are figure too; the gaps between arm and body stay.
    m = m | (dilate(m, 1, nb=N8) & ~dilate(~dilate(m, 1, nb=N8), 1, nb=N8))
    A = gauss(C, 0.8)
    flame = (A[..., 2] > A[..., 1] + 30) & (A[..., 0] > A[..., 1] + 25)
    band = dilate(m, 2, nb=N8) & ~m
    return m | (band & ~flame)

def fill_holes(C, hole, src_mask):
    """Fills `hole` by diffusion from the pixels round it (his ground strip where src_mask, his
    fill elsewhere), so what his character hid continues smoothly across the gap."""
    base = np.where(src_mask[..., None], C, BG)
    out = base.copy()
    out[hole] = BG
    for _ in range(600):
        p = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        out[hole] = avg[hole]
    res = C.copy()
    res[hole] = out[hole]
    return res

def thin_lines(C, minL, contrast, sign=1):
    """His thin lines at his resolution. sign 1: bright lines (cracks' white cores, sparkle arms,
    highlight lines): pixels brighter than minL that stand above BOTH sides 2 px away across some
    direction (so lines up to 3 px wide), thinned to their crest. sign -1: his thin dark lines (a
    crack's dark edges, the seams on the crystal faces), the same way down, not as dark as his
    black vines. Returns the mask and the lightness."""
    L = lum(gauss(C, 0.5))
    best = np.zeros(L.shape); crest = np.zeros(L.shape, bool)
    for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
        a, b = shift(L, 2 * dy, 2 * dx), shift(L, -2 * dy, -2 * dx)
        r = L - np.maximum(a, b) if sign > 0 else np.minimum(a, b) - L
        c = sign * (L - shift(L, dy, dx)) >= 0
        c &= sign * (L - shift(L, -dy, -dx)) >= 0
        better = r > best
        best = np.where(better, r, best); crest = np.where(better, c, crest)
    m = ((L > minL) if sign > 0 else (L > 40)) & (best > contrast) & crest
    m[:2] = m[-2:] = False; m[:, :2] = m[:, -2:] = False
    return m, L

EYE_SM = EYE_L = None

def eye_lmin(cx, cy, rx, ry, ox, oy, k, H, W):
    """An eye, downscaled lightness-aware: a game pixel whose footprint is a third or more his
    dark (pupil, lid) takes his darkest pixel there; one that is half or more his light (sclera)
    takes his lightest; the rest the mean. Keeps the pupil and the white ring crisp at 1x."""
    global EYE_SM, EYE_L
    if EYE_SM is None:
        EYE_SM = gauss(IM, 0.45); EYE_L = lab(EYE_SM)[..., 0]
    LL, P = EYE_L, PADSRC
    reg = LL[int(cy - ry) + P:int(cy + ry) + 1 + P, int(cx - rx) + P:int(cx + rx) + 1 + P]
    lo, hi = np.percentile(reg, 3), np.percentile(reg, 97)
    out = {}
    for gy in range(int((cy - ry - oy) * k) - 1, int((cy + ry - oy) * k) + 2):
        for gx in range(int((cx - rx - ox) * k) - 1, int((cx + rx - ox) * k) + 2):
            if not (0 <= gx < W and 0 <= gy < H): continue
            hx0, hy0, hx1, hy1 = ox + gx / k, oy + gy / k, ox + (gx + 1) / k, oy + (gy + 1) / k
            if (((hx0 + hx1) / 2 - cx) / rx) ** 2 + (((hy0 + hy1) / 2 - cy) / ry) ** 2 > 1: continue
            px = [(LL[y + P, x + P], EYE_SM[y + P, x + P]) for y in range(int(math.floor(hy0 + 0.2)), int(math.ceil(hy1 - 0.2)))
                  for x in range(int(math.floor(hx0 + 0.2)), int(math.ceil(hx1 - 0.2)))]
            Ls = np.array([p[0] for p in px]); cs = np.array([p[1] for p in px])
            t = (Ls - lo) / max(1.0, hi - lo)
            if (t < 0.35).mean() >= 0.34: out[(gy, gx)] = cs[Ls.argmin()]
            elif (t > 0.75).mean() >= 0.5: out[(gy, gx)] = cs[Ls.argmax()]
            else: out[(gy, gx)] = cs.mean(0)
    return out

# --- the sprites ----------------------------------------------------------------------------------
# area:    his region holding the sprite's art (x0, y0, x1, y1), everything else is ignored.
# k:       game pixels per his pixel.
# origin:  his point that is our frame's (0, 0) before any growth; base: that frame's size.
# anchor:  his point that is the sprite's anchor (core, ground centre, feet...).
# smoke:   dark pixels away from bodies are translucent dark smoke (else opaque).
# black / ground / drop / fill / noline: polygons in his coordinates (see classify).
# pieces:  [(name, polygons[, kinds])] split for animation; first match wins; the rest is 'main'.
#          Translucent smoke is split off as 'smoke' and ground stain as 'stain' first.

K64 = 64.0 / 86.0          # a 64 px projectile panel (86 px inside)
KST = 64.0 / 84.0          # the stream: one braid period (84 his px) per tile
ST_Y = 97.0                # the braid's centre line in his image
TILE_X = 420               # his tile window [420, 504): his stream head starts at 588 = 420 + 2*84

# His character in the aura, the 3/4 wall and the end-on wall (polygons round him).
AURA_CHAR = [(505, 513), (532, 511), (546, 528), (548, 548), (556, 556), (557, 590), (552, 600), (549, 615),
             (545, 637), (530, 643), (516, 644), (505, 640), (494, 636), (488, 612), (484, 600), (481, 583),
             (484, 556), (492, 546), (494, 527)]
AURA_PETALS = [ellipse(499, 520, 7), ellipse(497, 556, 8), ellipse(545, 535, 5)]
AURA_FEATHERS = [ellipse(487, 533, 6, 9), ellipse(557, 566, 6, 9)]
AURA_S, AURA_FEET = 1.30, (519.5, 635.5)
AURA_RING = [(468, 634), (500, 640), (528, 642), (560, 637), (572, 634), (572, 653), (466, 653)]
DIAG_CHAR = [(972, 594), (1002, 594), (1010, 612), (1016, 640), (1016, 740), (996, 740), (976, 740), (966, 730),
             (954, 716), (937, 704), (933, 662), (942, 636), (958, 616)]

# His black crow feathers round the blast's column (each a dark blue-black quill with a black edge).
BLAST_FEATHERS = [ellipse(534, 260, 12, 13), ellipse(609, 279, 8, 11), ellipse(531, 336, 9, 11), ellipse(572, 330, 8, 10),
                  ellipse(587, 333, 10, 8), ellipse(613, 368, 11, 7), ellipse(623, 351, 7, 9), ellipse(686, 266, 9, 12),
                  ellipse(712, 340, 8, 8)]

SPRITES = {
    'bolt': dict(area=(10, 54, 94, 139), k=K64, origin=(9, 53), base=(64, 64), anchor=(70.5, 96.5), smoke=True, solid_dark=22,
                 eyes=[(71, 96.5, 9, 9, 'lmin')],
                 pieces=[('orb', [ellipse(71, 96.5, 15.5)])]),
    'stream': dict(k=KST, wrap=True, tile=(TILE_X, 84), area=(TILE_X, 54, TILE_X + 84, 139), origin=(TILE_X, ST_Y - 32 / KST),
                   base=(64, 64), anchor=(TILE_X, ST_Y), smoke=True),
    'stream_head': dict(area=(588, 54, 675, 139), k=KST, origin=(588, ST_Y - 32 / KST), base=(64, 64),
                        anchor=(588 + 32 / KST, ST_Y), smoke=True, head=True,
                        pieces=[('sparks', [ellipse(652, 66, 7), ellipse(665, 106, 7), ellipse(626, 127, 8)]),
                                ('spiral', [ellipse(638, 98, 32, 31)])]),
    'breath': dict(area=(692, 54, 839, 192), k=K64, origin=(691, 53), base=(112, 104), anchor=(707 - 4 / K64, 121.5), smoke=True,
                   eyes=[(748, 82, 7, 5.5, 'box'), (781, 98, 7, 5.5, 'box'), (818, 83, 7, 5.5, 'box'), (745, 161, 7.5, 5.5, 'box'),
                         (778, 153, 7, 5.5, 'box'), (820, 165, 7.5, 5.5, 'box')],
                   pieces=[('orb', [ellipse(707, 121.5, 9)]),
                           ('eyes', [ellipse(748, 82, 7, 5), ellipse(781, 98, 6, 5), ellipse(817, 84, 6, 5), ellipse(746, 165, 7, 5),
                                     ellipse(817, 165, 7, 6), ellipse(780, 155, 5, 4)]),
                           ('orbs', [ellipse(795, 119, 4, 4), ellipse(780, 140, 4, 4)])]),
    'sphere': dict(area=(855, 54, 939, 139), k=K64, origin=(854, 53), base=(64, 64), anchor=(899.5, 97.5),
                   eyes=[(900, 97.5, 17.5, 11.5, 'box')],
                   pieces=[('core', [ellipse(899.5, 97, 23, 21)])]),
    'slash': dict(area=(9, 231, 94, 315), k=K64, origin=(8, 230), base=(64, 64), anchor=(51, 273), smoke=True),
    'multi': dict(area=(152, 231, 236, 315), k=K64, origin=(151, 230), base=(64, 64), anchor=(194, 273),
                  noline=[rect(140, 220, 250, 330)],   # his darts have soft glowing edges, no dark outline
                  pieces=[('d0', [rect(150, 230, 240, 263)]), ('d1', [rect(150, 263, 240, 282)]), ('d2', [rect(150, 282, 240, 318)])]),
    # His hit panel is the same 87 px box as the bolt's (his '72x72' label is a garbled copy of
    # ours), so it is at the projectiles' scale.
    'hit': dict(area=(295, 231, 379, 315), k=K64, origin=(294, 230), base=(64, 64), anchor=(337.5, 273)),
    'blast': dict(area=(438, 230, 841, 454), k=1 / 1.30, anchor=(607, 401), fade={'top': 16},
                  drop=[[(786, 280), (834, 280), (843, 320), (843, 425), (792, 425), (784, 410), (765, 404), (760, 380),
                         (764, 356), (776, 330)]],
                  smoke=True,
                  # His four-point sparkles: white stars with long 1 px arms, kept crisp (see lines).
                  lines=dict(poly=[ellipse(548, 294, 10, 12), ellipse(574, 303, 16, 18), ellipse(555, 318, 5, 5),
                                   ellipse(660, 330, 16, 16), ellipse(672, 287, 6, 6)], minL=150, contrast=22, add=True),
                  # The column's streaks: distinct violets with his fill between them, not a haze.
                  boost=[[(538, 230), (690, 230), (690, 300), (676, 390), (650, 404), (600, 410), (560, 404), (546, 380), (540, 300)]],
                  black=[ellipse(484, 268, 13, 10), ellipse(575, 286, 9, 15), ellipse(503, 343, 11, 9), ellipse(570, 330, 10, 10),
                         ellipse(605, 375, 12, 18), ellipse(630, 365, 9, 9), ellipse(690, 258, 11, 12), ellipse(711, 351, 10, 8),
                         ellipse(560, 368, 6, 14)] + BLAST_FEATHERS,
                  # His black crow feathers: solid (dark, opaque), their own piece (they fly with the bits).
                  pieces=[('feathers', BLAST_FEATHERS, ['dark', 'body', 'outline']),
                          ('column', [[(538, 230), (690, 230), (690, 300), (676, 390), (650, 404), (600, 410), (560, 404),
                                       (546, 380), (540, 300)]]),
                          ('pool', [[(437, 360), (843, 360), (843, 456), (437, 456)]])]),
    'wall': dict(area=(10, 492, 373, 652), k=1 / 1.30, anchor=(190, 646),
                 seams=[17, 46, 79, 100, 134, 158, 196, 222, 263, 290, 332, 363],   # his pillars' edges
                 black=[rect(9, 540, 373, 654)],
                 # His white zig-zag cracks and highlight lines on the crystal faces, kept 1 px and crisp.
                 lines=dict(poly=[rect(14, 500, 372, 640)], minL=130, contrast=28, dark=True),
                 pieces=[('bits', [[(9, 491), (373, 491), (373, 545), (360, 548), (360, 525), (340, 520), (300, 525), (250, 525),
                                    (240, 535), (230, 528), (175, 520), (150, 528), (100, 530), (55, 525), (30, 530), (20, 548), (9, 548)]]),
                         ('vines', [rect(9, 540, 373, 654)], ['dark'])]),
    # The aura in two layers with one frame: the back (all his flames; what his character hid is
    # filled in from the flames round him) and the front (his petals, feathers and the near half
    # of the ring at the feet, drawn over the character).
    # The anchor is his character's feet, found by registering our characterRef on his figure
    # (normalised correlation of luminance over +-14 his px, best at scale 1.30: (519.5, 635.5);
    # the same fit puts our character on his plain one beside the blast at r = 0.75).
    'aura_back': dict(area=(466, 492, 572, 652), k=1 / AURA_S, anchor=AURA_FEET, smoke=True,
                      fill_figure=True, fill_src='flame', base_rect=(-40, -112, 40, 16),
                      fill_full=AURA_PETALS + AURA_FEATHERS, drop=[AURA_RING]),
    'aura': dict(area=(466, 492, 572, 652), k=1 / AURA_S, anchor=AURA_FEET, smoke=True, frame_like='aura_back',
                 keep=AURA_PETALS + AURA_FEATHERS + [AURA_RING], pink=AURA_PETALS,
                 pieces=[('petals', AURA_PETALS + AURA_FEATHERS)]),
    'wall_diag': dict(area=(620, 492, 1014, 780), k=1 / 1.27, anchor=(772, 708), fade={'right': 30},
                      fill=[DIAG_CHAR], fill_slope=0.37, ground_violet=True,
                      # His long shadow and, above it, the thin strip of it that runs on under his character.
                      # (Its top edge runs along the crystals' real feet: the crystal bases above it, lit
                      # violet and magenta, are his crystal (opaque), not shadow.)
                      ground=[[(735, 708), (762, 714), (790, 715), (812, 713), (838, 684), (866, 663), (900, 672),
                               (940, 688), (1016, 714), (1016, 782), (870, 782), (800, 752), (760, 730)]],
                      black=[rect(620, 600, 900, 782)],
                      lines=dict(poly=[[(640, 640), (700, 590), (760, 540), (850, 500), (905, 500), (905, 640), (840, 680), (760, 720),
                                        (700, 740), (640, 740)]], minL=170, contrast=24),
                      pieces=[('bits', [ellipse(636, 699, 5), ellipse(640, 745, 5), ellipse(830, 745, 6), ellipse(907, 551, 5),
                                        ellipse(913, 568, 5), ellipse(935, 590, 6), ellipse(752, 520, 8), ellipse(736, 562, 6),
                                        ellipse(740, 586, 4)])]),
    'wall_depth': dict(area=(9, 701, 152, 1010), k=1 / 1.25, anchor=(80, 919),
                       black=[ellipse(122, 772, 12, 14), ellipse(40, 803, 12, 14), ellipse(25, 978, 14, 14)],
                       smoke=True,
                       lines=dict(poly=[rect(60, 704, 100, 1000)], minL=175, contrast=24),
                       pieces=[('column', [rect(62, 704, 98, 1006)]),
                               ('bits', [ellipse(122, 772, 12, 14), ellipse(40, 803, 12, 14), ellipse(38, 746, 9, 7),
                                         ellipse(108, 804, 9, 6), ellipse(118, 840, 5), ellipse(122, 881, 7, 9), ellipse(45, 874, 5),
                                         ellipse(23, 892, 6), ellipse(115, 768, 5), ellipse(57, 720, 4), ellipse(57, 734, 4)])]),
}

def source(name, cfg):
    """His colours for the sprite's region (with his character filled or removed), plus origin."""
    if cfg.get('tile'):
        # One braid period, made seamless: the window's last 20 px are quilted into the 20 px
        # just before it (a least-error vertical seam), so the tile's right end runs straight
        # on into its left end.
        tx, tw = cfg['tile']
        y0, y1 = cfg['area'][1], cfg['area'][3]
        A = IM[y0 + PADSRC:y1 + PADSRC, tx + PADSRC:tx + tw + PADSRC].copy()
        B = IM[y0 + PADSRC:y1 + PADSRC, tx - tw + PADSRC:tx + PADSRC]
        ov = 30
        err = ((gauss(A, 0.8)[:, tw - ov:] - gauss(B, 0.8)[:, tw - ov:]) ** 2).sum(-1)
        H = err.shape[0]
        cost = err.copy(); back = np.zeros(err.shape, np.int32)
        for y in range(1, H):
            for x in range(ov):
                lo, hi = max(0, x - 1), min(ov, x + 2)
                j = lo + int(np.argmin(cost[y - 1, lo:hi]))
                cost[y, x] += cost[y - 1, j]; back[y, x] = j
        x = int(np.argmin(cost[-1]))
        for y in range(H - 1, -1, -1):
            A[y, tw - ov + x:] = B[y, tw - ov + x:]
            x = back[y, x]
        return A, tx, y0
    x0, y0, x1, y1 = cfg['area']
    C = IM[y0 + PADSRC:y1 + PADSRC, x0 + PADSRC:x1 + PADSRC].copy()
    H, W = C.shape[:2]
    hole = poly_mask(H, W, x0, y0, cfg.get('fill', []))
    if cfg.get('fill_figure'):
        hole |= aura_figure(C, x0, y0)
    hole |= poly_mask(H, W, x0, y0, cfg.get('fill_full', []))
    if hole.any():
        dist = np.sqrt(((gauss(C, 0.8) - BG) ** 2).sum(-1))
        src = dist >= T_ART
        if cfg.get('fill_src') == 'flame':
            # Only his flame colours (violet to magenta) feed the fill, not his figure's dark
            # outline or the panel: the flames run on behind the whole figure.
            G = gauss(C, 0.8)
            src &= (G[..., 2] > G[..., 1] + 30) & (G[..., 0] > G[..., 1] + 10) & (lum(G) > 45)
            src &= ~poly_mask(H, W, x0, y0, cfg.get('drop', []))
        elif cfg.get('fill_src') != 'art':
            src &= poly_mask(H, W, x0, y0, cfg.get('ground', []))
        # (The aura: his flames run on behind the whole of his figure, so whatever figure stands
        # there, no map shows between it and the flames.)
        if 'fill_slope' in cfg: C = fill_along(C, hole, src & ~hole, cfg['fill_slope'])
        elif cfg.get('fill_src') == 'flame': C = fill_vertical(C, hole, src & ~hole)
        else: C = fill_holes(C, hole, src & ~hole)
    return C, x0, y0

# --- to game scale --------------------------------------------------------------------------------

W_BODY, W_DARK, W_GLOW, W_GROUND = 1.35, 1.0, 0.85, 1.0
PAD = 3

def frame_of(cfg, cls, x0, y0):
    """The frame (his origin of game (0, 0), size) and the anchor in it."""
    k = cfg['k']
    hx, hy = cfg['anchor']
    ys, xs = np.nonzero(cls)
    if cfg.get('wrap'):
        ox, oy = cfg['origin']
        return (ox, oy), (64, 64), (0, 32)
    # The art's bounds in game pixels relative to the anchor.
    gx0 = math.floor((xs.min() + x0 - hx) * k) - PAD
    gx1 = math.ceil((xs.max() + 1 + x0 - hx) * k) + PAD
    gy0 = math.floor((ys.min() + y0 - hy) * k) - PAD
    gy1 = math.ceil((ys.max() + 1 + y0 - hy) * k) + PAD
    if 'base' in cfg:
        # At least our old frame, laid out as his panel.
        ox, oy = cfg['origin']
        ax, ay = round((hx - ox) * k), round((hy - oy) * k)
        bw, bh = cfg['base']
        gx0, gy0 = min(gx0, -ax), min(gy0, -ay)
        gx1, gy1 = max(gx1, bw - ax), max(gy1, bh - ay)
        if cfg.get('head'):
            # The joint edge stays on the tile's end, and the head keeps the tile's rows (64,
            # centre line on 32), so the two line up.
            gx0, gy0, gy1 = -ax, -ay, bh - ay
    if 'base_rect' in cfg:
        bx0, by0, bx1, by1 = cfg['base_rect']
        gx0, gy0, gx1, gy1 = min(gx0, bx0), min(gy0, by0), max(gx1, bx1), max(gy1, by1)
    ax, ay = -gx0, -gy0
    w, h = gx1 - gx0, gy1 - gy0
    return (hx - ax / k, hy - ay / k), (w, h), (ax, ay)

def to_game(name, cfg):
    C, x0, y0 = source(name, cfg)
    cls, M, dist = classify((C, x0, y0), cfg)
    if cfg.get('frame_like'):
        o = data[cfg['frame_like']]
        (ox, oy), (w, h), (ax, ay) = o['origin'], (o['w'], o['h']), o['anchor']
    else:
        (ox, oy), (w, h), (ax, ay) = frame_of(cfg, cls, x0, y0)
    k = cfg['k']
    if cfg.get('wrap'):
        # The tile: resample one period exactly onto 64 px, wrapping (tile three times, keep the middle).
        tw = cfg['tile'][1]
        C3 = np.concatenate([C, C, C], 1)
        cls3 = np.concatenate([cls, cls, cls], 1)
        M3 = np.concatenate([M, M, M], 1)
        def rs(a):
            img = Image.fromarray(a.astype(np.float32), mode='F')
            top = oy - y0
            return np.asarray(img.resize((w, h), Image.BOX, box=(tw, top, 2 * tw, top + h / k)), np.float64)
        cov = {c: rs((cls3 == c).astype(float)) for c in (CLEAR, GLOW, DARK, BODY, GROUND)}
        col = {c: np.stack([rs(np.where(cls3 == c, M3[..., i], 0)) for i in range(3)], -1) for c in (GLOW, DARK, BODY, GROUND)}
        comp = np.stack([rs(np.where(cls3 > 0, M3[..., i], BG[i])) for i in range(3)], -1)
    else:
        box = (ox, oy, ox + w / k, oy + h / k)
        Hh, Ww = IM.shape[:2]
        def big(a, fill):
            out = np.full((Hh - 2 * PADSRC, Ww - 2 * PADSRC), fill, np.float64)
            out[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a
            p = np.full((Hh, Ww), fill, np.float64); p[PADSRC:-PADSRC, PADSRC:-PADSRC] = out
            return p
        def rs(a, fill=0.0):
            img = Image.fromarray(big(a, fill).astype(np.float32), mode='F')
            l, t, r, b = box
            return np.asarray(img.resize((w, h), Image.BOX, box=(l + PADSRC, t + PADSRC, r + PADSRC, b + PADSRC)), np.float64)
        cov = {c: rs((cls == c).astype(float), 1.0 if c == CLEAR else 0.0) for c in (CLEAR, GLOW, DARK, BODY, GROUND)}
        col = {c: np.stack([rs(np.where(cls == c, M[..., i], 0)) for i in range(3)], -1) for c in (GLOW, DARK, BODY, GROUND)}
        comp = np.stack([rs(np.where(cls > 0, M[..., i], BG[i]), BG[i]) for i in range(3)], -1)
    for c in col:
        col[c] = col[c] / np.maximum(cov[c], 1e-6)[..., None]
    wb = np.full((h, w), W_BODY); wg = np.full((h, w), W_GLOW)
    if cfg.get('boost'):
        # Where his streaks are distinct (the blast's column), a part-covered pixel is the streak.
        bm = poly_mask(h, w, ox, oy, cfg['boost'], k)
        wb[bm] = 2.2; wg[bm] = 0.45
    score = np.stack([cov[CLEAR], cov[GLOW] * wg, cov[DARK] * W_DARK, cov[BODY] * wb, cov[GROUND] * W_GROUND], -1)
    g = score.argmax(-1).astype(np.int8)
    rgb = np.zeros((h, w, 3))
    for c in (DARK, BODY, GROUND):
        rgb[g == c] = col[c][g == c]
    rgb[g == GLOW] = comp[g == GLOW]
    # Faint glow that would composite to almost his fill goes.
    a, _ = c2a(comp)
    g[(g == GLOW) & (a < 0.07)] = CLEAR
    out = dict(g=g, rgb=rgb, w=w, h=h, anchor=(ax, ay), origin=(ox, oy), k=k, cov_dark=cov[DARK])
    if cfg.get('lines'):
        # His thin bright lines mapped to game pixels by their crest (the brightest of his line
        # pixels in each game pixel), so the box filter cannot soften them; written after the
        # palette (see quantize).
        # With 'dark', his thin dark lines too (a crack is his white core between two dark edges):
        # a game pixel holding both is the bright core.
        sp = cfg['lines']
        pm = poly_mask(C.shape[0], C.shape[1], x0, y0, sp['poly'])
        lmask = np.zeros((h, w), np.int8); lrgb = np.zeros((h, w, 3))
        for sign in ((-1, 1) if sp.get('dark') else (1,)):
            lm, LL = thin_lines(C, sp['minL'], sp['contrast'], sign)
            best = np.full((h, w), -1e9)
            for yy, xx in zip(*np.nonzero(lm & pm)):
                gx = int(math.floor((x0 + xx + 0.5 - ox) * k)); gy = int(math.floor((y0 + yy + 0.5 - oy) * k))
                if 0 <= gx < w and 0 <= gy < h and sign * LL[yy, xx] > best[gy, gx]:
                    best[gy, gx] = sign * LL[yy, xx]; lrgb[gy, gx] = M[yy, xx]; lmask[gy, gx] = sign
        out.update(lines=lmask, lines_rgb=lrgb, lines_add=bool(sp.get('add')))
    return out

# --- clean-up at game scale ------------------------------------------------------------------------

def gmask(d, cfg, key):
    """A polygon set (his coords) as a mask over the game frame."""
    ox, oy = d['origin']; k = d['k']
    return poly_mask(d['h'], d['w'], ox, oy, cfg.get(key, []), k)

def cleanup(name, cfg, d):
    g, rgb = d['g'], d['rgb']
    wrap = bool(cfg.get('wrap'))
    H, W = g.shape
    body = g == BODY
    dark = g == DARK
    # Lone specks: a body or dark pixel with no opaque 8-neighbour goes, unless it is bright (a spark).
    opq = body | dark
    nbo = sum(shift(opq, dy, dx, wrap).astype(int) for dy, dx in N8)
    L = lum(rgb)
    lone = opq & (nbo == 0) & ~(body & (L > 150))
    g[lone] = CLEAR
    # Pinholes: a clear pixel with 4 opaque neighbours takes the commonest neighbour class.
    body = g == BODY; dark = g == DARK; opq = body | dark
    nb4 = sum(shift(opq, dy, dx, wrap).astype(int) for dy, dx in N4)
    hole = (g == CLEAR) & (nb4 == 4)
    for y, x in zip(*np.nonzero(hole)):
        vals = [(y + dy, (x + dx) % W if wrap else x + dx) for dy, dx in N4]
        vals = [(u, v) for u, v in vals if 0 <= u < H and 0 <= v < W]
        rgb[y, x] = np.mean([rgb[u, v] for u, v in vals], 0)
        g[y, x] = BODY if sum(g[u, v] == BODY for u, v in vals) >= 2 else DARK
    # Dark: his rim next to a body is opaque; away from bodies it is smoke (translucent) where the
    # sprite has smoke and the pixel is not in a 'black' (truly black: feathers, vines) polygon.
    body = g == BODY
    rim = (g == DARK) & dilate(body, 1, wrap)
    black = gmask(d, cfg, 'black')
    smoke = (g == DARK) & ~rim & ~black if cfg.get('smoke') else np.zeros_like(body)
    # Where his smoke is truly black (a dense mass: the bolt's trail), it is solid: dark, but still
    # in the smoke piece (see the pieces).
    solid = smoke & (L < cfg['solid_dark']) if cfg.get('solid_dark') else np.zeros_like(body)
    smoke &= ~solid
    d['solid_smoke'] = solid
    kind = np.full((H, W), '', dtype=object)
    kind[g == BODY] = 'body'
    kind[g == DARK] = 'dark'
    kind[smoke] = 'smoke'
    kind[g == GLOW] = 'glow'
    kind[g == GROUND] = 'ground'
    # Weeds: the olive brambles (warm and dull) get their own palette.
    weedy = (g == BODY) & (rgb[..., 0] > rgb[..., 2] + 4) & (rgb[..., 1] > rgb[..., 2] - 2) & (L < 150)
    kind[weedy] = 'weed'
    # The outline: where a body (not a tiny spark) meets the empty background or a soft glow,
    # his 1 px deep-violet edge is restored outside it.
    lab, n = components(body, N4, wrap)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    big = body & (sizes[lab] >= 5)
    noline = gmask(d, cfg, 'noline')
    # Only where his art has a dark edge (his dark pixels within a pixel of it): soft glowing
    # edges (sparkles, the sphere's spikes) keep their glow.
    had = dilate(d['cov_dark'] > 0.12, 1, wrap)
    ring = dilate(big, 1, wrap) & ((g == CLEAR) | (g == GLOW)) & had & ~noline
    if not wrap:
        ring[0, :] = ring[-1, :] = False; ring[:, 0] = ring[:, -1] = False
    kind[ring] = 'outline'
    # His eyes: their own kind, quantized by lightness (see quantize) and left out of the hue
    # smoothing, so the white ring, the dark lid and the pupil stay apart.
    ox, oy = d['origin']; k = d['k']
    for cx, cy, rx, ry, mode in cfg.get('eyes', []):
        em = poly_mask(H, W, ox, oy, [ellipse(cx, cy, rx, ry)], k) & ((g == BODY) | (g == DARK))
        if mode == 'lmin':
            for (yy, xx), c in eye_lmin(cx, cy, rx, ry, ox, oy, k, H, W).items():
                if em[yy, xx]: rgb[yy, xx] = c
        kind[em] = 'eye'
    d['kind'] = kind
    return d

# --- palette: one for the set, from his pixels --------------------------------------------------------

def median_cut(cols, n):
    cols = np.asarray(np.clip(np.round(cols), 0, 255), np.uint8).reshape(1, -1, 3)
    q = Image.fromarray(cols, 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, kmeans=4)
    pal = np.array(q.getpalette()[:n * 3], np.float64).reshape(-1, 3)
    used = np.unique(np.asarray(q).ravel())
    return pal[used]

def calm_chroma(d, wrap, sl=6.0, sab=10.0):
    """His flat planes keep one hue: within a body, each pixel's colour (a, b in Lab, not its
    lightness, so his 1 px cracks and highlight lines stay crisp) is averaged with its body
    neighbours of near the same lightness and hue. What is left of the JPEG's colour speckle
    goes, so the palette does not flip one plane between neighbouring hues."""
    m = d['kind'] == 'body'
    if not m.any(): return
    L = lab(d['rgb'])
    acc = np.zeros(L.shape[:2] + (2,)); ws = np.zeros(L.shape[:2])
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            Ln = shift(L, dy, dx, wrap); mn = shift(m, dy, dx, wrap)
            w = mn * np.exp(-((L[..., 0] - Ln[..., 0]) ** 2) / (2 * sl * sl)) \
                * np.exp(-((L[..., 1:] - Ln[..., 1:]) ** 2).sum(-1) / (2 * sab * sab)) * (1.0 if dy == 0 and dx == 0 else 0.7)
            acc += w[..., None] * Ln[..., 1:]; ws += w
    out = L.copy()
    out[..., 1:] = np.where(m[..., None], acc / np.maximum(ws, 1e-9)[..., None], L[..., 1:])
    d['rgb'] = np.where(m[..., None], lab2rgb(out), d['rgb'])

if os.environ.get('GJ_ONLY'):
    # (Experiments only: a subset of the sprites; the palette then comes from that subset.)
    SPRITES = {n: c for n, c in SPRITES.items() if n in os.environ['GJ_ONLY'].split(',')}
data = {}
for name, cfg in SPRITES.items():
    data[name] = cleanup(name, cfg, to_game(name, cfg))
    calm_chroma(data[name], bool(cfg.get('wrap')))

if os.environ.get('GJ_DUMP'):
    import pickle
    pickle.dump({n: {k: v for k, v in d.items()} for n, d in data.items()}, open(os.environ['GJ_DUMP'], 'wb'))

def gather(kind, per=2500):
    """A kind's colours from every sprite, at most `per` from each (an even stride), so a small
    sprite's own hues (the hit's and the sphere's hot pinks) count as much as a wall's lavender."""
    parts = []
    for d in data.values():
        c = d['rgb'][d['kind'] == kind]
        if len(c) > per: c = c[np.linspace(0, len(c) - 1, per).astype(int)]
        if len(c): parts.append(c)
    return np.concatenate(parts) if parts else np.zeros((0, 3))

def kmeans_lab(cols, n, iters=12):
    """A palette of n colours: median cut to start, then k-means with Lab distances (RGB means)."""
    cen = median_cut(cols, n)
    L = lab(cols)
    for _ in range(iters):
        dist = ((L[:, None, :] - lab(cen)[None, :, :]) ** 2).sum(-1)
        a = dist.argmin(1)
        cen = np.array([cols[a == i].mean(0) if (a == i).any() else cen[i] for i in range(len(cen))])
    return cen

def by_lum(p):
    return p[np.argsort(lum(p))]

N_COOL = 150   # violets, lavenders, whites
N_HOT = 30     # his hot pinks and magentas (red over blue)
SCLERA = np.array([[240.0, 228.0, 248.0], [252.0, 244.0, 255.0]])   # his eyes' white (fixed entries)

def body_palette():
    """150 colours for the violets and lavenders, plus 30 for his hot pinks and magentas (red over
    blue: the sphere's spikes, the hit, the splashes), which are too few to win slots otherwise.
    (Fewer left his lavender planes between two hues; the indices stay one byte.)"""
    c = gather('body', 4000)
    hot = c[:, 0] > c[:, 2] + 12
    return np.concatenate([kmeans_lab(c[~hot], N_COOL), kmeans_lab(c[hot], N_HOT), SCLERA])

FLOORS = {'glow': 0.0, 'smoke': 0.85, 'ground': 0.6}
OUTLINE = np.array([[40, 16, 58]])   # deep violet (his darkest violet rims), never black
SETS = {
    'outline': OUTLINE,
    'body': by_lum(body_palette()),
    'weed': by_lum(median_cut(gather('weed'), 5)),
    'dark': by_lum(median_cut(gather('dark'), 6)),
    'smoke': by_lum(median_cut(gather('smoke'), 4)),
    'glow': by_lum(kmeans_lab(gather('glow'), 20)),
    'ground': by_lum(kmeans_lab(gather('ground'), 12)),
}
PAL = []   # (r, g, b, a, kind, order); the composite colour each entry stands for, for lookups
COMPOSITE = []
IDX = {}
for kind, cols in SETS.items():
    IDX[kind] = []
    for i, col in enumerate(cols):
        if kind in FLOORS:
            a, F = c2a(col[None, None, :], FLOORS[kind])
            PAL.append((*[int(round(v)) for v in F[0, 0]], int(round(float(a[0, 0]) * 255)), kind, i))
        else:
            PAL.append((*[int(round(v)) for v in col], 255, kind, i))
        COMPOSITE.append(col)
        IDX[kind].append(len(PAL) - 1)
COMPOSITE = np.array(COMPOSITE)

# Nearest palette colour in Lab with the hue (a, b) weighted up: a plane keeps his hue and may
# step in lightness, rather than flipping between neighbouring hues.
QW = np.array([1.0, 1.6, 1.6])

QW_EYE = np.array([2.0, 1.0, 1.0])   # eyes: lightness first, so sclera, lid and pupil stay apart

def nearest(rgb, ids, w):
    pal = lab(COMPOSITE[ids]) * w
    dist = ((lab(rgb)[:, None, :] * w - pal[None, :, :]) ** 2).sum(-1)
    return np.array(ids)[dist.argmin(1)] + 1

def quantize(d):
    H, W = d['g'].shape
    idx = np.zeros((H, W), np.int32)
    for kind, ids in IDX.items():
        m = d['kind'] == kind
        if m.any(): idx[m] = nearest(d['rgb'][m], ids, QW)
    eye = d['kind'] == 'eye'
    if eye.any(): idx[eye] = nearest(d['rgb'][eye], IDX['body'] + IDX['outline'], QW_EYE)
    # JPEG specks inside a flat plane: a pixel unlike all 4 neighbours, which are alike (one flat
    # plane of one kind), and only a little off them, takes their commonest value. A pixel well
    # off its plane (his 1 px cracks, highlights, pupils) is his detail and stays.
    LP = lab(COMPOSITE)
    out = idx.copy()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = idx[y, x]
            if not v or eye[y, x]: continue
            nb = [idx[y, x + 1], idx[y, x - 1], idx[y + 1, x], idx[y - 1, x]]
            if v in nb or not all(nb) or not all(PAL[n - 1][4] == PAL[v - 1][4] for n in nb): continue
            ln = LP[np.array(nb) - 1]
            flat = max(np.sqrt(((ln[i] - ln[j]) ** 2).sum()) for i in range(4) for j in range(i + 1, 4)) < 12
            if flat and np.sqrt(((LP[v - 1] - ln.mean(0)) ** 2).sum()) < 16:
                out[y, x] = max(set(nb), key=nb.count)
    # His thin bright lines, written last (1 px, his crest colour by lightness): over his body
    # only, or anywhere for sparkles; never darker than what is there.
    if d.get('lines') is not None:
        for sign in (-1, 1):
            if sign > 0:
                m = (d['lines'] > 0) & ((out > 0) | d['lines_add'])
            else:
                # Dark lines only on his crystal faces (body), never on his black vines or rims.
                m = (d['lines'] < 0) & (d['kind'] == 'body') & (out > 0)
            if not m.any(): continue
            li = nearest(d['lines_rgb'][m], IDX['body'], QW_EYE)
            ys, xs = np.nonzero(m)
            for yy, xx, v in zip(ys, xs, li):
                cur = out[yy, xx]
                if not cur or PAL[cur - 1][4] in ('glow', 'smoke') or sign * (LP[v - 1][0] - LP[cur - 1][0]) > 0:
                    out[yy, xx] = v
    return out

def rle(flat):
    out = bytearray(); i = 0
    while i < len(flat):
        v = int(flat[i]); n = 1
        while i + n < len(flat) and flat[i + n] == v and n < 255: n += 1
        out += bytes((n, v)); i += n
    return base64.b64encode(bytes(out)).decode('ascii')

result, refmap = {}, {}
KIND_OF = np.array(['clear'] + [p[4] for p in PAL], dtype=object)
for name, cfg in SPRITES.items():
    d = data[name]
    idx = quantize(d)
    d['idx'] = idx
    H, W = idx.shape
    kinds = KIND_OF[idx]
    owner = np.full((H, W), 'main', dtype=object)
    owner[kinds == 'smoke'] = 'smoke'
    owner[kinds == 'ground'] = 'stain'
    owner[d['solid_smoke'] & (idx > 0)] = 'smoke'
    assigned = owner != 'main'
    for spec in cfg.get('pieces', []):
        pname, polys = spec[0], spec[1]
        pm = poly_mask(H, W, d['origin'][0], d['origin'][1], polys, d['k']) & ~assigned & (idx > 0)
        if len(spec) > 2: pm &= np.isin(kinds, spec[2])
        # The outline ring of a piece goes with it.
        owner[pm] = pname; assigned |= pm
    pieces = {}
    names = ['main', 'smoke', 'stain'] + [s[0] for s in cfg.get('pieces', [])]
    for pname in names:
        m = (owner == pname) & (idx > 0)
        if not m.any(): continue
        sub = np.where(m, idx, 0)
        ys, xs = np.nonzero(sub)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        if cfg.get('wrap') or cfg.get('head'):
            bx0, by0, bx1, by1 = 0, 0, W, H
        pieces[pname] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'rle': rle(sub[by0:by1, bx0:bx1].ravel())}
    result[name] = {'w': int(W), 'h': int(H), 'anchor': [int(d['anchor'][0]), int(d['anchor'][1])], 'fade': cfg.get('fade', {}), 'pieces': pieces}
    if cfg.get('seams'):
        result[name]['seams'] = [int(round((x - d['origin'][0]) * d['k'])) for x in cfg['seams']]
    refmap[name] = {'origin': [float(d['origin'][0]), float(d['origin'][1])], 'k': d['k'], 'size': [int(W), int(H)],
                    'anchor': [int(d['anchor'][0]), int(d['anchor'][1])], 'tile': cfg.get('tile')}
    edge = np.concatenate([idx[0], idx[-1], idx[:, 0], idx[:, -1]])
    print('%-11s %3dx%-3d anchor %3d,%-3d pieces %-40s border px %d' % (name, W, H, d['anchor'][0], d['anchor'][1], ','.join(pieces), int((edge > 0).sum())))

pal_json = [{'rgba': '#%02x%02x%02x%02x' % p[:4], 'kind': p[4], 'order': p[5]} for p in PAL]
ts = ["// GENERATED by tools/refs/genjutsu-from-ref.py from the owner's paint-over of the genjutsu sheet",
      "// (docs/reference/genjutsu-set-owner-reference.jpg): do not edit by hand. One palette for the set;",
      "// each sprite's key frame is split into pieces of base64 run-length data, as (run, palette",
      "// index + 1) byte pairs (0 = clear), each placed at (x, y) in the sprite's frame.", '',
      "export type GjKind = 'outline' | 'body' | 'weed' | 'dark' | 'smoke' | 'glow' | 'ground';",
      'export interface GjPal { rgba: string; kind: GjKind; order: number }',
      'export interface GjPiece { x: number; y: number; w: number; h: number; rle: string }',
      "export interface GjSprite { w: number; h: number; anchor: [number, number]; fade: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>; pieces: Record<string, GjPiece>; seams?: number[] }",
      'export const GJ_PAL: GjPal[] = ' + json.dumps(pal_json) + ';',
      'export const GJ_REF: Record<string, GjSprite> = ' + json.dumps(result, indent=1) + ';', '']
tmp = OUT + '.part'
open(tmp, 'w').write('\n'.join(ts))
os.replace(tmp, OUT)
open(REFMAP + '.part', 'w').write(json.dumps(refmap, indent=1) + '\n')
os.replace(REFMAP + '.part', REFMAP)
print('palette', len(PAL), 'entries:', ', '.join('%s %d' % (k, len(v)) for k, v in IDX.items()))

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    PALC = np.array([p[:4] for p in PAL], np.float64)
    for name, d in data.items():
        idx = d['idx']; H, W = idx.shape
        rgba = np.zeros((H, W, 4)); on = idx > 0
        rgba[on] = PALC[idx[on] - 1]
        def comp(bg):
            A = rgba[..., 3:] / 255
            return (rgba[..., :3] * A + np.array(bg) * (1 - A)).astype(np.uint8)
        ox, oy = d['origin']; k = d['k']
        if SPRITES[name].get('wrap'):
            tx, tw = SPRITES[name]['tile']
            his = Image.fromarray(np.clip(IM[int(oy) + PADSRC:int(oy + H / k) + PADSRC, tx + PADSRC:tx + tw + PADSRC], 0, 255).astype(np.uint8)).resize((W, H), Image.BOX)
        else:
            img = Image.fromarray(np.clip(IM, 0, 255).astype(np.uint8))
            his = img.resize((W, H), Image.BOX, box=(ox + PADSRC, oy + PADSRC, ox + W / k + PADSRC, oy + H / k + PADSRC))
        z = 4 if max(W, H) < 140 else 2
        imgs = [np.asarray(his), comp(BG), comp([84, 110, 70])]
        S = Image.new('RGB', (W * z * 3 + 20, H * z), (0, 0, 0))
        for i, x in enumerate(imgs):
            S.paste(Image.fromarray(x).resize((W * z, H * z), Image.NEAREST), (i * (W * z + 10), 0))
        S.save(os.path.join(PREVIEW, name + '.png'))
