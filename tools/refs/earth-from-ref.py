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
              quantized to a palette median-cut from his own pixels of that sprite (his greens and,
              on the walls, his saturated amber get slots of their own); traced polygons ('solid')
              and, for the aura's columns of glossy golden pebbles, his saturated gold and moss
              found by colour ('solid_auto') are solid rock even where no rim closes them;
    outline - his deep-brown (or deep moss-green) rims: a clean 1 px tinted outline wherever his
              art has one, never black; JPEG ringing (cold, dark halos) is not outline;
    dust    - his dust clouds, trails, haze and dithered cloud edges: SEMI-TRANSPARENT. In a dust
              zone, art not enclosed by a rim is dust; its alpha comes from its coverage (his
              dithered edges thin out) and its colour is un-blended from his panel fill, so it
              composites back to his look on his background and reads as dust on any map;
    shade   - the blast's shadow on the ground: a dark brown stain, semi-transparent.
* Walls are solid: every pixel the stone encloses (or nearly: 1 px gaps, and the side his panel
  border cut on the end-on wall) is filled, with his own colour there (his near-black shadow
  between the leaves and in the cracks), so no map shows through; the log prints the enclosed
  clear pixels left after quantizing (0).
* Fades where his panel cut the art (the bolt's trail, the blast's sides, the blast's ground shadow
  where his figure stood) reach a different length on each row and their alpha steps are
  ordered-dithered, so they end in wisps.
* Art he drew on the page outside the panels (the multi_hit burst) keeps its true colours and
  its dust is un-blended from the page colour.
* Pieces. Each key frame is split into the parts the generator animates on their own: loose rocks
  and pebbles ('bits'), 'dust', and named parts per sprite (the bolt's boulder, the blast's spikes,
  the bullets...); the rest is 'main'. His rims just outside a traced outline join that named
  part, so they move with it. 'under' is his dust continued under the rock that sits in his cloud
  (the rock inside the cloud's envelope: his dust closed by a few px; for the boulder and the
  blast's crystals, a harmonic continuation of his cloud across the rock, and on the blast
  everything below hidden cloud as well, since a cloud is a mound), each pixel the local mean of
  his dust round it, tapered at the cloud's edge and dithered onto his dust palette: a rock that
  moves, rocks or sinks uncovers his cloud, not a hole. Inside a traced crystal his dark foot is
  rock in shadow, never the see-through ground shadow.
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
import warnings

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


def holes_of(m):
    """The pixels not in `m` that cannot be reached (4-way) from the border without crossing `m`."""
    free = ~m
    border = np.zeros_like(m)
    border[0, :] = border[-1, :] = True
    border[:, 0] = border[:, -1] = True
    return free & ~flood(free, border & free)


def bayer4():
    """The 4x4 ordered-dither thresholds, in (0, 1)."""
    b = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float64)
    return (b + 0.5) / 16


