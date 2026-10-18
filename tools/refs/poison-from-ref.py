"""Cuts the owner's paint-over of the poison sheet into game-scale key frames for vfx_poison_v3.

    python3 -I tools/refs/poison-from-ref.py docs/reference/poison-set-owner-reference.jpg \
        tools/world-sprites/vfx-poison-v3-refdata.ts <character.png> [reviewDir]

<character.png> is our scale character at 1x (kit characterRef(), 128x128, feet at (64, 120)). It
is used to find and remove his characters (registered on them) and to split the aura into the
layers behind and in front of the figure.

The owner wants his reference copied as exactly as possible, so every key frame is HIS pixels:

* Scale. His sheet is a paint-over of our 2x poison sheet brought back to about 1x. Our 96 px
  character fits his best at 1.00 of his px across and 1.02 down (template match on his four
  characters: beside the blast, the wall, the 3/4 wall and in the aura), so one of his pixels is
  1.0 x 0.98 game pixels. The stream is the exception: his beam repeats every 65.9 of his px (it
  was our 64 px tile), so the stream and its head are read at 64 / 65.9 across, and one period is
  exactly one tile. Each sprite is placed by an anchor measured on his art (the swirl's core, the
  orb's centre, the breath's orb, the pool's centre, the ground under his walls, the aura's feet).
* Clean-up. His panel background, his characters (registered with our character and removed with
  a 3 px margin), the shadow his character casts, the labels and the panel borders are removed.
  JPEG noise is smoothed before every decision; colours are read from a lightly sharpened copy, and
  dark rims from the unsmoothed one (smoothing would melt a 1 px rim into the colour beside it).
  Where his character hid his light (the blast's green light, the 3/4 wall's lit ground), the hole
  is filled with a smooth continuation of the light round it; behind the aura's figure his flames
  are filled in from round it.
* Classes, decided at his resolution, then area-averaged (box filter) to game scale:
    body    - slime, venom mist, stone, bone, bubbles: opaque, quantized to one palette for the set
              (median cut of his own pixels, separately for his greens, his violets and his
              neutrals: stone, bone, the pale motes), each pixel to the nearest colour of its own
              family;
    outline - his dark rims: a clean 1 px tinted outline wherever his art has one: deep green
              round the slime, dark violet round the venom, dark stone round the frames (his rim
              hue, lifted off black);
    glow    - his soft light and the soft edges of his mist (the blast's green light, the 3/4
              wall's lit ground, the multi's trails, the aura's haze): kept SEMI-TRANSPARENT,
              un-blended from his panel colour (colour to alpha), so it composites back to his
              look on any map. Grey haze is kept only where he painted grey trails.
* Pieces. Each key frame is split into pieces the generator animates on their own: 'drops'
  (loose droplets, bubbles and motes), 'glow', named pieces per sprite (the bolt's mist, the
  sphere's ring, the walls' stone frame, the blast's pool...) and the rest ('main').
* The stream tile is the 64 px of his beam that end where his splash head begins, closed into a
  loop by a seam cut where its two ends match best; the head is his splash.
* The aura: 'aura_back' (behind the figure) is his flames, his motes and the far half of his pool,
  with what his figure hid filled in from round it; 'aura' (over the figure) is the near half of
  his pool. The tint his picture lays over the figure is drawn by the generator as a soft veil; its
  colours and strength are fitted here (his figure in the aura against his plain figure beside the
  blast, the same drawing).
The result is indexed run-length data that tools/world-sprites/vfx-poison-v3.ts decodes and
animates. With a review directory it also writes his crops at game scale (his-<name>.png, same
frame and anchor as ours), before/after previews (x-<name>.png) and refmap.json (where each key
frame sits in his image). Deterministic.
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
SX, SY = 1.0, 1 / 1.02             # game px per his px, across and down
STREAM_PERIOD = 65.9               # his beam repeats every 65.9 px: one 64 px tile
BG = np.array([31.0, 33.0, 46.0])  # his panel fill
CHAR = np.asarray(Image.open(CHAR_PNG).convert('RGBA')).astype(np.float64)  # feet at (64, 120)

# His panels: the border lines (left, top, right, bottom), measured on his sheet.
PANELS = {
    'bolt': (5, 41, 72, 108), 'stream': (260, 41, 523, 108), 'breath': (535, 41, 651, 149), 'sphere': (663, 41, 729, 108),
    'slash': (5, 178, 71, 245), 'multi': (116, 178, 182, 245), 'hit': (227, 178, 293, 245), 'blast': (338, 178, 582, 345),
    'wall': (5, 374, 348, 511), 'aura': (359, 374, 442, 511), 'wall_diag': (479, 374, 760, 658),
}
# His characters, registered with ours (feet x, feet y, his px per game px across and down).
HIS_CHAR = {
    'blast': (561.0, 292.4, 1.00, 1.02), 'wall': (326.0, 502.6, 1.00, 1.03),
    'wall_diag': (738.6, 571.4, 1.01, 1.02), 'aura': (401.0, 493.4, 1.00, 1.02),
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


def smooth_fill(val, known, s=4.0):
    """A smooth continuation of `val` from the `known` pixels (normalized convolution, from a fine
    to a coarse blur so small holes keep detail and big ones are still reached)."""
    out = np.zeros_like(val)
    done = np.zeros(known.shape, bool)
    w = known.astype(np.float64)
    for i, sc in enumerate((s, s * 2, s * 4, s * 8)):
        num = gauss(val * (w[..., None] if val.ndim == 3 else w), sc)
        den = gauss(w, sc)
        ok = (den > (0.08 if i < 3 else 1e-9)) & ~done
        out[ok] = (num[ok] / (den[ok][..., None] if val.ndim == 3 else den[ok]))
        done |= ok
    return out


def harmonic_fill(val, known, hole, iters=1500):
    """Fills `hole` with the smoothest surface that meets the `known` pixels round it (repeated
    averaging of the four neighbours, only over hole and known pixels), so a gradient running
    across the hole carries on through it. Starts from smooth_fill."""
    ys, xs = np.nonzero(dilate(hole, 2, nb=N8))
    if not len(ys):
        return val
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    v = val[y0:y1, x0:x1].astype(np.float64).copy()
    kn = known[y0:y1, x0:x1]
    ho = hole[y0:y1, x0:x1] & ~kn
    start = smooth_fill(np.where(kn[..., None] if v.ndim == 3 else kn, v, 0), kn, 2.0)
    v[ho] = start[ho]
    live = (kn | ho).astype(np.float64)
    for _ in range(iters):
        acc = np.zeros_like(v)
        cnt = np.zeros(ho.shape)
        for dy, dx in N4:
            w = shift(live, dy, dx)
            acc += shift(v, dy, dx) * (w[..., None] if v.ndim == 3 else w)
            cnt += w
        upd = ho & (cnt > 0)
        v[upd] = (acc[upd] / (cnt[upd][:, None] if v.ndim == 3 else cnt[upd]))
    out = val.copy()
    out[y0:y1, x0:x1] = np.where(ho[..., None] if v.ndim == 3 else ho, v, out[y0:y1, x0:x1])
    return out


# --- his sheet, his panels only ----------------------------------------------------------------

def flatten():
    """Only the inside of his panels is read. The 1 px panel borders (blurred to 3 px by the JPEG)
    cut through art that reaches them; each border band takes the pixels just inside it."""
    out = np.zeros_like(IM0) + BG
    for x0, y0, x1, y1 in PANELS.values():
        out[y0 + 1:y1, x0 + 1:x1] = IM0[y0 + 1:y1, x0 + 1:x1]
        out[y0 + 1, x0 + 1:x1] = IM0[y0 + 2, x0 + 1:x1]
        out[y1 - 1, x0 + 1:x1] = IM0[y1 - 2, x0 + 1:x1]
        out[y0 + 1:y1, x0 + 1] = IM0[y0 + 1:y1, x0 + 2]
        out[y0 + 1:y1, x1 - 1] = IM0[y0 + 1:y1, x1 - 2]
    return out


FLAT = flatten()
SMOOTH = gauss(FLAT, 0.55)
SHARP = np.clip(FLAT + 0.5 * (FLAT - gauss(FLAT, 1.0)), 0, 255)
LBG = float(lum(BG))


def his_character(name, grow=3):
    """His character in a panel: our character registered on his, its silhouette grown a little."""
    fx, fy, kx, ky = HIS_CHAR[name]
    m = np.zeros((H0, W0), bool)
    ys, xs = np.nonzero(CHAR[..., 3] > 0)
    for v, u in zip(ys, xs):
        x0, x1 = fx + (u - 64) * kx, fx + (u + 1 - 64) * kx
        y0, y1 = fy + (v - 120) * ky, fy + (v + 1 - 120) * ky
        m[int(np.floor(y0)):int(np.ceil(y1)), int(np.floor(x0)):int(np.ceil(x1))] = True
    return dilate(m, grow, nb=N8) if grow else m


# --- the sprites ------------------------------------------------------------------------------
# anchor:   the anchor in HIS coordinates (projectile core; ground centre; feet; breath origin).
# area:     polygons (his coordinates) holding his art for this sprite; the rest is ignored.
# char:     remove his character (registered on ours). shade: polygons where his character's
#           cast shadow lies (its non-slime pixels are removed). light: polygons where his light
#           is continued smoothly under what was removed.
# t_body:   how far from his panel colour a pixel must be to be opaque (default 40); weaker art is
#           glow (his light, his mist's soft edges). grey_glow: grey haze is kept as glow (trails).
# pieces:   [(name, polygons[, family])] named pieces split off 'main' (first match wins; only that
#           family's pixels when one is named); purple_piece: a
#           piece taking every violet pixel left in 'main'.
# drops:    the largest loose bit (px at game scale) still counted as a droplet.
# frame:    polygons of his stone frame (walls): his stone is grown into its dark faces and rimmed,
#           and it is its own piece.
# pad:      extra room (left, top, right, bottom) round the art for the animation.

SPRITES = {
    'bolt': dict(anchor=(53, 70), area=[rect(6, 42, 71, 107)], drops=24, purple_piece='mist', pad=(1, 2, 3, 3)),
    'breath': dict(anchor=(544, 95), area=[rect(536, 42, 650, 148)], drops=30, purple_piece='mist', pad=(0, 3, 5, 4)),
    'sphere': dict(anchor=(699.5, 71), area=[rect(664, 42, 728, 107)], drops=24, purple_piece='ring', pad=(2, 2, 2, 2)),
    'slash': dict(anchor=(38.5, 211.5), area=[rect(6, 179, 70, 244)], drops=12, grey_glow=True, pad=(3, 2, 2, 2),
                  pieces=[('dashes', [[(6, 179), (24, 179), (34, 195), (36, 230), (24, 244), (6, 244)]])]),
    'multi': dict(anchor=(149.5, 211.5), area=[rect(117, 179, 181, 244)], drops=10, grey_glow=True, pad=(4, 2, 2, 2)),
    'hit': dict(anchor=(261.5, 211), area=[rect(228, 179, 292, 244)], drops=20, purple_piece='streaks', pad=(6, 6, 6, 6)),
    'blast': dict(anchor=(435, 300), area=[rect(339, 179, 581, 344)], drops=40, char=True,
                  shade=[[(527, 296), (581, 296), (581, 344), (503, 344), (518, 318)]],
                  light=[[(470, 180), (581, 180), (581, 344), (512, 344), (512, 331), (522, 318), (528, 301), (527, 285), (518, 270), (505, 262), (500, 240), (490, 230), (470, 232)]], fade={'r': 40, 'b': 18}, light_s=4.0, light_gap=3, light_edge=12,
                  pad=(3, 0, 3, 3),
                  pieces=[('mist', [rect(339, 179, 411, 262), [(455, 179), (520, 179), (520, 240), (470, 240), (462, 222)]], 'purple'),
                          ('pool', [[(339, 258), (409, 258), (416, 280), (458, 282), (466, 258), (581, 258), (581, 344), (339, 344)]])]),
    'wall': dict(anchor=(149.5, 503), area=[rect(6, 375, 300, 510)], drops=30, char=True, pad=(3, 3, 3, 3),
                 frame=[rect(11, 403, 39.5, 510), rect(260.5, 403, 292, 510), rect(11, 484, 292, 510)]),
    'wall_diag': dict(anchor=(600, 590), area=[rect(480, 375, 759, 657)], drops=30, char=True,
                      frame=[[(484, 497), (530, 497), (530, 531), (527, 531), (527, 545), (524.5, 545), (524.5, 649), (484, 649)],
                             rect(678.5, 390, 706, 553), [(524, 614), (540, 606), (600, 571), (650, 542), (679, 525), (706, 553), (531, 646)],
                             rect(598, 566, 619, 592)],
                      light=[[(528, 640), (600, 606), (650, 579), (700, 553), (720, 541), (759, 505), (759, 657), (528, 657)]], fade={'r': 36, 'b': 30}, light_s=0.7, light_gap=2, pad=(3, 3, 0, 0)),
    'aura': dict(anchor=(401, 493.4), area=[rect(360, 375, 441, 510)], drops=20, aura=True, pad=(3, 3, 3, 3)),
    # The stream: his beam, the tile ending where his splash head begins (anchor x), centred on
    # the anchor's y.
    'stream': dict(anchor=(458.7, 74.0), area=[rect(261, 42, 522, 107)], drops=24, stream=True, head_w=70,
                   sx=64 / STREAM_PERIOD, purple_piece='mist'),
}
MARGIN = 3
FAM = ('green', 'purple', 'neutral')


def sx_of(cfg):
    return cfg.get('sx', SX)


def his_box(cfg, W, H, ax, ay):
    """His rectangle (float) covered by a W x H game frame with the anchor at (ax, ay)."""
    hx, hy = cfg['anchor']
    sx = sx_of(cfg)
    return (hx - ax / sx, hy - ay / SY, hx + (W - ax) / sx, hy + (H - ay) / SY)


def resample(arr, box, W, H, P=64):
    """Box-filters an HxW(xC) array of his sheet onto a W x H game grid covering `box`."""
    if arr.ndim == 2:
        a = np.pad(arr.astype(np.float32), P, mode='edge')
        b = (box[0] + P, box[1] + P, box[2] + P, box[3] + P)
        return np.asarray(Image.fromarray(a, 'F').resize((W, H), Image.BOX, box=b), np.float64)
    return np.stack([resample(arr[..., k], box, W, H, P) for k in range(arr.shape[2])], -1)


def family_of(c):
    """0 green (his slime), 1 violet (his venom), 2 neutral (stone, bone, motes; his greyish
    violet stone is neutral: a venom violet is clearly saturated)."""
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    chroma = c.max(-1) - c.min(-1)
    fam = np.full(c.shape[:2], 2, np.int8)
    fam[(g - np.maximum(r, b) > 6)] = 0
    fam[(r - g > 6) & (b - g > 6) & (chroma >= 24)] = 1
    return fam


def game_family(g):
    return np.argmax(g['fams'], -1)


def edge_ramp(cfg):
    """1 inside, falling to 0 toward the area's edges named in cfg['fade'] ({side: his px}):
    his art ran off his panel there, so it fades out instead of being cut."""
    ramp = np.ones((H0, W0))
    if not cfg.get('fade'):
        return ramp
    xs = np.array([p[0] for poly in cfg['area'] for p in poly])
    ys = np.array([p[1] for poly in cfg['area'] for p in poly])
    X = np.arange(W0)[None, :] + 0.5
    Y = np.arange(H0)[:, None] + 0.5
    for side, n in cfg['fade'].items():
        d = {'l': X - xs.min(), 'r': xs.max() - X, 't': Y - ys.min(), 'b': ys.max() - Y}[side]
        t = np.clip(d / n, 0, 1)
        ramp = ramp * (t * t * (3 - 2 * t))
    return ramp


def classify_his(name, cfg):
    """Class maps at his resolution over the whole sheet, limited to the sprite's area."""
    c = SMOOTH
    keep = poly_mask(H0, W0, cfg['area'])
    removed = np.zeros((H0, W0), bool)
    L = lum(c)
    dist = np.sqrt(((c - BG) ** 2).sum(-1))
    art = keep & (dist >= cfg.get('t_body', 40))
    if cfg.get('char'):
        removed |= his_character(name) & keep
    if cfg.get('shade'):
        # His character's cast shadow: only what is not his slime.
        removed |= poly_mask(H0, W0, cfg['shade']) & keep & ~(art & (family_of(c) == 0) & (L > 70))
    keep &= ~removed
    art &= keep
    if cfg.get('light'):
        # In his light everything is light, except his loose drops of slime (small, with a bright
        # highlight).
        lz = poly_mask(H0, W0, cfg['light'])
        lab, n = components(art & lz, nb=N8)
        if n:
            sizes = np.bincount(lab.ravel(), minlength=n + 1)
            peak = np.zeros(n + 1)
            np.maximum.at(peak, lab.ravel(), L.ravel())
            slime = (sizes < 120) & (peak >= 160)
            slime[0] = False
            art &= ~(lz & ~slime[lab])
    # His dark rims, read on the unsmoothed sheet (smoothing melts a 1 px rim into its neighbour).
    Lr = lum(FLAT)
    dr = np.sqrt(((FLAT - BG) ** 2).sum(-1))
    dark = keep & (((Lr < LBG - 7) & (dr >= 9)) | ((L < LBG - 6) & (dist >= 9)))
    art &= ~dark
    if cfg.get('frame'):
        # His stone is dark: its shadowed faces sit close to his panel colour. Grown from the
        # stone he clearly painted into the not-quite-panel pixels joined to it (not his bright green), it is
        # opaque stone, bounded by his dark rim.
        fs = family_of(c)
        stone = art & (fs != 0) & (L < 150)
        lab, n = components(stone, nb=N8)
        sizes = np.bincount(lab.ravel(), minlength=n + 1)
        stone = np.isin(lab, [k for k in range(1, n + 1) if sizes[k] >= 25])
        cand = keep & ~art & ~dark & (L < 110) & (dist >= 7) & ((fs != 0) | (L < 60))
        cand &= dilate(poly_mask(H0, W0, cfg['frame']), 2, nb=N8)
        if cfg.get('light'):
            cand &= ~poly_mask(H0, W0, cfg['light'])
        for _ in range(40):
            grow = cand & dilate(stone, 1, nb=N4) & ~stone
            if not grow.any():
                break
            stone |= grow
        art |= stone
    # Small holes inside his art (JPEG-darkened specks, his darkest stone) are his art too.
    ys, xs = np.nonzero(dilate(art | dark, 1, nb=N8))
    if len(ys):
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        sub = ~(art | dark)[y0:y1, x0:x1]
        lab, n = components(sub, nb=N4)
        sizes = np.bincount(lab.ravel(), minlength=n + 1)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
        seal = [k for k in range(1, n + 1) if sizes[k] <= 12 and k not in edge]
        if seal:
            m = np.zeros((H0, W0), bool)
            m[y0:y1, x0:x1] = np.isin(lab, seal)
            art |= m & keep
    a, F = c2a(c)
    fam = family_of(np.where(art[..., None], SHARP, F))
    glow = keep & ~art & ~dark & (a >= 0.035)
    if not cfg.get('grey_glow'):
        # Dull haze is JPEG fringe round his stone and motes, not light: his light and his mist
        # un-blend to saturated colours.
        glow &= (F.max(-1) - F.min(-1)) >= 45
    if cfg.get('light'):
        # His light: a soft gradient, cleaned of JPEG blocks (blurred by light_s) and continued
        # under what was removed (his character and its shadow) from the light round it, leaving
        # a gap of light_gap px round the hole (his character's dark rim and cast shade).
        ls, gap = cfg.get('light_s', 1.0), cfg.get('light_gap', 3)
        lz = poly_mask(H0, W0, cfg['light']) & poly_mask(H0, W0, cfg['area'])
        known = lz & keep & ~art & ~dark & ~dilate(removed, gap, nb=N8)
        af = smooth_fill(a * known, known, ls)
        Ff = smooth_fill(F * (a * known)[..., None], known, ls) / np.maximum(af, 1e-6)[..., None]
        zone = lz & ~art & ~(dark & keep & ~dilate(removed, gap, nb=N8))
        hole = zone & ~known
        af = harmonic_fill(af, known, hole)
        Ff = harmonic_fill(np.clip(Ff, 0, 255), known, hole)
        if cfg.get('light_edge'):
            # (his light ends softly where the zone meets the panel, not along the zone's edge)
            n = cfg['light_edge']
            depth = np.zeros((H0, W0))
            inside = lz.copy()
            for i in range(n):
                inside = inside & ~dilate(~inside, 1, nb=N8)
                depth += inside
            t = depth / n
            af = af * (t * t * (3 - 2 * t))
        a = np.where(zone, af, a)
        F = np.where(zone[..., None], np.clip(Ff, 0, 255), F)
        glow = (glow & ~lz) | (zone & (a >= 0.035))
    # Where his art ran off his panel, it fades out.
    a = a * edge_ramp(cfg)
    glow &= a >= 0.035
    # His dark rims: dark pixels right beside his art (a rim is at most 2 px from it).
    outline = dark & dilate(art, 2, nb=N8)
    return dict(body=art, outline=outline, glow=glow, a=np.where(glow, a, 0), F=F, fam=fam, keep=keep, removed=removed)


