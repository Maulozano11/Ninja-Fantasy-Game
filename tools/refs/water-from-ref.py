"""Cuts the owner's paint-over of the water sheet into game-scale key frames for vfx_water_v3.

    python3 -I tools/refs/water-from-ref.py docs/reference/water-set-owner-reference.jpg \
        tools/world-sprites/vfx-water-v3-refdata.ts <character.png> [reviewDir]

<character.png> is our scale character at 1x (kit characterRef(), 128x128, feet at (64, 120)); it
is used to split the aura into the layers behind and in front of the character.

The owner wants his reference copied as exactly as possible, so every key frame is HIS pixels:

* Scale. His sheet is a paint-over of our 2x water sheet brought down to about 1x, a little more in
  height than in width. Our character fits his best at 0.925 across and 0.912 down (template match
  on his characters; his panels give the same factors against our frame sizes), so one of his
  pixels is 0.925 x 0.912 game pixels. Each sprite is placed by an anchor measured on his art (the
  orb's centre, the pool's centre, the ground line his character stands on, his cone's tip...).
* Clean-up. His panel background, his characters (and the teal light round them), the labels and
  the panel borders are removed; art that spills over a panel border is read against the page
  colour there and the border line is filled from both sides. JPEG noise is smoothed before every
  decision, and colours are read from a lightly sharpened copy (the JPEG washes out his crisp
  edges and saturated cyans).
* Classes, decided at his resolution, then area-averaged (box filter) to game scale:
    body    - water, foam and spray: opaque, quantized to one palette for the set (median cut of
              his own pixels inside the water);
    outline - his dark navy rims: a clean 1 px tinted outline wherever his art has a rim (his rim
              colour, never black); a pixel his rim dominates is outline;
    glow    - his soft haze (the aura's halo, the hit's bloom, the multi's pale trails): kept
              SEMI-TRANSPARENT, un-blended from his background (colour to alpha), so it
              composites back to his look on any map.
* Pieces. Each key frame is split into pieces the generator animates on their own: 'drops'
  (loose droplets and spray), 'glow', named pieces per sprite (the blast's pool and crown) and the
  rest ('main').
* The stream tile is the 64 px of his jet that end exactly where his crest head begins, closed
  into a loop by a seam cut where its two ends match best; the head is his crest, so a line of
  tiles plus the head is his picture.
* The aura is split for drawing round a character: 'aura_back' (behind) is all his water, with the
  part our character hides filled in from round it; 'aura' (in front) is the bright streaks and
  the splash his picture puts over the figure. The veil of water over the figure is drawn by the
  generator; its colours come from his picture (his tint fitted over our character, and his bright
  water round the figure).
The result is indexed run-length data (tools/world-sprites/vfx-water-v3-refdata.ts) that
tools/world-sprites/vfx-water-v3.ts decodes and animates. With a review directory it also writes
his crops at game scale (for the comparison sheets) and before/after previews. Deterministic.
"""
import base64
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

REF, OUT_TS, CHAR_PNG = sys.argv[1], sys.argv[2], sys.argv[3]
REVIEW = sys.argv[4] if len(sys.argv) > 4 else None

IM0 = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
H0, W0 = IM0.shape[:2]
SX, SY = 0.925, 0.912             # game px per his px, across and down
BG = np.array([32.0, 33.0, 43.0])    # his panel fill
PAGE = np.array([21.0, 21.0, 29.0])  # his page colour, outside the panels
CHAR = np.asarray(Image.open(CHAR_PNG).convert('RGBA')).astype(np.float64)  # feet at (64, 120)

# His panels: the border lines (left, top, right, bottom), measured on his sheet.
PANELS = {
    'bolt': (9, 41, 82, 112), 'stream': (275, 41, 520, 112), 'breath': (533, 41, 640, 112), 'sphere': (652, 41, 724, 112),
    'slash': (9, 159, 78, 234), 'multi': (124, 159, 198, 229), 'hit': (240, 159, 318, 238), 'blast': (356, 159, 621, 324),
    'wall': (9, 354, 375, 495), 'wall_diag': (387, 354, 689, 647), 'wall_depth': (9, 677, 124, 1011), 'aura': (218, 677, 305, 817),
}

# --- small image tools -----------------------------------------------------------------------

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def lum(c):
    return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]


def gauss(a, s):
    """Separable gaussian blur (edges clamped)."""
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2)
    k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim
        pad[ax] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim
            sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out


