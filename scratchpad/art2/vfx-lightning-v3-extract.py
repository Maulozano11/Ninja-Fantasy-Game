# Cuts the owner's paint-over of the lightning sheet (REF-lightning-set-owner.jpg) into game-scale
# key frames for the lightning set, v3 (tools/world-sprites/vfx-lightning-v3.ts).
#
# The owner wants his reference copied as exactly as possible, so every key frame is HIS pixels:
#   * Scale. His character is 96 px tall (y 319-414 beside the blast), the same as ours at 1x, and
#     his panels have our frame sizes (bolt 74x64, slash 64x72, multi 72x64...), so his image is
#     at game scale: 1 of his pixels = 1 game pixel. Each panel's inner top-left is our frame's
#     (0, 0) before any growth, so the anchors keep their meaning.
#   * Clean-up. His panel background (#20202a), his characters, the labels and the panel borders
#     are removed (what his character hid of a ground strip is filled from around it); JPEG noise
#     is smoothed before every decision.
#   * Classes. Each pixel is one of:
#       stroke  - the bright arcs and cores (white, cyan, light blue), opaque;
#       outline - a 1 px ring round every stroke, ring and body (deep blue / indigo, never black);
#       body    - the opaque blue mass of the sphere's orb;
#       cream   - the sphere's cream rings, opaque;
#       spark   - his little '+' sparks, redrawn crisp (the JPEG had blurred them), no outline;
#       glow    - his soft blue glow, kept SEMI-TRANSPARENT: each glow colour is un-blended from
#                 his background (colour-to-alpha), so it composites back to his exact look;
#       ground  - his blast splash and the 3/4 wall's ground strip: un-blended with an alpha floor,
#                 so they read as a stain on any map, not only as light.
#   * Palette. One palette for the whole set, median-cut from his pixels of each class.
#   * Pieces. Each key frame is split into pieces the generator animates on their own (sparks,
#     posts, the blast's bolt / ground crackle / stain...).
# The result is written as indexed run-length data (tools/world-sprites/vfx-lightning-v3-refdata.ts);
# the generator derives every other animation frame from these key frames.
#
#   python3 -I <art2>/vfx-lightning-v3-extract.py <art2> <repo>/tools/world-sprites/vfx-lightning-v3-refdata.ts [previewDir]

import base64, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

ART2, OUT = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
REF = os.path.join(ART2, 'REF-lightning-set-owner.jpg')
IM = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
BG = np.array([32.0, 32.0, 42.0])  # his panel fill (median of empty panel areas)

def our_character():
    """Our character (kit characterRef: 128x128, feet at (64, 120)) as RGBA, cut from our 2x sheet
    vfx-lightning.png, where it stands beside the blast (its 1x canvas starts at (510, 278); the
    figure fills x 27-82, y 27-122 of it; checked pixel for pixel against characterRef)."""
    sheet = np.asarray(Image.open(os.path.join(ART2, 'vfx-lightning.png')).convert('RGBA'))[::2, ::2]
    out = np.zeros((128, 128, 4), np.uint8)
    reg = sheet[278 + 27:278 + 123, 510 + 27:510 + 83]
    on = np.abs(reg[..., :3].astype(int) - [0x20, 0x21, 0x2b]).sum(-1) > 0
    out[27:123, 27:83][on] = reg[on]
    return out

# --- small image tools -----------------------------------------------------------------------

def gauss(a, s):
    """Separable gaussian blur of an HxW or HxWxC float array (edges clamped)."""
    if s <= 0: return a.copy()
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim; pad[ax] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim; sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out

def lum(c):
    return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]

def c2a(c, floor=0.0):
    """Colour-to-alpha against his background: the least alpha a with c = a*F + (1-a)*BG, F in
    [0,255]; with `floor`, alpha is at least that (F then darker), so stains stay stains."""
    d = np.maximum(c - BG, 0)
    a = (d / (255 - BG)).max(-1)
    a = np.maximum(a, floor)
    F = BG + (c - BG) / np.maximum(a, 1e-6)[..., None]
    return np.clip(a, 0, 1), np.clip(F, 0, 255)

