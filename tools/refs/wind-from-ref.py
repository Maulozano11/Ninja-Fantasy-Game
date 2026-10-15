"""Cuts the owner's paint-over of the wind sheet (REF-wind-set-owner.jpg) into game-scale key frames
for the wind set, v3 (tools/world-sprites/vfx-wind-v3.ts).

    python3 -I tools/refs/wind-from-ref.py <REF-wind-set-owner.jpg> tools/world-sprites/vfx-wind-v3-refdata.ts [previewDir]

The owner asked for his reference to be copied as exactly as possible, so every key frame is HIS
pixels:
  * Scale. His sheet is our 2x review sheet (vfx-wind.png) redrawn at 0.544 of its size, so each of
    his panels is our sprite frame at S = 1.0875 of his pixels per game pixel (bolt 74x70 for our
    68x64, aura 87x141 for 80x128...), and his character is our 96 px character at the same factor
    (104-105 px). The inside top-left of each of his panels is our frame's (0, 0), so his art maps
    onto our anchors directly. Everything is area-averaged (box filter) down to game scale.
  * Clean-up. His panel fill (#20202a), the sheet background, the panel border lines, his
    character and labels are removed. The JPEG is smoothed (gaussian 0.6 px) before any decision.
  * Opacity. Each of his pixels is split into what he painted and the background under it:
      solid   - his strokes, leaves and dust, with their shading and the dark teal / green / brown
                outline round them: opaque;
      veil    - soft see-through wind (the breath cone, faint wisps, glows) lighter than his fill:
                colour-to-alpha (the least alpha that composites back to his pixel over his fill);
      dark    - dark teal fill between strokes away from any stroke: a dark veil at fixed alpha.
    Composited over his panel fill, every sprite gives back his picture.
  * Palette. One palette for the set, median-cut from his own pixels: opaque colours, plus veil
    colours at a few alpha steps. Silhouette edges that are dark become a 1 px outline tinted by
    what it surrounds (deep teal round wind, deep green round leaves, dark brown round dust).
  * Pieces. Each sprite's key frame is split into the parts the generator animates (the swirl, the
    rings, the funnel, the trail...), and loose leaves are cut out one by one so they can drift.
The result is written as indexed run-length data that the generator decodes, so the build needs no
image files. Deterministic.
"""
import base64, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

REF, OUT = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
IM = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
S = 1.0875                                  # his pixels per game pixel
FILL = np.array([32.0, 32.0, 42.0])         # his panel fill
SHEET = np.array([21.0, 21.0, 29.0])        # his sheet background
BORDER = np.array([40.0, 40.0, 50.0])       # his panel border line

# --- small image tools ------------------------------------------------------------------------------

def gauss(a, s):
    """Separable gaussian blur of an HxW or HxWxC float array (edges clamped)."""
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

def hue(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, (mx - mn) / np.maximum(mx, 1e-9)

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))

def shift(m, dy, dx):
    out = np.zeros_like(m); H, W = m.shape[:2]
    ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
    xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
    out[ys, xs] = m[yd, xd]
    return out

def dilate(m, n=1, nb=N4):
    for _ in range(n):
        o = m.copy()
        for dy, dx in nb: o |= shift(m, dy, dx)
        m = o
    return m

def components(m, nb=N8):
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
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                            lab[u, v] = n; st.append((u, v))
    return lab, n

def poly_mask(h, w, x0, y0, polys, scale=1.0):
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([((x - x0) * scale, (y - y0) * scale) for x, y in p], fill=255)
    return np.asarray(m) > 0

def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

def ellipse(cx, cy, rx, ry, n=48, a0=0.0, a1=2 * math.pi):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

GB = gauss(IM, 0.6)

# --- his pixels to game pixels -------------------------------------------------------------------------

def prep(cfg):
    """His smoothed pixels for a sprite, with his border lines and dropped parts set to the fill."""
    px0, py0, px1, py1 = cfg['panel']
    sx0, sy0, sx1, sy1 = cfg['src']
    c = GB[sy0:sy1, sx0:sx1].copy()
    raw = IM[sy0:sy1, sx0:sx1]
    H, W = c.shape[:2]
    yy, xx = np.mgrid[sy0:sy1, sx0:sx1]
    inside = (xx >= px0) & (xx < px1) & (yy >= py0) & (yy < py1)
    B = np.where(inside[..., None], FILL, SHEET)
    # The border line (and its JPEG halo) where no art covers it.
    on_border = (((xx >= px0 - 2) & (xx <= px0)) | ((xx >= px1 - 1) & (xx <= px1 + 1))) & (yy >= py0 - 2) & (yy <= py1 + 1)
    on_border |= (((yy >= py0 - 2) & (yy <= py0)) | ((yy >= py1 - 1) & (yy <= py1 + 1))) & (xx >= px0 - 2) & (xx <= px1 + 1)
    plain = (np.abs(raw - BORDER).sum(-1) < 24) | (np.abs(raw - FILL).sum(-1) < 16) | (np.abs(raw - SHEET).sum(-1) < 16)
    gone = on_border & plain
    gone |= poly_mask(H, W, sx0, sy0, cfg.get('drop', []))
    c[gone] = B[gone]
    cr = raw.copy(); cr[gone] = B[gone]
    return c, B, gone, cr