def to_game(cfg, cls, W, H, ax, ay):
    box = his_box(cfg, W, H, ax, ay)
    B = resample(cls['body'].astype(np.float64), box, W, H)
    O = resample(cls['outline'].astype(np.float64), box, W, H)
    CB = resample(SHARP * cls['body'][..., None], box, W, H)
    col = CB / np.maximum(B, 1e-6)[..., None]
    A = resample(cls['a'], box, W, H)
    FA = resample(cls['F'] * cls['a'][..., None], box, W, H)
    gcol = FA / np.maximum(A, 1e-6)[..., None]
    fams = np.stack([resample((cls['body'] & (cls['fam'] == k)).astype(np.float64), box, W, H) for k in range(3)], -1)
    ofams = np.stack([resample((dilate(cls['body'] & (cls['fam'] == k), 2, nb=N8) & cls['outline']).astype(np.float64), box, W, H) for k in range(3)], -1)
    return dict(B=B, O=O, col=col, A=A, gcol=gcol, fams=fams, ofams=ofams, box=box,
                his=resample(IM0, box, W, H), flat=resample(FLAT, box, W, H))


def bounds_game(cfg, cls):
    """The art's extent at game scale, relative to the anchor."""
    m = cls['body'] | cls['outline'] | (cls['a'] > 0.05)
    ys, xs = np.nonzero(m)
    hx, hy = cfg['anchor']
    sx = sx_of(cfg)
    return ((xs.min() - hx) * sx, (ys.min() - hy) * SY, (xs.max() + 1 - hx) * sx, (ys.max() + 1 - hy) * SY)