def bayer_at(H, W):
    return np.tile(bayer4(), (H // 4 + 1, W // 4 + 1))[:H, :W]


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
# shade_fade: {side: n}: the ground shadow alone fades out over its last n px on that side (the blast's
#         shadow, cut where his figure stood beside it);
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

# The sphere's planet, traced on his panel: the whole striped ball (its moss band runs from its
# left edge, his x 1716), the ring's front arc where it crosses the ball included. On the right
# it follows his curved dark shadow side out to his x 1879 (between y 200 and 230), and at the
# bottom his ball's dark underside down to y 308, so the shadow side is solid rock.
PLANET = [(1716, 200), (1722, 185), (1728, 172), (1738, 157), (1752, 145), (1770, 136), (1795, 132), (1818, 135),
          (1838, 145), (1852, 156), (1862, 168), (1868, 180), (1872, 192), (1877, 202), (1879, 214), (1879, 226),
          (1876, 236), (1872, 248), (1869, 258), (1863, 268), (1856, 279), (1846, 289), (1834, 297), (1820, 304),
          (1806, 307), (1792, 307), (1780, 304), (1768, 300), (1750, 292), (1738, 280), (1728, 262), (1716, 245),
          (1712, 225)]

# The aura's two columns of golden pebbles and rocks (his x 929-1015 and 1105-1192): inside them,
# his saturated gold and his moss are solid rock, found by colour (see solid_mask).
AURA_COLUMNS = [rect(929, 867, 1016, 1215), rect(1104, 867, 1192, 1215)]

# His figure inside the aura (removed; the ring's front arc across his waist is kept in front).
AURA_FIGURE = [(1040, 962), (1055, 944), (1075, 942), (1095, 952), (1100, 975), (1100, 1000), (1110, 1004), (1112, 1040),
               (1116, 1060), (1120, 1082), (1112, 1090), (1106, 1100), (1104, 1120), (1103, 1140), (1112, 1152), (1112, 1162),
               (1095, 1165), (1083, 1170), (1060, 1172), (1058, 1180), (1033, 1180), (1036, 1160), (1035, 1135), (1030, 1110),
               (1020, 1100), (1000, 1092), (1000, 1078), (1010, 1070), (1013, 1045), (1012, 1006), (1030, 1000), (1040, 990)]

SPRITES = {
    'bolt': dict(s=S_MED, anchor=(206, 221), area=[rect(28, 101, 267, 336)],
                 solid=[BOULDER], dust=[rect(25, 101, 267, 336)], dust_a=0.9, mute_streaks=True,
                 fade={'left': 22}, bits=40, pieces=[('boulder', [BOULDER])], under='harmonic'),
    'breath': dict(s=S_MED, anchor=(1323, 237), area=[rect(1317, 101, 1634, 362)],
                   dust=[rect(1317, 101, 1634, 362)], dust_a=0.92, bits=60),
    'sphere': dict(s=S_MED, anchor=(1801, 236), area=[rect(1664, 101, 1922, 348)],
                   solid=[PLANET], dust=[rect(1664, 101, 1922, 348)], dust_a=0.9, bits=20, smooth_body=True,
                   pieces=[('planet', [PLANET])], fill_solid=[PLANET], green_hi=1),
    'slash': dict(s=S_MED, anchor=(150, 556), area=[rect(25, 435, 267, 679)],
                  solid=[CRESCENT], dust=[rect(25, 435, 267, 679)], dust_a=0.9, bits=24),
    'multi': dict(s=S_MED, anchor=(444, 557), area=[rect(298, 435, 575, 679)],
                  solid=BULLETS, dust=[rect(298, 435, 575, 679)], dust_a=0.88, bits=10, mute_streaks=True,
                  pieces=[('b%d' % k, [b]) for k, b in enumerate(BULLETS)]),
    'multi_hit': dict(s=S_MED, anchor=(750, 556), area=[rect(586, 425, 802, 660)],
                      solid=[ellipse(752, 515, 20, 22), ellipse(770, 592, 22, 22)],
                      dust=[rect(586, 425, 802, 660)], dust_a=0.95, bits=60, ground=PAGE),
    'hit': dict(s=S_MED, anchor=(962, 562), area=[rect(811, 435, 1121, 679)],
                dust=[rect(811, 435, 1121, 679)], dust_a=0.95, bits=60, dust_colors=18, dither_dust=True, glow_rays=True,
                # (the rock right of the core: its glowing top is rock, not dust; its rim is open)
                solid=[ellipse(1031, 540, 19, 14)]),
    'blast': dict(s=2.39, anchor=(1412, 737), area=[rect(1159, 435, 1668, 797)],
                  drop=[[(1640, 640), (1700, 640), (1700, 797), (1640, 797)]],
                  solid=BLAST_SOLID, dust=[rect(1159, 435, 1668, 797)], dust_a=0.92, shade=[rect(1159, 600, 1668, 797)],
                  pieces=[('k%d' % k, [p]) for k, p in enumerate(BLAST_SOLID[:12])] + [('rocks', BLAST_SOLID[12:])],
                  fade={'right': 6, 'left': 10}, shade_fade={'right': 14}, bits=80, cloud_r=10, under='harmonic', under_down=True,
                  ground_band=14, under_clip=True, fill_solid=BLAST_SOLID,
                  # (the two dust streaks on the right were cut where his figure stood: they end in
                  # ragged wisps over their last 16 px, like his ground shadow)
                  dust_fade={'right': 16}, dust_fade_from=640),
    'wall': dict(s=2.34, anchor=(379.5, 1177), area=[rect(24, 867, 745, 1253)], art_d=14, bits=40,
                 dust=[rect(24, 1195, 745, 1253)], sparse=True, dust_a=0.85, wall=True),
    'wall_diag': dict(s=2.35, anchor=(1545, 1302), area=[rect(1222, 867, 1975, 1490)],
                      drop=[[(1828, 1050), (1975, 1050), (1975, 1320), (1828, 1320)]],
                      dust=[[(1222, 1240), (1500, 1240), (1840, 1150), (1840, 1490), (1222, 1490)]], sparse=True,
                      art_d=14, dust_a=0.85, bits=40, wall=True),
    'wall_depth': dict(s=2.26, anchor=(140, 1736), area=[rect(24, 1360, 451, 1974)],
                       drop=[[(288, 1795), (318, 1670), (451, 1670), (451, 1974), (325, 1974), (325, 1878), (300, 1870), (288, 1840)]],
                       dust=[[(180, 1780), (330, 1780), (330, 1974), (24, 1974), (24, 1900)]], sparse=True,
                       art_d=14, dust_a=0.85, bits=40, wall=True, cut=('left',)),
    'aura': dict(s=2.41, anchor=(1072, 1175), area=[rect(929, 867, 1192, 1215)],
                 dust=[rect(929, 867, 1192, 1215)], dust_a=0.85, bits=30, aura=True, figure=AURA_FIGURE,
                 solid_auto=dict(zone=AURA_COLUMNS, sat=0.55, L=70, min=40),
                 front_band=(988, 1060, 1124, 1098)),
    # The stream: his spike row, the tile ending where his head begins (x 975), the line 262.
    'stream': dict(s=158 / 64, anchor=(975, 262), area=[rect(650, 101, 1287, 324)],
                   dust=[[(978, 101), (1287, 101), (1287, 324), (978, 324)]], dust_l=(0, 150), dust_a=0.8,
                   solid=[ellipse(1225, 157, 22, 30)], bits=30, stream=True),
}
MARGIN = 3


def scale_of(cfg):
    s = cfg['s']
    return (s, s) if np.isscalar(s) else s


def solid_mask(cfg):
    """Where all of his art is opaque rock: the traced 'solid' polygons, plus with 'solid_auto' his
    saturated gold and his moss inside its zone (the aura's columns of glossy golden pebbles have
    no closed rim, but no dust is that saturated). The colour mask is closed (2 px), its holes are
    filled (the dark shading and rims inside a pebble), thin strokes are opened away, small specks
    are dropped and the rest grown 2 px to take in the pebbles' rims."""
    m = poly_mask(H0, W0, cfg['solid']) if cfg.get('solid') else np.zeros((H0, W0), bool)
    sa = cfg.get('solid_auto')
    if sa:
        zone = poly_mask(H0, W0, sa['zone'])
        ys, xs = np.nonzero(zone)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        c = SMOOTH[y0:y1, x0:x1]
        L = lum(c)
        mx, mn = c.max(-1), c.min(-1)
        sat = (mx - mn) / np.maximum(mx, 1)
        gold = (sat >= sa['sat']) & (L >= sa['L'])
        green = (c[..., 1] > c[..., 0] + 4) & (c[..., 1] > c[..., 2] + 20) & (L >= 45)
        g = (gold | green) & zone[y0:y1, x0:x1]
        g = erode(dilate(g, 2, nb=N8), 2, nb=N8)
        # (only small holes: a pebble's shading, not the dust a ring of pebbles closes round)
        hl, nh = components(holes_of(g), nb=N4)
        hs = np.bincount(hl.ravel(), minlength=nh + 1)
        g |= np.isin(hl, np.nonzero(hs <= sa.get('hole', 120))[0]) & (hl > 0)
        g = dilate(erode(g, 2, nb=N8), 2, nb=N8) & g
        lab, n = components(g, nb=N8)
        sizes = np.bincount(lab.ravel(), minlength=n + 1)
        g = np.isin(lab, np.nonzero(sizes >= sa['min'])[0]) & (lab > 0)
        g = dilate(g, 2, nb=N8) & zone[y0:y1, x0:x1]
        m[y0:y1, x0:x1] |= g
    return m


def classify_his(cfg):
    """Class maps at his resolution over the whole sheet, limited to the sprite's area."""
    c = SMOOTH
    keep = poly_mask(H0, W0, cfg['area'])
    if cfg.get('drop'):
        keep &= ~poly_mask(H0, W0, cfg['drop'])
    L = lum(c)
    dist = np.sqrt(((c - BG) ** 2).sum(-1))
    front = np.zeros_like(keep)
    if cfg.get('figure'):
        # His figure goes, except the ring's light tan band crossing in front of his waist.
        fig = poly_mask(H0, W0, [cfg['figure']])
        bx0, by0, bx1, by1 = cfg['front_band']
        band = poly_mask(H0, W0, [rect(bx0, by0, bx1, by1)])
        tan = (c[..., 1] - c[..., 2] >= 22) & (c[..., 0] - c[..., 1] <= 62) & (L >= 118)
        front = band & tan & keep
        keep &= ~fig | front
    art = keep & ((L >= 70) | (dist >= cfg.get('art_d', 24)))
    # His rims: deep brown (or deep moss green), warm (red well above blue), darker than the art
    # round them. Read on a lightly smoothed copy so a 1 px rim survives; JPEG ringing is cold
    # (blue-grey) and is not a rim.
    Lr = lum(gauss(FLAT, 0.4))
    warm = FLAT[..., 0] - FLAT[..., 2]
    near_art = dilate(L >= 78, 3, nb=N8)
    outline = keep & (Lr < cfg.get('rim_l', 58)) & (warm >= 18) & near_art & (dist >= 16)
    sz = poly_mask(H0, W0, cfg['shade']) & keep if cfg.get('shade') else np.zeros_like(keep)
    if sz.any():
        # His ground shadow is a broad dark brown, not a rim: dark areas too wide to be a line
        # (they survive a 3 px erosion) are shadow there.
        darkw = keep & (Lr < 66) & (warm >= 8) & (L < 90)
        broad = dilate(erode(darkw, 3), 3) & sz
        outline &= ~broad
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
        if cfg.get('solid') or cfg.get('solid_auto'):
            dust &= ~solid_mask(cfg)
        body &= ~dust
    # Dust strength: dense where it stands well clear of his fill, thinning on dithered and soft
    # edges (colour-to-alpha against the fill, with a generous floor for the cloud's dark folds).
    strength = np.clip((dist - 10) / 55, 0, 1)
    da = np.where(dust, strength, 0.0)
    shade = np.zeros_like(art)
    sa = np.zeros((H0, W0))
    if sz.any():
        # His shadow on the ground: dark warm brown over the fill, not enclosed by a rim. Its alpha
        # is its projection on SHADE (his shadow brown) from the fill; it leaves the dust class.
        d = gauss(FLAT, 1.0) - BG
        v = SHADE - BG
        a = np.clip((d * v).sum(-1) / (v * v).sum(), 0, 1)
        cand = sz & ~enclosed & ~outline & (L < 66) & (a >= 0.08)
        if cfg.get('solid'):
            # (a crystal's dark foot inside its traced outline is rock in shadow, not the ground
            # shadow: it stays opaque, so no map shows through the crystal)
            cand &= ~solid_mask(cfg)
        shade = cand
        sa = np.where(shade, a, 0.0)
        dust &= ~shade
        body &= ~shade
    return dict(body=body, outline=outline, dust=dust, da=np.where(dust, da, 0.0), shade=shade, sa=sa, keep=keep, enclosed=enclosed, front=front, thin=thin & body)


SHADE = np.array([66.0, 45.0, 30.0])  # his ground shadow's brown, at its strongest


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


# --- to game scale ----------------------------------------------------------------------------

def his_box(cfg, W, H, ax, ay):
    """His rectangle (float) covered by a W x H game frame with the anchor at (ax, ay)."""
    sx, sy = scale_of(cfg)
    hx, hy = cfg['anchor']
    return (hx - ax * sx, hy - ay * sy, hx + (W - ax) * sx, hy + (H - ay) * sy)


def resample(arr, box, W, H, P=64):
    """Box-filters an array of his sheet onto a W x H game grid covering `box` (padded with its
    edge, so a frame may reach past the sheet's border)."""
    if arr.ndim == 2:
        a = np.pad(arr.astype(np.float32), P, mode='edge')
        b = (box[0] + P, box[1] + P, box[2] + P, box[3] + P)
        return np.asarray(Image.fromarray(a, 'F').resize((W, H), Image.BOX, box=b), np.float64)
    return np.stack([resample(arr[..., k], box, W, H, P) for k in range(arr.shape[2])], -1)


def bounds_game(cfg, cls):
    """The art's extent at game scale, relative to the anchor."""
    m = cls['body'] | cls['outline'] | (cls['da'] > 0.1) | (cls['sa'] > 0.1)
    ys, xs = np.nonzero(m)
    sx, sy = scale_of(cfg)
    hx, hy = cfg['anchor']
    return ((xs.min() - hx) / sx, (ys.min() - hy) / sy, (xs.max() + 1 - hx) / sx, (ys.max() + 1 - hy) / sy)


def frame_for(cfg, cls):
    """The art's bounds plus MARGIN, plus `pad` (left, top, right, bottom) where the animation
    throws rocks or dust further out than his picture."""
    x0, y0, x1, y1 = bounds_game(cfg, cls)
    pl, pt, pr, pb = cfg.get('pad', (0, 0, 0, 0))
    ax = int(np.ceil(-x0)) + MARGIN + pl
    ay = int(np.ceil(-y0)) + MARGIN + pt
    return ax + int(np.ceil(x1)) + MARGIN + pr, ay + int(np.ceil(y1)) + MARGIN + pb, ax, ay


def to_game(cfg, cls, W, H, ax, ay):
    box = his_box(cfg, W, H, ax, ay)
    r = lambda a: resample(a, box, W, H)
    B = r(cls['body'].astype(np.float64))
    O = r(cls['outline'].astype(np.float64))
    col = r(SHARP * cls['body'][..., None]) / np.maximum(B, 1e-6)[..., None]
    rcol = r(SMOOTH * cls['outline'][..., None]) / np.maximum(O, 1e-6)[..., None]
    DA = r(cls['da'])
    SA = r(cls['sa'])
    allc = r(np.where(cls['keep'][..., None], SMOOTH, BG))
    F = r(cls['front'].astype(np.float64))
    clean = r(np.where(cls['keep'][..., None], FLAT, BG))
    if cfg.get('mute_streaks'):
        # His thin pale speed streaks are a pixel or two wide: at game scale he sees them blended
        # with the fill (a muted tan), so they take his colour there, not the streak's own.
        T = r(cls['thin'].astype(np.float64))
        col = np.where((T >= 0.25)[..., None], allc, col)
    # Art drawn on his page (outside the panels) was put back on the panel fill by flatten(); its
    # real colours are those less the difference, and its dust is un-blended from the page.
    gr = np.asarray(cfg.get('ground', BG), np.float64)
    off = BG - gr
    col, rcol, allc, clean = col - off, rcol - off, allc - off, clean - off
    # His thin pale streaks (ray dashes): their coverage, and their own colour (his streak pixels
    # only, spread a little so the pixels beside a dash know it too).
    T = r(cls['thin'].astype(np.float64))
    colT = r(SHARP * cls['thin'][..., None])
    colT = gauss(colT, 1.0) / np.maximum(gauss(T, 1.0), 1e-6)[..., None] - off
    bright = None
    if cfg.get('glow_rays'):
        # (each pixel of his sheet as the brightest colour round it: a 1 px gold dash at his
        # resolution keeps its own gold at game scale here, where the box filter dims it)
        Ls = lum(SHARP)
        best, bl = SHARP.copy(), Ls.copy()
        for dy, dx in N8:
            c2, l2 = shift(SHARP, dy, dx), shift(Ls, dy, dx)
            up = l2 > bl
            best[up], bl[up] = c2[up], l2[up]
        bright = r(np.where(cls['keep'][..., None], best, BG)) - off
    return dict(B=B, O=O, col=col, rcol=rcol, DA=DA, SA=SA, all=allc, F=F, box=box, ground=gr,
                his=r(IM0) if cfg.get('aura') else clean, flat=clean, T=T, colT=colT, bright=bright)


def decide(cfg, g, W, H, ax, ay):
    """Solid body, rim, dust and shade at game scale. A pixel is drawn solid where his opaque art
    covers at least half of it; it is rim where his rim dominates it, and a clear pixel just outside
    a solid becomes rim where his rim reaches into it, so the silhouette gets one clean 1 px rim
    wherever his art has one. A pixel not drawn solid but holding his dust is dust: its alpha is
    how much of it his art covers (dust weighted by its strength) times the sprite's dust opacity,
    and its colour is his colour there un-blended from his panel fill."""
    B, O, DA, SA = g['B'], g['O'], g['DA'], g['SA']
    S = B + O
    drawn = S >= 0.5
    nb = sum(shift(drawn, dy, dx).astype(int) for dy, dx in N4)
    drawn |= (~drawn) & (nb >= 3) & (S >= 0.25)          # pinholes
    dark = drawn & (O > B)
    solid = drawn & ~dark
    ring = dilate(solid) & ~drawn & (O >= 0.14)
    rim = dark | ring
    rim &= dilate(solid, 2, nb=N8)                       # a rim with no body near it is noise
    solid |= drawn & ~rim                                # (rim specks dropped above become body)
    free = ~solid & ~rim
    cover = np.clip(S + DA, 0, 1)
    dust = free & (DA >= 0.03) & (cover >= 0.07)
    da = cover * cfg.get('dust_a', 0.9)
    # His colour un-blended at the dust's own alpha (before any fade, which only thins it).
    a_f = np.maximum(da, 1e-3)[..., None]
    dcol = np.clip((g['all'] - (1 - a_f) * g['ground']) / a_f, 0, 255)
    # Fades where his panel cut the art: the dust thins out over the last n px, each row reaching
    # its own length (a smooth per-row jitter), so the trail ends in wisps, not in straight bands;
    # the alpha steps there are dithered (see quantize).
    xs = np.arange(W)[None, :]
    ys = np.arange(H)[:, None]
    fadek = np.ones((H, W))
    for side, n in cfg.get('fade', {}).items():
        any_art = solid | rim | dust | (SA > 0.06)
        cols = np.nonzero(any_art.any(0))[0]
        rows = np.nonzero(any_art.any(1))[0]
        across = H if side in ('left', 'right') else W
        j = np.sin(np.arange(across) * 12.9898 + 4.1) * 43758.5453
        j = gauss((j - np.floor(j) - 0.5)[:, None], 1.5)[:, 0]
        j = j / max(1e-6, np.abs(j).max()) * 0.45 * n
        jy, jx = j[:, None], j[None, :]
        if side == 'left':
            k = np.clip((xs - cols[0] + 0.5 - jy - 0.45 * n) / n * 1.6, 0, 1)
        elif side == 'right':
            k = np.clip((cols[-1] - xs + 0.5 - jy - 0.45 * n) / n * 1.6, 0, 1)
        elif side == 'top':
            k = np.clip((ys - rows[0] + 0.5 - jx - 0.45 * n) / n * 1.6, 0, 1)
        else:
            k = np.clip((rows[-1] - ys + 0.5 - jx - 0.45 * n) / n * 1.6, 0, 1)
        da = da * k
        SA = SA * k
        fadek = fadek * k
    for side, n in cfg.get('shade_fade', {}).items():
        # His ground shadow cut by the figure he stood beside (the blast): it ends in ragged wisps
        # over its last n px instead of a straight edge (a jitter of its own on each row).
        cols = np.nonzero((SA > 0.06).any(0))[0]
        j = np.sin(np.arange(H) * 78.233 + 1.7) * 43758.5453
        j = gauss((j - np.floor(j) - 0.5)[:, None], 1.2)[:, 0]
        j = (j / max(1e-6, np.abs(j).max()) * 0.5 * n)[:, None]
        if side == 'right':
            k = np.clip((cols[-1] - xs + 0.5 - j - 0.4 * n) / n * 1.4, 0, 1)
        else:
            k = np.clip((xs - cols[0] + 0.5 - j - 0.4 * n) / n * 1.4, 0, 1)
        SA = SA * k
    for side, n in cfg.get('dust_fade', {}).items():
        # His dust cut where his figure stood (rows from his y `dust_fade_from` down): it ends in
        # ragged wisps over its last n px, each row reaching its own length.
        y_from = int(np.floor(ay + (cfg['dust_fade_from'] - cfg['anchor'][1]) / scale_of(cfg)[1]))
        rows = np.arange(H) >= y_from
        cols = np.nonzero(((da > 0.03) & rows[:, None]).any(0))[0]
        j = np.sin(np.arange(H) * 39.346 + 0.9) * 43758.5453
        j = gauss((j - np.floor(j) - 0.5)[:, None], 1.0)[:, 0]
        j = (j / max(1e-6, np.abs(j).max()) * 0.5 * n)[:, None]
        if side == 'right':
            k = np.clip((cols[-1] - xs + 0.5 - j - 0.4 * n) / n * 1.4, 0, 1)
        else:
            k = np.clip((xs - cols[0] + 0.5 - j - 0.4 * n) / n * 1.4, 0, 1)
        k = np.where(rows[:, None], k, 1.0)
        da = da * k
        fadek = fadek * k
    dust &= da >= 0.05
    glow = np.zeros((H, W), bool)
    if cfg.get('glow_rays'):
        # His ray dashes glow: gold with no outline. The box filter mixes his dark panel into their
        # edges, which would read as a brown stick with a dark rim on any lighter map. Round each
        # dash, a pixel's opacity is how much of the dash's gold it holds over his panel (its colour
        # projected on gold-minus-panel), and its colour is the gold: the core stays opaque gold,
        # the edges become translucent gold. Rock that is not a dash keeps its rims.
        # (a dash: a small, long piece of solid and rim; the rocks, which are round, keep theirs)
        lab, n = components(solid | rim, nb=N8)
        dash = np.zeros((H, W), bool)
        gold = np.zeros((H, W, 3))
        for c in range(1, n + 1):
            m = lab == c
            ys_, xs_ = np.nonzero(m)
            if len(ys_) < 4 or len(ys_) > 60:
                continue
            ev = np.linalg.eigvalsh(np.cov(np.stack([xs_, ys_]).astype(np.float64)) + 1e-6 * np.eye(2))
            if os.environ.get('EARTH_DASHDBG'):
                print('comp', c, len(ys_), round(ev[1] / max(ev[0], 1e-6), 1), xs_.mean().round(), ys_.mean().round())
            if ev[1] < 2.4 * ev[0]:
                continue
            # (the dash's own gold: the brightest of his colours along it; a dark piece is no dash)
            cc = g['bright'][m]
            gc = cc[np.argsort(lum(cc))[-max(1, len(cc) // 3):]].mean(0)
            if lum(gc) < 110:
                continue
            dash |= m
            gold[m] = gc
        other = (solid | rim) & ~dash
        near = dilate(dash, 1, nb=N8) & dust & ~dilate(other, 1, nb=N8) & ~dash
        cand = dash | near
        if near.any():
            gw = dash.astype(np.float64)
            gwb = gauss(gw, 1.0)
            gb = gauss(gold * gw[..., None], 1.0) / np.maximum(gwb, 1e-6)[..., None]
            near &= gwb >= 0.05
            gold = np.where(near[..., None], gb, gold)
        v = gold - g['ground']
        a = np.clip(((g['all'] - g['ground']) * v).sum(-1) / np.maximum((v * v).sum(-1), 1.0), 0, 1)
        core = cand & (a >= 0.8)
        glow = cand & ~core & (a >= 0.1)
        g['col'] = np.where(core[..., None], np.clip(gold, 0, 255), g['col'])
        solid = (solid & ~cand) | core
        rim &= ~cand
        dust = (dust & ~cand) | glow
        da = np.where(glow, np.minimum(a, cfg.get('dust_a', 0.9)), da)
        dcol = np.where(glow[..., None], np.clip(gold, 0, 255), dcol)
        fadek = np.where(glow, 0.99, fadek)     # (its alpha steps dithered, like a fade)
    shade = free & ~dust & (SA >= 0.06)
    holefill = np.zeros((H, W), bool)
    holedust = np.zeros((H, W), bool)
    if cfg.get('wall'):
        # A wall is solid stone: nothing it encloses may be see-through. Every pixel the stone
        # encloses (or nearly: gaps up to 1 px are closed) is filled. Inside the stone (its edge
        # mostly stone) it becomes stone in his own colour there (his near-black shadow between
        # the leaves and in the cracks); a pocket inside his dust at the base becomes dust.
        # Where his panel border cut the stone ('cut': the sides), the shadow between the leaves
        # reaches that side: a barrier along it closes those bays too.
        bar = np.zeros((H, W), bool)
        for side in cfg.get('cut', ()):
            st0 = solid | rim
            cols = np.nonzero(st0.any(0))[0]
            x0 = cols[0] if side == 'left' else cols[-1]
            near = st0[:, x0:x0 + 4].any(1) if side == 'left' else st0[:, max(0, x0 - 3):x0 + 1].any(1)
            r = np.nonzero(near)[0]
            bar[r[0]:r[-1] + 1, x0 - 1 if side == 'left' else x0 + 1] = True
        # (repeated: filling a nearly closed pocket can seal off the one beside it)
        for _ in range(4):
            art = solid | rim | dust | shade | holedust | bar
            stone = solid | rim | bar
            enc = holes_of(stone) | (holes_of(erode(dilate(stone, 1, nb=N8), 1, nb=N8)) & ~stone)
            enc |= holes_of(art) | (holes_of(erode(dilate(art, 1, nb=N8), 1, nb=N8)) & ~art)
            enc &= ~stone & ~holedust
            enc &= ~(dust & ~holes_of(stone))
            if not enc.any():
                break
            lab, n = components(enc, nb=N4)
            for c in range(1, n + 1):
                m = lab == c
                edge = dilate(m, 1) & ~m
                if (edge & stone).sum() >= 0.5 * edge.sum():
                    holefill |= m
                else:
                    holedust |= m & ~dust
            holefill &= ~bar
            solid = solid | holefill
            dust &= ~holefill
            shade &= ~holefill
            holedust &= ~holefill
    return dict(solid=solid, rim=rim, dust=dust, da=da, dcol=dcol, shade=shade, sa=np.clip(SA, 0, 0.85),
                fadek=fadek, holefill=holefill, holedust=holedust, glow=glow)


# --- build every key frame ----------------------------------------------------------------------

ONLY = os.environ.get('EARTH_ONLY')
built = {}
for name, cfg in SPRITES.items():
    if ONLY and name not in ONLY.split(','):
        continue
    cls = classify_his(cfg)
    W, H, ax, ay = frame_for(cfg, cls)
    if cfg.get('stream'):
        # One strip: the tile's 64 columns left of the anchor, then the head.
        x0, y0, x1, y1 = bounds_game(cfg, cls)
        ax = 64
        W = 64 + int(np.ceil(x1)) + MARGIN
        H = max(H, ay + 32)
    g = to_game(cfg, cls, W, H, ax, ay)
    d = decide(cfg, g, W, H, ax, ay)
    # A pixel drawn solid with little of his body in it (a pinhole, a dark crack speck) takes the
    # mean of his body and rim there, or of the solid pixels round it.
    weak = d['solid'] & (g['B'] < 0.15)
    both = (g['col'] * g['B'][..., None] + g['rcol'] * g['O'][..., None]) / np.maximum(g['B'] + g['O'], 1e-6)[..., None]
    g['col'] = np.where((weak & (g['B'] + g['O'] > 0.05))[..., None], both, g['col'])
    weak &= g['B'] + g['O'] <= 0.05
    if weak.any():
        ok = (d['solid'] & ~weak).astype(np.float64)
        nbm = gauss(g['col'] * ok[..., None], 1.0) / np.maximum(gauss(ok, 1.0), 1e-6)[..., None]
        g['col'] = np.where(weak[..., None], nbm, g['col'])
    # The box filter softens his crisp pixel clusters; a light unsharp mask over the body (within
    # the body only) brings back his contrast between neighbouring shades.
    sm = d['solid'].astype(np.float64)
    blur = gauss(g['col'] * sm[..., None], 0.8) / np.maximum(gauss(sm, 0.8), 1e-6)[..., None]
    delta = np.clip(cfg.get('crisp', 0.45) * (g['col'] - blur), -16, 16)
    g['col'] = np.where(d['solid'][..., None], np.clip(g['col'] + delta, 0, 255), g['col'])
    if cfg.get('smooth_body'):
        # His bands are smooth: a 3x3 median over the body (body pixels only) takes out the
        # JPEG speckle the box filter carried down.
        # (his greens are left out: a median would erase the thin moss strip down the ball's side)
        gcol = g['col']
        greenish = (gcol[..., 1] > gcol[..., 0] + 4) & (gcol[..., 1] > gcol[..., 2] + 10)
        so = d['solid'] & ~d['holefill'] & ~greenish
        stack = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                v = shift(g['col'], dy, dx)
                ok = shift(so, dy, dx)
                stack.append(np.where(ok[..., None], v, np.nan))
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', RuntimeWarning)       # (pixels with no body round them)
            med = np.nanmedian(np.stack(stack), 0)
        g['col'] = np.where((so & ~np.isnan(med).any(-1))[..., None], np.nan_to_num(med), g['col'])
    # Stone filled in where the wall enclosed a hole: his own colour there (dark shadow).
    g['col'] = np.where(d['holefill'][..., None], g['flat'], g['col'])
    built[name] = dict(cfg=cfg, cls=cls, g=g, W=W, H=H, ax=ax, ay=ay, **d)
    print('built %-11s %3dx%-3d anchor %3d,%-3d' % (name, W, H, ax, ay))


# --- palettes: one per sprite, from his pixels ---------------------------------------------------

def median_cut(cols, n):
    cols = np.asarray(np.clip(np.round(cols), 0, 255), np.uint8).reshape(1, -1, 3)
    if cols.shape[1] == 0:
        return np.zeros((0, 3))
    q = Image.fromarray(cols, 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:n * 3], np.float64).reshape(-1, 3)
    used = np.unique(np.asarray(q).ravel())
    return pal[used]


def nearest(cols, pal):
    return ((cols[..., None, :] - pal) ** 2).sum(-1).argmin(-1)


DUST_STEPS = 8
SHADE_STEPS = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.85]


def palette_for(b):
    cls, cfg = b['cls'], b['cfg']
    # His body colours as they land at game scale, cut separately for his greens (moss, vines,
    # grass: few pixels, but they must keep their own hues) and for the rest.
    cols = b['g']['col'][b['solid']]
    green = cols[:, 1] > cols[:, 0] + 4
    n = cfg.get('colors', 36)
    ng = 0 if green.sum() < 6 else int(np.clip(round(n * 2.5 * green.mean()), 3, 12))
    # On the walls his saturated amber (the golden dirt strip, orange pebbles) is few pixels next
    # to his tan stone: it gets slots of its own, so it keeps its chroma instead of going beige.
    amber = (cols[:, 2] < 0.35 * cols[:, 0]) & (cols[:, 0] > 110) & ~green if cfg.get('wall') else np.zeros(len(cols), bool)
    na = 0 if amber.sum() < 6 else int(np.clip(round(n * 3 * amber.mean()), 2, 6))
    body = median_cut(cols[~green & ~amber], n - ng - na)
    if na:
        body = np.concatenate([body, median_cut(cols[amber], na)])
    if ng:
        body = np.concatenate([body, median_cut(cols[green], ng)])
    if ng and cfg.get('green_hi'):
        # His lime moss highlights are a few bright pixels: the median cut averages them into the
        # darker moss, so his brightest greens (top 30%) get a slot of their own.
        gc = cols[green]
        gl = lum(gc)
        top = gc[gl >= np.quantile(gl, 0.7)]
        body = np.concatenate([body, median_cut(top, cfg['green_hi'])])
    body = body[np.argsort(lum(body))]
    rims = median_cut(SMOOTH[cls['outline'] & erode(cls['outline'] | ~cls['keep'], 1, nb=N4) | (cls['outline'] & False)], 3)
    if len(rims) == 0:
        rims = median_cut(SMOOTH[cls['outline']], 3)
    if len(rims) == 0:
        rims = np.array([[52.0, 26.0, 12.0]])
    # Rims are deep and tinted, never black: pulled a little darker than his JPEG-softened mean.
    rims = np.clip(rims * 0.9, 0, 255)
    rims = rims[np.argsort(lum(rims))]
    dsrc = b['dcol'][b['dust'] & ~b['glow']]
    dust = median_cut(dsrc, cfg.get('dust_colors', 10)) if len(dsrc) else np.zeros((0, 3))
    if b['glow'].any():
        # (his glowing ray gold gets dust colours of its own, at every alpha step)
        dust = np.concatenate([dust, median_cut(b['dcol'][b['glow']], 2)])
    pal = []
    for c in body:
        pal.append((*[int(round(v)) for v in c], 255, 'body'))
    for c in rims:
        pal.append((*[int(round(v)) for v in c], 255, 'outline'))
    a_max = cfg.get('dust_a', 0.9)
    for c in dust:
        for k in range(DUST_STEPS):
            pal.append((*[int(round(v)) for v in c], int(round(255 * a_max * (k + 1) / DUST_STEPS)), 'dust'))
    if b['shade'].any():
        for a in SHADE_STEPS:
            pal.append((*[int(v) for v in SHADE], int(round(255 * a)), 'shade'))
    assert len(pal) <= 255, len(pal)
    return pal, body, rims, dust


def quantize(b, pal, body, rims, dust):
    H, W = b['solid'].shape
    idx = np.zeros((H, W), np.int32)
    nb = len(body)
    s = b['solid']
    idx[s] = nearest(b['g']['col'][s], body) + 1
    # Speck clean-up: a body pixel unlike all four neighbours and close to them in brightness is
    # JPEG noise and takes their commonest value (real highlights stand out and stay).
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = idx[y, x]
            if not v:
                continue
            n4 = [idx[y, x + 1], idx[y, x - 1], idx[y + 1, x], idx[y - 1, x]]
            if v in n4 or not all(n4) or max(n4) > nb:
                continue
            m = max(set(n4), key=n4.count)
            if abs(lum(body[v - 1]) - lum(body[m - 1])) < 30:
                idx[y, x] = m
    r = b['rim']
    idx[r] = nb + nearest(b['g']['rcol'][r], rims) + 1
    d = b['dust']
    if d.any():
        a_max = b['cfg'].get('dust_a', 0.9)
        bay = bayer_at(H, W)[d]
        cols = b['dcol'][d]
        dd = ((cols[:, None, :] - dust[None]) ** 2).sum(-1)
        ng_ = 2 if b['glow'].any() else 0
        if ng_:
            isg = b['glow'][d]
            dd[np.ix_(isg, np.arange(len(dust) - ng_))] = 1e12
            dd[np.ix_(~isg, np.arange(len(dust) - ng_, len(dust)))] = 1e12
        order = np.argsort(dd, 1)
        ci = order[:, 0]
        s_ = b['da'][d] / a_max * DUST_STEPS
        # Alpha steps: rounded, except where the dust fades out (his panel cut it), where they
        # are ordered-dithered, so the fade breaks up finely instead of in bands.
        faded = b['fadek'][d] < 1
        ai = np.where(faded, np.floor(s_ + bay) - 1, np.maximum(np.round(s_) - 1, 0))
        if b['cfg'].get('dither_dust'):
            # His glow is a smooth ramp: an ordered dither between the two nearest of his dust
            # colours, and between alpha steps, instead of flat bands.
            if dust.shape[0] > 1:
                c2 = order[:, 1]
                d1 = np.sqrt(dd[np.arange(len(ci)), ci])
                d2 = np.sqrt(dd[np.arange(len(ci)), c2])
                ci = np.where(bay < d1 / np.maximum(d1 + d2, 1e-6), c2, ci)
            ai = np.floor(s_ + bay) - 1
        keep_ = ai >= 0
        ai = np.clip(ai, 0, DUST_STEPS - 1).astype(int)
        v = np.where(keep_, nb + len(rims) + ci * DUST_STEPS + ai + 1, 0)
        idx[d] = v
    sh = b['shade']
    if sh.any():
        base = nb + len(rims) + len(dust) * DUST_STEPS
        ai = np.abs(b['sa'][sh][:, None] - np.array(SHADE_STEPS)[None]).argmin(1)
        idx[sh] = base + ai + 1
    if b['holedust'].any():
        # (pockets the wall's dust encloses take the dust round them)
        kinds_ = np.array(['clear'] + [p[4] for p in pal])
        idx = np.where(b['holedust'], fill_from(idx, kinds_[idx] == 'dust', b['holedust']), idx)
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


def split_pieces(idx, kinds, b, keep_full=False, wrap=False, names_extra=()):
    """'dust', 'shade', 'bits' (small loose rocks and pebbles with their rims), named pieces, and
    'main'."""
    H, W = idx.shape
    k = kinds[idx]
    owner = np.full((H, W), 'main', dtype=object)
    owner[k == 'dust'] = 'dust'
    owner[k == 'shade'] = 'shade'
    rock = (k == 'body') | (k == 'outline')
    lab, n = components(rock, nb=N8, wrap=wrap)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    big = sizes[1:].max() if n else 0
    cfg = b['cfg']
    bits = np.zeros((H, W), bool)
    for c in range(1, n + 1):
        if sizes[c] > cfg.get('bits', 30) or sizes[c] >= big:
            continue
        bits |= lab == c
    owner[bits] = 'bits'
    names = ['main', 'bits', 'dust', 'shade']
    x0, y0 = b['g']['box'][:2]
    sx, sy = scale_of(cfg)
    for pname, polys in cfg.get('pieces', []):
        m = poly_mask(H, W, polys, x0, y0, 1 / sx, 1 / sy) & np.isin(owner, ['main', 'bits']) & rock
        owner[m] = pname
        names.append(pname)
    # His rims just outside a traced outline (the polygons sit a hair inside his deep-brown edge)
    # belong to that piece, so they move with it (the boulder rocking, a crystal sinking, a bullet
    # bobbing) instead of staying behind as a floating line: a loose rock piece that lies mostly
    # within 2 px of the named pieces joins them, each pixel the nearest named piece.
    named = [p for p, _ in cfg.get('pieces', [])]
    if named:
        near1 = {p: dilate(owner == p, 1, nb=N8) for p in named}
        near2 = {p: grow_round(owner == p, 2) for p in named}
        loose = np.isin(owner, ['main', 'bits']) & rock
        lab2, n2 = components(loose, nb=N8, wrap=wrap)
        any2 = np.zeros((H, W), bool)
        for p in named:
            any2 |= near2[p]
        for c in range(1, n2 + 1):
            m = lab2 == c
            if (m & any2).sum() < 0.5 * m.sum():
                continue
            best = max(named, key=lambda p: (m & near2[p]).sum())
            owner[m] = best
            for p in reversed(named):
                owner[m & near2[p]] = p
            for p in reversed(named):
                owner[m & near1[p]] = p
    glow = b.get('glow')
    if glow is not None and glow.any():
        # (a dash's translucent glow moves with the dash)
        gl = glow & (k == 'dust')
        lab3, n3 = components(rock | gl, nb=N8)
        for c in range(1, n3 + 1):
            m = lab3 == c
            r_ = m & rock
            if not r_.any() or not (m & gl).any():
                continue
            vals, cnt = np.unique(owner[r_], return_counts=True)
            owner[m & gl] = vals[np.argmax(cnt)]
    for pname, m in names_extra:
        owner[m & (idx > 0)] = pname
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
        pieces[pname] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0),
                         'rle': rle(sub[by0:by1, bx0:bx1].ravel())}
    return pieces


def seam_rows(A, B, PALC, lo, hi):
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
            kk = j0 + int(np.argmin(acc[y - 1, j0:j1]))
            acc[y, i] += acc[y - 1, kk]
            back[y, i] = kk
    i = int(np.argmin(acc[-1]))
    out = [0] * H
    for y in range(H - 1, -1, -1):
        out[y] = int(S[i])
        i = back[y, i]
    return out


def fill_from(idx, dust, hole):
    """Each hole pixel takes the dust value of its neighbours, filled in from the hole's edge inward."""
    out = np.where(dust, idx, 0)
    todo = hole.copy()
    while todo.any():
        got = np.zeros_like(out)
        for dy, dx in N8:
            v = shift(out, dy, dx)
            got = np.where((got == 0) & (v > 0), v, got)
        new = todo & (got > 0)
        if not new.any():
            break
        out[new] = got[new]
        todo &= ~new
    return np.where(hole, out, 0)


def grow_round(m, n):
    """Dilated n px, alternating 4- and 8-neighbour steps (a rounder, octagonal growth)."""
    for k in range(n):
        m = dilate(m, 1, nb=N8 if k % 2 else N4)
    return m


def shrink_round(m, n):
    return ~grow_round(~m, n)


def cloud_of(dust, r):
    """His cloud's envelope: his dust closed by r px (gaps and bays narrower than about 2r, where a
    rock sits in it, count as cloud) with the holes it encloses filled."""
    H, W = dust.shape
    P = r + 2
    m = np.pad(dust, P)
    c = shrink_round(grow_round(m, r), r)[P:P + H, P:P + W] | dust
    return c | holes_of(c)


def under_region(idx, kinds, cfg, line=None):
    """Where dust goes under the rock, so that a rock that moves (rocks, tumbles, bobs, sinks)
    uncovers dust, not a hole: the rock that lies inside his cloud's envelope (cloud_of). On the
    walls (whose stone never moves) only the small rocks sitting in his dust. `line`: only above
    that row (the stream, whose spikes sink into the rubble at the line)."""
    k = kinds[idx]
    rock = (k == 'body') | (k == 'outline')
    dust = k == 'dust'
    cloud = dust | (k == 'shade')
    region = rock & cloud_of(cloud, cfg.get('cloud_r', 6))
    if cfg.get('wall'):
        lab, n = components(rock, nb=N8)
        small = np.zeros(idx.shape, bool)
        for c in range(1, n + 1):
            m = lab == c
            if m.sum() > 500:
                continue
            ring = dilate(m, 1, nb=N8) & ~m
            if ring.sum() and (ring & dust).sum() >= 0.5 * ring.sum():
                small |= m
        region &= small
    if line is not None:
        region &= (np.arange(idx.shape[0]) < line)[:, None]
    return region


def under_fill(idx, kinds, PALC, region, cfg, dust_pal):
    """His dust continued under `region`: each pixel takes the local mean of his dust round it
    (premultiplied colour and alpha, a normalized gaussian over his dust pixels only, widened where
    his dust is far), tapered over the 2 px inside the cloud's edge, then put back on his dust
    palette with an ordered dither on the alpha steps."""
    H, W = idx.shape
    k = kinds[idx]
    dust = k == 'dust'
    rgba = PALC[np.maximum(idx, 1) - 1]
    A = np.where(dust, rgba[..., 3] / 255.0, 0.0)
    Q = np.concatenate([rgba[..., :3] * A[..., None], A[..., None]], -1)
    w = dust.astype(np.float64)
    out_q = np.zeros_like(Q)
    done = np.zeros((H, W), bool)
    for sg in (1.5, 3.0, 6.0, 12.0, 24.0):
        wb = gauss(w, sg)
        qb = gauss(Q * w[..., None], sg) / np.maximum(wb, 1e-9)[..., None]
        ok = region & ~done & (wb > 0.04)
        out_q[ok] = qb[ok]
        done |= ok
    a = np.where(region & done, out_q[..., 3], 0.0)
    # Taper: thinner over the last 2 px inside the cloud's envelope.
    env = cloud_of(dust | (k == 'shade'), cfg.get('cloud_r', 6))
    e1 = erode(env, 1, nb=N8)
    e2 = erode(e1, 1, nb=N8)
    a = a * np.where(e2, 1.0, np.where(e1, 0.75, 0.45))
    a_max = cfg.get('dust_a', 0.9)
    out = np.zeros((H, W), np.int32)
    if len(dust_pal) == 0:
        return out
    on = region & (a > 0.02)
    colr = out_q[on][:, :3] / np.maximum(out_q[on][:, 3], 1e-6)[:, None]
    ci = nearest(colr, dust_pal)
    st = np.floor(a[on] / a_max * DUST_STEPS + bayer_at(H, W)[on]) - 1
    keep = st >= 0
    st = np.clip(st, 0, DUST_STEPS - 1).astype(int)
    d0 = int(np.nonzero(kinds == 'dust')[0][0]) if (kinds == 'dust').any() else 0
    out[on] = np.where(keep, d0 + ci * DUST_STEPS + st, 0)
    return out


def harmonic(known, val, unknown, iters=4000):
    """A field equal to `val` on `known` and harmonic (each pixel the mean of its four neighbours)
    on `unknown`, 0 beyond the frame: the smoothest continuation of what lies round a hole. Solved
    by relaxation from a multi-scale normalized-blur start (deterministic)."""
    w = known.astype(np.float64)
    v = np.where(known, val, 0.0)
    est = np.zeros_like(v)
    got = np.zeros(v.shape, bool)
    for sg in (2.0, 4.0, 8.0, 16.0, 32.0):
        wb = gauss(w, sg)
        ok = unknown & ~got & (wb > 0.02)
        est[ok] = (gauss(v * w, sg) / np.maximum(wb, 1e-9))[ok]
        got |= ok
    v = np.where(unknown, est, v)
    for _ in range(iters):
        p = np.pad(v, 1)
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        nv = np.where(unknown, avg, v)
        if np.abs(nv - v).max() < 1e-5:
            v = nv
            break
        v = nv
    return v


def smooth_noise(H, W, cell, seed):
    """Value noise in [0, 1) on a cell-px lattice, bilinear (deterministic)."""
    gh, gw = H // cell + 2, W // cell + 2
    j = np.sin((np.arange(gh)[:, None] * 127.1 + np.arange(gw)[None, :] * 311.7 + seed * 74.7)) * 43758.5453
    g = j - np.floor(j)
    ys = np.arange(H)[:, None] / cell
    xs = np.arange(W)[None, :] / cell
    y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int)
    fy, fx = ys - y0, xs - x0
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a, b = g[y0, x0], g[y0, x0 + 1]
    c, d = g[y0 + 1, x0], g[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def clip_outer(region, dust, rock):
    """The hidden cloud clipped to the cloud's own outer outline on the left and right. On each row
    his cloud's outer edge shows where its last dust pixel has clear ground beyond it; where a rock
    stands there instead (a crystal at the cloud's side), the edge is hidden and is interpolated
    from the rows above and below where it shows, smoothed, with small round billows. The hidden
    cloud stops at that edge and thins over the 3 px inside it (his dust edges thin out the same
    way), so no crystal's straight side survives in the dust. Returns (region, alpha factor)."""
    H, W = region.shape
    xs = np.arange(W)[None, :]
    factor = np.ones((H, W))
    keep = region.copy()
    for side in ('left', 'right'):
        edge = np.full(H, np.nan)
        for y in range(H):
            d = np.nonzero(dust[y])[0]
            if len(d) == 0:
                continue
            if side == 'left':
                x = d[0]
                if not rock[y, max(0, x - 3):x].any():
                    edge[y] = x
            else:
                x = d[-1]
                if not rock[y, x + 1:x + 4].any():
                    edge[y] = x
        ok = ~np.isnan(edge)
        if ok.sum() < 2:
            continue
        ys = np.arange(H)
        e = np.interp(ys, ys[ok], edge[ok])
        e = gauss(e[:, None], 2.0)[:, 0]
        # billows: round bulges outward, about 9 rows apart
        bump = 2.2 * np.abs(np.sin(np.pi * (ys + (3.0 if side == 'left' else 7.0)) / 9.0))
        if side == 'left':
            lim = (e - bump)[:, None]
            dist = xs - lim
        else:
            lim = (e + bump)[:, None]
            dist = lim - xs
        keep &= dist >= 0
        factor *= np.clip(0.4 + 0.2 * dist, 0, 1)
    return keep, factor


def harmonic_under(idx, kinds, PALC, cfg, dust_pal, ground=None):
    """His cloud continued behind the rock that stands in it (the blast's crystals, the bolt's
    boulder): where his cloud goes on behind a rock is read from what lies round the rock. Cloud
    is 1 on his dust (by its strength) and 0 on the clear background, and is continued across the
    rock as a harmonic field (the smoothest surface joining the cloud's edges on either side), so the
    hidden cloud's outline runs on from his on both sides of the rock in a smooth, billowing curve
    (a little noise on the threshold), never along the rock's straight edges. Behind a rock half in
    the cloud only the half in it gets dust; a crystal tip in the clear sky gets none. Under it, his
    dust colours and strength are carried in from round the rock (normalized blur), thinner toward
    the hidden outline, then put on his dust palette with an ordered dither between his two nearest
    dust colours and between alpha steps (his own pixel-art texture, not a flat fill). Where his
    ground shadow lies round a rock's foot (rows from `ground` down), the shadow is continued under
    it the same way."""
    H, W = idx.shape
    k = kinds[idx]
    rock = (k == 'body') | (k == 'outline')
    dust = k == 'dust'
    shade = k == 'shade'
    rgba = PALC[np.maximum(idx, 1) - 1]
    a_max = cfg.get('dust_a', 0.9)
    A = np.where(dust, rgba[..., 3] / 255.0, 0.0)
    occ = harmonic(~rock, np.clip(A / a_max * 1.25, 0, 1), rock)
    jit = (smooth_noise(H, W, 5, 11) - 0.5) * 0.22
    region = rock & (occ >= 0.5 + jit)
    if cfg.get('under_down'):
        # A cloud is a mound: behind a rock, everything below a point of hidden cloud (down to the
        # rock's foot, above the ground band) is cloud too. Without this a wide crystal standing in
        # the middle of the cloud, whose sides are cloud on both hands but whose middle the harmonic
        # field reads as thin, leaves a clear hole behind it that opens as it sinks.
        lab, n = components(rock, nb=N8)
        above = (np.arange(H) < (ground if ground is not None else H))[:, None]
        for c in range(1, n + 1):
            m = (lab == c) & above
            region |= np.maximum.accumulate(region & m, axis=0) & m
    outer = np.ones((H, W))
    if cfg.get('under_clip'):
        region, outer = clip_outer(region, dust & (A >= 0.15 * a_max), rock)
    # His dust carried in (premultiplied colour and alpha over his dust pixels only).
    Q = np.concatenate([rgba[..., :3] * A[..., None], A[..., None]], -1)
    w = dust.astype(np.float64)
    out_q = np.zeros_like(Q)
    done = np.zeros((H, W), bool)
    for sg in (1.5, 3.0, 6.0, 12.0, 24.0):
        wb = gauss(w, sg)
        qb = gauss(Q * w[..., None], sg) / np.maximum(wb, 1e-9)[..., None]
        ok = region & ~done & (wb > 0.03)
        out_q[ok] = qb[ok]
        done |= ok
    edge = np.clip((occ - 0.5 - jit) / 0.22, 0, 1)
    a = np.where(region & done, out_q[..., 3], 0.0) * (0.55 + 0.45 * edge) * outer
    out = np.zeros((H, W), np.int32)
    d0 = int(np.nonzero(kinds == 'dust')[0][0]) if (kinds == 'dust').any() else 0
    on = region & (a > 0.02)
    if len(dust_pal) and on.any():
        colr = out_q[on][:, :3] / np.maximum(out_q[on][:, 3], 1e-6)[:, None]
        dd = ((colr[:, None, :] - dust_pal[None]) ** 2).sum(-1)
        order = np.argsort(dd, 1)
        ci = order[:, 0]
        bay = bayer_at(H, W)[on]
        if dust_pal.shape[0] > 1:
            d1 = np.sqrt(dd[np.arange(len(ci)), ci])
            d2 = np.sqrt(dd[np.arange(len(ci)), order[:, 1]])
            ci = np.where(bay < d1 / np.maximum(d1 + d2, 1e-6), order[:, 1], ci)
        st = np.floor(a[on] / a_max * DUST_STEPS + bay) - 1
        keep = st >= 0
        st = np.clip(st, 0, DUST_STEPS - 1).astype(int)
        out[on] = np.where(keep, d0 + ci * DUST_STEPS + st, 0)
    if shade.any() and ground is not None:
        # His ground shadow continued under the rocks standing in it (below the cloud's dust).
        s0 = int(np.nonzero(kinds == 'shade')[0][0])
        SAv = np.where(shade, (idx - s0) / max(1, len(SHADE_STEPS) - 1), 0.0)
        socc = harmonic(~rock, shade.astype(np.float64), rock)
        sreg = rock & (out == 0) & (socc >= 0.5 + jit) & (np.arange(H) >= ground)[:, None]
        sw = shade.astype(np.float64)
        sval = np.zeros((H, W))
        sdone = np.zeros((H, W), bool)
        for sg in (2.0, 4.0, 8.0, 16.0):
            wb = gauss(sw, sg)
            ok = sreg & ~sdone & (wb > 0.03)
            sval[ok] = (gauss(SAv * sw, sg) / np.maximum(wb, 1e-9))[ok]
            sdone |= ok
        st = np.clip(np.round(sval * (len(SHADE_STEPS) - 1)), 0, len(SHADE_STEPS) - 1).astype(int)
        out = np.where(sreg, s0 + st, out)
    return out


def add_under(pieces, idx, kinds, PALC, cfg, dust_pal, line=None, ground=None):
    if not (kinds == 'dust').any():
        return pieces
    if cfg.get('under') == 'harmonic':
        u = harmonic_under(idx, kinds, PALC, cfg, dust_pal, ground)
    else:
        u = under_fill(idx, kinds, PALC, under_region(idx, kinds, cfg, line), cfg, dust_pal)
    if u.any():
        ys, xs = np.nonzero(u)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        pieces['under'] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'rle': rle(u[by0:by1, bx0:bx1].ravel())}
    return pieces


