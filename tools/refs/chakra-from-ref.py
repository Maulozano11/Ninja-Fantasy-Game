"""Cuts the owner's paint-over of the chakra sheet into game-scale key frames for vfx_chakra_v3.

    python3 -I tools/refs/chakra-from-ref.py docs/reference/chakra-set-owner-reference.jpg \
        tools/world-sprites/vfx-chakra-v3-refdata.ts [reviewDir]

With a review directory it also writes his crops (his-<name>.png), where each key frame lies in his
sheet (his-map.json, for chakra-v3-review.py) and before/after previews (key-<name>.png: his crop,
ours on his background, ours on grass). With CHAKRA_DEBUG=<dir> it also writes the class map of
every panel (cls-<name>.png).

The owner wants his reference copied as exactly as possible, so every key frame is HIS pixels:

* Scale. His sheet is a paint-over of our 2x chakra sheet brought down to 1x: his characters
  (beside the blast, the wall, inside the aura) are 94-97 px tall against our 96, and his frame
  for the horizontal wall is 261 px between the posts against our 257. So one of his pixels is one
  game pixel; nothing is resampled. Each sprite is placed by an anchor measured on his art (the
  vortex core, the orb's centre, the seal circle's centre, the ground line under the posts...).
* Clean-up. His panel background, his characters, the labels and the panel borders are removed;
  what his character hid of the aura's glow and of the 3/4 wall's shadow is filled in from round
  it. JPEG noise is smoothed before every decision; colours are read from a lightly sharpened
  copy (the JPEG washes out his crisp edges).
* Classes, decided per pixel:
    blue    - the chakra itself (swirls, beams, crescents, spikes, hex lines): opaque, quantized to
              one blue ramp for the set (median cut of his own pixels), navy to white;
    gold    - his gold seals, rims and frames: opaque, one gold ramp from his pixels;
    cream   - his small warm flecks round the bolt and the slash: opaque, their own greyish-cream
              ramp read from his own pixels (they are not his seal gold);
    outline - his dark rims: a clean 1 px tinted outline (deep blue round chakra, dark gold round
              gold) wherever his art has a rim or ends on the background;
    glow    - his soft blue light (the blast's pillar haze, the halo round the orbs and the
              wall's crest): kept SEMI-TRANSPARENT, un-blended from his background (colour to
              alpha), so it composites back to his look on any map;
    warm    - the same for his warm light (the gold glow at the aura's feet);
    barrier - the body of the hexagon barrier: see-through like our barrier, un-blended with an
              alpha floor so it stays a solid blue pane;
    shade   - the soft blue shadow the 3/4 wall casts on the ground (un-blended, faded where his
              panel cut it).
* Palette. One for the set: a blue ramp (28), a gold ramp (16) and a cream ramp for the flecks
  (6, last, so the other entries keep their indices), median cut of his pixels then refined
  (k-means); his light in a few hues x alpha steps, each pixel taking the entry whose look over
  his background is nearest to his.
* Pieces. Each key frame is split into pieces the generator animates on their own: 'loose' (his
  small flecks, sparkles and dots), the sphere's 'orb' and 'ring', the hit's 'core', the blast's
  'seal', 'lines' and 'pillar', the walls' gold 'frame' and the 3/4 wall's 'shadow', the aura's
  'ringfront' (the near half of the ring, drawn over the character), and the rest ('main'). For
  the blast the pillar piece takes its own halo (the light it spills 4 px round it), and it also
  keeps what his picture hides, for the frames where it is not covered: the haze under the
  circle, the lines and the pillar ('under': filled in from his haze round them; where the pillar
  stood it is rebuilt row by row from his haze beside it and brought to the level of the haze band
  in the circle, thinning upward, so no dark pit and no ghost pillar are left) and the far arcs of
  the circle and the hexagram behind the pillar ('sealback', 'linesback': their near halves turned
  half a turn about the circle's centre).
* The stream tile is one 64 px period of his beam (it repeats every 64.4 px), its first columns
  blended into the next period's so it closes into a loop; the head starts two periods later, so a
  line of tiles plus the head is his picture.
The result is indexed run-length data (tools/world-sprites/vfx-chakra-v3-refdata.ts) that
tools/world-sprites/vfx-chakra-v3.ts decodes and animates. Deterministic.
"""
import base64
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

REF, OUT_TS = sys.argv[1], sys.argv[2]
REVIEW = sys.argv[3] if len(sys.argv) > 3 else None

IM = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
H0, W0 = IM.shape[:2]
BG = np.array([30.0, 29.0, 37.0])  # his panel fill (median of empty panel areas)

# --- small image tools -----------------------------------------------------------------------

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def lum(c):
    return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]