def decide(g, wrap=False):
    """Body, outline and glow at game scale. A pixel is drawn where his art covers at least half
    of it; it is outline where his dark rim dominates it, and a clear pixel just outside the body
    becomes outline where his rim reaches into it, so the silhouette gets one clean 1 px rim
    wherever his art has one."""
    B, O, A = g['B'], g['O'], g['A']
    S = B + O
    drawn = S >= 0.5
    nb = sum(shift(drawn, dy, dx, wrap).astype(int) for dy, dx in N4)
    drawn |= (~drawn) & (nb >= 3) & (S >= 0.2)          # pinholes
    dark = drawn & (O > B)
    solid = drawn & ~dark
    ring = dilate(solid, wrap=wrap) & ~drawn & (O >= 0.15)
    rim = dark | ring
    # A rim pixel with no body near it is a speck of his dark noise.
    rim &= dilate(solid, 2, wrap=wrap, nb=N8)
    glow = (~drawn) & (~ring) & (A >= 0.045)
    return solid, rim, glow


def frame_for(cfg, cls):
    """The art's bounds plus MARGIN, plus `pad` (left, top, right, bottom) where the animation
    throws slime further out than his picture."""
    x0, y0, x1, y1 = bounds_game(cfg, cls)
    pl, pt, pr, pb = cfg.get('pad', (0, 0, 0, 0))
    ax = int(np.ceil(-x0)) + MARGIN + pl
    ay = int(np.ceil(-y0)) + MARGIN + pt
    return ax + int(np.ceil(x1)) + MARGIN + pr, ay + int(np.ceil(y1)) + MARGIN + pb, ax, ay