def poly_mask(h, w, x0, y0, polys):
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([(x - x0, y - y0) for x, y in p], fill=255)
    return np.asarray(m) > 0

def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

def ellipse(cx, cy, rx, ry, n=48):
    return [(cx + rx * np.cos(a), cy + ry * np.sin(a)) for a in np.linspace(0, 2 * np.pi, n, endpoint=False)]

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))

def shift(m, dy, dx, wrap_x=False):
    """m shifted by (dy, dx): out[y, x] = m[y - dy, x - dx], clear (or wrapped in x) at the edges."""
    H, W = m.shape
    if wrap_x:
        m = np.roll(m, dx, 1); dx = 0
    out = np.zeros_like(m)
    out[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return out

def dilate(m, wrap_x=False):
    out = m.copy()
    for dy, dx in N4: out |= shift(m, dy, dx, wrap_x)
    return out

def components(m):
    """Labels of 4-connected components of a bool mask (simple flood fill)."""
    H, W = m.shape
    lab = np.zeros((H, W), np.int32); n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n
                while st:
                    a, b = st.pop()
                    for dy, dx in N4:
                        u, v = a + dy, b + dx
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                            lab[u, v] = n; st.append((u, v))
    return lab, n

# --- the sprites ------------------------------------------------------------------------------
# panel:  his panel's inner rect (x, y, w, h); its top-left is our frame's (0, 0) before growth.
# anchor: in panel coordinates (the projectile core; the ground centre; the feet).
# Masks are polygons in HIS image coordinates:
#   drop   - removed (labels, stray marks);
#   fill   - his character: removed, then the glow / ground strip behind him filled from around it;
#   body   - the opaque body class;  ground - the ground class;  cream - bright warm-or-neutral
#            pixels are spark class (the sphere's cream rings);
#   pieces - [(piece, polygons[, kinds])]: split for animation, first match wins; 'sparks' (spark class)
#            and 'stain' (ground class) are split off by class first, the rest is 'main'.
# frame:  'panel' keeps at least the panel rect (our old frame size), 'tight' crops to the art.
# fade:   {side: px}: his art ran off his panel there, so it fades out over px pixels.

SPRITES = {
    'bolt': dict(panel=(10, 38, 74, 64), anchor=(43, 32)),
    'stream': dict(panel=(324, 38, 64, 64), anchor=(32, 32), tile=True),
    'stream_head': dict(panel=(452, 38, 76, 64), anchor=(32, 32), head=True),
    'breath': dict(panel=(541, 38, 106, 113), anchor=(58, 56)),
    'sphere': dict(panel=(659, 38, 77, 76), anchor=(38, 38), body=[ellipse(697, 76, 20.5, 20.5)],
                   cream=[ellipse(697, 76, 40, 40)]),
    'slash': dict(panel=(10, 179, 64, 72), anchor=(32, 36)),
    'multi': dict(panel=(119, 179, 72, 64), anchor=(32, 32)),
    'hit': dict(panel=(227, 179, 77, 77), anchor=(37, 37)),
    'blast': dict(panel=(337, 179, 347, 286), anchor=(152, 213), frame='tight', fade={'top': 18},
                  fill=[[(633, 316), (666, 316), (673, 338), (681, 362), (681, 376), (674, 400), (682, 409), (678, 417),
                         (660, 419), (636, 419), (626, 413), (617, 402), (612, 384), (620, 362), (627, 344), (631, 330)]],
                  ground=[[(338, 425), (370, 408), (420, 400), (470, 396), (530, 396), (590, 400), (640, 404), (668, 412),
                           (670, 432), (640, 448), (590, 462), (500, 465), (420, 465), (360, 455), (338, 440)]]),
    'wall': dict(panel=(10, 493, 363, 124), anchor=(150, 118), frame='tight',
                 drop=[rect(311, 493, 373, 617)],
                 pieces=[('posts', [rect(x - 4, 500, x + 4, 606) for x in (42, 100, 160, 220, 279)], ['stroke', 'outline'])]),
    'wall_diag': dict(panel=(386, 493, 292, 237), anchor=(115, 183), frame='tight', fade={'top': 10, 'right': 14},
                      fill=[[(645, 566), (668, 564), (675, 578), (673, 592), (679, 600), (679, 642), (677, 662), (673, 674),
                             (645, 675), (626, 670), (616, 660), (619, 640), (630, 610), (637, 595), (640, 578)]],
                      ground=[[(386, 730), (386, 722), (420, 728), (463, 700), (500, 682), (546, 647), (582, 617),
                               (620, 592), (678, 556), (678, 730)]],
                      pieces=[('posts', [[(x - 4, y0), (x + 4, y0), (x + 4, y1), (x - 4, y1)] for x, y0, y1 in
                                         ((419, 614, 718), (463, 593, 692), (500, 561, 674), (546, 536, 637), (582, 506, 608))],
                               ['stroke', 'outline'])]),
    'wall_depth': dict(panel=(10, 716, 128, 302), anchor=(33, 206), frame='tight',
                       # His character: only his cape lies over the columns' glow, so only it is filled.
                       fill=[[(96, 840), (97, 928), (86, 914), (80, 900), (83, 870), (91, 855)]],
                       drop=[[(96, 826), (125, 826), (131, 848), (138, 860), (138, 882), (131, 928), (96, 928)]]),
    'aura': dict(panel=(207, 716, 81, 127), anchor=(40, 112), aura=True,
                 drop=[[(225, 791), (233, 787), (252, 824), (245, 830)]]),  # his character's sword
}

T_STROKE, T_THIN, T_THIN_RAW = 140, 108, 92

def fill_holes(c, hole, src):
    """Fills `hole` by diffusion from the pixels round it (his glow / ground strip where `src`,
    his background elsewhere), so what his character hid continues smoothly across the gap."""
    base = np.where(src[..., None], c, BG)
    out = base.copy()
    out[hole] = BG
    for _ in range(500):
        p = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        out[hole] = avg[hole]
    res = c.copy()
    res[hole] = out[hole]
    return res

def classify(name, cfg):
    px, py, pw, ph = cfg['panel']
    c = IM[py:py + ph, px:px + pw].copy()
    H, W = c.shape[:2]
    wrap = bool(cfg.get('tile'))
    drop = poly_mask(H, W, px, py, cfg.get('drop', []))
    hole = poly_mask(H, W, px, py, cfg.get('fill', []))
    a0, _ = c2a(gauss(c, 0.6))
    if hole.any():
        # What his character hid: the glow / ground strip around him, filled in smoothly.
        src = ~hole & ~drop & (a0 >= 0.04) & (lum(c) < T_STROKE)
        c = fill_holes(c, hole, src)
    c[drop] = BG
    cs = gauss(c, 0.6)
    cm = gauss(c, 0.45)
    L, Ls = lum(c), lum(cs)
    warm = (cs[..., 0] > cs[..., 2] + 10) & (cs[..., 0] > 80) & (Ls > 70)
    cream = poly_mask(H, W, px, py, cfg.get('cream', [])) & ~poly_mask(H, W, px, py, cfg.get('body', []))
    warm |= cream & (Ls > 100) & (cs[..., 0] >= cs[..., 2] - 16)
    stroke = ((L >= T_STROKE) | ((Ls >= T_THIN) & (L >= T_THIN_RAW))) & ~warm
    body = poly_mask(H, W, px, py, cfg.get('body', []))
    ground = poly_mask(H, W, px, py, cfg.get('ground', []))
    a, F = c2a(cm)
    cls = np.zeros((H, W), np.int8)  # 0 clear, 1 glow, 2 ground, 3 body, 4 stroke, 5 spark, 6 outline
    cls[(a >= 0.06)] = 1
    cls[ground & (a >= 0.035)] = 2
    cls[body & (a >= 0.08)] = 3
    cls[stroke] = 4
    cls[warm] = 5
    cls[drop | (hole & (cls >= 4))] = 0
    if cfg.get('aura'):
        aura_middle(cls, c, cs, cfg)
    plus = crisp_sparks(cls, cs, cream)
    # Lone stroke pixels that are not clearly bright are glow; lone glow specks go.
    lab, n = components(cls == 4)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    cls[(cls == 4) & (sizes[lab] <= 1) & (L < 112)] = 1
    lab, n = components(cls == 5)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    cls[(cls == 5) & (sizes[lab] <= 1)] = 1
    g = cls == 1
    nb = sum(shift(cls >= 1, dy, dx, wrap).astype(int) for dy, dx in N4)
    cls[g & (nb == 0)] = 0
    # The outline: a 1 px ring round strokes and sparks, and round the body, drawn over glow.
    solid = (cls == 4) | (cls == 5)
    ring = dilate(solid, wrap) & ~solid & (cls != 3)
    ring |= dilate(cls == 3, wrap) & (cls <= 2)
    spark_ring = ring & dilate(cls == 5, wrap) & ~dilate(cls == 4, wrap)
    cls[ring] = 6
    cls[plus > 0] = 0
    if cfg.get('aura'):
        cls[CHARZONE & (cls == 6) & ~dilate(solid)] = 0
    return dict(c=c, cm=cm, cs=cs, cls=cls, spark_ring=spark_ring, plus=plus, W=W, H=H)

def crisp_sparks(cls, cs, cream):
    """His little yellow sparks are '+' shapes blurred by the JPEG: each small yellow blob outside
    the sphere's rings is redrawn as a crisp '+' at its centre (1 = centre, 2 = arm, 3 = tip),
    without an outline, like the sparks of the rest of the set."""
    H, W = cls.shape
    plus = np.zeros((H, W), np.int8)
    lab, n = components((cls == 5) & ~cream)
    L = lum(cs)
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) > 18: continue
        w = L[ys, xs] - 60
        cy, cx = int(round((ys * w).sum() / w.sum())), int(round((xs * w).sum() / w.sum()))
        ext = max(ys.max() - ys.min(), xs.max() - xs.min()) + 1
        arm = 2 if ext >= 5 else 1
        SPARK_PX.append(cs[ys, xs])
        cls[ys, xs] = 0
        for dy, dx, v in [(0, 0, 1)] + [(d * sy, d * sx, 2 if d == 1 else 3) for d in range(1, arm + 1) for sy, sx in N4]:
            u, x = cy + dy, cx + dx
            if 0 <= u < H and 0 <= x < W: plus[u, x] = v
    return plus