def polys_game(b, polys):
    """Polygons in his coordinates rasterized on the sprite's game frame."""
    H, W = b['solid'].shape
    x0, y0 = b['g']['box'][:2]
    sx, sy = scale_of(b['cfg'])
    return poly_mask(H, W, polys, x0, y0, 1 / sx, 1 / sy)


def fill_solid(idx, kinds, inside):
    """His solid rock has no see-through pixels: every clear or semi-transparent pixel inside
    `inside` (a traced outline, shrunk 1 px so its rim is left alone) takes the commonest opaque
    value among its 8 neighbours, filled in from the opaque edge inward."""
    rockk = np.isin(kinds, ['body', 'outline'])
    out = idx.copy()
    H, W = idx.shape
    todo = inside & ~rockk[out]
    n0 = int(todo.sum())
    while todo.any():
        sets = []
        for y, x in zip(*np.nonzero(todo)):
            nb = [out[y + dy, x + dx] for dy, dx in N8 if 0 <= y + dy < H and 0 <= x + dx < W and rockk[out[y + dy, x + dx]] and not todo[y + dy, x + dx]]
            if nb:
                vals, cnt = np.unique(nb, return_counts=True)
                sets.append((y, x, int(vals[np.argmax(cnt)])))
        if not sets:
            break
        for y, x, v in sets:
            out[y, x] = v
            todo[y, x] = False
    return out, n0