def classify(c, B, cfg, cr=None):
    """Splits each pixel into what he painted (alpha, colour F) over the background B under it."""
    d = c - B
    L, LB = lum(c), lum(B)
    dsum = np.abs(d).sum(-1)
    painted = dsum > 15
    core = (L - LB >= cfg.get('ts', 24)) & painted
    near = dilate(core, 2)
    # Dark paint: dark teal (green well above red, not much lighter than his fill), or anything
    # darker than his fill (the deep green round leaves, the brown shadows of the dust).
    darkish = (((c[..., 1] - c[..., 0] >= 24) & (L < LB + 18)) | (L < LB - 2)) & (dsum >= 16)
    # Solid: his strokes, with their shading and the dark outline round them.
    solid = core | (dilate(core, 1) & painted) | (darkish & near)
    # See-through: lighter than his fill (veils, wisps, glows): the least alpha that gives his pixel.
    lighter = painted & ~solid & (d.max(-1) > 0)
    a_light = np.clip((np.maximum(d, 0) / (255 - B)).max(-1), 0, 1)
    # Dark teal away from any stroke: a dark veil.
    dark_veil = darkish & ~solid
    alpha = np.where(solid, 1.0, np.where(dark_veil, 0.72, np.where(lighter, a_light, 0.0)))
    # Decisions are made on the smoothed pixels; colours come from his unsmoothed ones (contrast).
    dr = (c if cr is None else cr) - B
    F = np.clip(np.where(alpha[..., None] > 0, B + dr / np.maximum(alpha, 1e-6)[..., None], 0), 0, 255)
    return alpha, F, solid

def to_game(cfg, alpha, F, solid):
    """Box-resamples onto the game grid: game (gx, gy) covers his [p0 + g * S, p0 + (g + 1) * S).
    Solid coverage of half a pixel or more makes an opaque pixel; the rest stays see-through."""
    px0, py0 = cfg['panel'][:2]
    sx0, sy0, sx1, sy1 = cfg['src']
    gl = math.floor((sx0 - px0) / S); gt = math.floor((sy0 - py0) / S)
    gr = math.ceil((sx1 - px0) / S); gb = math.ceil((sy1 - py0) / S)
    W, H = gr - gl, gb - gt
    ox, oy = px0 + gl * S - sx0, py0 + gt * S - sy0
    pad = 16
    def rs(a):
        z = np.pad(a.astype(np.float32), pad)
        return np.asarray(Image.fromarray(z, 'F').resize((W, H), Image.BOX, box=(ox + pad, oy + pad, ox + pad + W * S, oy + pad + H * S))).astype(np.float64)
    sm = solid.astype(np.float64)
    Cs = rs(sm)
    Ps = np.stack([rs(F[..., k] * sm) for k in range(3)], -1)
    tr = alpha * (1 - sm)
    At = rs(tr)
    Pt = np.stack([rs(F[..., k] * tr) for k in range(3)], -1)
    return compose(Cs, Ps, At, Pt), (gl, gt)


# --- the sprites ------------------------------------------------------------------------------------
# All positions below are GAME pixels relative to the inside top-left of his panel ("panel coords"),
# i.e. our frame's (0, 0) before any growth; his pixel = panel origin + game * S.
#   panel   his panel's inside (x0, y0, x1, y1), his px, x1/y1 exclusive
#   src     the part of his sheet read (his px); his art may run past his panel
#   anchor  the sprite's anchor (panel coords): the vortex eye, the ring centre on the ground,
#           the wall centre on the ground, the character's feet...
#   ts      how much brighter than his fill (luminance) a pixel must be to count as a solid stroke
#   drop    polygons removed (his character and its cape, the BEAST panel...)
#   soft    polygons where only solid strokes are kept (his glow round his character)
#   body    (aura) his character: inside it only the ribbons and leaves passing in front are kept
#   pieces  name -> polygons: parts the generator animates separately (first match wins, the rest
#           is 'main'); 'dust' splits his dirt and dust off into its own piece
#   glow    a soft green glow drawn behind the effect, in his glow colours (see synth_glow)
P = {
    'bolt': (10, 43, 84, 113), 'stream': (280, 43, 520, 113), 'breath': (534, 43, 638, 113),
    'sphere': (651, 43, 727, 113), 'slash': (10, 185, 80, 259), 'multi': (128, 185, 201, 255),
    'hit': (245, 185, 323, 270), 'blast': (362, 185, 618, 339), 'wall': (11, 371, 402, 502),
    'wall_diag': (415, 371, 737, 652), 'wall_depth': (11, 683, 141, 1012), 'aura': (223, 683, 310, 824),
}