def gauss(a, s):
    """Separable gaussian blur of an HxW or HxWxC float array (edges clamped)."""
    if s <= 0:
        return a.astype(np.float64).copy()
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
    """m shifted by (dy, dx): out[y, x] = m[y - dy, x - dx], clear (or wrapped in x) at the edges."""
    H, W = m.shape[:2]
    if wrap:
        m = np.roll(m, dx, 1)
        dx = 0
    out = np.zeros_like(m)
    out[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return out


def dilate(m, n=1, wrap=False, nb=N4):
    for _ in range(n):
        out = m.copy()
        for dy, dx in nb:
            out |= shift(m, dy, dx, wrap)
        m = out
    return m


def erode(m, n=1, wrap=False, nb=N4):
    return ~dilate(~m, n, wrap, nb)


def components(m, nb=N8, wrap=False):
    """Labels of the connected components of a bool mask (flood fill)."""
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


def fill_enclosed(m):
    """m plus every region it encloses (background regions not touching the border)."""
    lab, n = components(~m, N4)
    H, W = m.shape
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    out = m.copy()
    for k in range(1, n + 1):
        if k not in edge:
            out |= lab == k
    return out


def poly_mask(h, w, polys, x0=0, y0=0):
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([(x - x0, y - y0) for x, y in p], fill=255)
    return np.asarray(m) > 0


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def ellipse(cx, cy, rx, ry, n=64):
    return [(cx + rx * np.cos(t), cy + ry * np.sin(t)) for t in np.linspace(0, 2 * np.pi, n, endpoint=False)]


def c2a(c, floor=0.0):
    """Colour-to-alpha against his background: the least alpha a with c = a*F + (1-a)*BG, F in
    [0, 255]; with `floor`, alpha is at least that (F then darker), so a pane stays a pane."""
    d = np.maximum(c - BG, 0)
    a = np.clip(np.maximum((d / (255 - BG)).max(-1), floor), 0, 1)
    F = BG + (c - BG) / np.maximum(a, 1e-6)[..., None]
    return a, np.clip(F, 0, 255)


def fill_holes(c, hole, src, iters=600):
    """Fills `hole` by diffusion from the pixels round it (his glow where `src`, his background
    elsewhere), so what his character hid continues smoothly across the gap."""
    base = np.where(src[..., None], c, BG)
    out = base.copy()
    out[hole] = BG
    for _ in range(iters):
        p = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        out[hole] = avg[hole]
    res = c.copy()
    res[hole] = out[hole]
    return res


SMOOTH = gauss(IM, 0.55)
SHARP = np.clip(IM + 0.5 * (IM - gauss(IM, 0.9)), 0, 255)

# --- the sprites ------------------------------------------------------------------------------
# All coordinates are HIS (pixels of his sheet; one is one game pixel).
# crop:    the part of his panel holding the art (inside the panel border); the rest is clear.
# anchor:  the projectile core / seal centre / ground centre / feet / the breath's origin (4 px
#          left of the centre of his orb, as on our breath) / the stream's left end.
# solid:   alpha (colour to alpha) from which a blue pixel is opaque chakra, not glow;
#          solidL: and the brightness it needs as well.
# glowA:   the faintest alpha kept as glow.
# warm:    how much redder than blue a pixel must be to be gold or warm light (cream flecks: less).
# goldL:   the brightness gold needs (darker warm pixels are warm light).
# enclose: regions the opaque chakra encloses are opaque too (his dark lines inside a shape).
# glow:    polygons where only bright pixels (lum >= glowL) are opaque; the rest is light.
# barrier: polygons of the barrier's pane (lum < lineL there is the see-through pane).
# shade:   polygons of the ground shadow.
# fill:    his character: removed, and what he hid filled in from round it.
# noring:  polygons where no outline is added (thin lines lying on his glow).
# loose:   small separate bits (up to this many px) are the 'loose' piece (flecks, sparkles).
# cream:   his small warm flecks are greyish cream, not seal gold: they take their own ramp.
# pieces:  [(piece, polygons or None, kinds or None)], first match wins; the rest is 'main'.
# fade:    {side: px}: his art ran off his panel there; it fades out over px pixels.
# frame:   (x0, y0, x1, y1) fixed frame in his coordinates (the stream tile and head).
STREAM_X0, STREAM_Y0 = 312, 40   # the tile: his x 312..376 (one 64 px period of his beam)
HEAD_X0 = STREAM_X0 + 2 * 64     # the head starts where the second tile after it would
SEAM = 8                         # the tile's first columns blend into the next period's

# The blast's pillar. What it hides (the haze, the far arcs of the seal circle and the hexagram) is
# needed while the pillar is not up: the haze is filled in from round it, and the circle and the
# hexagram behind it are their near halves turned half a turn about the circle's centre (both are
# symmetric that way, so the far arcs fall where his circle runs behind the pillar).
PILLAR = [(388, 174), (456, 174), (456, 290), (466, 300), (466, 320), (376, 320), (376, 300), (388, 290)]
# The pillar's own light spills a few px round it: that halo belongs to the pillar (it goes with it).
PILLAR_HALO = 4

SPRITES = {
    'bolt': dict(crop=(8, 43, 71, 106), anchor=(45, 72), solid=0.30, enclose=True, warm=6, loose=40, cream=True),
    'stream': dict(crop=(STREAM_X0, 42, STREAM_X0 + 64, 105), frame=(STREAM_X0, STREAM_Y0, STREAM_X0 + 64, STREAM_Y0 + 64),
                   anchor=(STREAM_X0, 72), tile=True, solid=0.45, solidL=80, loose=24),
    'stream_head': dict(crop=(HEAD_X0, 42, 513, 105), frame=(HEAD_X0, STREAM_Y0, 518, STREAM_Y0 + 68),
                        anchor=(HEAD_X0 + 32, 72), head=True, solid=0.45, solidL=80, loose=24),
    'breath': dict(crop=(526, 43, 638, 145), anchor=(534, 92), solid=0.34, enclose=True, loose=24),
    'sphere': dict(crop=(652, 43, 724, 105), anchor=(684, 71), solid=0.36, enclose=True, loose=12,
                   pieces=[('ring', [ellipse(684, 71, 22.5, 22.5)], ['gold', 'goldline']),
                           ('orb', [ellipse(684, 71, 17.5, 17.5)], None)]),
    'slash': dict(crop=(8, 174, 71, 237), anchor=(39, 205), solid=0.34, enclose=True, warm=6, loose=30, cream=True),
    'multi': dict(crop=(116, 174, 179, 237), anchor=(147, 205), solid=0.26, enclose=True, loose=12),
    'hit': dict(crop=(225, 174, 288, 237), anchor=(256, 205), solid=0.24, enclose=True, loose=12,
                pieces=[('core', [ellipse(256, 205, 15, 15)], None)]),
    'blast': dict(crop=(333, 174, 511, 362), anchor=(420, 306), solid=0.5, glowA=0.04, loose=30, warm=8,
                  fade={'top': 16, 'left': 8, 'right': 10, 'bottom': 6},
                  glow=[rect(333, 174, 511, 362)], glowL=168, noring=[rect(333, 174, 511, 362)],
                  pieces=[('seal', [ellipse(420, 306, 84, 53)], ['gold', 'goldline']),
                          ('pillar', [PILLAR], ['blue', 'glow']),
                          ('lines', [ellipse(420, 306, 84, 53)], ['blue', 'outline'])],
                  hidden=dict(poly=PILLAR, reflect=['seal', 'lines'], halo=PILLAR_HALO, ring=(420, 306, 84, 53)), halo={'seal': 3, 'pillar': PILLAR_HALO}),
    'wall': dict(crop=(8, 392, 281, 520), anchor=(145, 513), solid=0.45, barrier=[rect(22, 408, 268, 503)], lineL=118, loose=10,
                 pieces=[('frame', None, ['gold', 'goldline'])]),
    'wall_diag': dict(crop=(464, 392, 762, 667), anchor=(584, 588), solid=0.45, glowA=0.04, fade={'right': 18, 'bottom': 14},
                      barrier=[[(498, 532), (660, 425), (660, 535), (498, 642)]], lineL=118, loose=10,
                      shade=[[(486, 660), (683, 534), (762, 552), (762, 667), (500, 667)]],
                      fill=[[(721, 486), (746, 485), (752, 506), (756, 525), (758, 545), (755, 560), (759, 575), (748, 589),
                             (725, 594), (709, 579), (700, 568), (696, 550), (709, 536), (709, 518), (715, 500)],
                            [(696, 556), (762, 576), (762, 645), (745, 634), (714, 606), (696, 590)]],
                      pieces=[('frame', None, ['gold', 'goldline']), ('shadow', None, ['shade'])]),
    'aura': dict(crop=(348, 392, 429, 519), anchor=(388, 505), solid=0.3, glowA=0.1, goldL=150, loose=60, fillA=0.3,
                 fade={'left': 5, 'right': 5},
                 fill=[[(372, 411), (398, 409), (404, 419), (405, 440), (409, 448), (409, 470), (406, 478), (405, 498),
                        (401, 508), (372, 510), (366, 500), (366, 470), (363, 450), (367, 440), (370, 425)]],
                 pieces=[('ringfront', [rect(348, 503, 429, 519)], ['gold', 'goldline'])]),
}

CLEAR, GLOW, WARM, BARRIER, SHADE, BLUE, GOLD, OUTLINE, GOLDLINE, CREAM = range(10)
KIND_OF = ['clear', 'glow', 'warm', 'barrier', 'shade', 'blue', 'gold', 'outline', 'goldline', 'cream']
LBG = float(lum(BG))


def source(cfg):
    """His pixels for a sprite, and where they sit in his sheet. The stream tile is his 64 px
    period with its first columns blended into the next period's (so it closes into a loop),
    laid three times side by side so every blur wraps."""
    x0, y0, x1, y1 = cfg['crop']
    if not cfg.get('tile'):
        return IM[y0:y1, x0:x1].copy(), x0, y0
    t = IM[y0:y1, x0:x1].copy()
    for k in range(SEAM):
        w = 1 - (k + 0.5) / SEAM
        t[:, k] = w * IM[y0:y1, x1 + k] + (1 - w) * IM[y0:y1, x0 + k]
    return np.concatenate([t, t, t], 1), x0 - 64, y0


def classify(name, cfg):
    c, ox, oy = source(cfg)
    H, W = c.shape[:2]
    pm = lambda key: poly_mask(H, W, cfg.get(key, []), ox, oy)
    hole, drop = pm('fill'), pm('drop')
    if hole.any():
        a0, _ = c2a(gauss(c, 0.6))
        cw = gauss(c, 0.6)
        warm0 = (cw[..., 0] - cw[..., 2] > 16) & (cw[..., 0] > 70)
        c = fill_holes(c, hole, ~hole & ~drop & (a0 >= 0.03) & ((a0 <= cfg.get('fillA', 1.0)) | warm0))
    c[drop] = BG
    cs = gauss(c, 0.6)
    cm = gauss(c, 0.45)
    sh = np.clip(c + 0.5 * (c - gauss(c, 0.9)), 0, 255)
    a, F = c2a(cs)
    L = lum(cs)
    warm = (cs[..., 0] - cs[..., 2] > cfg.get('warm', 16)) & (cs[..., 0] > 70)
    cls = np.zeros((H, W), np.int8)
    ga = cfg.get('glowA', 0.05)
    cls[a >= ga] = GLOW
    cls[warm & (a >= ga)] = WARM
    solid = (a >= cfg.get('solid', 0.4)) & (L >= cfg.get('solidL', 0)) & ~warm
    cls[solid] = BLUE
    cls[warm & (a >= 0.3) & (L >= cfg.get('goldL', 70))] = GOLD
    g = pm('glow')
    cls[g & (cls == BLUE) & (L < cfg.get('glowL', 0))] = GLOW
    b = pm('barrier')
    cls[b & np.isin(cls, (GLOW, BLUE)) & (L < cfg.get('lineL', 0))] = BARRIER
    cls[b & (cls == CLEAR) & ~hole] = BARRIER
    s = pm('shade')
    cls[s & np.isin(cls, (GLOW, BLUE))] = SHADE
    if cfg.get('enclose'):
        op = np.isin(cls, (BLUE, GOLD))
        inner = fill_enclosed(op) & ~op
        cls[inner & warm] = GOLD
        cls[inner & ~warm] = BLUE
    # Lone opaque pixels that are not clearly bright are glow; lone glow specks go.
    lab, n = components(cls == BLUE, N8)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    cls[(cls == BLUE) & (sizes[lab] <= 1) & (L < 120)] = GLOW
    nb = sum(shift(cls >= 1, dy, dx).astype(int) for dy, dx in N8)
    cls[np.isin(cls, (GLOW, WARM)) & (nb <= 1)] = CLEAR
    # The outline: a 1 px tinted ring round opaque chakra and gold where his art ends on his
    # background or on a dark rim of his (not where it runs into his glow).
    blue, gold = cls == BLUE, cls == GOLD
    dark = (L < LBG + 10) | (cls == CLEAR)
    nr = pm('noring')
    ring_b = dilate(blue) & ~blue & ~gold & dark & ~nr
    ring_g = dilate(gold) & ~blue & ~gold & dark & ~nr
    cls[ring_b] = OUTLINE
    cls[ring_g & ~ring_b] = GOLDLINE
    if cfg.get('cream'):
        # His small warm flecks (the bolt's, the slash's) are a greyish cream, not his seal gold.
        lab, n = components(np.isin(cls, (BLUE, GOLD, OUTLINE, GOLDLINE)), N8)
        sizes = np.bincount(lab.ravel(), minlength=n + 1)
        cls[(lab > 0) & (sizes[lab] <= cfg['loose']) & (cls == GOLD)] = CREAM
    d = dict(c=c, cs=cs, cm=cm, sh=sh, a=a, F=F, cls=cls, hole=hole, ox=ox, oy=oy)
    if cfg.get('hidden'):
        # The haze behind the pillar, the circle, its lines and the sparks: filled in from the haze
        # and the background round them (every opaque pixel and the pillar's own light is a hole).
        pol = dilate(poly_mask(H, W, [cfg['hidden']['poly']], ox, oy), cfg['hidden'].get('halo', 0), nb=N8)
        holes = pol | np.isin(cls, (BLUE, GOLD, OUTLINE, GOLDLINE, WARM))
        holes |= dilate(cls == GOLD, 3, nb=N8)
        cu = fill_holes(c, holes, ~holes)
        # Where the pillar stood (with its halo), a diffusion fill is fed by the dark sky above it and
        # leaves a dark pit in the circle once the pillar has gone. So the haze there is rebuilt row
        # by row from his haze just left and right of it, smoothed down the column, and brought to the
        # level of the haze band inside the circle round it (so no pit and no ghost pillar); then the
        # small holes round it are filled again from it.
        ys = np.nonzero(pol.any(1))[0]
        rows = np.zeros((len(ys), 2, 3))
        for i, y in enumerate(ys):
            xs = np.nonzero(pol[y])[0]
            rows[i, 0] = cu[y, max(0, xs[0] - 3):xs[0]].mean(0)
            rows[i, 1] = cu[y, xs[-1] + 1:xs[-1] + 4].mean(0)
        r = 7
        kern = np.exp(-0.5 * (np.arange(-r, r + 1) / 2.5) ** 2)
        kern /= kern.sum()
        padded = np.pad(rows, ((r, r), (0, 0), (0, 0)), mode='edge')
        sm = sum(w * padded[k:k + len(ys)] for k, w in enumerate(kern))
        for i, y in enumerate(ys):
            xs = np.nonzero(pol[y])[0]
            u = (xs - xs[0] + 0.5) / (len(xs) + 0.0)
            cu[y, xs] = sm[i, 0] * (1 - u[:, None]) + sm[i, 1] * u[:, None]
        ecx, ecy, erx, ery = cfg['hidden']['ring']
        yy, xx = np.mgrid[:H, :W]
        ell = ((xx + ox - ecx) / erx) ** 2 + ((yy + oy - ecy) / ery) ** 2 < 1
        band, mid = lum(c[ell & ~holes]).mean(), lum(cu[ell & pol]).mean()
        k = min(1.0, (band - LBG) / max(1e-6, mid - LBG))
        # Above the circle it thins out upward: a glow pool at the pillar's base, not a ghost pillar.
        up = np.clip((ecy - ery - (yy + oy)) / 44.0, 0, 1)
        kk = k * (1 - 0.6 * up * up * (3 - 2 * up))
        cu[pol] = BG + (cu[pol] - BG) * kk[pol][:, None]
        # Its rim blends into his haze round it, so no straight seam shows.
        rim = pol & ~erode(pol, 5, nb=N8)
        cu = fill_holes(cu, rim, ~rim, iters=80)
        cu = fill_holes(cu, holes & ~pol, ~(holes & ~pol))
        au, _ = c2a(gauss(cu, 0.6))
        d['under'] = holes & (au >= cfg.get('glowA', 0.05))
        d['under_cm'] = gauss(cu, 0.45)
    if cfg.get('tile'):
        for k in ('c', 'cs', 'cm', 'sh', 'a', 'F', 'cls', 'hole'):
            d[k] = d[k][:, 64:128]
        d['ox'] = ox + 64
    d['H'], d['W'] = d['cls'].shape
    return d


def class_preview(d, k=4):
    col = np.array([[0, 0, 0], [40, 80, 160], [160, 110, 40], [30, 60, 120], [60, 60, 90], [120, 200, 255], [255, 200, 60], [255, 0, 255], [255, 120, 0], [230, 220, 190]], np.uint8)
    img = col[d['cls']]
    his = np.clip(d['c'], 0, 255).astype(np.uint8)
    both = np.concatenate([his, np.zeros((d['H'], 4, 3), np.uint8), img], 1)
    return Image.fromarray(both).resize((both.shape[1] * k, both.shape[0] * k), Image.NEAREST)


DATA = {n: classify(n, cfg) for n, cfg in SPRITES.items()}
if os.environ.get('CHAKRA_DEBUG'):
    dbg = os.environ['CHAKRA_DEBUG']
    os.makedirs(dbg, exist_ok=True)
    for n, d in DATA.items():
        class_preview(d, 4 if max(d['W'], d['H']) < 150 else 2).save(os.path.join(dbg, 'cls-' + n + '.png'))

# --- the palette: one for the set, from his pixels -----------------------------------------------


def median_cut(cols, n):
    cols = np.asarray(np.clip(np.round(cols), 0, 255), np.uint8).reshape(1, -1, 3)
    q = Image.fromarray(cols, 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:n * 3], np.float64).reshape(-1, 3)
    used = np.unique(np.asarray(q).ravel())
    return pal[used]


