"""Cuts the owner's paint-over of the earth sheet into game-scale key frames for vfx_earth_v3.

    python3 -I tools/refs/earth-from-ref.py docs/reference/earth-set-owner-reference.jpg \
        tools/world-sprites/vfx-earth-v3-refdata.ts <character.png> [reviewDir]

<character.png> is our scale character at 1x (kit characterRef(), 128x128, feet at (64, 120)); it
places our figure inside his aura, to split the aura into the layers behind and over the figure.

The owner wants his reference copied as exactly as possible ("con la mayor exactitud posible"), so
every key frame is HIS pixels:

* Scale. His sheet is a repaint of our 2x earth kit, drawn bigger: his character is 215-230 of his
  pixels tall where ours is 95 (hair top to soles). Each panel with a character uses its own
  factor (his px per game px): blast 2.39, wall 2.34, 3/4 wall 2.35, end-on wall 2.26, aura 2.39.
  The other panels use the median, 2.35. The stream repeats every 158 of his px, so it is scaled at
  158/64 = 2.47 and a 64 px tile is exactly one of his periods.
* Anchors keep their meaning (projectile core, breath cone tip, ground centre, feet, stream line,
  the impact point of multi_hit) and are measured on his art; frames are sized to his art.
* Clean-up. His panel fill, the page, his characters, the labels and the panel borders are removed
  (art is read as its difference from the fill it lies on, and the border lines are filled from
  both sides). JPEG noise is smoothed before every decision; colours come from a lightly sharpened
  copy.
* Classes, decided at his resolution and then area-averaged (box filter) to game scale:
    body    - rock, spikes, slabs, moss, vines, grass, pebbles, the pale speed streaks: opaque,
              quantized to a palette median-cut from his own pixels of that sprite;
    outline - his deep-brown (or deep moss-green) rims: a clean 1 px tinted outline wherever his
              art has one, never black; JPEG ringing (cold, dark halos) is not outline;
    dust    - his dust clouds, trails, haze and dithered cloud edges: SEMI-TRANSPARENT. In a dust
              zone, art not enclosed by a rim is dust; its alpha comes from its coverage (his
              dithered edges thin out) and its colour is un-blended from his panel fill, so it
              composites back to his look on his background and reads as dust on any map;
    shade   - the blast's shadow on the ground: a dark brown stain, semi-transparent.
* Pieces. Each key frame is split into the parts the generator animates on their own: loose rocks
  and pebbles ('bits'), 'dust', and named parts per sprite (the bolt's boulder, the blast's spikes,
  the wall's moss...); the rest is 'main'.
* The stream tile is the 64 px of his spike row that end exactly where his head begins, closed into
  a loop by a seam cut where its two ends match best; the head is the rest of his row, so a line of
  tiles plus the head is his picture.
* The aura is split for drawing round a character: 'aura_back' (behind) and 'aura' (in front: the
  dust ring's front arc across the waist and the pebbles at the feet), using our character placed
  on his.
The result is indexed run-length data (tools/world-sprites/vfx-earth-v3-refdata.ts) that
tools/world-sprites/vfx-earth-v3.ts decodes and animates. With a review directory it also writes
his crops at game scale and before/after previews. Deterministic.
"""
import base64
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

REF, OUT_TS, CHAR_PNG = sys.argv[1], sys.argv[2], sys.argv[3]
REVIEW = sys.argv[4] if len(sys.argv) > 4 else None
DEBUG = os.environ.get('EARTH_DEBUG')

IM0 = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
H0, W0 = IM0.shape[:2]
BG = np.array([34.0, 34.0, 45.0])    # his panel fill
PAGE = np.array([23.0, 22.0, 30.0])  # his page colour, outside the panels
CHAR = np.asarray(Image.open(CHAR_PNG).convert('RGBA')).astype(np.float64)  # feet at (64, 120)
S_MED = 2.35                         # his px per game px where a panel has no character