def grow(r, l, t=None, rr=None, b=None):
    t = l if t is None else t; rr = l if rr is None else rr; b = t if b is None else b
    return (r[0] - l, r[1] - t, r[2] + rr, r[3] + b)

def circle(cx, cy, r, n=40):
    return ellipse(cx, cy, r, r, n)

SPRITES = {
    'bolt': dict(panel=P['bolt'], src=P['bolt'], anchor=(44, 31), ts=24,
                 pieces={'swirl': [circle(44.5, 31.5, 29.0)]}),
    'stream': dict(panel=P['stream'], src=P['stream'], anchor=(32, 32), ts=24),
    'breath': dict(panel=P['breath'], src=P['breath'], anchor=(48, 32), ts=110),
    'sphere': dict(panel=P['sphere'], src=P['sphere'], anchor=(36, 33), ts=24),
    'slash': dict(panel=P['slash'], src=P['slash'], anchor=(32, 32), ts=24),
    'multi': dict(panel=P['multi'], src=P['multi'], anchor=(32, 32), ts=24,
                  pieces={'cone1': [[(4, 6), (34, 6), (34, 30), (22, 34), (16, 34), (4, 20)]],
                          'cone2': [[(34, 2), (66, 2), (66, 20), (50, 30), (40, 26), (34, 16)]],
                          'cone3': [[(18, 26), (50, 26), (50, 42), (36, 46), (14, 42), (14, 34)]],
                          'cone4': [[(18, 44), (62, 42), (62, 62), (34, 62), (18, 58)]]}),
    'hit': dict(panel=P['hit'], src=P['hit'], anchor=(37, 40), ts=24),
    'blast': dict(panel=P['blast'], src=P['blast'], anchor=(88, 110), ts=24,
                  drop=[rect(164, -2, 240, 145)],
                  soft=[rect(146, 52, 165, 145)],
                  pieces={'funnel': [[(28, 2), (168, 2), (168, 52), (146, 58), (132, 72), (122, 90), (115, 106), (110, 121),
                                      (90, 121), (84, 106), (78, 90), (68, 74), (46, 60), (28, 52)]]},
                  glow=dict(kind='ellipse', cx=90, cy=104, rx=84, ry=36, a=0.42)),
    'wall': dict(panel=P['wall'], src=P['wall'], anchor=(150, 112), ts=24,
                 drop=[rect(296, -2, 362, 125)], dust=True),
    'wall_diag': dict(panel=P['wall_diag'], src=P['wall_diag'], anchor=(118, 179), ts=24,
                      drop=[ellipse(254, 150, 48, 70)], soft=[ellipse(254, 150, 64, 84)], dust=True,
                      glow=dict(kind='segment', x0=40, y0=226, x1=186, y1=118, r=56, a=0.30)),
    'wall_depth': dict(panel=P['wall_depth'], src=P['wall_depth'], anchor=(30, 200), ts=24,
                       drop=[rect(62, 96, 122, 212)], dust=True),
    'aura': dict(panel=P['aura'], src=(212, 683, 321, 826), anchor=(40, 112), ts=24,
                 body=[[(25, 20), (51, 20), (53, 34), (51, 46), (58, 52), (62, 62), (61, 76), (54, 82), (53, 98), (55, 114),
                        (50, 121), (26, 121), (22, 114), (17, 104), (15, 92), (14, 80), (16, 66), (19, 54), (25, 46), (24, 34)]],
                 glow=dict(kind='ellipse', cx=38, cy=66, rx=33, ry=56, a=0.40, back=True)),
}

def pg_to_his(cfg, pts):
    px0, py0 = cfg['panel'][:2]
    return [(px0 + x * S, py0 + y * S) for x, y in pts]

def prep_sprite(name, cfg):
    cfg = dict(cfg)
    cfg['drop'] = [pg_to_his(cfg, p) for p in cfg.get('drop', [])]
    c, B, gone, cr = prep(cfg)
    alpha, F, solid = classify(c, B, cfg, cr)
    sx0, sy0, sx1, sy1 = cfg['src']
    H, W = alpha.shape
    if cfg.get('soft'):
        sm = poly_mask(H, W, sx0, sy0, [pg_to_his(cfg, p) for p in cfg['soft']])
        halo = sm & ~solid
        alpha[halo] = 0
    if cfg.get('body'):
        # His character: only the ribbons (bright mint) and leaves passing in front of it are kept.
        bm = poly_mask(H, W, sx0, sy0, [pg_to_his(cfg, p) for p in cfg['body']])
        h, s = hue(c); L = lum(c)
        ribbon = (L >= 125) & (c[..., 1] - c[..., 0] >= 30) & (h >= 135) & (h <= 185)
        leafy = (L >= 100) & (h >= 70) & (h < 135) & (s > 0.25)
        keep = ribbon | leafy
        # Specks of his tinted character that happen to pass the test: keep only real strokes.
        lab, n = components(keep & bm)
        sizes = np.bincount(lab.ravel(), minlength=n + 1)
        keep_in = (keep & bm) & (sizes[lab] >= 6)
        # The ribbon's dark outline over the body: one pixel round what is kept.
        ring = dilate(keep_in, 1, N8) & bm & ~keep_in
        alpha[bm] = 0; solid[bm] = False
        alpha[keep_in] = 1; solid[keep_in] = True
        alpha[ring] = 1; solid[ring] = True
        F[ring] = OUTLINE_GUESS
        F[keep_in] = cr[keep_in]
    return c, B, alpha, F, solid