def nearest(cols, pal):
    return ((cols[..., None, :] - pal) ** 2).sum(-1).argmin(-1)


def refine(cols, pal, iters=10):
    """A few Lloyd (k-means) steps from the median cut, so the ramp follows his pixels closely."""
    cols = np.asarray(cols, np.float64)
    pal = pal.copy()
    for _ in range(iters):
        lab = nearest(cols, pal)
        for k in range(len(pal)):
            m = lab == k
            if m.any():
                pal[k] = cols[m].mean(0)
    return np.round(pal)


def gather(cl, key):
    cl = cl if isinstance(cl, tuple) else (cl,)
    parts = [d[key][np.isin(d['cls'], cl)] for d in DATA.values() if np.isin(d['cls'], cl).any()]
    return np.concatenate(parts) if parts else np.zeros((0, 3))


def by_lum(p):
    return p[np.argsort(lum(p))]


def unblend(cl, floor=0.0):
    """His colours of a light class, un-blended from his background: (colour, alpha) per pixel."""
    out_c, out_a = [], []
    for d in DATA.values():
        m = d['cls'] == cl
        if m.any():
            a, F = c2a(d['cm'][m], floor)
            # Only clear enough light tells its hue (faint pixels un-blend to noise).
            ok = a >= max(0.12, floor)
            out_c.append(F[ok])
            out_a.append(a[ok])
    return np.concatenate(out_c), np.concatenate(out_a)