def shift(m, dy, dx, wrap=False):
    """out[y, x] = m[y - dy, x - dx]; clear at the edges (or wrapped across x)."""
    if wrap:
        m = np.roll(m, dx, 1)
        dx = 0
    H, W = m.shape[:2]
    out = np.zeros_like(m)
    out[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return out


def dilate(m, n=1, wrap=False, nb=N4):
    for _ in range(n):
        o = m.copy()
        for dy, dx in nb:
            o |= shift(m, dy, dx, wrap)
        m = o
    return m


def components(m, nb=N8, wrap=False):
    H, W = m.shape
    lab = np.zeros((H, W), np.int32)
    n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1
                st = [(y, x)]
                lab[y, x] = n
                while st:
                    a, b = st.pop()
                    for dy, dx in nb:
                        u, v = a + dy, b + dx
                        if wrap:
                            v %= W
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                            lab[u, v] = n
                            st.append((u, v))
    return lab, n


def poly_mask(h, w, polys, x0=0.0, y0=0.0, sx=1.0, sy=1.0):
    """Polygons in his coordinates rasterized on a grid whose (0, 0) is his (x0, y0), with sx, sy
    grid pixels per his pixel."""
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([((x - x0) * sx, (y - y0) * sy) for x, y in p], fill=255)
    return np.asarray(m) > 0


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def c2a(c, bg=BG):
    """Colour-to-alpha (lighter than the background only): the least alpha with
    c = a*F + (1-a)*bg."""
    d = np.maximum(c - bg, 0)
    a = np.clip((d / (255 - bg)).max(-1), 0, 1)
    F = bg + d / np.maximum(a, 1e-6)[..., None]
    return a, np.clip(F, 0, 255)


# --- his sheet, flattened onto one background ------------------------------------------------

def flatten():
    """Inside his panels the art lies on BG, outside on PAGE, and the 1 px panel borders (blurred
    to 3 px by the JPEG) cut through it where it spills over. Everything becomes 'difference from
    the background it lies on', put back on BG, with each border band filled from both sides."""
    bgmap = np.zeros((H0, W0, 3)) + PAGE
    for x0, y0, x1, y1 in PANELS.values():
        bgmap[y0 + 1:y1, x0 + 1:x1] = BG
    d = IM0 - bgmap
    dd = d.copy()
    band = np.zeros((H0, W0), bool)
    for x0, y0, x1, y1 in PANELS.values():
        # (The top line is filled from inside only: his labels sit right above it.)
        dd[y0 - 1:y0 + 2, x0 - 1:x1 + 2] = d[y0 + 2, x0 - 1:x1 + 2][None]
        dd[y1 - 1:y1 + 2, x0 - 1:x1 + 2] = ((d[y1 - 2, x0 - 1:x1 + 2] + d[y1 + 2, x0 - 1:x1 + 2]) / 2)[None]
        band[y0 - 1:y0 + 2, x0 - 1:x1 + 2] = band[y1 - 1:y1 + 2, x0 - 1:x1 + 2] = True
        for x in (x0, x1):
            dd[y0 - 1:y1 + 2, x - 1:x + 2] = ((d[y0 - 1:y1 + 2, x - 2] + d[y0 - 1:y1 + 2, x + 2]) / 2)[:, None]
            band[y0 - 1:y1 + 2, x - 1:x + 2] = True
    # Faint differences on the page or a border band (JPEG ringing round the lines) are noise.
    weak = (np.abs(dd).sum(-1) < 30) & (band | (bgmap[..., 0] == PAGE[0]))
    dd[weak] = 0
    return np.clip(BG + dd, 0, 255)


FLAT = flatten()
SMOOTH = gauss(FLAT, 0.5)
SHARP = np.clip(FLAT + 0.6 * (FLAT - gauss(FLAT, 0.9)), 0, 255)

# --- the sprites ------------------------------------------------------------------------------
# anchor: the anchor in HIS coordinates (projectile core; ground centre; feet; the breath's origin).
# area:   polygons (his coordinates) holding his art for this sprite; the rest is ignored.
# drop:   polygons removed first (his characters, labels, stray marks).
# teal:   polygons where the teal light round his character is removed (the generator re-makes the
#         effect's own glow).
# glow:   keep his soft haze as semi-transparent glow; halo: where even strong haze is glow.
# mist:   polygons where pale grey streaks are see-through trails (no rim).
# pieces: [(name, polygons)]: named pieces split off 'main' (first match wins).
# drops:  the largest loose bit (px at game scale) still counted as a droplet.

SPRITES = {
    'bolt': dict(anchor=(62, 78), area=[rect(10, 42, 82, 112)], drops=24, pad=(6, 2, 0, 3)),
    'breath': dict(anchor=(536, 77), area=[rect(534, 42, 640, 112)], drops=24, breath=True, pad=(0, 3, 6, 4)),
    'sphere': dict(anchor=(689.5, 77.5), area=[rect(653, 42, 724, 112)], drops=24),
    'slash': dict(anchor=(46, 198.5), area=[rect(10, 160, 78, 234)], drops=12),
    'multi': dict(anchor=(164.5, 195), area=[rect(125, 160, 198, 229)], drops=6, glow=True,
                  mist=[rect(125, 160, 163, 229)]),
    'hit': dict(anchor=(281, 200), area=[rect(241, 160, 318, 238)], drops=30, glow=True, pad=(8, 8, 8, 10)),
    'blast': dict(anchor=(456, 293), area=[rect(357, 160, 560, 324)], drops=30, pad=(14, 2, 14, 8),
                  drop=[rect(548, 190, 622, 325)], teal=[rect(480, 200, 622, 325)],
                  pieces=[('crown', [[(415, 160), (500, 160), (500, 214), (472, 214), (462, 222), (446, 222), (436, 214), (415, 214)]]),
                          ('pool', [[(356, 262), (420, 262), (425, 276), (440, 284), (472, 284), (490, 276), (494, 262), (560, 262), (560, 324), (356, 324)]])]),
    'wall': dict(anchor=(161, 486.8), area=[rect(10, 355, 312, 495)], drops=30,
                 drop=[rect(305, 380, 375, 495)]),
    'wall_diag': dict(anchor=(505.9, 564.6), area=[rect(388, 355, 640, 647)], drops=30,
                      drop=[rect(628, 450, 689, 647)], teal=[rect(560, 420, 689, 647)]),
    'wall_depth': dict(anchor=(34, 906.2), area=[rect(10, 678, 80, 1011)], drops=30,
                       drop=[[(70, 800), (125, 800), (125, 925), (62, 925), (62, 872), (66, 858), (70, 840)]],
                       teal=[rect(40, 820, 125, 940)]),
    'aura': dict(anchor=(262.3, 800.5), area=[rect(205, 680, 320, 817)], drops=30, aura=True, glow=True,
                 halo=[rect(200, 670, 330, 830)]),
    # The stream: his jet, the tile ending where his crest head begins (the anchor's x), centred
    # on the anchor's y.
    'stream': dict(anchor=(457.6, 76.5), area=[rect(276, 42, 520, 112)], drops=30, stream=True, head_w=72),
}
MARGIN = 4


def his_box(cfg, W, H, ax, ay):
    """His rectangle (float) covered by a W x H game frame with the anchor at (ax, ay)."""
    hx, hy = cfg['anchor']
    return (hx - ax / SX, hy - ay / SY, hx + (W - ax) / SX, hy + (H - ay) / SY)


def resample(arr, box, W, H, P=48):
    """Box-filters an HxW(xC) array of his sheet onto a W x H game grid covering `box` (the sheet
    is padded with its edge, so a frame may reach past the sheet's border)."""
    if arr.ndim == 2:
        a = np.pad(arr.astype(np.float32), P, mode='edge')
        b = (box[0] + P, box[1] + P, box[2] + P, box[3] + P)
        return np.asarray(Image.fromarray(a, 'F').resize((W, H), Image.BOX, box=b), np.float64)
    return np.stack([resample(arr[..., k], box, W, H, P) for k in range(arr.shape[2])], -1)


def classify_his(cfg):
    """Class maps at his resolution over the whole sheet, limited to the sprite's area."""
    c = SMOOTH
    keep = poly_mask(H0, W0, cfg['area'])
    if cfg.get('drop'):
        keep &= ~poly_mask(H0, W0, cfg['drop'])
    if cfg.get('teal'):
        # The teal light round his character is greener than any of his water (whose blue always
        # leads its green), so it goes.
        tz = poly_mask(H0, W0, cfg['teal'])
        keep &= ~(tz & (c[..., 2] - c[..., 1] < 16) & (lum(c) < 150))
    L = lum(c)
    dist = np.sqrt(((c - BG) ** 2).sum(-1))
    art = keep & ((L >= 95) | (dist >= 22))
    # His rims and dark strokes: deep navy, darker than the water. Read on the unsmoothed sheet
    # too, where a 1 px rim is still dark (smoothing mixes it into the bright core beside it).
    Lr = lum(FLAT)
    dr = np.sqrt(((FLAT - BG) ** 2).sum(-1))
    outline = keep & (((Lr < 26) & (dr >= 14)) | ((Lr < 44) & (FLAT[..., 0] < 40) & (dr >= 22)) | (art & (L < 44) & (c[..., 0] < 40)))
    art |= outline
    a, F = c2a(c)
    glow = (keep & ~art & (a >= 0.035)) if cfg.get('glow') else np.zeros_like(art)
    if cfg.get('mist'):
        mz = poly_mask(H0, W0, cfg['mist'])
        grey = mz & art & ~outline & ((c.max(-1) - c.min(-1)) < 60) & (L < 150)
        # The rims round the trails go too, unless they also edge a blade.
        blade = art & ~outline & ~grey
        outline &= ~(mz & ~dilate(blade, 2))
        art &= ~(grey | (mz & ~outline & ~blade))
        glow |= grey
    body = art & ~outline
    if cfg.get('halo'):
        # Round the aura his haze is strong; what can be reached from outside the art without
        # crossing his bright water is haze (glow), except the dark rim right against the water.
        halo = keep & poly_mask(H0, W0, cfg['halo'])
        y0, y1 = np.nonzero(halo.any(1))[0][[0, -1]]
        x0, x1 = np.nonzero(halo.any(0))[0][[0, -1]]
        bright = (L >= 85)[y0:y1 + 1, x0:x1 + 1]
        sub = ~dilate(bright) & halo[y0:y1 + 1, x0:x1 + 1]
        lab, n = components(sub, nb=N4)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        reach = np.zeros_like(halo)
        reach[y0:y1 + 1, x0:x1 + 1] = dilate(np.isin(lab, list(edge))) & ~bright
        rim_ok = dilate(keep & (L >= 85), nb=N8)
        hz = reach & ~(outline & rim_ok)
        body &= ~hz
        outline &= ~hz
        glow |= hz & (a >= 0.035)
    return dict(body=body, outline=outline, glow=glow, a=np.where(glow, a, 0), F=F)


def to_game(cfg, cls, W, H, ax, ay):
    box = his_box(cfg, W, H, ax, ay)
    B = resample(cls['body'].astype(np.float64), box, W, H)
    O = resample(cls['outline'].astype(np.float64), box, W, H)
    CB = resample(SHARP * cls['body'][..., None], box, W, H)
    col = CB / np.maximum(B, 1e-6)[..., None]
    A = resample(cls['a'], box, W, H)
    FA = resample(cls['F'] * cls['a'][..., None], box, W, H)
    gcol = FA / np.maximum(A, 1e-6)[..., None]
    return dict(B=B, O=O, col=col, A=A, gcol=gcol, box=box, his=resample(IM0, box, W, H), flat=resample(FLAT, box, W, H))


def bounds_game(cfg, cls):
    """The art's extent at game scale, relative to the anchor."""
    m = cls['body'] | cls['outline'] | (cls['a'] > 0.06)
    ys, xs = np.nonzero(m)
    hx, hy = cfg['anchor']
    return ((xs.min() - hx) * SX, (ys.min() - hy) * SY, (xs.max() + 1 - hx) * SX, (ys.max() + 1 - hy) * SY)


def decide(g, wrap=False):
    """Body, outline and glow at game scale. A pixel is drawn where his art covers at least half
    of it; it is outline where his navy rim dominates it, and a clear pixel just outside the body
    becomes outline where his rim reaches into it, so the silhouette gets one clean 1 px rim
    wherever his art has one."""
    B, O, A = g['B'], g['O'], g['A']
    S = B + O
    drawn = S >= 0.5
    nb = sum(shift(drawn, dy, dx, wrap).astype(int) for dy, dx in N4)
    drawn |= (~drawn) & (nb >= 3) & (S >= 0.2)          # pinholes
    dark = drawn & (O > B)
    solid = drawn & ~dark
    ring = dilate(solid, wrap=wrap) & ~drawn & (O >= 0.12)
    rim = dark | ring
    # A rim pixel with no body near it is a speck of his dark noise.
    rim &= dilate(solid, 2, wrap=wrap, nb=N8)
    glow = (~drawn) & (~ring) & (A >= 0.05)
    return solid, rim, glow


def frame_for(cfg, cls):
    """The art's bounds plus MARGIN, plus `pad` (left, top, right, bottom) where the animation
    throws water further out than his picture."""
    x0, y0, x1, y1 = bounds_game(cfg, cls)
    pl, pt, pr, pb = cfg.get('pad', (0, 0, 0, 0))
    ax = int(np.ceil(-x0)) + MARGIN + pl
    ay = int(np.ceil(-y0)) + MARGIN + pt
    return ax + int(np.ceil(x1)) + MARGIN + pr, ay + int(np.ceil(y1)) + MARGIN + pb, ax, ay


# --- build every key frame (classes at game scale) --------------------------------------------

built = {}
for name, cfg in SPRITES.items():
    cls = classify_his(cfg)
    if cfg.get('stream'):
        # One strip: the tile's 64 columns, then the head; 72 rows (the tile uses the middle 64).
        W, H, ax, ay = 64 + cfg['head_w'], 72, 64, 36
    else:
        W, H, ax, ay = frame_for(cfg, cls)
    g = to_game(cfg, cls, W, H, ax, ay)
    solid, rim, glow = decide(g)
    built[name] = dict(cfg=cfg, cls=cls, g=g, W=W, H=H, ax=ax, ay=ay, solid=solid, rim=rim, glow=glow)

# --- the palette: one for the set, from his pixels ---------------------------------------------


def median_cut(cols, n):
    cols = np.asarray(np.clip(np.round(cols), 0, 255), np.uint8).reshape(1, -1, 3)
    q = Image.fromarray(cols, 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:n * 3], np.float64).reshape(-1, 3)
    used = np.unique(np.asarray(q).ravel())
    return pal[used]