OUTLINE_GUESS = np.array([18.0, 41.0, 38.0])

def to_game2(cfg, alpha, F, solid, hx0=None, gw=None, sx=S):
    """Like to_game, but for a horizontal span starting at his x = hx0, gw game px wide, at scale sx."""
    px0, py0 = cfg['panel'][:2]
    sx0, sy0, sx1, sy1 = cfg['src']
    gt = math.floor((sy0 - py0) / S); gb = math.ceil((sy1 - py0) / S)
    H = gb - gt
    ox, oy = hx0 - sx0, py0 + gt * S - sy0
    pad = 16
    def rs(a):
        z = np.pad(a.astype(np.float32), pad)
        return np.asarray(Image.fromarray(z, 'F').resize((gw, H), Image.BOX, box=(ox + pad, oy + pad, ox + pad + gw * sx, oy + pad + H * S))).astype(np.float64)
    sm = solid.astype(np.float64)
    Cs = rs(sm); Ps = np.stack([rs(F[..., k] * sm) for k in range(3)], -1)
    tr = alpha * (1 - sm); At = rs(tr); Pt = np.stack([rs(F[..., k] * tr) for k in range(3)], -1)
    return Cs, Ps, At, Pt

def compose(Cs, Ps, At, Pt):
    H, W = Cs.shape
    out = np.zeros((H, W, 4))
    op = Cs >= 0.5
    out[op, :3] = Ps[op] / Cs[op, None]; out[op, 3] = 1
    tA = Cs + At
    t = ~op & (tA > 0.07)
    out[t, :3] = np.clip((Ps[t] + Pt[t]) / tA[t, None], 0, 255)
    out[t, 3] = np.minimum(tA[t], 0.9)
    return out

def fill_holes(img, max_px=12):
    """Small see-through gaps enclosed by his strokes become opaque in the colour they show over
    his fill: inside a mass of wind they are paint, not holes."""
    op = img[..., 3] >= 1
    tr = (img[..., 3] > 0) & ~op
    labs, n = components(~op, N4)
    if n == 0: return img
    sizes = np.bincount(labs.ravel(), minlength=n + 1)
    edge = np.zeros(n + 1, bool)
    edge[np.unique(labs[0, :])] = True; edge[np.unique(labs[-1, :])] = True
    edge[np.unique(labs[:, 0])] = True; edge[np.unique(labs[:, -1])] = True
    # Only gaps that are see-through all the way (no fully clear pixel) are filled.
    clear_in = np.zeros(n + 1, bool)
    clear_in[np.unique(labs[(img[..., 3] == 0) & ~op])] = True
    sel = (sizes[labs] <= max_px) & ~edge[labs] & ~clear_in[labs] & tr
    out = img.copy()
    a = img[sel][:, 3:4]
    out[sel, :3] = img[sel][:, :3] * a + FILL * (1 - a)
    out[sel, 3] = 1
    return out

# --- pass 1: every sprite at game scale, unquantized -------------------------------------------------
stage = {}
for name, cfg in SPRITES.items():
    c, B, alpha, F, solid = prep_sprite(name, cfg)
    img, org = to_game(cfg, alpha, F, solid)
    img = fill_holes(img)
    sx0, sy0, sx1, sy1 = cfg['src']
    raw = IM[sy0:sy1, sx0:sx1]
    rawc, _ = to_game(cfg, np.ones(raw.shape[:2]), raw, np.ones(raw.shape[:2], bool))
    stage[name] = dict(img=img, org=org, raw=rawc[..., :3], cfg=cfg, src=(c, B, alpha, F, solid))

# His glow colours: the see-through pixels of his halo round his character in the blast panel.
def halo_colours():
    cfg = SPRITES['blast']
    c, B, gone, cr = prep(dict(cfg, drop=[]))
    alpha, F, solid = classify(c, B, cfg, cr)
    sx0, sy0 = cfg['src'][:2]
    H, W = alpha.shape
    m = poly_mask(H, W, sx0, sy0, [pg_to_his(cfg, rect(146, 52, 164, 140))]) & ~solid & (alpha > 0.08)
    return F[m], alpha[m]
HALO_F, HALO_A = halo_colours()
print('halo samples', len(HALO_F), 'median colour', np.median(HALO_F, 0).round(), 'alpha max', HALO_A.max().round(2))