# (The gold ramp is still sampled with the flecks in it, as it was before they had their own.)
_b, _g = gather(BLUE, 'sh'), gather((GOLD, CREAM), 'sh')
BLUE_RAMP = by_lum(refine(_b, median_cut(_b, 28)))
GOLD_RAMP = by_lum(refine(_g, median_cut(_g, 16)))
# His flecks' greyish cream, read from his own pixels (sharpening warms and brightens such small
# marks, smoothing dims them).
_c = gather(CREAM, 'c')
CREAM_RAMP = by_lum(refine(_c, median_cut(_c, 6)))
# His rims are near-black navy; they are kept as a deep blue and a dark gold (never black).
OUTLINES = {'outline': np.array([22.0, 34.0, 96.0]), 'goldline': np.array([86.0, 50.0, 14.0])}
LIGHTS = {  # kind: (class, hues, alpha levels 0..255, alpha floor)
    'glow': (GLOW, 9, [12, 22, 34, 48, 64, 84, 108, 136, 168, 204], 0.0),
    'warm': (WARM, 4, [12, 22, 34, 48, 64, 84, 108, 136, 168], 0.0),
    'barrier': (BARRIER, 7, [180, 196, 212, 228, 244], 0.7),
    'shade': (SHADE, 3, [12, 22, 34, 48, 64, 84, 108, 136], 0.0),
}
HUES = {}
for kind, (cl, nh, levels, floor) in LIGHTS.items():
    cols, al = unblend(cl, floor)
    HUES[kind] = by_lum(refine(cols, median_cut(cols, nh))) if len(cols) else np.zeros((0, 3))