result = {}
review = {}
for name, b in built.items():
    cfg = b['cfg']
    pal, body, rims, dust = palette_for(b)
    PALC = np.array([p[:4] for p in pal], np.float64)
    kinds = np.array(['clear'] + [p[4] for p in pal])
    idx = quantize(b, pal, body, rims, dust)
    if cfg.get('fill_solid'):
        inside = np.zeros(idx.shape, bool)
        for poly in cfg['fill_solid']:
            inside |= erode(polys_game(b, [poly]), 1)
        idx, nf = fill_solid(idx, kinds, inside)
        print('%-11s see-through pixels filled inside his solid rock: %d (left: %d)' % (name, nf, int((inside & ~np.isin(kinds[idx], ['body', 'outline'])).sum())))
    if cfg.get('wall'):
        print('%-11s enclosed clear pixels after quantize: %d' % (name, holes_of(idx > 0).sum()))
    pal_json = [{'rgba': '#%02x%02x%02x%02x' % p[:4], 'kind': p[4]} for p in pal]
    if cfg.get('stream'):
        ay = b['ay']
        assert ay >= 32 and ay + 32 <= b['H'], (ay, b['H'])
        tile = idx[ay - 32:ay + 32, :64].copy()
        head0 = idx[ay - 32:ay + 32, 64:76]
        seam = seam_rows(head0, tile[:, :12], PALC, 0, 11)
        for y, sc in enumerate(seam):
            tile[y, :sc] = head0[y, :sc]
        # Where his rock runs on across the joint (the pebble the joint cuts), the tile's first column
        # takes his column just past the joint, so the next tile closes that rock instead of leaving
        # it cut flat at column 63; a body pixel there with nothing beyond becomes his rim.
        rock_k = np.isin(kinds, ['body', 'outline'])
        for y in range(64):
            if rock_k[tile[y, 63]] and not tile[y, 0] and rock_k[head0[y, 0]]:
                tile[y, 0] = head0[y, 0]
                if kinds[tile[y, 0]] == 'body' and not rock_k[tile[y, 1]]:
                    tile[y, 0] = len(body) + 1 + int(np.argmin(lum(rims)))
        print('stream seam: rows with column 63 opaque and column 0 clear: %s' % [y for y in range(64) if tile[y, 63] and not tile[y, 0]])
        # No loose bit may touch the tile's top or bottom row.
        lab, n = components(tile > 0, wrap=True)
        for c in set(np.unique(np.concatenate([lab[0], lab[-1]]))) - {0}:
            if (lab == c).sum() <= 40:
                tile[lab == c] = 0
        # The head starts 32 columns before the joint: the game puts the head's anchor (x 32) on the
        # end of the last tile, so its first 32 columns lie over the last tile's right half and are
        # that half (his columns there), and the anchor is exactly his joint.
        head = idx[:, 32:].copy()
        result['stream'] = {'w': 64, 'h': 64, 'anchor': [0, 32], 'pal': pal_json,
                            'pieces': add_under(split_pieces(tile, kinds, b, keep_full=True, wrap=True), tile, kinds, PALC, cfg, dust, line=32 + 6)}
        result['stream_head'] = {'w': int(head.shape[1]), 'h': int(head.shape[0]), 'anchor': [32, int(ay)], 'pal': pal_json,
                                 'pieces': add_under(split_pieces(head, kinds, b, keep_full=True), head, kinds, PALC, cfg, dust, line=ay + 6)}
        review['stream'] = (tile, PALC, b['g']['his'][ay - 32:ay + 32, :64])
        review['stream_head'] = (head, PALC, b['g']['his'][:, 32:])
        if REVIEW:
            os.makedirs(REVIEW, exist_ok=True)
            np.savez(os.path.join(REVIEW, 'strip-stream.npz'), idx=idx, pal=PALC, ay=ay)
        continue
    if cfg.get('aura'):
        front = (b['g']['F'] >= 0.3) & (idx > 0)
        rows = np.arange(b['H'])[:, None]
        front |= (rows >= b['ay']) & (idx > 0)                 # the pebbles at his feet
        front = dilate(front, 1, nb=N8) & (idx > 0) & ((rows >= b['ay']) | (b['g']['F'] >= 0.05) | front)
        for lname, m in (('aura', front), ('aura_back', ~front)):
            sub = np.where(m, idx, 0)
            result[lname] = {'w': b['W'], 'h': b['H'], 'anchor': [b['ax'], b['ay']], 'pal': pal_json,
                             'pieces': add_under(split_pieces(sub, kinds, b), sub, kinds, PALC, cfg, dust)}
            review[lname] = (sub, PALC, b['g']['his'])
        continue
    result[name] = {'w': b['W'], 'h': b['H'], 'anchor': [b['ax'], b['ay']], 'pal': pal_json,
                    'pieces': add_under(split_pieces(idx, kinds, b), idx, kinds, PALC, cfg, dust, ground=b['ay'] - cfg.get('ground_band', 0))}
    review[name] = (idx, PALC, b['g']['his'])