def nearest(cols, pal):
    return ((cols[..., None, :] - pal) ** 2).sum(-1).argmin(-1)


inner = [b['cls']['body'] & ~dilate(~b['cls']['body']) for b in built.values()]
BODY = median_cut(np.concatenate([SHARP[m] for m in inner]), 24)
BODY = BODY[np.argsort(lum(BODY))]
OUTLINE = np.median(SMOOTH[np.logical_or.reduce([b['cls']['outline'] for b in built.values()])], 0)
print('his rim median', OUTLINE.round())


# --- the aura: behind and in front of the character --------------------------------------------

def char_in_frame(b):
    W, H, ax, ay = b['W'], b['H'], b['ax'], b['ay']
    ch = np.zeros((H, W, 4))
    for v in range(128):
        for u in range(128):
            x, y = ax + u - 64, ay + v - 120
            if 0 <= x < W and 0 <= y < H and CHAR[v, u, 3] > 0:
                ch[y, x] = CHAR[v, u]
    return ch


def aura_split(b):
    """Splits the aura's key frame into what goes behind our character and what goes over it."""
    W, H, ax, ay = b['W'], b['H'], b['ax'], b['ay']
    g = b['g']
    ch = char_in_frame(b)
    body = ch[..., 3] > 0
    zone = dilate(body)
    col = g['col']
    L = lum(col)
    # His bright streaks cross the figure's legs (higher up, his bright bits are the figure's own
    # lit edges seen through the water). A streak is a line brighter than what is round it.
    rows = np.arange(H)[:, None]
    Lf = lum(g['flat'])
    ridge = Lf - gauss(Lf, 2.0)
    streak = b['solid'] & zone & (rows >= ay - 30) & (ridge >= 12) & (Lf >= 125) & (col[..., 2] - col[..., 0] >= 40)
    feet = b['solid'] & zone & (rows >= ay - 4)
    front = streak | feet
    # Only whole streaks (a few loose bright pixels are the figure's highlights).
    lab, n = components(front)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    front &= sizes[lab] >= 10
    front_rim = b['rim'] & dilate(front, nb=N8) & zone
    # The veil: his picture over our character is (1 - a) * ours + a * W, fitted per band of rows
    # (least squares) on the character's pixels away from the streaks.
    veil = np.zeros((H, W))
    veil_col = np.zeros((H, W, 3))
    fit = body & ~dilate(front | front_rim, nb=N8)
    his = g['flat']
    for y0 in range(0, H, 6):
        m = fit[y0:y0 + 6]
        if m.sum() < 12:
            continue
        o = ch[y0:y0 + 6, :, :3][m]
        h = his[y0:y0 + 6][m]
        rows, rhs = [], []
        for k in range(3):
            e = np.zeros((len(o), 4))
            e[:, 0] = -o[:, k]
            e[:, 1 + k] = 1
            rows.append(e)
            rhs.append(h[:, k] - o[:, k])
        sol = np.linalg.lstsq(np.concatenate(rows), np.concatenate(rhs), rcond=None)[0]
        a = float(np.clip(sol[0], 0, 0.9))
        veil[y0:y0 + 6] = a
        veil_col[y0:y0 + 6] = np.clip(sol[1:] / max(a, 1e-3), 0, 255)
    print('aura veil per band', [round(float(veil[y, ax]), 2) for y in range(0, H, 6)])
    # The veil itself is drawn by the generator (a soft field round the body that breathes, so it
    # sits right on any figure); from his picture it takes its colours: his fitted water tint over
    # the body (deep) and his bright water just round the figure (the lighter rim).
    strong = veil >= 0.4
    deep = np.median(veil_col[strong], 0)
    ring = b['solid'] & dilate(zone, 6) & ~zone
    rc = col[ring]
    light = np.median(rc[lum(rc) >= np.percentile(lum(rc), 75)], 0)
    b['veil_info'] = {'deep': '#%02x%02x%02x' % tuple(int(round(v)) for v in deep),
                      'light': '#%02x%02x%02x' % tuple(int(round(v)) for v in light),
                      'fit': round(float(np.median(veil[strong])), 2)}
    print('aura veil', b['veil_info'])
    # Behind: everything else; what our character covers is filled from the water round it.
    hole = zone & (b['solid'] | b['rim'])
    back_solid = (b['solid'] & ~zone) | hole
    back_rim = b['rim'] & ~zone
    known = b['solid'] & ~zone
    # First his own texture, mirrored in across the nearer edge of the hole in each row; what
    # that cannot reach is filled smoothly from round it.
    mir = np.zeros((H, W, 3))
    got = np.zeros((H, W), bool)
    for y in range(H):
        xs = np.nonzero(hole[y])[0]
        for x in xs:
            l = x
            while l >= 0 and hole[y, l]:
                l -= 1
            r = x
            while r < W and hole[y, r]:
                r += 1
            for src in sorted([(x - l, 2 * l - x + 1), (r - x, 2 * r - x - 1)]):
                sx = src[1]
                if 0 <= sx < W and known[y, sx]:
                    mir[y, x] = col[y, sx]
                    got[y, x] = True
                    break
    cur = np.where(known[..., None], col, 0.0)
    cur[got] = mir[got]
    known = known | got
    w = known.astype(np.float64)
    for _ in range(300):
        acc = np.zeros_like(cur)
        cnt = np.zeros((H, W))
        for dy, dx in N4:
            acc += shift(cur * w[..., None], dy, dx)
            cnt += shift(w, dy, dx)
        upd = hole & ~got & (cnt > 0)
        cur[upd] = acc[upd] / cnt[upd][:, None]
        w = np.where(upd, 1.0, w)
    back_col = np.where(hole[..., None], cur, col)
    b['layers'] = {
        'aura_back': dict(solid=back_solid, rim=back_rim, glow=b['glow'] & ~zone, col=back_col),
        'aura': dict(solid=front, rim=front_rim & ~front, glow=np.zeros((H, W), bool), col=col),
    }