# --- build every key frame (classes at game scale) --------------------------------------------

built = {}
for name, cfg in SPRITES.items():
    cls = classify_his(name, cfg)
    if cfg.get('stream'):
        # One strip: the tile's 64 columns, then the head; 72 rows (the tile uses the middle 64).
        W, H, ax, ay = 64 + cfg['head_w'], 72, 64, 36
    else:
        W, H, ax, ay = frame_for(cfg, cls)
    g = to_game(cfg, cls, W, H, ax, ay)
    solid, rim, glow = decide(g)
    built[name] = dict(cfg=cfg, cls=cls, g=g, W=W, H=H, ax=ax, ay=ay, solid=solid, rim=rim, glow=glow)
    print('%-10s %3dx%-3d anchor %3d,%-3d solid %5d rim %4d glow %5d' % (name, W, H, ax, ay, solid.sum(), rim.sum(), glow.sum()))


# --- the aura: behind and over the figure ------------------------------------------------------

def char_in_frame(b, scale=(1.0, 1.0)):
    """Our character standing on the aura's anchor, as RGBA in the frame."""
    W, H, ax, ay = b['W'], b['H'], b['ax'], b['ay']
    ch = np.zeros((H, W, 4))
    for v in range(128):
        for u in range(128):
            x, y = ax + u - 64, ay + v - 120
            if 0 <= x < W and 0 <= y < H and CHAR[v, u, 3] > 0:
                ch[y, x] = CHAR[v, u]
    return ch


