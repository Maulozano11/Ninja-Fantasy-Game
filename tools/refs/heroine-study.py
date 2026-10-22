"""The owner's four heroines brought down to our scale: the reduced references every heroine part copies.

His pictures (docs/reference/{lyra,elise,saya,aurelia}-owner-reference.jpg, tools/refs/heroine_ref.py)
are his own pixel art at 2.2 to 2.8 of his pixels to one of ours, in proportions that are not ours
(she is 5.1 to 5.4 heads tall, ours 4.1). For each picture this script:

1. cuts her figure into parts (polygons in her pixels, PARTS; some parts take only her pixels of
   some colours, KEEP): first listed has a pixel where two overlap; her weapon's light is the
   glow (heroine_ref.GLOW);
2. lays each part on our female rig at idle frame 0 by its map (heroine_ref.SEGMENTS[which]; SEG_OF
   says which) and brings it down: each of our pixels is the part's where half of it is, and takes
   her commonest colour under it (5 x 5 samples), shaded by her colours under it near that one (their
   mean, then her nearest colour), her lines inside the part left out unless they fill the pixel;
3. paints the hand-drawn part (tools/refs/heroine_paint.py PAINT, see paint()): drawn by hand at our
   scale after hers, in her colours, what that reduction loses or her picture hides; everything below
   her head (torso, arms, hands, skirt, coat or skirt panels, legs, the weapon and its light) and her
   eyes, brows and mouth;
4. lays her dark line round the figure, and between her parts where her picture has it.

Every pixel is one of that picture's colours (heroine_ref.PALETTES[which]).

It writes, in <out>:

  <which>-reduced@1.png  the reduced reference in our 256 x 256 frame's box (BOX) at 1x
  <which>-reduced@8.png  the same at 8x
  <which>-native@4.png   her pixels at 4x
  <which>-parts@4.png    her parts, each in its own tint
  <which>-compare@4.png  her figure beside the reduced one at the same height
  <which>-palette.png    her colours, those the reduced reference uses marked
  overlay@8.png          the four on our female idle (dimmed) with our joints marked

and, with --write, tools/refs/data/heroine-<which>-reduced.npy (palette indices over BOX, 255 where
she is not; its last row holds the box's x0, y0), -parts.npy (which part each pixel came from) and
-layers.npy (each part alone, what the parts in front hide included), that heroine_ref.reduced(),
reduced_parts() and reduced_layers() read. <idle> is our female at idle frame 0 with no items (a
256 x 256 PNG, tools/refs/heroine-idle.mts writes it). The same pictures always give the same bytes.
Run from the repository root with python3 -I:

  npx tsx tools/refs/heroine-idle.mts <out>
  python3 -I tools/refs/heroine-study.py <out> <out>/female-idle.png [--write] [--only <which>]
  python3 -I tools/refs/heroine-study.py --palette <which>
  python3 -I tools/refs/heroine-study.py --rows <which> x0 y0 x1 y1 [--parts]

--palette prints a picture's colours for heroine_ref.PALETTES; --rows prints the figure over a box of
our frame in KEY characters (and which part each pixel is), the base for a hand-drawn block.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import heroine_ref as R  # noqa: E402

# The reduced references' box in our frame (x0, y0, x1, y1): every figure and weapon fits in it.
BOX = (72, 112, 184, 226)
SAMPLES = 5
COVER = 0.5
# Thin parts that are theirs where they cover less.
COVER_OF = {'blade': 0.3, 'hilt': 0.3, 'glow': 0.3}
# How near (redmean distance) a colour of hers under one of our pixels must be to the commonest one
# there to shade it.
NEAR = 40.0
# A pixel of a part takes her line's colour only where her line fills more than 1 - LIT of it.
LIT = 0.4
BACK_TO_FRONT = R.PART_NAMES

# ---------------------------------------------------------------------------------------------
# Her parts, in her pixels (x, y of pixel corners; a pixel is in when its middle is). Listed in the
# order they claim pixels: the first listed has a pixel where two overlap. What no part takes (and
# the white round her) is left out.

# Lyra's and Elise's body: one template, one set of cuts (TEMPLATE_PARTS); each picture adds its own
# where her clothes differ.
TEMPLATE_PARTS = {
    # the hilt (pommel, grip, the swept guard): only her steel, gold and dark pixels in it (her cream
    # coat behind the guard and her skin are not the hilt's)
    'hilt': [(15, 113), (34, 117), (52, 127), (76, 128), (78, 140), (68, 153), (56, 153), (44, 155), (30, 151),
             (21, 141), (15, 125)],
    # the blade, from the guard to the point
    'blade': [(55, 141), (64, 139), (139, 231), (138, 239), (131, 238), (53, 148)],
    # the near hand round the grip
    'handN': [(34, 123), (42, 121), (50, 123), (56, 127), (58, 136), (53, 144), (40, 145), (33, 137)],
    # hair, face, ear, the ribbon and the ornament, down to her chin
    'head': [(52, 0), (131, 0), (131, 46), (114, 46), (109, 49), (104, 51), (98, 51), (92, 47), (52, 46)],
    # the near arm: the bare shoulder, the red drape over it, the puffed sleeve, the bracer, the cuff
    'armN': [(60, 53), (80, 53), (83, 60), (82, 68), (86, 73), (85, 79), (76, 80), (75, 90), (72, 100), (66, 104),
             (62, 118), (59, 123), (42, 123), (40, 118), (44, 110), (46, 100), (46, 88), (50, 80), (56, 77), (59, 68)],
    # the far hand
    'handF': [(119, 124), (134, 123), (137, 135), (135, 149), (124, 151), (119, 141)],
    # the far arm: the sleeve and the bracer (behind the pouch)
    'armF': [(112, 72), (124, 72), (127, 86), (128, 100), (130, 112), (131, 124), (117, 125), (117, 104), (113, 90)],
    # the legs: the thighs under the skirt, the gold cuffs, the boots
    'legN': [(68, 147), (97, 147), (96, 160), (95, 171), (88, 177), (86, 194), (82, 209), (77, 224), (71, 237), (71, 256),
             (43, 256), (45, 241), (53, 228), (57, 206), (61, 186), (65, 171), (67, 160)],
    'legF': [(98, 147), (122, 147), (124, 160), (124, 172), (118, 180), (117, 200), (117, 222), (119, 236), (133, 243),
             (135, 253), (99, 253), (100, 236), (101, 214), (101, 190), (99, 172), (98, 160)],
    # the skirt: from the belt's lower edge to the hem, the gold piece on the belt over it
    'skirt': [(78, 114), (121, 114), (122, 151), (78, 151)],
    # the torso: neck, chest, blouse, corset, the pauldron and its strap, the belt and the pouch on it
    'torso': [(86, 44), (104, 50), (113, 49), (126, 56), (132, 70), (126, 78), (124, 84), (113, 84), (113, 100),
              (117, 104), (125, 102), (134, 103), (134, 123), (119, 123), (117, 116), (98, 120), (80, 118), (65, 118),
              (65, 106), (77, 104), (80, 94), (81, 84), (86, 80)],
    # the coat: both tails from the waist to the calves, the lining behind the legs
    'coat': [(16, 104), (80, 104), (80, 151), (99, 151), (113, 113), (142, 116), (144, 224), (116, 224), (110, 214),
             (82, 212), (58, 226), (16, 226)],
    # the long hair down her back
    'hair': [(14, 28), (92, 28), (92, 132), (14, 132)],
}
PARTS = {
    'lyra': {**TEMPLATE_PARTS,
             # her braid over the near shoulder, in front of her chest
             'hairFront': [(78, 44), (92, 45), (94, 56), (93, 66), (92, 76), (91, 84), (83, 84), (80, 74), (78, 62)]},
    'elise': dict(TEMPLATE_PARTS),
    'saya': {
        # the hilt: the gold pommel and brown grip up-left of her fist, the gold ring and steel bars of
        # the swept guard below it
        'hilt': [(49, 92), (60, 94), (72, 102), (81, 107), (81, 123), (70, 125), (60, 125), (51, 119), (49, 105)],
        # her blade, from the guard down to the right across her legs
        'blade': [(69, 110), (78, 105), (145, 175), (143, 183), (136, 183), (67, 117)],
        # a second blade from the same guard down to the left (his picture draws two)
        'blade2': [(57, 113), (65, 118), (21, 181), (11, 181), (13, 173)],
        # the fingerless glove round the grip
        'handN': [(57, 95), (67, 94), (75, 99), (75, 111), (66, 113), (57, 109)],
        # hair, face, the gold ornament, down to her chin
        'head': [(78, 0), (136, 0), (136, 40), (121, 40), (115, 42), (108, 44), (100, 42), (78, 40)],
        # the near arm: bare shoulder, the navy guard with its red bands, the glove's cuff
        'armN': [(83, 47), (98, 48), (98, 60), (94, 67), (90, 77), (86, 85), (80, 93), (76, 98), (64, 100), (59, 95),
                 (63, 86), (69, 74), (75, 62), (79, 52)],
        # the far arm and its glove
        'armF': [(116, 47), (127, 49), (131, 62), (135, 80), (137, 95), (131, 98), (124, 96), (120, 80), (118, 62)],
        'handF': [(122, 94), (137, 94), (140, 104), (137, 115), (126, 115), (122, 104)],
        # the red scarf: round her neck and its ends flowing back behind the near shoulder
        'scarf': [(96, 38), (124, 38), (126, 50), (112, 54), (100, 53), (96, 60), (88, 66), (80, 76), (66, 82),
                  (52, 92), (38, 92), (38, 70), (56, 58), (80, 50), (92, 42)],
        # the legs: thighs, the wrapped leggings, the armoured shoes
        'legN': [(70, 117), (99, 117), (99, 130), (93, 145), (89, 165), (87, 180), (89, 199), (67, 199), (68, 182),
                 (70, 160), (73, 140), (73, 125)],
        'legF': [(104, 117), (127, 117), (127, 135), (125, 155), (125, 175), (139, 189), (137, 198), (109, 198),
                 (110, 180), (110, 160), (106, 140)],
        # the pleated skirt and the gold tassels on it
        'skirt': [(84, 93), (129, 93), (131, 121), (83, 121)],
        # the torso: the cream chest plate, the navy top, the belts, the pouches
        'torso': [(98, 40), (119, 40), (127, 48), (128, 62), (126, 80), (130, 90), (130, 98), (80, 98), (80, 88),
                  (88, 80), (92, 64), (96, 52)],
        # the black scabbard hanging from her near hip behind her legs
        'scabbard': [(79, 117), (91, 121), (72, 148), (61, 155), (54, 153), (55, 145)],
        # the long hair down her back
        'hair': [(36, 28), (101, 28), (101, 122), (36, 122)],
    },
    'aurelia': {
        # her staff: the shaft from her far hand down to the right, the golden winged head and the pearl
        'blade': [(128, 108), (134, 104), (152, 120), (150, 127), (142, 124), (128, 114)],
        'hilt': [(140, 108), (184, 110), (184, 154), (140, 154)],
        # the far hand round the shaft
        'handF': [(124, 99), (139, 99), (141, 112), (137, 120), (127, 120), (124, 110)],
        # the near hand, open
        'handN': [(56, 101), (78, 101), (78, 120), (56, 120)],
        # the bun, the face and the side locks, down to her chin
        'head': [(74, 0), (136, 0), (136, 46), (121, 46), (114, 41), (106, 43), (98, 41), (74, 41)],
        # the near arm: bare shoulder, the gold band, the detached sleeve and its wide cuff
        'armN': [(79, 44), (97, 45), (97, 58), (93, 66), (90, 80), (87, 96), (83, 106), (70, 107), (57, 105), (55, 96),
                 (63, 80), (71, 66), (77, 56)],
        # the far arm: shoulder, band, sleeve
        'armF': [(112, 47), (125, 49), (127, 60), (133, 70), (139, 88), (141, 103), (126, 103), (122, 90), (118, 70),
                 (114, 60)],
        # the thighs in the skirt's slits, the white boots and the gold shoes
        'legN': [(77, 104), (97, 104), (96, 126), (92, 150), (90, 180), (86, 200), (66, 200), (68, 186), (72, 160),
                 (74, 130), (76, 115)],
        'legF': [(115, 104), (131, 104), (131, 130), (129, 160), (129, 182), (141, 191), (139, 199), (111, 199),
                 (113, 180), (115, 150), (115, 125)],
        # the front panel hanging over her legs, embroidered
        'skirt': [(97, 95), (119, 95), (119, 160), (108, 170), (97, 160)],
        # the torso: collar, the gem, the bodice, the gold sash, the belt and the pouch
        'torso': [(92, 37), (117, 37), (125, 48), (125, 62), (123, 78), (127, 97), (82, 97), (82, 80), (88, 62), (90, 48)],
        # the side and back panels of the skirt, behind her legs
        'coat': [(34, 92), (148, 92), (148, 188), (34, 188)],
    },
}
CLAIM = {
    'lyra': ['hilt', 'blade', 'handN', 'head', 'hairFront', 'armN', 'handF', 'armF', 'legN', 'legF', 'skirt', 'torso',
             'coat', 'hair'],
    'elise': ['hilt', 'blade', 'handN', 'head', 'armN', 'handF', 'armF', 'legN', 'legF', 'skirt', 'torso', 'coat',
              'hair'],
    'saya': ['hilt', 'handN', 'blade', 'blade2', 'head', 'armN', 'handF', 'armF', 'legN', 'legF', 'skirt', 'torso',
             'scarf', 'scabbard', 'hair'],
    'aurelia': ['handF', 'blade', 'hilt', 'handN', 'head', 'armN', 'armF', 'legN', 'legF', 'skirt', 'torso', 'coat'],
}


def _steel_gold_dark(N):
    """Her hilts' stuff: her steel (greys), her golds and browns, her line; not her skin, cloth or
    cream coat."""
    r, g, b = (N[..., i].astype(float) for i in range(3))
    L = R.luma(N)
    grey = (np.abs(r - g) < 28) & (np.abs(g - b) < 28) & (L < 215)
    gold = (r > g) & (g > b) & (r - b > 60) & ~((r > 220) & (g > 170))
    return grey | gold | (L < 60)


# Parts that take only some of her pixels in their polygon (what else is there goes on to the next).
KEEP = {
    'lyra': {'hilt': _steel_gold_dark},
    'elise': {'hilt': _steel_gold_dark},
    'saya': {'hilt': _steel_gold_dark},
    'aurelia': {},
}
# Her line (the darkest colour of hers): round the figure and between parts. A pixel at least this
# dark (luma) is a line already.
LINE = {'lyra': '#04010d', 'elise': '#080613', 'saya': '#02010d', 'aurelia': '#030101'}
DARK = 40
# A line between two parts where her line covers this much of the pixel.
LINE_COVER = 0.2
# Parts without her line round them: the light round the weapon.
UNLINED = {'glow'}
# Parts that meet without a line between them.
NO_LINE = {frozenset(p) for p in [('head', 'hair'), ('hairFront', 'head'), ('skirt', 'torso'), ('hilt', 'blade'),
                                  ('glow', 'blade'), ('handN', 'hilt'), ('handN', 'blade'), ('glow', 'hilt')]}
# The hand-drawn part (see paint()) and the colours it uses: tools/refs/heroine_paint.py.
from heroine_paint import KEY, PAINT  # noqa: E402
# Which of heroine_ref.SEGMENTS[which] each part rides.
SEG_OF = {'head': 'head', 'hair': 'hair', 'hairFront': 'hair', 'torso': 'torso', 'skirt': 'torso', 'scarf': 'hair',
          'coat': 'coat', 'armN': 'armN', 'armF': 'armF', 'handN': 'handN', 'handF': 'handF', 'legN': 'legN',
          'legF': 'legF', 'blade': 'weapon', 'hilt': 'weapon', 'glow': 'weapon', 'scabbard': 'weapon',
          'blade2': 'weapon'}


inside = R.inside


def ci(which, h):
    return R.PALETTES[which].index(h)


def her(which):
    """Her pixels: (N rgb, Q palette indices, the parts' masks). The glow is her weapon's light
    (heroine_ref.GLOW) that no other part takes."""
    N = R.native(which)
    fig = R.figure(which)
    Q = R.quantize(N, which)
    H, W = Q.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = xx + 0.5, yy + 0.5
    M = {}
    taken = ~fig
    for name in CLAIM[which]:
        m = inside(PARTS[which][name], cx, cy) & ~taken
        if name in KEEP[which]:
            m &= KEEP[which][name](N)
        M[name] = m
        taken |= m
    M['glow'] = R.glow(which) & ~np.any([M[n] for n in CLAIM[which]], 0)
    return N, Q, M


# ---------------------------------------------------------------------------------------------

def sample(which, seg, Q, mask, fig, box):
    """One part of her brought down onto our box: (cov, col, dark), each (h, w). cov is how much of
    each of our pixels the part covers (of SAMPLES x SAMPLES samples); col its colour there, her
    commonest colour under it shaded by the colours of hers under it near that one (their mean, then
    her nearest colour: her ramps stay smooth, and two colours of different stuff, her line and her
    cloth or the cloth and the gold on it, are never mixed into a third), -1 where cov is 0; dark how
    much of the pixel her line covers, whatever part it is (for the line between parts)."""
    x0, y0, x1, y1 = box
    h, w = y1 - y0, x1 - x0
    H, W = Q.shape
    S = SAMPLES
    offs = (np.arange(S) + 0.5) / S
    oy, ox = np.meshgrid(offs, offs, indexing='ij')
    yy, xx = np.mgrid[y0:y1, x0:x1]
    q = np.stack([(xx[..., None, None] + ox).ravel(), (yy[..., None, None] + oy).ravel()], 1)
    p = R.backward(seg, q)
    px = np.floor(p[:, 0]).astype(int)
    py = np.floor(p[:, 1]).astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    hit = np.zeros(len(q), bool)
    hit[ok] = mask[py[ok], px[ok]]
    P = R.rgb(which)
    Ld = R.luma(P) <= DARK
    dk = np.zeros(len(q), bool)
    dk[ok] = fig[py[ok], px[ok]] & Ld[Q[py[ok], px[ok]]]
    col = np.full(len(q), -1)
    col[hit] = Q[py[hit], px[hit]]
    hit = hit.reshape(h, w, S * S)
    col = col.reshape(h, w, S * S)
    cov = hit.mean(-1)
    out = np.full((h, w), -1)
    n = len(P)
    for j, i in zip(*np.nonzero(cov > 0)):
        c = col[j, i][col[j, i] >= 0]
        # her lines inside a part are left out unless they fill the pixel: the part's own colours
        # show, and her line is laid again round the parts (outline)
        lit = c[~Ld[c]]
        if len(lit) and len(lit) >= LIT * len(c):
            c = lit
        top = np.bincount(c, minlength=n).argmax()
        near = c[R.colour_distance(P[c], P[top]) < NEAR]
        out[j, i] = int(R.quantize(P[near].mean(0), which))
    return cov, out, dk.reshape(h, w, S * S).mean(-1)


def layers(which, N, Q, M):
    """Her parts on our box: (lay, own, dark). lay: each part alone, (h, w) palette indices, -1 where
    it is not; own: which part each pixel of the figure is ('' off it); dark: her line's cover under
    each pixel by the map of the part that owns it. A pixel is the figure's where her parts cover
    half of it between them; it is the front-most part's that covers half of it (COVER_OF), else the
    part that covers most of it."""
    box = BOX
    h, w = box[3] - box[1], box[2] - box[0]
    seg = R.SEGMENTS[which]
    fig = np.zeros(Q.shape, bool)
    for m in M.values():
        fig |= m
    cov, col, drk = {}, {}, {}
    for name in BACK_TO_FRONT:
        if name not in M:
            continue
        cov[name], col[name], drk[name] = sample(which, seg[SEG_OF[name]], Q, M[name], fig, box)
    names = list(cov)
    total = np.minimum(sum(cov.values()), 1)
    own = np.full((h, w), '', dtype='<U9')
    best = np.zeros((h, w))
    for name in names:
        more = cov[name] > best
        own[more] = name
        best = np.maximum(best, cov[name])
    for name in names:
        own[cov[name] >= COVER_OF.get(name, COVER)] = name
    own[total < COVER] = ''
    for name in names:
        solo = cov[name] >= COVER_OF.get(name, COVER)
        own[(own == '') & solo] = name
    lay = {name: np.full((h, w), -1) for name in BACK_TO_FRONT}
    dark = np.zeros((h, w))
    for name in names:
        mine = (cov[name] >= COVER_OF.get(name, COVER)) | (own == name)
        lay[name][mine] = col[name][mine]
        dark[own == name] = drk[name][own == name]
    return lay, own, dark


def outline(which, idx, part, dark):
    """Her dark line round the figure, and round each part where it lies on a part behind it where
    her picture has her line (LINE_COVER of the pixel; not between the NO_LINE pairs): every such
    edge pixel that is not already as dark."""
    L = R.luma(R.rgb(which))
    line = ci(which, LINE[which])
    order = {n: k for k, n in enumerate(BACK_TO_FRONT)}
    h, w = idx.shape
    out = idx.copy()
    for j in range(h):
        for i in range(w):
            v = idx[j, i]
            if v < 0 or L[v] <= DARK:
                continue
            me = part[j, i]
            if me in UNLINED:
                continue
            for jj, ii in ((j - 1, i), (j + 1, i), (j, i - 1), (j, i + 1)):
                if not (0 <= jj < h and 0 <= ii < w) or idx[jj, ii] < 0:
                    out[j, i] = line
                    break
                other = part[jj, ii]
                if (other != me and order[other] < order[me] and frozenset((me, other)) not in NO_LINE
                        and dark[j, i] >= LINE_COVER):
                    out[j, i] = line
                    break
    return out


def paint(which, idx, part, patches):
    """The hand-drawn PAINT on the figure: (x0, y0, rows) in our frame, each character one of
    KEY[which] (her colours), '.' keeps the pixel, '_' clears it. A patch with a part name makes its
    pixels that part's; with None they stay the part they were (a new pixel takes the part of its
    nearest neighbour)."""
    key = {c: ci(which, h) for c, h in KEY[which].items()}
    bx, by = BOX[:2]
    idx, part = idx.copy(), part.copy()
    for name, px, py, rows in patches:
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == '.':
                    continue
                j, i = py + dy - by, px + dx - bx
                if ch == '_':
                    idx[j, i] = -1
                    part[j, i] = ''
                    continue
                idx[j, i] = key[ch]
                if name:
                    part[j, i] = name
                elif not part[j, i]:
                    near = [part[jj, ii] for jj, ii in ((j, i - 1), (j, i + 1), (j - 1, i), (j + 1, i))
                            if 0 <= jj < idx.shape[0] and 0 <= ii < idx.shape[1] and part[jj, ii]]
                    part[j, i] = near[0] if near else 'torso'
    return idx, part


def build(which):
    N, Q, M = her(which)
    lay, own, dark = layers(which, N, Q, M)
    h, w = BOX[3] - BOX[1], BOX[2] - BOX[0]
    idx = np.full((h, w), -1)
    for name in BACK_TO_FRONT:
        put = own == name
        idx[put] = lay[name][put]
    part = own.copy()
    part[idx < 0] = ''
    before = idx.copy()
    idx, part = paint(which, idx, part, PAINT.get(which, []))
    # her line round the figure; between parts only where her picture has it, so not round what is
    # drawn by hand (that draws its own)
    dark[idx != before] = 0
    idx = outline(which, idx, part, dark)
    part[idx < 0] = ''
    # each part's layer: what of it shows is the finished figure's; what the parts in front hide stays
    # the reduction's
    for name in BACK_TO_FRONT:
        mine = part == name
        lay[name][mine] = idx[mine]
        lay[name][(part != name) & (idx < 0)] = -1
    return N, Q, M, idx, part, lay


def rows(which, idx, x0, y0, x1, y1):
    """The figure over a box of our frame as rows of KEY[which] characters (each pixel the nearest
    of them), '.' where she is not: the base for a PAINT patch."""
    keys = list(KEY[which])
    K = np.array([[int(KEY[which][c][i:i + 2], 16) for i in (1, 3, 5)] for c in keys])
    P = R.rgb(which)
    bx, by = BOX[:2]
    out = []
    for y in range(y0, y1):
        r = ''
        for x in range(x0, x1):
            v = idx[y - by, x - bx]
            r += '.' if v < 0 else keys[int(R.colour_distance(K, P[v]).argmin())]
        out.append(r)
    return out


# ---------------------------------------------------------------------------------------------

def to_rgba(which, idx):
    P = R.rgb(which)
    out = np.zeros(idx.shape + (4,), np.uint8)
    m = idx >= 0
    out[m, :3] = P[idx[m]]
    out[m, 3] = 255
    return out


def big(a, k, bgc=(236, 236, 240)):
    a = a.astype(np.uint8)
    if a.shape[2] == 4:
        base = np.zeros(a.shape[:2] + (3,), np.uint8)
        base[:] = bgc
        al = a[..., 3:4] / 255.0
        a = (a[..., :3] * al + base * (1 - al)).astype(np.uint8)
    im = Image.fromarray(a)
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


TINT = {'hilt': (255, 140, 60), 'blade': (255, 60, 60), 'glow': (255, 255, 0), 'handN': (0, 220, 255),
        'handF': (230, 40, 200), 'head': (255, 200, 0), 'hairFront': (255, 120, 0), 'hair': (160, 90, 30),
        'armN': (0, 140, 255), 'armF': (150, 60, 255), 'legN': (0, 200, 120), 'legF': (120, 220, 0),
        'skirt': (255, 0, 120), 'torso': (255, 255, 255), 'coat': (90, 90, 90), 'scarf': (255, 0, 0),
        'scabbard': (0, 0, 0), 'blade2': (255, 90, 90)}


def write_outputs(out, which, N, M, idx):
    rgba = to_rgba(which, idx)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'{which}-reduced@1.png'))
    big(rgba, 8).save(os.path.join(out, f'{which}-reduced@8.png'))
    R.save(N, os.path.join(out, f'{which}-native@4.png'), 4)
    used = set(np.unique(idx[idx >= 0]).tolist())
    k = 20
    pal = R.PALETTES[which]
    per = 32
    im = Image.new('RGB', (per * k, ((len(pal) + per - 1) // per) * (k + 6)), (255, 255, 255))
    d = ImageDraw.Draw(im)
    for i, hexc in enumerate(pal):
        X, Y = (i % per) * k, (i // per) * (k + 6)
        d.rectangle((X, Y, X + k - 2, Y + k - 1), fill=hexc)
        if i in used:
            d.rectangle((X, Y + k + 1, X + k - 2, Y + k + 4), fill=(0, 0, 0))
    im.save(os.path.join(out, f'{which}-palette.png'))
    show = (N * 0.25 + 150).astype(np.uint8)
    for name, m in M.items():
        show[m] = (N[m] * 0.55 + np.array(TINT[name]) * 0.45).astype(np.uint8)
    R.save(show, os.path.join(out, f'{which}-parts@4.png'), 4)
    # her figure beside the reduced one, the same height
    fig = np.zeros(N.shape[:2], bool)
    for m in M.values():
        fig |= m
    hisf = np.zeros(N.shape[:2] + (4,), np.uint8)
    hisf[fig, :3] = N[fig]
    hisf[fig, 3] = 255
    yy, xx = np.nonzero(fig)
    hisf = hisf[yy.min():yy.max() + 1, xx.min():xx.max() + 1]
    oy, ox = np.nonzero(idx >= 0)
    ours = rgba[oy.min():oy.max() + 1, ox.min():ox.max() + 1]
    kk = 4
    hh = ours.shape[0] * kk
    a = big(hisf, 1)
    a = a.resize((round(a.width * hh / a.height), hh), Image.NEAREST)
    b = big(ours, kk)
    c = Image.new('RGB', (a.width + b.width + 16, hh), (255, 255, 255))
    c.paste(a, (0, 0))
    c.paste(b, (a.width + 16, 0))
    c.save(os.path.join(out, f'{which}-compare@4.png'))


def overlay(out, idle_path, results):
    """The reduced references on our female idle (dimmed), our joints marked, side by side."""
    k = 8
    idle = np.asarray(Image.open(idle_path).convert('RGBA')).astype(np.float64)
    x0, y0, x1, y1 = BOX
    tiles = []
    for which, idx, part in results:
        base = np.full((y1 - y0, x1 - x0, 3), 236.0)
        sub = idle[y0:y1, x0:x1]
        al = sub[..., 3:4] / 255
        base = base * (1 - al) + (sub[..., :3] * 0.55 + 236 * 0.45) * al
        rgba = to_rgba(which, idx)
        ra = rgba[..., 3:4] / 255 * 0.72
        comp = base * (1 - ra) + rgba[..., :3] * ra
        im = Image.fromarray(comp.astype(np.uint8)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
        d = ImageDraw.Draw(im)
        for name, (jx, jy) in R.OUR_JOINTS.items():
            X, Y = (jx - x0) * k, (jy - y0) * k
            col = (0, 140, 255) if name.endswith('N') else (230, 40, 200) if name.endswith('F') else (0, 190, 0)
            d.ellipse((X - 5, Y - 5, X + 5, Y + 5), outline=col, width=2)
        d.text((8, 8), which, fill=(0, 0, 0))
        tiles.append(im)
    W = sum(t.width for t in tiles) + 16 * (len(tiles) - 1)
    c = Image.new('RGB', (W, tiles[0].height), (255, 255, 255))
    x = 0
    for t in tiles:
        c.paste(t, (x, 0))
        x += t.width + 16
    c.save(os.path.join(out, 'overlay@8.png'))


def palette(which, tol=14.0, least=2):
    """Her colours, rebuilt: her figure's pixels clustered (redmean distance `tol`, most common first,
    then medians), clusters of fewer than `least` of her pixels dropped, darkest first."""
    N = R.native(which)
    px = N[R.figure(which)].reshape(-1, 3).astype(float)
    keys, inv, cnt = np.unique((px // 6).astype(int), axis=0, return_inverse=True, return_counts=True)
    inv = inv.ravel()
    cs = []
    for o in np.argsort(-cnt, kind='stable'):
        c = px[inv == o].mean(0)
        if all(R.colour_distance(c, q) > tol for q in cs):
            cs.append(c)
    cs = np.array(cs)

    def settle(cs, rounds):
        for _ in range(rounds):
            lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
            cs = np.array([np.median(px[lab == i], 0) for i in range(len(cs)) if (lab == i).any()])
        lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
        return cs, np.bincount(lab, minlength=len(cs))

    cs, n = settle(cs, 10)
    while n.min() < least:
        cs, n = settle(np.delete(cs, n.argmin(), 0), 3)
    cs = np.round(cs).astype(int)
    cs = cs[np.argsort(R.luma(cs), kind='stable')]
    return ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cs]


def main():
    if sys.argv[1] == '--palette':
        pal = palette(sys.argv[2])
        print(f"    '{sys.argv[2]}': [")
        for i in range(0, len(pal), 10):
            print('        ' + ', '.join(f"'{h}'" for h in pal[i:i + 10]) + ',')
        print('    ],')
        return
    if sys.argv[1] == '--rows':
        which = sys.argv[2]
        x0, y0, x1, y1 = map(int, sys.argv[3:7])
        N, Q, M, idx, part, lay = build(which)
        for r in rows(which, idx, x0, y0, x1, y1):
            print(f"        '{r}',")
        if '--parts' in sys.argv:
            letter = dict(zip(R.PART_NAMES, 'hcSAmLlstraf' + 'HgBbin'))
            bx, by = BOX[:2]
            for y in range(y0, y1):
                print(''.join(letter[part[y - by, x - bx]] if part[y - by, x - bx] else '.' for x in range(x0, x1)))
        return
    out, idle = sys.argv[1], sys.argv[2]
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else list(R.WHICH)
    results = []
    for which in only:
        N, Q, M, idx, part, lay = build(which)
        write_outputs(out, which, N, M, idx)
        results.append((which, idx, part))
        if '--write' in sys.argv:
            write_npy(which, idx, part, lay)
    overlay(out, idle, results)


def write_npy(which, idx, part, lay):
    """The reduced reference, which part each pixel came from, and each part's own layer, as small
    .npy files in tools/refs/data (palette indices, 255 where empty; each array's last row holds the
    box's x0, y0 in our frame): heroine-<which>-reduced.npy, -parts.npy, -layers.npy."""
    os.makedirs(R.DATA, exist_ok=True)
    x0, y0 = BOX[:2]

    def with_origin(a):
        a = np.vstack([a.astype(np.uint8), np.zeros((1, a.shape[1]), np.uint8)])
        a[-1, :2] = (x0, y0)
        return a

    def save(kind, a):
        with open(os.path.join(R.DATA, f'heroine-{which}-{kind}.npy'), 'wb') as f:
            np.save(f, a, allow_pickle=False)

    save('reduced', with_origin(np.where(idx >= 0, idx, 255)))
    lab = np.full(idx.shape, 255)
    for i, name in enumerate(R.PART_NAMES):
        lab[part == name] = i
    save('parts', with_origin(lab))
    save('layers', np.stack([with_origin(np.where(lay[name] >= 0, lay[name], 255)) for name in R.PART_NAMES]))


if __name__ == '__main__':
    main()