def synth_glow(spec, W, H, org):
    """A soft glow in his halo colour: alpha falls off like his halo (strongest at the middle)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    gx, gy = xx + org[0] + 0.5, yy + org[1] + 0.5
    if spec['kind'] == 'ellipse':
        r = np.hypot((gx - spec['cx']) / spec['rx'], (gy - spec['cy']) / spec['ry'])
    else:
        ax, ay, bx, by = spec['x0'], spec['y0'], spec['x1'], spec['y1']
        vx, vy = bx - ax, by - ay
        t = np.clip(((gx - ax) * vx + (gy - ay) * vy) / (vx * vx + vy * vy), 0, 1)
        r = np.hypot(gx - (ax + t * vx), gy - (ay + t * vy)) / spec['r']
    a = spec['a'] * np.clip(1 - r, 0, 1) ** 1.7
    out = np.zeros((H, W, 4))
    # Brighter green near the middle, deeper teal at the rim (his halo).
    med = np.median(HALO_A)
    col = np.median(HALO_F[HALO_A >= med], 0)
    rim = np.median(HALO_F[HALO_A <= med], 0)
    k = np.clip(1 - r, 0, 1)[..., None]
    out[..., :3] = rim * (1 - k) + col * k
    out[..., 3] = a
    out[a < 0.03] = 0
    return out

for name, st in stage.items():
    spec = st['cfg'].get('glow')
    if spec:
        H, W = st['img'].shape[:2]
        st['glow'] = synth_glow(spec, W, H, st['org'])

# --- the stream: a seamless 64 px tile and the head, both from his jet -------------------------------
# His jet runs left to right through three crescents to a flaring head. The tile is his jet from
# x 64 to 132 (panel coords), the stretch round his second crescent, pressed to 64 px (x 0.94) so
# a crescent comes every 64 px; its last 8 columns are blended into its first 8 so it wraps. The
# head is his jet from x 132 on: the big crescent, the head crescent and the spray. In the head,
# everything behind the big crescent is the scrolling tile pattern (so the tile joins the head in
# every frame), and the crescent hides the seam.
TILE_X0, TILE_X1, BLEND = 64, 132, 8
def stream_parts():
    st = stage['stream']; cfg = st['cfg']
    c, B, alpha, F, solid = st['src']
    px0 = cfg['panel'][0]
    sxs = S * (TILE_X1 - TILE_X0) / 64
    Cs, Ps, At, Pt = to_game2(cfg, alpha, F, solid, hx0=px0 + TILE_X0 * S, gw=64 + BLEND, sx=sxs)
    # Premultiplied blend of the wrap columns.
    pre = lambda C, P_, A, Pt_: (np.concatenate([P_ + Pt_, (C + A)[..., None]], -1))
    E = np.concatenate([Ps + Pt, np.minimum(Cs + At, 1)[..., None]], -1)
    solidf = Cs
    tile = E[:, :64].copy(); sol = solidf[:, :64].copy()
    for x in range(BLEND):
        w = (x + 0.5) / BLEND
        tile[:, x] = E[:, 64 + x] * (1 - w) + E[:, x] * w
        sol[:, x] = solidf[:, 64 + x] * (1 - w) + solidf[:, x] * w
    H = tile.shape[0]
    out = np.zeros((H, 64, 4))
    a = tile[..., 3]
    op = sol >= 0.5
    out[..., :3] = np.where(a[..., None] > 1e-6, tile[..., :3] / np.maximum(a, 1e-6)[..., None], 0)
    out[..., 3] = np.where(op, 1, np.where(a > 0.07, np.minimum(a, 0.9), 0))
    out[~op & (a <= 0.07)] = 0
    head_w = math.ceil((cfg['src'][2] - px0) / S) - TILE_X1
    Cs, Ps, At, Pt = to_game2(cfg, alpha, F, solid, hx0=px0 + TILE_X1 * S, gw=head_w)
    head = compose(Cs, Ps, At, Pt)
    return out, head
tile_img, head_img = stream_parts()
tile_img, head_img = fill_holes(tile_img), fill_holes(head_img)
gt_stream = stage['stream']['org'][1]
C_BIG = [(141, 3), (150, 3), (160, 9), (167, 18), (170, 28), (170, 38), (166, 48), (158, 57), (150, 61), (144, 60), (149, 53),
         (153, 44), (154, 36), (154, 28), (152, 19), (147, 10)]
print('stream tile', tile_img.shape[1], 'x', tile_img.shape[0], 'head', head_img.shape[1], 'x', head_img.shape[0])

# --- palettes: one per sprite, from his own pixels of that panel ------------------------------------------
# His panels differ in hue (the bolt is a deep emerald, the breath a pale aqua, the walls a grey
# teal), so each sprite gets its own palette sampled from its panel: opaque colours per family
# (wind, leaves, dust) refined with k-means in Lab, the outline colour of each family (the median
# of his darkest pixels of it), and see-through colours at six alpha steps.
def family(rgb):
    """0 wind (teal / mint / white), 1 leaf (yellow-green), 2 dust (brown / grey)."""
    h, s = hue(rgb)
    leaf = (h >= 66) & (h < 135) & (s >= 0.2)
    dust = ((h < 66) | (h >= 260)) & (s >= 0.04)
    return np.where(leaf, 1, np.where(dust, 2, 0))

def lab(rgb):
    """sRGB (0-255) to CIELAB, for matching colours the way the eye does."""
    c = np.asarray(rgb, np.float64) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def median_cut(cols, n):
    cols = np.asarray(cols, np.float64)
    if len(cols) == 0: return np.zeros((0, 3))
    q = Image.fromarray(np.clip(cols, 0, 255).astype(np.uint8).reshape(1, -1, 3), 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:n * 3], np.float64).reshape(-1, 3)
    return pal[np.unique(np.asarray(q).ravel())]

def kmeans_lab(cols, init, iters=10, fixed=0):
    """Refines a palette (median cut) with k-means in Lab; returns RGB means of his pixels. The
    first `fixed` entries (his extremes: the deepest shade, the brightest highlight) stay put, so
    averaging does not wash them out."""
    cols = np.asarray(cols, np.float64)
    if len(cols) == 0 or len(init) == 0: return init
    if len(cols) > 40000:
        cols = cols[np.linspace(0, len(cols) - 1, 40000).astype(int)]
    L = lab(cols); pal = init.copy()
    for _ in range(iters):
        d = ((L[:, None, :] - lab(pal)[None]) ** 2).sum(-1)
        a = d.argmin(1)
        for k in range(fixed, len(pal)):
            m = a == k
            if m.any(): pal[k] = cols[m].mean(0)
    return pal

def extremes(cols, q=1.5):
    """His extreme colours of a family: the darkest, the brightest, and the most saturated of his
    dark shades and of his mid tones (medians of small slices, so JPEG specks do not count)."""
    lc = lum(cols); sat = cols.max(-1) - cols.min(-1)
    lo = np.median(cols[lc <= np.percentile(lc, q)], 0)
    hi = np.median(cols[lc >= np.percentile(lc, 100 - q)], 0)
    out = [lo, hi]
    for a, b in ((5, 30), (30, 70)):
        band = (lc >= np.percentile(lc, a)) & (lc <= np.percentile(lc, b))
        if band.sum() > 40:
            sb = sat[band]
            out.append(np.median(cols[band][sb >= np.percentile(sb, 95)], 0))
    return np.array(out)

ALEV = np.array([0.12, 0.24, 0.36, 0.5, 0.64, 0.78])
GLEV = np.array([0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.36, 0.42])
FAM_N = {0: 26, 1: 8, 2: 7}

class Palette:
    def __init__(self, imgs, extra_tr=()):
        opq = np.concatenate([im_[im_[..., 3] >= 1][:, :3] for im_ in imgs])
        trn = np.concatenate([im_[(im_[..., 3] > 0) & (im_[..., 3] < 1)][:, :3] for im_ in imgs] + [e[e[..., 3] > 0][:, :3] for e in extra_tr])
        fam = family(opq)
        rgb, fams, self.outline = [], [], {}
        for f, n in FAM_N.items():
            cols = opq[fam == f]
            if len(cols) < 12: continue
            n = min(n, max(3, len(cols) // 16))
            ex = extremes(cols) if n >= 6 else np.zeros((0, 3))
            pal = kmeans_lab(cols, np.concatenate([ex, median_cut(cols, n - len(ex))]), fixed=len(ex))
            pal = pal[np.argsort(lum(pal))]
            lc = lum(cols)
            if f == 2: lc = np.where(lc < 52, 999, lc)  # his dust edge is a dark brown, not the fill
            ol = np.median(cols[lc <= np.percentile(lc, 4)], 0)
            self.outline[f] = len(rgb)
            rgb.append(ol); fams.append(f)
            for p_ in pal: rgb.append(p_); fams.append(f)
        self.op = np.array(rgb); self.fam = np.array(fams)
        self.tr = kmeans_lab(trn, median_cut(trn, 6)) if len(trn) else np.zeros((0, 3))
        self.tr = self.tr[np.argsort(lum(self.tr))]
        self.n_op = len(self.op)
        entries = [tuple(int(round(v)) for v in c_) + (255,) for c_ in self.op]
        for fc in self.tr:
            for a in ALEV:
                entries.append(tuple(int(round(v)) for v in fc) + (int(round(a * 255)),))
        # His glow: two colours (middle and rim) at finer alpha steps, so it falls off softly.
        self.n_tr = len(entries)
        self.glow = np.zeros((0, 3))
        if len(extra_tr):
            gl = np.concatenate([e[e[..., 3] > 0] for e in extra_tr])
            if len(gl):
                self.glow = gl[:, :3][np.argsort(gl[:, 3])][[0, -1]]
                for fc in self.glow:
                    for a in GLEV:
                        entries.append(tuple(int(round(v)) for v in fc) + (int(round(a * 255)),))
        self.entries = entries
        self.arr = np.array(entries, np.float64)

    def nearest(self, cols, pal):
        d = ((lab(cols)[:, None, :] - lab(pal)[None, :, :]) ** 2).sum(-1)
        return d.argmin(1)

    def quantize(self, im_):
        H, W = im_.shape[:2]
        idx = np.zeros((H, W), np.int32)
        op = im_[..., 3] >= 1
        if op.any():
            # Each pixel takes the nearest colour of its own family (leaves stay yellow-green).
            cols = im_[op][:, :3]
            fam = family(cols)
            out = self.nearest(cols, self.op)
            for f in np.unique(fam):
                ids = np.nonzero(self.fam == f)[0]
                if len(ids) == 0: continue
                m = fam == f
                out[m] = ids[self.nearest(cols[m], self.op[ids])]
            idx[op] = out + 1
        tr = (im_[..., 3] > 0) & ~op
        if tr.any() and len(self.tr):
            fi = self.nearest(im_[tr][:, :3], self.tr)
            ai = np.abs(im_[tr][:, 3][:, None] - ALEV[None]).argmin(1)
            idx[tr] = self.n_op + fi * len(ALEV) + ai + 1
        return idx

    def quantize_glow(self, im_):
        idx = np.zeros(im_.shape[:2], np.int32)
        on = im_[..., 3] > 0
        if on.any() and len(self.glow):
            fi = self.nearest(im_[on][:, :3], self.glow)
            ai = np.abs(im_[on][:, 3][:, None] - GLEV[None]).argmin(1)
            idx[on] = self.n_tr + fi * len(GLEV) + ai + 1
        return idx

    def is_op(self, idx): return (idx > 0) & (idx <= self.n_op)
    def rgb(self, idx): return self.arr[np.maximum(idx - 1, 0), :3]
    def fam_of(self, idx): return np.where(self.is_op(idx), self.fam[np.clip(idx - 1, 0, self.n_op - 1)], -1)

    def clean(self, idx):
        """Specks dropped, and dark silhouette edges set to the tinted outline of what they surround."""
        H, W = idx.shape
        op = self.is_op(idx)
        nb = sum(shift(op, dy, dx).astype(int) for dy, dx in N8)
        L = lum(self.rgb(idx))
        idx = idx.copy()
        idx[op & (nb == 0) & (L < 90)] = 0
        op = self.is_op(idx)
        op = self.is_op(idx)
        # Silhouette edges: next to a clear or faint pixel (not next to a dense veil inside the art).
        faint = ~op & (self.arr[np.maximum(idx - 1, 0), 3] * (idx > 0) < 0.3 * 255)
        edge = np.zeros_like(op)
        for dy, dx in N4:
            edge |= op & shift(faint, dy, dx)
        edge[0, :] |= op[0, :]; edge[-1, :] |= op[-1, :]; edge[:, 0] |= op[:, 0]; edge[:, -1] |= op[:, -1]
        L = lum(self.rgb(idx))
        fam_px = self.fam_of(idx)
        dark_edge = edge & (L < 62)
        for f, oi in self.outline.items():
            idx[dark_edge & (fam_px == f)] = oi + 1
        return idx

    def leaves(self, idx, max_px=60):
        """Loose leaves: clumps of yellow-green with their dark outline that do not lie on a stroke
        (most of what borders them is clear or dark), so they can be moved on their own."""
        op = self.is_op(idx)
        fam_px = self.fam_of(idx)
        L = lum(self.rgb(idx))
        seed = op & (fam_px == 1) & (L >= 60)
        labs, n = components(seed, N8)
        out = []
        taken = np.zeros_like(op)
        for k in range(1, n + 1):
            m = labs == k
            cnt = m.sum()
            if cnt < 2 or cnt > max_px: continue
            # The leaf: its bright part, the rest of its yellow-green and its dark outline.
            reg = m | (dilate(m, 2, N8) & op & ((fam_px == 1) | (L < 60)) & ~taken)
            reg &= dilate(m, 2, N8)
            ring = dilate(reg, 2, N8) & ~reg
            on_stroke = (ring & op & (fam_px == 0) & (L >= 85)).sum() / max(1, ring.sum())
            if on_stroke > 0.2: continue
            taken |= reg
            out.append(reg)
        return out, taken

def rle(arr):
    flat = arr.ravel(); out = bytearray(); i = 0
    while i < len(flat):
        v = int(flat[i]); n = 1
        while i + n < len(flat) and flat[i + n] == v and n < 255: n += 1
        out += bytes((n, v)); i += n
    return base64.b64encode(bytes(out)).decode('ascii')

def piece(idx, mask=None):
    a = idx if mask is None else np.where(mask, idx, 0)
    ys, xs = np.nonzero(a)
    if len(ys) == 0: return None
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    return {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'rle': rle(a[y0:y1, x0:x1])}

# --- pass 2: quantize, clean, cut into pieces --------------------------------------------------------------
RESULT, QUANT, PALS = {}, {}, {}
for name, st in stage.items():
    if name == 'stream': continue
    cfg = st['cfg']; org = st['org']
    pal = Palette([st['img']], [st['glow']] if 'glow' in st else [])
    PALS[name] = pal
    idx = pal.clean(pal.quantize(st['img']))
    H, W = idx.shape
    lv, taken = pal.leaves(idx)
    main = np.where(taken, 0, idx)
    pieces = {}
    used = np.zeros((H, W), bool)
    for pname, polys in cfg.get('pieces', {}).items():
        m = poly_mask(H, W, org[0], org[1], polys) & ~used & (main > 0)
        used |= m
        p_ = piece(main, m)
        if p_: pieces[pname] = p_
    rest = (main > 0) & ~used
    if cfg.get('dust'):
        fam_px = pal.fam_of(main)
        dm = rest & (fam_px == 2)
        dm |= rest & dilate(dm, 1) & (lum(pal.rgb(main)) < 60) & pal.is_op(main) & (fam_px != 1)
        p_ = piece(main, dm)
        if p_: pieces['dust'] = p_
        rest &= ~dm
    p_ = piece(main, rest)
    if p_: pieces['main'] = p_
    if 'glow' in st:
        p_ = piece(pal.quantize_glow(st['glow']))
        if p_: pieces['glow'] = p_
    ax, ay = cfg['anchor']
    RESULT[name] = {'w': W, 'h': H, 'anchor': [int(ax - org[0]), int(ay - org[1])], 'pal': name, 'pieces': pieces,
                    'leaves': [piece(idx, m) for m in lv]}
    QUANT[name] = (idx, main, lv, pal)
    print(f'{name:11s} {W}x{H} anchor {RESULT[name]["anchor"]} colours {len(pal.entries)} pieces {sorted(pieces)} leaves {len(lv)}')

# The stream tile and head share one palette.
pal = Palette([tile_img, head_img]); PALS['stream'] = pal
tidx = pal.clean(pal.quantize(tile_img))
hidx = pal.clean(pal.quantize(head_img))
H = hidx.shape[0]
cb = poly_mask(H, hidx.shape[1], TILE_X1, gt_stream, [C_BIG])
hl, htaken = pal.leaves(hidx)
hmain = np.where(htaken, 0, hidx)
back = [int(np.nonzero(cb[y])[0].min()) if cb[y].any() else 0 for y in range(H)]
RESULT['stream'] = {'w': 64, 'h': tidx.shape[0], 'anchor': [32, int(32 - gt_stream)], 'pal': 'stream', 'pieces': {'tile': piece(tidx)}, 'leaves': []}
RESULT['stream_head'] = {'w': hidx.shape[1], 'h': H, 'anchor': [32, int(32 - gt_stream)], 'pal': 'stream',
                         'pieces': {'head': piece(hmain, ~cb), 'crescent': piece(hmain, cb)},
                         'leaves': [piece(hidx, m) for m in hl], 'back': back}
QUANT['stream'] = (tidx, tidx, [], pal)
QUANT['stream_head'] = (hidx, hmain, hl, pal)
print('stream tile 64x%d, head %dx%d leaves %d colours %d' % (tidx.shape[0], hidx.shape[1], H, len(hl), len(pal.entries)))

# --- previews -------------------------------------------------------------------------------------------
def render(idx, pal):
    rgba = np.zeros(idx.shape + (4,))
    on = idx > 0
    rgba[on] = pal.arr[idx[on] - 1]
    return rgba

def over(rgba, bg):
    a = rgba[..., 3:] / 255
    return rgba[..., :3] * a + np.array(bg, np.float64) * (1 - a)

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    for name, (idx, main, lv, pal) in QUANT.items():
        tiles = []
        if name in stage and name != 'stream':
            tiles.append(stage[name]['raw'])
        rgba = render(idx, pal)
        tiles += [over(rgba, (32, 32, 42)), over(rgba, (92, 124, 66))]
        lvm = np.zeros(idx.shape, bool)
        for m in lv: lvm |= m
        dbg = over(render(main, pal), (32, 32, 42)); dbg[lvm] = (255, 0, 255)
        if name in stage and 'glow' in stage[name]:
            tiles.append(over(render(pal.quantize_glow(stage[name]['glow']), pal), (32, 32, 42)))
        tiles.append(dbg)
        Hh = max(t.shape[0] for t in tiles)
        row = np.concatenate([np.pad(t, ((0, Hh - t.shape[0]), (0, 3), (0, 0))) for t in tiles], 1)
        k = 3 if row.shape[1] < 500 else 2
        Image.fromarray(np.clip(row, 0, 255).astype(np.uint8)).resize((row.shape[1] * k, Hh * k), Image.NEAREST).save(os.path.join(PREVIEW, f'q-{name}.png'))