for name, r in result.items():
    print('%-11s %3dx%-3d anchor %3d,%-3d pal %3d pieces %s' % (name, r['w'], r['h'], r['anchor'][0], r['anchor'][1], len(r['pal']), ','.join(r['pieces'])))

if not ONLY:
    scales = {n: scale_of(c) for n, c in SPRITES.items()}
    ts = ["// GENERATED by tools/refs/earth-from-ref.py from the owner's paint-over of the earth sheet",
          "// (docs/reference/earth-set-owner-reference.jpg): do not edit by hand. Each sprite's key frame has",
          "// its own palette (his rock, his rims, his dust at alpha steps, his ground shadow) and is split into",
          "// pieces of base64 run-length data, as (run, palette index + 1) byte pairs (0 = clear), each placed",
          "// at (x, y) in the sprite's frame.", '',
          "export type EarthKind = 'body' | 'outline' | 'dust' | 'shade';",
          'export interface EarthPal { rgba: string; kind: EarthKind }',
          'export interface EarthPiece { x: number; y: number; w: number; h: number; rle: string }',
          'export interface EarthRef { w: number; h: number; anchor: [number, number]; pal: EarthPal[]; pieces: Record<string, EarthPiece> }',
          '/** His px per game px (across, down), per panel. */',
          'export const EV3_SCALE: Record<string, [number, number]> = ' + json.dumps({k: [round(v[0], 4), round(v[1], 4)] for k, v in scales.items()}) + ';',
          'export const EV3_REF: Record<string, EarthRef> = ' + json.dumps(result, indent=1) + ';', '']
    tmp = OUT_TS + '.part'
    with open(tmp, 'w') as fh:
        fh.write('\n'.join(ts))
    os.replace(tmp, OUT_TS)
    print('wrote', OUT_TS)