def aura_veil():
    """The tint his aura lays over the figure. His figure in the aura is a re-drawing of his plain
    figure beside the blast, so the two are compared by their colour statistics, not pixel by
    pixel: the aura figure's mean colour = (1 - a) * plain + a * V, with V his violet flame colour
    (the flames the figure stands in), gives the tint's strength a. The rim of the veil takes his
    bright green flame colour (the green light the figure is lit by)."""
    fa, fb = HIS_CHAR['aura'], HIS_CHAR['blast']
    inner = lambda m: m & ~dilate(~m, 2, nb=N8)
    A = SMOOTH[inner(his_character('aura', 0))]
    B = SMOOTH[inner(his_character('blast', 0))]
    x0, y0, x1, y1 = PANELS['aura']
    sub = SMOOTH[y0 + 2:y1 - 1, x0 + 2:x1 - 1]
    zone = ~his_character('aura', 2)[y0 + 2:y1 - 1, x0 + 2:x1 - 1]
    fam = family_of(sub)
    vio = zone & (fam == 1) & (sub[..., 0] - sub[..., 1] > 30) & (sub[..., 2] - sub[..., 1] > 30)
    V = np.median(sub[vio], 0)
    grn = zone & (fam == 0) & (lum(sub) > 150)
    G = np.median(sub[grn], 0)
    d = A.mean(0) - B.mean(0)
    v = V - B.mean(0)
    a = float(np.clip((d * v).sum() / (v * v).sum(), 0, 0.6))
    print('aura veil: figure mean', A.mean(0).round(1), 'plain', B.mean(0).round(1), 'violet', V.round(), 'green', G.round(), 'a', round(a, 3))
    return V, G, a