PAL = []  # (r, g, b, a, kind, order, hue)
IDX = {}


def add(kind, cols, alphas=None):
    IDX[kind] = []
    if alphas is None:
        for i, c in enumerate(cols):
            PAL.append((*[int(round(v)) for v in c], 255, kind, i, 0))
            IDX[kind].append(len(PAL) - 1)
        return
    for h, c in enumerate(cols):
        row = []
        for i, a in enumerate(alphas):
            PAL.append((*[int(round(v)) for v in c], a, kind, i, h))
            row.append(len(PAL) - 1)
        IDX[kind].append(row)


add('outline', [OUTLINES['outline']])
add('goldline', [OUTLINES['goldline']])
add('blue', BLUE_RAMP)
add('gold', GOLD_RAMP)
for kind, (cl, nh, levels, floor) in LIGHTS.items():
    add(kind, HUES[kind], levels)
add('cream', CREAM_RAMP)  # last, so every other entry keeps its index
if len(PAL) > 254:
    raise SystemExit('chakra-from-ref: palette too big (%d)' % len(PAL))
PALC = np.array([p[:4] for p in PAL], np.float64)


def light_index(kind, cols):
    """The light entry (hue and alpha) whose look over his background is nearest to his pixel."""
    ent = np.array(IDX[kind]).ravel()
    comp = PALC[ent, 3:4] / 255 * PALC[ent, :3] + (1 - PALC[ent, 3:4] / 255) * BG
    return ent[nearest(cols, comp)] + 1