SPARK_PX = []
CHARZONE = None
def aura_middle(cls, c, cs, cfg):
    """The aura is drawn over the character, so his tinted character goes and its middle stays
    clear: inside our character's silhouette only clearly bright blue-white arcs are kept."""
    global CHARZONE
    ch = our_character()[..., 3] > 0
    H, W = cls.shape
    ax, ay = cfg['anchor']
    zone = np.zeros((H, W), bool)
    ys, xs = np.nonzero(ch)
    for y, x in zip(ys, xs):
        u, v = x - 64 + ax, y - 120 + ay
        if 0 <= u < W and 0 <= v < H: zone[v, u] = True
    zone = dilate(dilate(zone))
    CHARZONE = zone
    blue = cs[..., 2] > cs[..., 0] + 30
    keep = (cls == 4) & blue & (lum(cs) >= 150)
    cls[zone & ~keep] = 0

# --- palette: one for the set, from his pixels ----------------------------------------------------

def median_cut(cols, n):
    cols = np.asarray(np.clip(cols, 0, 255), np.uint8).reshape(1, -1, 3)
    q = Image.fromarray(cols, 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    pal = np.array(q.getpalette()[:n * 3], np.float64).reshape(-1, 3)
    used = np.unique(np.asarray(q).ravel())
    return pal[used]

data = {k: classify(k, v) for k, v in SPRITES.items()}

def gather(cl, key='cm'):
    parts = [d[key][d['cls'] == cl] for d in data.values() if (d['cls'] == cl).any()]
    return np.concatenate(parts) if parts else np.zeros((0, 3))

def by_lum(p):
    return p[np.argsort(lum(p))]

strokes = gather(4)
STROKE = by_lum(np.concatenate([median_cut(strokes, 9), [np.percentile(strokes, 99, axis=0)]]))
warmpx = gather(5)
yellow = np.concatenate(SPARK_PX)
CREAM = by_lum(median_cut(warmpx, 4))
YEL = by_lum(median_cut(yellow, 3))
YEL[-1] = np.maximum(YEL[-1], np.percentile(yellow, 97, axis=0))
# The JPEG's 4:2:0 chroma subsampling greys out 1 px wide warm sparks on the blue night, so their
# chroma is restored (x2 away from grey) instead of copying that artefact.
YEL = np.clip(YEL.mean(1, keepdims=True) + (YEL - YEL.mean(1, keepdims=True)) * 2.0, 0, 255)
BODY = by_lum(median_cut(gather(3), 5))
GLOW = by_lum(median_cut(gather(1), 9))
GROUND = by_lum(median_cut(gather(2), 7))
OUTLINE = np.array([[28, 58, 168], [38, 34, 104]])  # deep blue round strokes; indigo round sparks

PAL = []  # (r, g, b, a, kind, order)
def add(cols, kind, floor=0.0):
    out = []
    for i, col in enumerate(cols):
        if kind in ('glow', 'ground'):
            a, F = c2a(col[None, None, :], floor)
            PAL.append((*[int(round(v)) for v in F[0, 0]], int(round(float(a[0, 0]) * 255)), kind, i))
        else:
            PAL.append((*[int(round(v)) for v in col], 255, kind, i))
        out.append(len(PAL) - 1)
    return out
IDX = {
    'outline': add(OUTLINE, 'outline'),
    'stroke': add(STROKE, 'stroke'),
    'cream': add(CREAM, 'cream'),  # the sphere's rings
    'spark': add(YEL, 'spark'),    # the '+' sparks
    'body': add(BODY, 'body'),
    'glow': add(GLOW, 'glow'),
    'ground': add(GROUND, 'ground', 0.55),
}
CLS_KIND = {1: 'glow', 2: 'ground', 3: 'body', 4: 'stroke', 5: 'cream'}
SRC = {'glow': GLOW, 'ground': GROUND, 'body': BODY, 'stroke': STROKE, 'cream': CREAM}
PALC = np.array([p[:4] for p in PAL], np.float64)

def quantize(d):
    H, W = d['H'], d['W']
    idx = np.zeros((H, W), np.int32)  # 0 = clear, else palette index + 1
    for cl, kind in CLS_KIND.items():
        m = d['cls'] == cl
        if not m.any(): continue
        pal = SRC[kind]
        dist = ((d['cm'][m][:, None, :] - pal[None, :, :]) ** 2).sum(-1)
        idx[m] = np.array(IDX[kind])[dist.argmin(1)] + 1
    ring = d['cls'] == 6
    idx[ring] = IDX['outline'][0] + 1
    y3 = IDX['spark']
    for v, e in ((3, y3[0]), (2, y3[1]), (1, y3[2])):
        idx[d['plus'] == v] = e + 1
    idx[ring & d['spark_ring']] = IDX['outline'][1] + 1
    # Speck clean-up inside a class: a pixel unlike all 4 neighbours takes their commonest value.
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = idx[y, x]
            if not v: continue
            nb = [idx[y, x + 1], idx[y, x - 1], idx[y + 1, x], idx[y - 1, x]]
            if v not in nb and all(nb) and all(PAL[n - 1][4] == PAL[v - 1][4] for n in nb):
                idx[y, x] = max(set(nb), key=nb.count)
    return idx

def rle(flat):
    out = bytearray(); i = 0
    while i < len(flat):
        v = int(flat[i]); n = 1
        while i + n < len(flat) and flat[i + n] == v and n < 255: n += 1
        out += bytes((n, v)); i += n
    return base64.b64encode(bytes(out)).decode('ascii')

MARGIN = 2
result = {}
for name, cfg in SPRITES.items():
    d = data[name]
    idx = quantize(d)
    H, W = idx.shape
    px, py, pw, ph = cfg['panel']
    ax, ay = cfg['anchor']
    ys, xs = np.nonzero(idx)
    if cfg.get('tile'):
        x0, y0, x1, y1 = 0, 0, W, H
    else:
        x0, y0, x1, y1 = xs.min() - MARGIN, ys.min() - MARGIN, xs.max() + 1 + MARGIN, ys.max() + 1 + MARGIN
        if cfg.get('frame', 'panel') == 'panel':
            x0, y0, x1, y1 = min(x0, 0), min(y0, 0), max(x1, W), max(y1, H)
        if cfg.get('head'):
            x0 = 0  # the joint edge stays on the tile boundary
    fw, fh = x1 - x0, y1 - y0
    frame = np.zeros((fh, fw), np.int32)
    sx0, sy0 = max(0, x0), max(0, y0)
    sx1, sy1 = min(W, x1), min(H, y1)
    frame[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = idx[sy0:sy1, sx0:sx1]
    # Pieces.
    kinds = np.array(['clear'] + [p[4] for p in PAL])[frame]
    owner = np.full(frame.shape, 'main', dtype=object)
    sr = np.zeros((fh, fw), bool)
    sr[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = d['spark_ring'][sy0:sy1, sx0:sx1]
    owner[(kinds == 'spark') | (kinds == 'cream') | ((frame == IDX['outline'][1] + 1) & sr)] = 'sparks'
    owner[kinds == 'ground'] = 'stain'
    assigned = (owner != 'main')
    for spec in cfg.get('pieces', []):
        pname, polys = spec[0], spec[1]
        m = poly_mask(fh, fw, px + x0, py + y0, polys) & ~assigned & (frame > 0)
        if len(spec) > 2: m &= np.isin(kinds, spec[2])  # only these kinds (posts: no glow slabs)
        owner[m] = pname; assigned |= m
    pieces = {}
    for pname in ['main', 'stain', 'sparks'] + [sp[0] for sp in cfg.get('pieces', [])]:
        m = (owner == pname) & (frame > 0)
        if not m.any(): continue
        sub = np.where(m, frame, 0)
        ys2, xs2 = np.nonzero(sub)
        bx0, by0, bx1, by1 = xs2.min(), ys2.min(), xs2.max() + 1, ys2.max() + 1
        if cfg.get('tile') or cfg.get('head'):
            bx0, by0, bx1, by1 = 0, 0, fw, fh  # tile pieces keep the full frame (they wrap)
        pieces[pname] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0),
                         'rle': rle(sub[by0:by1, bx0:bx1].ravel())}
    result[name] = {'w': int(fw), 'h': int(fh), 'anchor': [int(ax - x0), int(ay - y0)], 'fade': cfg.get('fade', {}), 'pieces': pieces}
    d['frame'] = frame
    edge = np.concatenate([frame[0], frame[-1], frame[:, 0], frame[:, -1]])
    print('%-11s %3dx%-3d anchor %3d,%-3d (panel offset %d,%d) pieces %s  border px %d' % (
        name, fw, fh, ax - x0, ay - y0, x0, y0, ','.join(pieces), int((edge > 0).sum())))

pal_json = [{'rgba': '#%02x%02x%02x%02x' % p[:4], 'kind': p[4], 'order': p[5]} for p in PAL]
ts = ["// GENERATED by art2/vfx-lightning-v3-extract.py from the owner's paint-over of the lightning",
      "// sheet (REF-lightning-set-owner.jpg): do not edit by hand. One palette for the set; each",
      "// sprite's key frame is split into pieces of base64 run-length data, as (run, palette index + 1)",
      "// byte pairs (0 = clear), each placed at (x, y) in the sprite's frame.", '',
      "export type RefKind = 'outline' | 'stroke' | 'cream' | 'spark' | 'body' | 'glow' | 'ground';",
      'export interface RefPal { rgba: string; kind: RefKind; order: number }',
      'export interface RefPiece { x: number; y: number; w: number; h: number; rle: string }',
      'export interface RefSprite { w: number; h: number; anchor: [number, number]; fade: Partial<Record<\'top\' | \'right\' | \'bottom\' | \'left\', number>>; pieces: Record<string, RefPiece> }',
      'export const LV3_PAL: RefPal[] = ' + json.dumps(pal_json) + ';',
      'export const LV3_REF: Record<string, RefSprite> = ' + json.dumps(result, indent=1) + ';', '']
tmp = OUT + '.part'
open(tmp, 'w').write('\n'.join(ts))
os.replace(tmp, OUT)
# Where each key frame's (0, 0) is in his image, for the review images (vfx-lightning-v3-review.py).
refmap = {n: {'origin': [SPRITES[n]['panel'][0] + SPRITES[n]['anchor'][0] - r['anchor'][0],
                         SPRITES[n]['panel'][1] + SPRITES[n]['anchor'][1] - r['anchor'][1]],
              'anchor': r['anchor'], 'size': [r['w'], r['h']]} for n, r in result.items()}
mp = os.path.join(ART2, 'vfx-lightning-v3-refmap.json')
open(mp + '.part', 'w').write(json.dumps(refmap, indent=1) + '\n')
os.replace(mp + '.part', mp)
print('palette', len(PAL), 'entries')
for i, p in enumerate(PAL): print('  %2d #%02x%02x%02x a%3d %s %d' % (i, *p))

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    for name, d in data.items():
        cfg = SPRITES[name]
        fr = d['frame']; H, W = fr.shape
        rgba = np.zeros((H, W, 4))
        on = fr > 0
        rgba[on] = PALC[fr[on] - 1]
        def comp(bg):
            A = rgba[..., 3:] / 255
            return (rgba[..., :3] * A + np.array(bg) * (1 - A)).astype(np.uint8)
        px, py, pw, ph = cfg['panel']
        r = result[name]
        x0, y0 = cfg['anchor'][0] - r['anchor'][0] + px, cfg['anchor'][1] - r['anchor'][1] + py
        his = np.zeros((H, W, 3), np.uint8) + BG.astype(np.uint8)
        hx0, hy0 = max(0, x0), max(0, y0)
        hx1, hy1 = min(IM.shape[1], x0 + W), min(IM.shape[0], y0 + H)
        his[hy0 - y0:hy1 - y0, hx0 - x0:hx1 - x0] = IM[hy0:hy1, hx0:hx1].astype(np.uint8)
        k = 4 if max(W, H) < 140 else 2
        imgs = [his, comp(BG), comp([84, 110, 70])]
        S = Image.new('RGB', (W * k * 3 + 20, H * k), (0, 0, 0))
        for i, x in enumerate(imgs):
            S.paste(Image.fromarray(x).resize((W * k, H * k), Image.NEAREST), (i * (W * k + 10), 0))
        S.save(os.path.join(PREVIEW, name + '.png'))