if REVIEW:
    os.makedirs(REVIEW, exist_ok=True)

    def rgba_of(idx, PALC):
        out = np.zeros(idx.shape + (4,))
        on = idx > 0
        out[on] = PALC[idx[on] - 1]
        return out

    def comp(rgba, bg):
        A = rgba[..., 3:] / 255
        return rgba[..., :3] * A + np.asarray(bg, np.float64) * (1 - A)

    for n, r in result.items():
        with open(os.path.join(REVIEW, 'ref-' + n + '.json'), 'w') as fh:
            json.dump(r, fh)
    anchors = {n: r['anchor'] for n, r in result.items()}
    with open(os.path.join(REVIEW, 'his-anchors.json'), 'w') as fh:
        json.dump(anchors, fh)
    for name, (idx, PALC, his) in review.items():
        np.savez(os.path.join(REVIEW, 'k-' + name + '.npz'), idx=idx, pal=PALC)
        Image.fromarray(np.clip(his, 0, 255).astype(np.uint8)).save(os.path.join(REVIEW, 'his-' + name + '.png'))
        rgba = rgba_of(idx, PALC)
        H, W = idx.shape
        k = 4 if max(W, H) < 120 else 3 if max(W, H) < 200 else 2
        imgs = [his, comp(rgba, BG), comp(rgba, [96, 124, 72])]
        S = Image.new('RGB', (W * k * len(imgs) + 10 * len(imgs), H * k), (0, 0, 0))
        for i, x in enumerate(imgs):
            S.paste(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).resize((W * k, H * k), Image.NEAREST), (i * (W * k + 10), 0))
        S.save(os.path.join(REVIEW, 'x-' + name + '.png'))