def quantize(name, d):
    H, W = d['H'], d['W']
    cls = d['cls']
    idx = np.zeros((H, W), np.int32)  # palette index + 1, 0 = clear
    for kind, cl, ramp, src in (('blue', BLUE, BLUE_RAMP, 'sh'), ('gold', GOLD, GOLD_RAMP, 'sh'), ('cream', CREAM, CREAM_RAMP, 'c')):
        m = cls == cl
        if m.any():
            idx[m] = np.array(IDX[kind])[nearest(d[src][m], ramp)] + 1
    # Speck clean-up: an opaque pixel unlike all four neighbours and close to them in brightness
    # is JPEG noise and takes their commonest value (real highlights stand out and stay).
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = idx[y, x]
            if not v:
                continue
            nb = [idx[y, x + 1], idx[y, x - 1], idx[y + 1, x], idx[y - 1, x]]
            if v in nb or not all(nb) or any(PAL[n - 1][4] != PAL[v - 1][4] for n in nb):
                continue
            m = max(set(nb), key=nb.count)
            if abs(lum(PALC[v - 1][:3]) - lum(PALC[m - 1][:3])) < 30:
                idx[y, x] = m
    idx[cls == OUTLINE] = IDX['outline'][0] + 1
    idx[cls == GOLDLINE] = IDX['goldline'][0] + 1
    for kind, (cl, nh, levels, floor) in LIGHTS.items():
        m = cls == cl
        if not m.any():
            continue
        idx[m] = light_index(kind, d['cm'][m])
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
MARGIN = 2