aura_split(built['aura'])

GLOW_SRC = [b['g']['gcol'][b['glow']] for b in built.values()]
GLOW = median_cut(np.concatenate(GLOW_SRC), 6)
ALPHAS = [15, 30, 55, 85, 120, 160, 200]

PAL = []  # (r, g, b, a, kind)
for c in BODY:
    PAL.append((*[int(round(v)) for v in c], 255, 'body'))
I_OUT = len(PAL)
PAL.append((*[int(round(v)) for v in OUTLINE], 255, 'outline'))
I_GLOW = len(PAL)
for c in GLOW:
    for a in ALPHAS:
        PAL.append((*[int(round(v)) for v in c], a, 'glow'))
PALC = np.array([p[:4] for p in PAL], np.float64)


def glow_index(cols, alphas):
    gi = nearest(cols, GLOW)
    ai = np.abs(alphas[:, None] * 255 - np.array(ALPHAS)[None]).argmin(1)
    return I_GLOW + gi * len(ALPHAS) + ai + 1


def quantize(solid, rim, glow, col, g):
    H, W = solid.shape
    idx = np.zeros((H, W), np.int32)
    idx[solid] = nearest(col[solid], BODY) + 1
    # Speck clean-up: a body pixel unlike all four neighbours and close to them in brightness is
    # JPEG noise and takes their commonest value (real highlights stand out and stay).
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = idx[y, x]
            if not v:
                continue
            nb = [idx[y, x + 1], idx[y, x - 1], idx[y + 1, x], idx[y - 1, x]]
            if v in nb or not all(nb):
                continue
            m = max(set(nb), key=nb.count)
            if abs(lum(PALC[v - 1][:3]) - lum(PALC[m - 1][:3])) < 34:
                idx[y, x] = m
    idx[rim] = I_OUT + 1
    if glow.any():
        idx[glow] = glow_index(g['gcol'][glow], g['A'][glow])
    return idx