def aura_split(b):
    """The aura's key frame split into what goes behind the figure and what goes over it."""
    W, H, ax, ay = b['W'], b['H'], b['ax'], b['ay']
    g = b['g']
    # His figure (registered on ours) at game scale, grown by 1: removed from his art.
    fig = resample(his_character('aura', 0).astype(np.float64), g['box'], W, H) >= 0.3
    zone = dilate(fig, 1, nb=N8)
    solid, rim, glow = b['solid'] & ~zone, b['rim'] & ~zone, b['glow'] & ~zone
    col = g['col'].copy()
    fams = g['fams'].copy()
    # Behind the figure his flames go on: fill the figure's hole from the flames round it, row by
    # row between the flames on its left and right (normalized diffusion of his colours).
    hole = np.zeros((H, W), bool)
    for y in range(H):
        xs = np.nonzero(solid[y])[0]
        if len(xs) < 2:
            continue
        inside = zone[y] & (np.arange(W) > xs.min()) & (np.arange(W) < xs.max())
        hole[y] = inside
    hole &= ~solid
    # (from his violet flames: they are the ones rising behind the figure)
    known = solid & dilate(hole, 6, nb=N8) & (game_family(g) == 1)
    fill_col = smooth_fill(np.where(known[..., None], col, 0), known, 1.5)
    col[hole] = fill_col[hole]
    fams[hole] = np.array([0.0, 1.0, 0.0])
    back_solid = solid | hole
    back_rim = rim & ~hole
    # The near half of his pool (below the feet) goes over the figure's feet.
    rows = np.arange(H)[:, None]
    pool = (rows >= ay - 1) & (back_solid | back_rim)
    near = pool & (rows >= ay + 1)
    g2 = dict(g)
    g2['col'] = col
    g2['fams'] = fams
    b['layers'] = {
        'aura_back': dict(solid=back_solid & ~near, rim=back_rim & ~near, glow=glow, g=g2),
        'aura': dict(solid=back_solid & near, rim=back_rim & near, glow=np.zeros((H, W), bool), g=g2),
    }
    b['fig'] = fig


aura_split(built['aura'])
VEIL_DEEP, VEIL_LIGHT, VEIL_A = aura_veil()

# --- the palette: one for the set, from his pixels ---------------------------------------------


def median_cut(cols, n):
    cols = np.asarray(np.clip(np.round(cols), 0, 255), np.uint8).reshape(1, -1, 3)
    q = Image.fromarray(cols, 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:n * 3], np.float64).reshape(-1, 3)
    used = np.unique(np.asarray(q).ravel())
    return pal[used]


def nearest(cols, pal):
    return ((cols[..., None, :] - pal) ** 2).sum(-1).argmin(-1)


def layers_of(b):
    if 'layers' in b:
        return [(n, Ly['solid'], Ly['rim'], Ly['glow'], Ly['g']) for n, Ly in b['layers'].items()]
    return [(None, b['solid'], b['rim'], b['glow'], b['g'])]


def chroma_smooth(col, solid, fam):
    """JPEG chroma noise: each body pixel keeps its own lightness but takes the mean hue offset
    of its own family's pixels round it (3x3; 5x5 on the neutral stone, whose JPEG speckle is
    the worst), so his flat planes keep one hue."""
    Y = lum(col)
    C = col - Y[..., None]
    out = col.copy()
    for k, r in ((0, 1), (1, 1), (2, 2)):
        m = (solid & (fam == k)).astype(np.float64)
        acc = np.zeros_like(C)
        cnt = np.zeros(m.shape)
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                acc += shift(C * m[..., None], dy, dx)
                cnt += shift(m, dy, dx)
        sel = m > 0
        out[sel] = Y[sel][:, None] + acc[sel] / np.maximum(cnt[sel], 1)[:, None]
    return out


FAM_N = (32, 14, 16)
BODY = []
for k in range(3):
    src = []
    for b in built.values():
        for _, solid, _, _, g in layers_of(b):
            fam = game_family(g)
            src.append(chroma_smooth(g['col'], solid, fam)[solid & (fam == k)])
    cols = np.concatenate(src)
    if k == 2:
        # His neutrals are mostly dark stone; his bone and pale motes get their own few colours
        # so they keep their cream instead of falling to a stone grey.
        light = lum(cols) > 140
        pal = np.concatenate([median_cut(cols[~light], FAM_N[k]), median_cut(cols[light], 8)])
    else:
        pal = median_cut(cols, FAM_N[k])
    BODY.append(pal[np.argsort(lum(pal))])
    print(FAM[k], len(pal), 'colours from', len(cols), 'px')