# His panels: the border lines (left, top, right, bottom), measured on his sheet.
PANELS = {
    'bolt': (24, 100, 268, 337), 'note': (297, 100, 621, 242), 'stream': (649, 100, 1288, 325),
    'breath': (1316, 100, 1635, 363), 'sphere': (1663, 100, 1923, 349),
    'slash': (24, 434, 268, 680), 'multi': (297, 434, 576, 680), 'hit': (810, 434, 1122, 680),
    'blast': (1158, 434, 1788, 798), 'wall': (23, 866, 901, 1254), 'aura': (928, 866, 1193, 1216),
    'wall_diag': (1221, 866, 1976, 1491), 'wall_depth': (23, 1359, 452, 1975),
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


def erode(m, n=1, nb=N4):
    return ~dilate(~m, n, nb=nb)


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


def flood(free, seeds):
    """Pixels of `free` reachable (4-way) from `seeds`."""
    H, W = free.shape
    seen = seeds & free
    st = list(zip(*np.nonzero(seen)))
    seen = seen.copy()
    while st:
        y, x = st.pop()
        for dy, dx in N4:
            u, v = y + dy, x + dx
            if 0 <= u < H and 0 <= v < W and free[u, v] and not seen[u, v]:
                seen[u, v] = True
                st.append((u, v))
    return seen


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


def ellipse(cx, cy, rx, ry, n=48):
    return [(cx + rx * np.cos(2 * np.pi * k / n), cy + ry * np.sin(2 * np.pi * k / n)) for k in range(n)]


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
        dd[y0 - 2:y0 + 3, x0 - 2:x1 + 3] = d[y0 + 3, x0 - 2:x1 + 3][None]
        dd[y1 - 2:y1 + 3, x0 - 2:x1 + 3] = ((d[y1 - 3, x0 - 2:x1 + 3] + d[min(H0 - 1, y1 + 3), x0 - 2:x1 + 3]) / 2)[None]
        band[y0 - 2:y0 + 3, x0 - 2:x1 + 3] = band[y1 - 2:y1 + 3, x0 - 2:x1 + 3] = True
        for x in (x0, x1):
            dd[y0 - 2:y1 + 3, x - 2:x + 3] = ((d[y0 - 2:y1 + 3, x - 3] + d[y0 - 2:y1 + 3, min(W0 - 1, x + 3)]) / 2)[:, None]
            band[y0 - 2:y1 + 3, x - 2:x + 3] = True
    # Faint differences on the page or a border band (JPEG ringing round the lines) are noise.
    weak = (np.abs(dd).sum(-1) < 30) & (band | (bgmap[..., 0] == PAGE[0]))
    dd[weak] = 0
    return np.clip(BG + dd, 0, 255)


FLAT = flatten()
SMOOTH = gauss(FLAT, 0.7)
SHARP = np.clip(FLAT + 0.5 * (FLAT - gauss(FLAT, 1.0)), 0, 255)

# --- the sprites ------------------------------------------------------------------------------
# All coordinates are HIS (pixels of his sheet).
# s:      his px per game px (one number, or (across, down));
# anchor: the anchor (projectile core; breath cone tip; impact point; ground centre; feet);
# area:   polygons holding his art for this sprite; the rest is ignored;
# drop:   polygons removed first (his characters, stray marks);
# solid:  polygons where all art is opaque body (big shapes whose edge has no rim);
# dust:   polygons where art not enclosed by a rim is semi-transparent dust;
# dust_a: the dust's opacity where it is dense (his cloud cores); edges thin out from there;
# shade:  polygons where a dark stain on the ground is kept as a semi-transparent shadow;
# fade:   {side: n}: the art fades out over its last n game px on that side (his panel cut it);
# pieces: [(name, polygons)]: named pieces split off 'main' (first match wins);
# bits:   the largest loose bit (game px) still counted as a flying rock or pebble.

BOULDER = [(146, 215), (150, 192), (160, 178), (178, 166), (195, 158), (215, 153), (238, 153), (252, 163), (260, 180),
           (265, 205), (265, 232), (259, 252), (248, 268), (230, 281), (208, 287), (185, 284), (166, 272), (153, 255), (147, 236)]
CRESCENT = [(100, 446), (150, 446), (190, 460), (215, 488), (233, 520), (240, 560), (238, 600), (225, 635), (202, 658),
            (160, 672), (100, 672), (140, 655), (165, 630), (172, 600), (175, 560), (170, 520), (158, 490), (135, 465)]
BULLETS = [[(408, 490), (414, 474), (440, 468), (475, 466), (500, 470), (506, 480), (498, 494), (470, 503), (440, 508), (414, 506)],
           [(450, 555), (458, 538), (480, 534), (520, 532), (550, 537), (570, 550), (565, 562), (540, 572), (500, 577), (465, 575), (452, 567)],
           [(390, 616), (398, 604), (420, 602), (450, 603), (475, 608), (495, 622), (497, 636), (480, 643), (450, 644), (420, 640), (398, 630)]]

# The blast's crystals and the rocks at its foot, traced on his panel (their bases are lost in
# the dust, so the rims alone do not close them).
BLAST_SOLID = [
    [(1198, 536), (1209, 513), (1231, 535), (1241, 565), (1251, 592), (1251, 606), (1200, 606)],            # left tall
    [(1175, 602), (1184, 590), (1203, 600), (1210, 630), (1210, 676), (1182, 676)],                         # far left
    [(1268, 480), (1284, 457), (1306, 477), (1309, 515), (1312, 540), (1305, 550), (1270, 552)],            # top left
    [(1283, 600), (1295, 615), (1320, 645), (1330, 662), (1300, 665), (1288, 645)],                         # thin, leaning left
    [(1318, 562), (1330, 557), (1352, 600), (1351, 665), (1318, 665)],                                      # behind the centre
    [(1350, 665), (1351, 600), (1361, 552), (1370, 507), (1378, 472), (1386, 507), (1396, 545), (1409, 596), (1410, 665)],  # centre
    [(1410, 596), (1420, 570), (1430, 540), (1438, 522), (1446, 547), (1448, 610), (1450, 665), (1410, 665)],  # right of centre
    [(1450, 572), (1468, 540), (1474, 525), (1477, 580), (1477, 612), (1452, 612)],                         # thin right
    [(1455, 672), (1470, 640), (1485, 615), (1499, 596), (1500, 640), (1490, 672)],                         # leaning right
    [(1498, 512), (1522, 478), (1537, 495), (1539, 552), (1498, 552)],                                      # top right
    [(1552, 618), (1563, 570), (1587, 547), (1600, 563), (1601, 600), (1580, 618)],                         # right
    [(1580, 680), (1582, 655), (1590, 612), (1612, 583), (1626, 603), (1627, 668), (1620, 682)],            # far right
    [(1197, 690), (1210, 678), (1232, 690), (1246, 734), (1200, 736)],                                      # rock, left
    [(1282, 735), (1300, 715), (1318, 716), (1336, 740), (1343, 776), (1285, 778)],                         # rock, bottom left
    [(1342, 668), (1368, 665), (1369, 696), (1343, 697)],                                                   # block
    [(1504, 712), (1528, 681), (1545, 690), (1558, 715), (1557, 743), (1504, 743)],                         # rock, right
    [(1415, 752), (1432, 736), (1450, 738), (1461, 760), (1460, 788), (1416, 788)],                         # rock, bottom
]

SPRITES = {
    'bolt': dict(s=S_MED, anchor=(206, 221), area=[rect(25, 101, 267, 336)],
                 solid=[BOULDER], dust=[rect(25, 101, 267, 336)], dust_a=0.9,
                 fade={'left': 14}, bits=40, pieces=[('boulder', [BOULDER])]),
    'breath': dict(s=S_MED, anchor=(1323, 237), area=[rect(1317, 101, 1634, 362)],
                   dust=[rect(1317, 101, 1634, 362)], dust_a=0.92, bits=60),
    'sphere': dict(s=S_MED, anchor=(1801, 236), area=[rect(1664, 101, 1922, 348)],
                   solid=[ellipse(1801, 236, 68, 95)], dust=[rect(1664, 101, 1922, 348)], dust_a=0.9, bits=20,
                   pieces=[('planet', [ellipse(1801, 236, 70, 97)])]),
    'slash': dict(s=S_MED, anchor=(150, 556), area=[rect(25, 435, 267, 679)],
                  solid=[CRESCENT], dust=[rect(25, 435, 267, 679)], dust_a=0.9, bits=24),
    'multi': dict(s=S_MED, anchor=(444, 557), area=[rect(298, 435, 575, 679)],
                  solid=BULLETS, dust=[rect(298, 435, 575, 679)], dust_a=0.88, bits=10,
                  pieces=[('b%d' % k, [b]) for k, b in enumerate(BULLETS)]),
    'multi_hit': dict(s=S_MED, anchor=(750, 556), area=[rect(586, 425, 802, 660)],
                      solid=[ellipse(752, 515, 20, 22), ellipse(770, 592, 22, 22)],
                      dust=[rect(586, 425, 802, 660)], dust_a=0.95, bits=60),
    'hit': dict(s=S_MED, anchor=(962, 562), area=[rect(811, 435, 1121, 679)],
                dust=[rect(811, 435, 1121, 679)], dust_a=0.95, bits=60),
    'blast': dict(s=2.39, anchor=(1412, 737), area=[rect(1159, 435, 1668, 797)],
                  drop=[[(1640, 640), (1700, 640), (1700, 797), (1640, 797)]],
                  solid=BLAST_SOLID, dust=[rect(1159, 435, 1668, 797)], dust_a=0.92, shade=[rect(1159, 600, 1668, 797)],
                  pieces=[('spikes', BLAST_SOLID[:12]), ('rocks', BLAST_SOLID[12:])],
                  fade={'right': 6}, bits=80),
    'wall': dict(s=2.34, anchor=(379.5, 1177), area=[rect(24, 867, 745, 1253)], bits=40),
    'wall_diag': dict(s=2.35, anchor=(1545, 1302), area=[rect(1222, 867, 1975, 1490)],
                      drop=[[(1828, 1050), (1975, 1050), (1975, 1320), (1828, 1320)]],
                      dust=[[(1222, 1240), (1500, 1240), (1840, 1150), (1840, 1490), (1222, 1490)]], dust_a=0.85, bits=40),
    'wall_depth': dict(s=2.26, anchor=(140, 1736), area=[rect(24, 1360, 451, 1974)],
                       drop=[[(318, 1670), (451, 1670), (451, 1974), (318, 1974)]],
                       dust=[[(180, 1780), (330, 1780), (330, 1974), (24, 1974), (24, 1900)]], dust_a=0.85, bits=40),
    'aura': dict(s=2.41, anchor=(1072, 1175), area=[rect(929, 867, 1192, 1215)],
                 dust=[rect(929, 867, 1192, 1215)], dust_a=0.85, bits=30, aura=True),
    # The stream: his spike row, the tile ending where his head begins (x 975), the line 262.
    'stream': dict(s=158 / 64, anchor=(975, 262), area=[rect(650, 101, 1287, 324)],
                   dust=[[(978, 101), (1287, 101), (1287, 324), (978, 324)]], dust_l=(0, 150), dust_a=0.8,
                   solid=[ellipse(1225, 157, 22, 30)], bits=30, stream=True),
}
MARGIN = 3


def scale_of(cfg):
    s = cfg['s']
    return (s, s) if np.isscalar(s) else s


def classify_his(cfg):
    """Class maps at his resolution over the whole sheet, limited to the sprite's area."""
    c = SMOOTH
    keep = poly_mask(H0, W0, cfg['area'])
    if cfg.get('drop'):
        keep &= ~poly_mask(H0, W0, cfg['drop'])
    L = lum(c)
    dist = np.sqrt(((c - BG) ** 2).sum(-1))
    art = keep & ((L >= 70) | (dist >= cfg.get('art_d', 24)))
    # His rims: deep brown (or deep moss green), warm (red well above blue), darker than the art
    # round them. Read on a lightly smoothed copy so a 1 px rim survives; JPEG ringing is cold
    # (blue-grey) and is not a rim.
    Lr = lum(gauss(FLAT, 0.4))
    warm = FLAT[..., 0] - FLAT[..., 2]
    near_art = dilate(L >= 78, 3, nb=N8)
    outline = keep & (Lr < cfg.get('rim_l', 58)) & (warm >= 18) & near_art & (dist >= 16)
    art |= outline
    # Pale streaks (speed lines, ray dashes): thin and light. Always opaque body.
    pale = art & (L >= 175) & ((c.max(-1) - c.min(-1)) < 120)
    thin = pale & ~dilate(erode(pale, 2), 2)
    # Art enclosed by a rim (rocks, pebbles, spikes, the bullets): not reachable from the open
    # background without crossing a rim (rims thickened 1 px to close JPEG gaps).
    # The rims are thickened 2 px for the flood, closing JPEG gaps of up to ~4 px; what lies
    # strictly inside, and the 2 px band round it, is enclosed. The band outside a rim stays open.
    barrier = dilate(outline, 2, nb=N8)
    y0, y1 = np.nonzero(keep.any(1))[0][[0, -1]]
    x0, x1 = np.nonzero(keep.any(0))[0][[0, -1]]
    sub = (~barrier)[y0:y1 + 1, x0:x1 + 1]
    seeds = (~art)[y0:y1 + 1, x0:x1 + 1]
    reach = np.zeros_like(keep)
    reach[y0:y1 + 1, x0:x1 + 1] = flood(sub, seeds)
    inside = ~reach & ~barrier & art
    enclosed = art & ~outline & ~reach & dilate(inside, 2, nb=N8)
    reach = art & ~outline & ~enclosed
    body = art & ~outline
    dust = np.zeros_like(art)
    if cfg.get('dust'):
        dz = poly_mask(H0, W0, cfg['dust'])
        dust = dz & body & reach & ~thin
        if cfg.get('sparse'):
            # Only his dithered, broken-up dust is see-through: dense art (rock faces, rubble)
            # stays solid even where no rim closes it.
            dens = gauss(art.astype(np.float64), 2.0)
            dust &= dens < 0.8
        if cfg.get('dust_l'):
            lo, hi = cfg['dust_l']
            dust &= (L >= lo) & (L <= hi)
        if cfg.get('solid'):
            dust &= ~poly_mask(H0, W0, cfg['solid'])
        body &= ~dust
    # Dust strength: dense where it stands well clear of his fill, thinning on dithered and soft
    # edges (colour-to-alpha against the fill, with a generous floor for the cloud's dark folds).
    strength = np.clip((dist - 10) / 55, 0, 1)
    da = np.where(dust, strength, 0.0)
    shade = np.zeros_like(art)
    sa = np.zeros((H0, W0))
    if cfg.get('shade'):
        sz = poly_mask(H0, W0, cfg['shade']) & keep & ~art
        # A stain darker and warmer than the fill: alpha from its projection on SHADE.
        d = FLAT - BG
        v = SHADE - BG
        a = np.clip((gauss(d, 1.2) * v).sum(-1) / (v * v).sum(), 0, 1)
        shade = sz & (a >= 0.08)
        sa = np.where(shade, a, 0.0)
    return dict(body=body, outline=outline, dust=dust, da=da, shade=shade, sa=sa, keep=keep, enclosed=enclosed)


SHADE = np.array([16.0, 10.0, 6.0])  # the colour his ground shadow darkens toward


def debug_classes(name, cfg, cls):
    """His crop with the classes painted over (body as is, rims red, dust blue by strength, shade
    purple), beside the crop itself."""
    keep = cls['keep']
    y0, y1 = np.nonzero(keep.any(1))[0][[0, -1]]
    x0, x1 = np.nonzero(keep.any(0))[0][[0, -1]]
    sl = (slice(y0, y1 + 1), slice(x0, x1 + 1))
    out = np.zeros((y1 - y0 + 1, x1 - x0 + 1, 3)) + [0, 0, 0]
    out[cls['body'][sl]] = SHARP[sl][cls['body'][sl]]
    out[cls['outline'][sl]] = [255, 0, 0]
    d = cls['dust'][sl]
    out[d] = np.array([40, 90, 255]) * cls['da'][sl][d][:, None]
    s = cls['shade'][sl]
    out[s] = np.array([200, 0, 200]) * np.minimum(1, cls['sa'][sl][s] * 2)[:, None]
    both = np.concatenate([IM0[sl], np.zeros((y1 - y0 + 1, 6, 3)), out], 1)
    img = Image.fromarray(both.astype(np.uint8))
    dr = ImageDraw.Draw(img)
    ox = x1 - x0 + 1 + 6
    for key, col in (('solid', (255, 255, 0)), ('dust', (0, 255, 255)), ('shade', (255, 0, 255)), ('drop', (255, 128, 0))):
        for p in cfg.get(key, []):
            for off in (0, ox):
                dr.line([(x - x0 + off, y - y0) for x, y in p] + [(p[0][0] - x0 + off, p[0][1] - y0)], fill=col)
    for off in (0, ox):
        ax, ay = cfg['anchor']
        dr.line([(ax - x0 + off - 4, ay - y0), (ax - x0 + off + 4, ay - y0)], fill=(0, 255, 0))
        dr.line([(ax - x0 + off, ay - y0 - 4), (ax - x0 + off, ay - y0 + 4)], fill=(0, 255, 0))
    k = 2 if both.shape[1] < 1000 else 1
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    img.save(os.path.join(DEBUG, 'cls-' + name + '.png'))
    return
    Image.fromarray(both.astype(np.uint8)).save(os.path.join(DEBUG, 'cls-' + name + '.png'))


if DEBUG:
    os.makedirs(DEBUG, exist_ok=True)
    for name, cfg in SPRITES.items():
        if os.environ.get('EARTH_ONLY') and name not in os.environ['EARTH_ONLY'].split(','):
            continue
        debug_classes(name, cfg, classify_his(cfg))
        print('debug', name)
    sys.exit(0)