def rle(flat):
    out = bytearray()
    i = 0
    while i < len(flat):
        v = int(flat[i])
        n = 1
        while i + n < len(flat) and flat[i + n] == v and n < 255:
            n += 1
        out += bytes((n, v))
        i += n
    return base64.b64encode(bytes(out)).decode('ascii')


KIND = np.array(['clear'] + [p[4] for p in PAL])


def split_pieces(idx, cfg, b, keep_full=False, wrap=False):
    """'drops' (small loose bits with their rims), 'glow', named pieces, and 'main'."""
    H, W = idx.shape
    kinds = KIND[idx]
    owner = np.full((H, W), 'main', dtype=object)
    owner[kinds == 'glow'] = 'glow'
    # Droplets: small bits of water standing clear of the rest (more than their rim apart), with
    # the rim round them.
    body = kinds == 'body'
    lab, n = components(body, nb=N4, wrap=wrap)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    big = sizes[1:].max() if n else 0
    drop_body = np.zeros((H, W), bool)
    for k in range(1, n + 1):
        if sizes[k] > cfg['drops'] or sizes[k] >= big:
            continue
        m = lab == k
        if not (dilate(m, 2, wrap=wrap, nb=N8) & body & ~m).any():
            drop_body |= m
    drop_rim = (kinds == 'outline') & dilate(drop_body, wrap=wrap, nb=N8) & ~dilate(body & ~drop_body, wrap=wrap, nb=N8)
    owner[drop_body | drop_rim] = 'drops'
    names = ['main', 'drops', 'glow']
    for pname, polys in cfg.get('pieces', []):
        x0, y0 = b['g']['box'][:2]
        m = poly_mask(H, W, polys, x0, y0, SX, SY) & (owner == 'main') & (idx > 0)
        owner[m] = pname
        names.append(pname)
    pieces = {}
    for pname in names:
        m = (owner == pname) & (idx > 0)
        if not m.any():
            continue
        sub = np.where(m, idx, 0)
        if keep_full:
            bx0, by0, bx1, by1 = 0, 0, W, H
        else:
            ys, xs = np.nonzero(sub)
            bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        pieces[pname] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'rle': rle(sub[by0:by1, bx0:bx1].ravel())}
    return pieces