def pieces_add(pieces, pname, sub, cfg, fw, fh):
    if cfg.get('tile') or cfg.get('head'):
        bx0, by0, bx1, by1 = 0, 0, fw, fh
    else:
        ys2, xs2 = np.nonzero(sub)
        bx0, by0, bx1, by1 = xs2.min(), ys2.min(), xs2.max() + 1, ys2.max() + 1
    pieces[pname] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0),
                     'rle': rle(sub[by0:by1, bx0:bx1].ravel())}
RESULT = {}
FRAMES = {}
for name, cfg in SPRITES.items():
    d = DATA[name]
    idx = quantize(name, d)
    H, W = idx.shape
    ox, oy = d['ox'], d['oy']
    if 'frame' in cfg:
        fx0, fy0, fx1, fy1 = cfg['frame']
    else:
        ys, xs = np.nonzero(idx)
        fx0, fy0 = xs.min() + ox - MARGIN, ys.min() + oy - MARGIN
        fx1, fy1 = xs.max() + 1 + ox + MARGIN, ys.max() + 1 + oy + MARGIN
    fw, fh = fx1 - fx0, fy1 - fy0
    frame = np.zeros((fh, fw), np.int32)
    sx0, sy0 = max(ox, fx0), max(oy, fy0)
    sx1, sy1 = min(ox + W, fx1), min(oy + H, fy1)
    frame[sy0 - fy0:sy1 - fy0, sx0 - fx0:sx1 - fx0] = idx[sy0 - oy:sy1 - oy, sx0 - ox:sx1 - ox]
    kinds = KIND[frame]
    owner = np.full(frame.shape, 'main', dtype=object)
    assigned = frame == 0
    for pname, polys, pk in cfg.get('pieces', []):
        m = ~assigned
        if polys is not None:
            m &= poly_mask(fh, fw, polys, fx0, fy0)
        if pk is not None:
            m &= np.isin(kinds, pk)
        owner[m] = pname
        assigned |= m
        if pname in cfg.get('halo', {}):
            # The light round this piece (the JPEG's glow round his gold) belongs to it.
            h = dilate(m, cfg['halo'][pname], nb=N8) & ~assigned & np.isin(kinds, ['glow', 'warm'])
            owner[h] = pname
            assigned |= h
    if cfg.get('loose'):
        # Small separate bits (flecks, sparkles, dots) are their own piece.
        opaque = (frame > 0) & np.isin(kinds, ['blue', 'gold', 'cream', 'outline', 'goldline']) & (owner == 'main')
        lab, n = components(opaque, N8, wrap=bool(cfg.get('tile')))
        sizes = np.bincount(lab.ravel(), minlength=n + 1)
        owner[(lab > 0) & (sizes[lab] <= cfg['loose'])] = 'loose'
    if cfg.get('hidden'):
        # Hidden in his picture: the haze under everything that is not haze ('under'), and the far
        # arcs of the circle and the hexagram behind the pillar ('sealback', 'linesback').
        hid = poly_mask(fh, fw, [cfg['hidden']['poly']], fx0, fy0) & (owner == 'pillar') & (frame > 0)
        covered = (owner != 'main') & (frame > 0)
        ax_f, ay_f = cfg['anchor'][0] - fx0, cfg['anchor'][1] - fy0
        extra = {}
        under = np.zeros((fh, fw), np.int32)
        m = d['under']
        tmp = np.zeros((H, W), np.int32)
        tmp[m] = light_index('glow', d['under_cm'][m])
        under[sy0 - fy0:sy1 - fy0, sx0 - fx0:sx1 - fx0] = tmp[sy0 - oy:sy1 - oy, sx0 - ox:sx1 - ox]
        extra['under'] = np.where(covered, under, 0)
        for src in cfg['hidden']['reflect']:
            sub = np.where(owner == src, frame, 0)
            back = np.zeros_like(sub)
            ys, xs = np.nonzero(sub)
            X, Y = np.round(2 * ax_f - xs).astype(int), np.round(2 * ay_f - ys).astype(int)
            ok = (X >= 0) & (Y >= 0) & (X < fw) & (Y < fh)
            back[Y[ok], X[ok]] = sub[ys[ok], xs[ok]]
            extra[src + 'back'] = np.where(hid & (owner != src), back, 0)
    pieces = {}
    names = ['main'] + [p[0] for p in cfg.get('pieces', [])] + ['loose']
    for pname in dict.fromkeys(names):
        m = (owner == pname) & (frame > 0)
        if not m.any():
            continue
        sub = np.where(m, frame, 0)
        pieces_add(pieces, pname, sub, cfg, fw, fh)
    if cfg.get('hidden'):
        for pname, sub in extra.items():
            if sub.any():
                pieces_add(pieces, pname, sub, cfg, fw, fh)
    ax, ay = cfg['anchor']
    RESULT[name] = {'w': int(fw), 'h': int(fh), 'anchor': [int(round(ax - fx0)), int(round(ay - fy0))],
                    'origin': [int(fx0), int(fy0)], 'fade': cfg.get('fade', {}), 'pieces': pieces}
    FRAMES[name] = frame
    edge = np.concatenate([frame[0], frame[-1], frame[:, 0], frame[:, -1]])
    print('%-11s %3dx%-3d anchor %3d,%-3d origin %d,%d pieces %s  border px %d' % (
        name, fw, fh, ax - fx0, ay - fy0, fx0, fy0, ','.join('%s:%d' % (k, (owner == k).sum()) for k in pieces), int((edge > 0).sum())))