# His rims, per family: his rim pixels are near black (JPEG-darkened); the rule is a tinted rim,
# so each takes the hue of its family's darkest colours, at a dark but not black level.
RIM = []
for k in range(3):
    dk = BODY[k][:max(2, len(BODY[k]) // 5)].mean(0)
    hue = dk - dk.mean()
    base = dk * (30.0 / max(1.0, lum(dk)))
    if np.abs(base - base.mean()).max() < 10:
        base = base.mean() + hue / max(1e-6, np.abs(hue).max()) * 10
    if k == 2:
        # Dark stone: his darkest stone at the rim level, a quarter of the way to the green rim
        # (his stone carries green runes and slime; a blue-grey rim would read cold).
        base = 0.75 * dk * (28.0 / max(1.0, lum(dk))) + 0.25 * RIM[0]
    RIM.append(np.clip(base, 0, 255))
    print('rim', FAM[k], 'from', dk.round(), '->', RIM[k].round())

GLOW_SRC = []
for b in built.values():
    for _, _, _, glow, g in layers_of(b):
        GLOW_SRC.append(g['gcol'][glow])
GLOW = median_cut(np.concatenate(GLOW_SRC), 12)
GLOW = GLOW[np.argsort(lum(GLOW))]
ALPHAS = [14, 28, 46, 68, 94, 124, 158, 196]

PAL = []  # (r, g, b, a, kind, fam)
I_BODY = []
for k in range(3):
    I_BODY.append(len(PAL))
    for c in BODY[k]:
        PAL.append((*[int(round(v)) for v in c], 255, 'body', FAM[k]))
I_RIM = len(PAL)
for k in range(3):
    PAL.append((*[int(round(v)) for v in RIM[k]], 255, 'outline', FAM[k]))
I_GLOW = len(PAL)
for c in GLOW:
    fam = FAM[int(family_of(c[None, None])[0, 0])]
    for a in ALPHAS:
        PAL.append((*[int(round(v)) for v in c], a, 'glow', fam))
PALC = np.array([p[:4] for p in PAL], np.float64)
assert len(PAL) < 255, len(PAL)
print('palette', len(PAL))


def glow_index(cols, alphas):
    gi = nearest(cols, GLOW)
    ai = np.abs(alphas[:, None] * 255 - np.array(ALPHAS)[None]).argmin(1)
    return I_GLOW + gi * len(ALPHAS) + ai + 1


def quantize(solid, rim, glow, g, stone_rim=False):
    H, W = solid.shape
    idx = np.zeros((H, W), np.int32)
    fam = game_family(g)
    col = chroma_smooth(g['col'], solid, fam)
    for k in range(3):
        m = solid & (fam == k)
        if m.any():
            idx[m] = I_BODY[k] + nearest(col[m], BODY[k]) + 1
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
            if abs(lum(PALC[v - 1][:3]) - lum(PALC[m - 1][:3])) < 30:
                idx[y, x] = m
    # Rims take the family of the body they edge (his rim colour for it).
    if rim.any():
        near = np.zeros((H, W, 3))
        for k in range(3):
            fk = ((fam == k) & solid).astype(float)
            near[..., k] = sum(shift(fk, dy, dx) for dy, dx in N8) * 0.25 + g['ofams'][..., k] + 0.5 * g['fams'][..., k]
        rk = np.argmax(near, -1)
        idx[rim] = I_RIM + rk[rim] + 1
    if stone_rim:
        # His stone frame's edge is a dark line: the outermost stone pixels become his dark-stone
        # rim (big stone parts only; the pale motes are neutral too).
        stone = solid & (fam == 2)
        lab, n = components(stone, nb=N4)
        sizes = np.bincount(lab.ravel(), minlength=n + 1)
        big = np.isin(lab, [k for k in range(1, n + 1) if sizes[k] >= 60])
        edge = big & dilate(~(solid | rim), nb=N4)
        idx[edge] = I_RIM + 2 + 1
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
PFAM = np.array(['none'] + [p[5] for p in PAL])


def frame_piece(idx, cfg, b):
    """His stone frame (the posts, the base and its rune plaques): every drawn pixel inside the
    frame's polygons (traced on his sheet) except his light."""
    H, W = idx.shape
    x0, y0 = b['g']['box'][:2]
    m = poly_mask(H, W, cfg['frame'], x0, y0, sx_of(cfg), SY)
    fr = m & (idx > 0) & (KIND[idx] != 'glow')
    # His slime reaching into a polygon stays slime: a bright green part that runs on outside the
    # polygons is not a rune cut into the stone (his greenish stone is darker).
    green = (idx > 0) & (PFAM[idx] == 'green') & (KIND[idx] == 'body') & (lum(PALC[np.maximum(idx, 1) - 1][..., :3]) > 95)
    lab, n = components(green, nb=N4)
    out = np.unique(lab[green & ~m])
    fr &= ~np.isin(lab, out[out > 0])
    return fr


def split_pieces(idx, cfg, b, keep_full=False, wrap=False):
    """'drops' (small loose bits with their rims), 'glow', named pieces, and 'main'."""
    H, W = idx.shape
    kinds = KIND[idx]
    owner = np.full((H, W), 'main', dtype=object)
    owner[kinds == 'glow'] = 'glow'
    names = ['main', 'drops', 'glow']
    if cfg.get('frame'):
        fr = frame_piece(idx, cfg, b)
        owner[fr] = 'frame'
        names.append('frame')
    body = (kinds == 'body') & (owner == 'main')
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
    drop_rim = (kinds == 'outline') & (owner == 'main') & dilate(drop_body, wrap=wrap, nb=N8) & ~dilate(body & ~drop_body, wrap=wrap, nb=N8)
    owner[drop_body | drop_rim] = 'drops'
    x0, y0 = b['g']['box'][:2]
    sx = sx_of(cfg)
    for pc in cfg.get('pieces', []):
        pname, polys = pc[0], pc[1]
        m = poly_mask(H, W, polys, x0, y0, sx, SY) & (owner == 'main') & (idx > 0)
        if len(pc) > 2:
            m &= PFAM[idx] == pc[2]
        owner[m] = pname
        if pname not in names:
            names.append(pname)
    if cfg.get('purple_piece'):
        pn = cfg['purple_piece']
        pur = (owner == 'main') & (PFAM[idx] == 'purple') & ((kinds == 'body') | (kinds == 'outline'))
        # (a violet rim pixel that edges green slime stays with the slime)
        green = (owner == 'main') & (PFAM[idx] == 'green') & (kinds == 'body')
        pur &= ~((kinds == 'outline') & dilate(green, nb=N8))
        owner[pur] = pn
        if pn not in names:
            names.append(pn)
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
    on), chosen where the two match best, moving at most 1 px from row to row."""
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
refmap = {}
for name, b in built.items():
    cfg = b['cfg']
    box = [round(float(v), 3) for v in b['g']['box']]
    if cfg.get('aura'):
        for lname, Ly in b['layers'].items():
            idx = quantize(Ly['solid'], Ly['rim'], Ly['glow'], Ly['g'])
            result[lname] = {'w': b['W'], 'h': b['H'], 'anchor': [b['ax'], b['ay']], 'pieces': split_pieces(idx, cfg, b)}
            idx_for_review[lname] = idx
            refmap[lname] = {'box': box, 'w': b['W'], 'h': b['H'], 'anchor': [b['ax'], b['ay']]}
        continue
    idx = quantize(b['solid'], b['rim'], b['glow'], b['g'], stone_rim=bool(cfg.get('frame')))
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
        result['stream'] = {'w': 64, 'h': 64, 'anchor': [0, 32], 'pieces': split_pieces(tile, cfg, b, keep_full=True, wrap=True)}
        result['stream_head'] = {'w': int(head.shape[1]), 'h': 72, 'anchor': [32, 36], 'pieces': split_pieces(head, cfg, b, keep_full=True)}
        idx_for_review['stream'] = tile
        idx_for_review['stream_head'] = head
        bx0, by0, bx1, by1 = b['g']['box']
        sx = sx_of(cfg)
        refmap['stream'] = {'box': [round(bx0, 3), round(by0 + 4 / SY, 3), round(bx0 + 64 / sx, 3), round(by0 + 68 / SY, 3)], 'w': 64, 'h': 64, 'anchor': [0, 32]}
        refmap['stream_head'] = {'box': [round(bx0 + 64 / sx, 3), round(by0, 3), round(bx1, 3), round(by1, 3)], 'w': int(head.shape[1]), 'h': 72, 'anchor': [32, 36]}
        continue
    result[name] = {'w': b['W'], 'h': b['H'], 'anchor': [b['ax'], b['ay']], 'pieces': split_pieces(idx, cfg, b)}
    idx_for_review[name] = idx
    refmap[name] = {'box': box, 'w': b['W'], 'h': b['H'], 'anchor': [b['ax'], b['ay']]}

for name, r in result.items():
    print('%-11s %3dx%-3d anchor %3d,%-3d pieces %s' % (name, r['w'], r['h'], r['anchor'][0], r['anchor'][1], ','.join(r['pieces'])))

hexc = lambda c: '#%02x%02x%02x' % tuple(int(round(v)) for v in c)
pal_json = [{'rgba': '#%02x%02x%02x%02x' % p[:4], 'kind': p[4], 'fam': p[5]} for p in PAL]
veil = {'deep': hexc(VEIL_DEEP), 'light': hexc(VEIL_LIGHT), 'alpha': round(VEIL_A, 3)}
ts = ["// GENERATED by tools/refs/poison-from-ref.py from the owner's paint-over of the poison sheet",
      "// (docs/reference/poison-set-owner-reference.jpg): do not edit by hand. One palette for the set",
      "// (his greens, violets and neutrals; his rims; his light with alpha); each sprite's key frame is",
      "// split into pieces of base64 run-length data, as (run, palette index + 1) byte pairs (0 = clear),",
      "// each placed at (x, y) in the sprite's frame.", '',
      "export type PoisonKind = 'body' | 'outline' | 'glow';",
      "export type PoisonFam = 'green' | 'purple' | 'neutral';",
      'export interface PoisonPal { rgba: string; kind: PoisonKind; fam: PoisonFam }',
      'export interface PoisonPiece { x: number; y: number; w: number; h: number; rle: string }',
      'export interface PoisonRef { w: number; h: number; anchor: [number, number]; pieces: Record<string, PoisonPiece> }',
      '/** Game px per pixel of his sheet (across, down). */',
      'export const PV3_SCALE: [number, number] = [%s, %s];' % (SX, round(SY, 5)),
      '/** The tint his aura lays over the figure (fitted: his figure in the aura against his plain figure). */',
      'export const PV3_VEIL = ' + json.dumps(veil) + ';',
      'export const PV3_PAL: PoisonPal[] = ' + json.dumps(pal_json) + ';',
      'export const PV3_REF: Record<string, PoisonRef> = ' + json.dumps(result, indent=1) + ';', '']
tmp = OUT_TS + '.part'
with open(tmp, 'w') as fh:
    fh.write('\n'.join(ts))
os.replace(tmp, OUT_TS)

if REVIEW:
    os.makedirs(REVIEW, exist_ok=True)
    tmp = os.path.join(REVIEW, 'refmap.json.part')
    with open(tmp, 'w') as fh:
        json.dump(refmap, fh, indent=1)
    os.replace(tmp, os.path.join(REVIEW, 'refmap.json'))

    def rgba_of(idx):
        out = np.zeros(idx.shape + (4,))
        on = idx > 0
        out[on] = PALC[idx[on] - 1]
        return out

    def comp(rgba, bg):
        A = rgba[..., 3:] / 255
        return rgba[..., :3] * A + np.asarray(bg, np.float64) * (1 - A)

    for name, rm in refmap.items():
        his = resample(IM0, rm['box'], rm['w'], rm['h'])
        Image.fromarray(np.clip(his, 0, 255).astype(np.uint8)).save(os.path.join(REVIEW, 'his-' + name + '.png'))
        idx = idx_for_review[name]
        rgba = rgba_of(idx)
        H, W = idx.shape
        k = 4 if max(W, H) < 120 else 3 if max(W, H) < 200 else 2
        imgs = [his, comp(rgba, BG), comp(rgba, [84, 110, 70])]
        if name == 'aura':
            back = rgba_of(idx_for_review['aura_back'])
            imgs.append(comp(rgba, comp(char_in_frame(built['aura']), comp(back, BG))))
            imgs.append(comp(back, BG))
        S = Image.new('RGB', (W * k * len(imgs) + 10 * len(imgs), H * k), (0, 0, 0))
        for i, x in enumerate(imgs):
            S.paste(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).resize((W * k, H * k), Image.NEAREST), (i * (W * k + 10), 0))
        S.save(os.path.join(REVIEW, 'x-' + name + '.png'))