def seam_rows(A, B, lo, hi):
    """Per row, the column s in [lo, hi] where a strip switches from A (left of s) to B (from s
    on), chosen where the two match best, moving at most 1 px from row to row (dynamic
    programming)."""
    H = A.shape[0]
    ca = PALC[np.maximum(A, 1) - 1][..., :3] * (A > 0)[..., None]
    cb = PALC[np.maximum(B, 1) - 1][..., :3] * (B > 0)[..., None]
    diff = np.sqrt(((ca - cb) ** 2).sum(-1)) + 200 * ((A > 0) != (B > 0))
    S = np.arange(lo, hi + 1)
    cost = np.array([[diff[y, s] + (diff[y, s - 1] if s > 0 else 0) for s in S] for y in range(H)])
    acc = cost.copy()
    back = np.zeros(acc.shape, np.int32)
    for y in range(1, H):
        for i in range(len(S)):
            j0, j1 = max(0, i - 1), min(len(S), i + 2)
            k = j0 + int(np.argmin(acc[y - 1, j0:j1]))
            acc[y, i] += acc[y - 1, k]
            back[y, i] = k
    i = int(np.argmin(acc[-1]))
    out = [0] * H
    for y in range(H - 1, -1, -1):
        out[y] = int(S[i])
        i = back[y, i]
    return out