pal_json = [{'rgba': '#%02x%02x%02x%02x' % p[:4], 'kind': p[4], 'order': p[5], 'hue': p[6]} for p in PAL]
ts = ["// GENERATED by tools/refs/chakra-from-ref.py from the owner's paint-over of the chakra sheet",
      "// (docs/reference/chakra-set-owner-reference.jpg): do not edit by hand. One palette for the set;",
      "// each sprite's key frame is split into pieces of base64 run-length data, as (run, palette",
      "// index + 1) byte pairs (0 = clear), each placed at (x, y) in the sprite's frame. 'origin' is",
      "// where the frame's (0, 0) lies in his sheet.", '',
      "export type CkKind = 'outline' | 'goldline' | 'blue' | 'gold' | 'glow' | 'warm' | 'barrier' | 'shade' | 'cream';",
      'export interface CkPal { rgba: string; kind: CkKind; order: number; hue: number }',
      'export interface CkPiece { x: number; y: number; w: number; h: number; rle: string }',
      "export interface CkSprite { w: number; h: number; anchor: [number, number]; origin: [number, number]; fade: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>; pieces: Record<string, CkPiece> }",
      'export const CK_PAL: CkPal[] = ' + json.dumps(pal_json) + ';',
      'export const CK_REF: Record<string, CkSprite> = ' + json.dumps(RESULT, indent=1) + ';', '']
tmp = OUT_TS + '.part'
with open(tmp, 'w') as f:
    f.write('\n'.join(ts))
os.replace(tmp, OUT_TS)
print('palette', len(PAL), 'entries:', ', '.join('%s %d' % (k, sum(1 for p in PAL if p[4] == k)) for k in dict.fromkeys(p[4] for p in PAL)))

if REVIEW:
    os.makedirs(REVIEW, exist_ok=True)
    refmap = {}
    for name, frame in FRAMES.items():
        H, W = frame.shape
        r = RESULT[name]
        x0, y0 = r['origin']
        his = np.zeros((H, W, 3)) + BG
        hx0, hy0 = max(0, x0), max(0, y0)
        hx1, hy1 = min(W0, x0 + W), min(H0, y0 + H)
        his[hy0 - y0:hy1 - y0, hx0 - x0:hx1 - x0] = IM[hy0:hy1, hx0:hx1]
        Image.fromarray(his.astype(np.uint8)).save(os.path.join(REVIEW, 'his-%s.png' % name))
        refmap[name] = {'origin': r['origin'], 'anchor': r['anchor'], 'size': [W, H], 'crop': list(SPRITES[name]['crop'])}
        rgba = np.zeros((H, W, 4))
        on = frame > 0
        rgba[on] = PALC[frame[on] - 1]

        def comp(bg):
            A = rgba[..., 3:] / 255
            return (rgba[..., :3] * A + np.array(bg, np.float64) * (1 - A)).astype(np.uint8)
        k = 4 if max(W, H) < 140 else 2
        imgs = [his.astype(np.uint8), comp(BG), comp([84, 110, 70])]
        S = Image.new('RGB', (W * k * 3 + 20, H * k), (0, 0, 0))
        for i, x in enumerate(imgs):
            S.paste(Image.fromarray(x).resize((W * k, H * k), Image.NEAREST), (i * (W * k + 10), 0))
        S.save(os.path.join(REVIEW, 'key-%s.png' % name))
    with open(os.path.join(REVIEW, 'his-map.json'), 'w') as f:
        json.dump(refmap, f, indent=1)