result = {}
idx_for_review = {}
for name, b in built.items():
    cfg = b['cfg']
    if cfg.get('aura'):
        for lname, Ly in b['layers'].items():
            idx = quantize(Ly['solid'], Ly['rim'], Ly['glow'], Ly['col'], b['g'])
            result[lname] = {'w': b['W'], 'h': b['H'], 'anchor': [b['ax'], b['ay']], 'pieces': split_pieces(idx, cfg, b)}
            idx_for_review[lname] = idx
        continue
    idx = quantize(b['solid'], b['rim'], b['glow'], b['g']['col'], b['g'])
    if cfg.get('stream'):
        # The tile: his 64 px before the head (rows 4..67). Its left end is closed onto its right
        # end by taking the head's first columns (which continue the right end) up to a seam.
        strip = idx[4:68]
        tile = strip[:, :64].copy()
        head0 = strip[:, 64:76]
        seam = seam_rows(head0, tile[:, :12], 0, 11)
        for y, s in enumerate(seam):
            tile[y, :s] = head0[y, :s]
        # No droplet may touch the tile's top or bottom row.
        lab, n = components(tile > 0, wrap=True)
        for k in set(np.unique(np.concatenate([lab[0], lab[-1]]))) - {0}:
            if (lab == k).sum() <= 40:
                tile[lab == k] = 0
        head = idx[:, 64:].copy()
        result['stream'] = {'w': 64, 'h': 64, 'anchor': [32, 32], 'pieces': split_pieces(tile, cfg, b, keep_full=True, wrap=True)}
        result['stream_head'] = {'w': int(head.shape[1]), 'h': 72, 'anchor': [32, 36], 'pieces': split_pieces(head, cfg, b, keep_full=True)}
        idx_for_review['stream'] = tile
        idx_for_review['stream_head'] = head
        continue
    result[name] = {'w': b['W'], 'h': b['H'], 'anchor': [b['ax'], b['ay']], 'pieces': split_pieces(idx, cfg, b)}
    idx_for_review[name] = idx

for name, r in result.items():
    print('%-11s %3dx%-3d anchor %3d,%-3d pieces %s' % (name, r['w'], r['h'], r['anchor'][0], r['anchor'][1], ','.join(r['pieces'])))

pal_json = [{'rgba': '#%02x%02x%02x%02x' % p[:4], 'kind': p[4]} for p in PAL]
ts = ["// GENERATED by tools/refs/water-from-ref.py from the owner's paint-over of the water sheet",
      "// (docs/reference/water-set-owner-reference.jpg): do not edit by hand. One palette for the set",
      "// (his water, his rim, his haze with alpha); each sprite's key frame is split into pieces of",
      "// base64 run-length data, as (run, palette index + 1) byte pairs (0 = clear), each placed at",
      "// (x, y) in the sprite's frame.", '',
      "export type WaterKind = 'body' | 'outline' | 'glow';",
      'export interface WaterPal { rgba: string; kind: WaterKind }',
      'export interface WaterPiece { x: number; y: number; w: number; h: number; rle: string }',
      'export interface WaterRef { w: number; h: number; anchor: [number, number]; pieces: Record<string, WaterPiece> }',
      '/** Game px per pixel of his sheet (across, down). */',
      'export const WV3_SCALE: [number, number] = [%s, %s];' % (SX, SY),
      'export const WV3_PAL: WaterPal[] = ' + json.dumps(pal_json) + ';',
      '/** The aura veil over the figure, from his picture: his water tint fitted over the body (deep), his',
      ' *  bright water round the figure (light, the rim) and the tint he painted (median fitted alpha). */',
      'export const WV3_VEIL = ' + json.dumps(built['aura']['veil_info']) + ';',
      'export const WV3_REF: Record<string, WaterRef> = ' + json.dumps(result, indent=1) + ';', '']
tmp = OUT_TS + '.part'
with open(tmp, 'w') as fh:
    fh.write('\n'.join(ts))
os.replace(tmp, OUT_TS)
print('palette', len(PAL))

if REVIEW:
    os.makedirs(REVIEW, exist_ok=True)

    def rgba_of(idx):
        out = np.zeros(idx.shape + (4,))
        on = idx > 0
        out[on] = PALC[idx[on] - 1]
        return out

    def comp(rgba, bg):
        A = rgba[..., 3:] / 255
        return rgba[..., :3] * A + np.asarray(bg, np.float64) * (1 - A)

    sources = {}
    for name, b in built.items():
        if b['cfg'].get('aura'):
            sources['aura'] = b['g']['his']
        elif b['cfg'].get('stream'):
            sources['stream'] = b['g']['his'][4:68, :64]
            sources['stream_head'] = b['g']['his'][:, 64:]
        else:
            sources[name] = b['g']['his']
    # His crops at game scale, same frame and anchor as ours (the review sheets use them).
    for name, his in sources.items():
        Image.fromarray(np.clip(his, 0, 255).astype(np.uint8)).save(os.path.join(REVIEW, 'his-' + name + '.png'))
    for name, idx in idx_for_review.items():
        rgba = rgba_of(idx)
        his = sources['aura' if name.startswith('aura') else name]
        H, W = idx.shape
        k = 4 if max(W, H) < 120 else 3 if max(W, H) < 200 else 2
        imgs = [his, comp(rgba, BG), comp(rgba, [84, 110, 70])]
        if name == 'aura':
            back = rgba_of(idx_for_review['aura_back'])
            imgs.append(comp(rgba, comp(char_in_frame(built['aura']), comp(back, BG))))
        S = Image.new('RGB', (W * k * len(imgs) + 10 * len(imgs), H * k), (0, 0, 0))
        for i, x in enumerate(imgs):
            S.paste(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).resize((W * k, H * k), Image.NEAREST), (i * (W * k + 10), 0))
        S.save(os.path.join(REVIEW, 'x-' + name + '.png'))
