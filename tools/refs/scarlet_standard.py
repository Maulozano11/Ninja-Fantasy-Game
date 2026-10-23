"""The owner's Scarlet at our game scale, at the level of his own game-scale characters (the standard).

His Scarlet picture (docs/reference/scarlet-owner-reference.jpg, scarlet_ref.py) is drawn at 1.8 of his
pixels to one of ours, so it cannot be copied 1:1 as his Ren, Roman and Solen paint-overs are. The first
reduction (scarlet-study.py, brought down by sampling) read as mush next to them: no black line between
the sleeves and the coat, the coat's black too dark to show any form, noise for shading, a pale face with
no jaw, hair speckled instead of locks. This module paints him again at our scale the way the owner
paints at our scale, from the owner's own game-scale pixels where the piece is the same kind of thing:

  coat body and sleeves   his Ren jacket and sleeves (docs/reference/ren-owner-reference.jpg: a black
                          high-collared jacket on our male), his line and his cloth's shading taken
                          into Scarlet's coat greys by lightness; the front opened on the shirt, the
                          lapels and edges in Scarlet's gold, the sleeves carried on to the wrist in
                          the same shading with Scarlet's gold-banded cuff
  coat skirts             his Ren skirt's panels (studs taken off), opened at the front, Scarlet's gold
                          down the front edges, his purple lining inside the far one, a tattered hem
  gloves                  his Ren fingerless gloves (Scarlet wears the same kind), in Scarlet's blacks
  boots                   his Ren boots' feet, the shafts carried up to below the knee as Scarlet's
                          tall boots, with his strap and buckle at the top
  face                    his Roman face (the male face standard, roman-head-from-ref.py), in
                          Scarlet's skin, with Scarlet's amber eyes and his smirk
  hair, shirt, cravat,    painted by hand at our scale after his Scarlet picture, in his colours, as
  trousers, belt, sword   his game-scale characters are painted: locks with a line round them and a
                          lit and a shaded side, flat colour, no noise

Every colour is one of his Scarlet colours (scarlet_ref.PALETTE). layers() gives each part alone, what
the parts in front hide included, in our 256 x 256 frame (PALETTE indices, 255 where empty), in the parts
scarlet-study.py writes (head, torso, lining, armN, handN, armF, handF, legN, legF, hilt, blade): it
takes the place of the reduction there, and every Scarlet part script cuts its pieces out of it.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import ren_ref  # noqa: E402
import scarlet_ref as R  # noqa: E402

G = R.GRID
NONE = 255
REN_AT = ren_ref.OFFSET  # his Ren picture's pixel (0, 0) in our frame
LUMA = R.luma(R.rgb())


def ci(ch):
    return R.CHARS.index(ch)


# Scarlet's ramps (characters of scarlet_ref.CHARS), darkest first.
COAT = 'fjntBH'      # his coat's greys: #1a191e .. #646267 (his black line is 'a')
SKIN = 'qMQUXZ246'   # his skin, from the dark brown of his lines to his lit skin
GOLD = 'vyFJOS'      # his gold trim
LINE = 'a'


def nearest(chars, L, shift=0.0):
    """The character of `chars` whose lightness is nearest L + shift."""
    return min(chars, key=lambda c: abs(LUMA[ci(c)] - (L + shift)))


def ren_colour(rgb, kind):
    """A colour of his Ren in Scarlet's colours: his line black, his dark cloth the coat's grey of the
    same lightness, his skin Scarlet's skin as much lighter as Scarlet is paler, his silver (the plate on
    the back of his gloves: Scarlet's are plain leather) the leather's shine."""
    L = float(R.luma(np.asarray(rgb, float)[None])[0])
    if kind == 'line':
        return LINE
    if kind == 'skin':
        return nearest(SKIN, L, 28)
    if kind in ('gold', 'silver'):
        return 'B'
    return nearest(COAT, L)


def ren_pieces():
    """His Ren cut into pieces (ren_ref.pieces), each as a layer of Scarlet's colours in our frame."""
    a = ren_ref.native()
    out = {}
    for n, (m, c) in ren_ref.pieces(a).items():
        lay = np.full((G, G), NONE, np.uint8)
        for y, x in zip(*np.nonzero(m)):
            lay[y + REN_AT[1], x + REN_AT[0]] = ci(ren_colour(c[y, x], ren_ref.kind(c[y, x])))
        out[n] = lay
    return out


def draw(lay, x0, y0, rows):
    """Hand-painted rows onto a layer at (x0, y0): '.' keeps the cell, '_' clears it, any other
    character is that colour of his (scarlet_ref.CHARS)."""
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch == '.':
                continue
            lay[y0 + dy, x0 + dx] = NONE if ch == '_' else ci(ch)


def empty():
    return np.full((G, G), NONE, np.uint8)


# ---------------------------------------------------------------------------------------------------
# A small painting kit: shapes (pixel-corner polygons and limbs in our frame) filled flat in a ramp
# lit from the upper left, with his black line round them, as his game-scale characters are painted.
# ---------------------------------------------------------------------------------------------------

YS, XS = np.mgrid[0:G, 0:G]
CX, CY = XS + 0.5, YS + 0.5


def poly(pts):
    """The cells whose centres lie inside a polygon of pixel corners (our frame)."""
    m = np.zeros((G, G), bool)
    n = len(pts)
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        cond = ((y0 > CY) != (y1 > CY)) & (CX < (x1 - x0) * (CY - y0) / (y1 - y0 + 1e-12) + x0)
        m ^= cond
    return m


def limb(p0, p1, r0, r1=None):
    """A tube from p0 to p1, r0 wide (half) at p0 and r1 at p1, with round ends; and across it, for each
    cell, where it lies from its upper-left side (0) to its lower-right side (1)."""
    r1 = r0 if r1 is None else r1
    (x0, y0), (x1, y1) = p0, p1
    vx, vy = x1 - x0, y1 - y0
    L2 = vx * vx + vy * vy
    t = np.clip(((CX - x0) * vx + (CY - y0) * vy) / L2, 0, 1)
    px, py = x0 + t * vx, y0 + t * vy
    r = r0 + (r1 - r0) * t
    m = np.hypot(CX - px, CY - py) <= r
    # the side toward the light (up and to the left) is the one whose normal points that way
    nx, ny = -vy, vx
    if nx + ny > 0:
        nx, ny = -nx, -ny
    n = np.hypot(nx, ny)
    d = ((CX - px) * nx + (CY - py) * ny) / n  # + toward the light
    u = np.clip(0.5 - d / (2 * r), 0, 1)
    return m, u


def stroke(pts, r0, r1):
    """A tube along a polyline, r0 wide (half) at its start tapering to r1 at its end; and across it, as
    limb() gives, where each cell lies from its lit side (0) to its shaded side (1)."""
    lens = [float(np.hypot(b[0] - a[0], b[1] - a[1])) for a, b in zip(pts, pts[1:])]
    total = sum(lens)
    m = np.zeros((G, G), bool)
    u = np.zeros((G, G))
    best = np.full((G, G), np.inf)
    done = 0.0
    for (a, b), l in zip(zip(pts, pts[1:]), lens):
        ra = r0 + (r1 - r0) * done / total
        rb = r0 + (r1 - r0) * (done + l) / total
        mm, uu = limb(a, b, ra, rb)
        # each cell takes its place across the segment it lies nearest the middle of
        vx, vy = b[0] - a[0], b[1] - a[1]
        t = np.clip(((CX - a[0]) * vx + (CY - a[1]) * vy) / (vx * vx + vy * vy), 0, 1)
        d = np.hypot(CX - (a[0] + t * vx), CY - (a[1] + t * vy))
        take = mm & (d < best)
        u[take] = uu[take]
        best[take] = d[take]
        m |= mm
        done += l
    return m, u


def across_rows(m):
    """For each cell of a shape, where it lies along its row from the left end (0) to the right (1)."""
    u = np.zeros((G, G))
    for y in np.nonzero(m.any(axis=1))[0]:
        xs = np.nonzero(m[y])[0]
        a, b = xs.min(), xs.max()
        u[y, m[y]] = (np.nonzero(m[y])[0] - a + 0.5) / (b - a + 1)
    return u


def edge(m):
    """The cells of a shape with a 4-neighbour outside it."""
    p = np.pad(m, 1)
    return m & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])


def cel(lay, m, u, ramp, bands, line=LINE, outline=True):
    """Paints a shape flat in a ramp by where each cell lies across it (u: 0 the lit side, 1 the shaded
    side): ramp[k] up to bands[k] (the last to 1), his line round it."""
    k = np.searchsorted(np.asarray(bands), u, side='right')
    k = np.clip(k, 0, len(ramp) - 1)
    for i, ch in enumerate(ramp):
        lay[m & (k == i)] = ci(ch)
    if outline:
        lay[edge(m)] = ci(line)


def paint(lay, x0, y0, rows, legend=None):
    """Hand-painted rows at (x0, y0): '.' keeps the cell, '_' clears it, '0' is his black line, any other
    character a colour by `legend` (else a character of scarlet_ref.CHARS)."""
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch == '.':
                continue
            if ch == '_':
                lay[y0 + dy, x0 + dx] = NONE
                continue
            c = legend.get(ch, ch) if legend else ch
            lay[y0 + dy, x0 + dx] = ci(LINE if c == '0' else c)


J = R.OUR_JOINTS

# The hand-painted parts' letters: his black line 0; the coat's greys 2 (deepest), 3 (shade), 4 (base), 5 (lit), 6 and 7 (shine); his gold
# q y g G S (dark to light); his shirt's whites w e d c b m (lit to shaded); his cravat's reds R r k K
# (lit to deep); his coat's purple lining p P L; his skin s t u v (lit to shaded), x his brown line.
LEGEND = {
    '1': 'f', '2': 'f', '3': 'j', '4': 'n', '5': 't', '6': 'B', '7': 'H',
    'q': 'v', 'y': 'y', 'g': 'J', 'G': 'O', 'S': 'S',
    'w': '7', 'e': '5', 'd': '3', 'c': '0', 'b': 'Y', 'm': 'V',
    'R': 'x', 'r': 'u', 'k': 'k', 'K': 'c',
    'p': 'e', 'P': 'h', 'L': 'p',
    'T': 'T', 'I': 'I', 'z': 'z',
    's': '6', 't': '2', 'u': 'X', 'v': 'U', 'x': 'q',
}

# His chest from x 118, y 145 ('.' keeps the coat as shaded): the standing collar's gold-edged points
# beside the jaw; the open front: his white shirt, the red cravat knotted at the throat and hanging down
# the shirt, the near lapel with his gold embroidery, the fronts edged in gold down to the belt; his
# belt across the opening with its gold ring buckle; below it, over the trousers, the gold cross hanging
# from the belt, his red tassel at the far hip and the small gold star (ORNAMENTS: the trousers' belt
# carries them, scarlet-lower-from-ref.py).
CHEST = [
    # x 118 .. 137
    '0SS40........04SS0..',  # 145
    '0S5540......0444S0..',  # 146
    '0S55440kKkk0444S0...',  # 147
    '.0S54G0krRRrk0g3q...',  # 148
    '.0Sq4G0wkrRrkdg33...',  # 149
    '..0g4S0wekRkdc0g3q..',  # 150
    '..04qG0weerkdc0gq3..',  # 151
    '..0g4S0weerkdc0g33..',  # 152
    '..04qG0weekrdc0gq3..',  # 153
    '..0g4S0weekrdc0g33..',  # 154
    '..04qG0weedrkc0gq3..',  # 155
    '..0g4S0weedkdc0g33..',  # 156
    '..044G0weedkdc0g4...',  # 157
    '..0444S0weddcb0g4...',  # 158
    '..0444S0weddcb0g4...',  # 159
    '..0444G0weddcm0g4...',  # 160
    '..0444S0weddcb0g4...',  # 161
    '..0444S0weddcb0g4...',  # 162
    '..044GS0weddcm0g4...',  # 163
    '..0444S0weddcb0g4...',  # 164
    '..0444S0weddcb0g4...',  # 165
    '..0444G0weddcm0g4...',  # 166
    '..044GS0weddcb0g4...',  # 167
    '..0444S0weddcb0g4...',  # 168
    '..0444S0weddcb0g4...',  # 169
    '..0444G0wedcbm0g4...',  # 170
    '..0444S0wedcbm0g4...',  # 171
    '..0444S000gSSg0g4...',  # 172
    '..0444S233S00G0g4...',  # 173
    '..0444S322G00g0g4...',  # 174
    '..0444S000gGGq0g4...',  # 175
    '........g...........',  # 176
    '........S.......g...',  # 177
    '.......gSg......r...',  # 178
    '......g0S0g.....R...',  # 179
    '.......gSg......r...',  # 180
    '........S.......k...',  # 181
    '........g.......k...',  # 182
    '........q...........',  # 183
    '....gS..............',  # 184
    '....Sg..............',  # 185
]

# The belt's ornaments in the chest above (our frame, x0, y0, x1, y1 inclusive): over the trousers, so
# the coat leaves them out (scarlet-upper-from-ref.py) and the belt carries them
# (scarlet-lower-from-ref.py), with the pixel each hangs from (for the buckle its middle) and the dark
# cells walled in by its gold.
# The belt in the coat's opening, under the coat's fronts (x0, y0, x1, y1 inclusive).
BELT = (125, 172, 131, 175)
ORNAMENTS = {
    'buckle': ((128, 172, 131, 175), (129, 173)),
    'cross': ((124, 176, 128, 183), (126, 176)),
    'tassel': ((134, 177, 134, 182), (134, 177)),
    'star': ((122, 184, 123, 185), (122, 184)),
}
ORNAMENT_HOLES = {'buckle': [(129, 173), (130, 173), (129, 174), (130, 174)], 'cross': [(125, 179), (127, 179)]}
# His tassel's cord under its gold knot (the rows the lower script colours with his tassel's reds).
TASSEL_ROWS = range(178, 183)

# Ramps for the cel shading, lit side first: his coat (lit, base, shade, deep), his trousers.
COAT_RAMP = 'tnjf'
COAT_BANDS = [0.2, 0.62, 0.86]


def ren_shifted(lay, dx, dy):
    """A layer of his Ren moved by (dx, dy) cells."""
    out = empty()
    ys, xs = np.nonzero(lay != NONE)
    out[ys + dy, xs + dx] = lay[ys, xs]
    return out


def put(dst, src):
    on = src != NONE
    dst[on] = src[on]


def sleeve(s):
    """A coat sleeve on our arm `s`: the upper sleeve over the shoulder, the forearm to a cuff at the
    wrist with his gold band round its top."""
    lay = empty()
    sh, el, wr = J['shoulder' + s], J['elbow' + s], J['wrist' + s]
    r = (4.6, 4.1, 3.9) if s == 'N' else (4.2, 3.8, 3.5)
    up, uu = limb(sh, el, r[0], r[1])
    fo, fu = limb(el, wr, r[1], r[2])
    m = up | fo
    u = np.where(up, uu, fu)
    cel(lay, m, u, COAT_RAMP, COAT_BANDS)
    # the cuff: the last cells before the wrist a shade darker, his gold across its top
    vx, vy = wr[0] - el[0], wr[1] - el[1]
    L = float(np.hypot(vx, vy))
    t = ((CX - el[0]) * vx + (CY - el[1]) * vy) / L
    cuff = fo & (t > L - 3.2) & ~edge(m)
    lay[cuff & (fu < 0.6)] = ci('n')
    lay[cuff & (fu >= 0.6)] = ci('j')
    band_ = fo & (t > L - 3.6) & (t <= L - 2.6) & ~edge(m)
    lay[band_ & (fu < 0.5)] = ci('S')
    lay[band_ & (fu >= 0.5)] = ci('J')
    # the crease across the inside of the elbow, and the light along the top of the shoulder
    ex, ey = el
    crease = (np.hypot(CX - ex, CY - ey) < 1.6) & (fu > 0.45) & ~edge(m)
    lay[crease] = ci('f')
    shx, shy = sh
    lay[up & ~edge(m) & (uu < 0.35) & (np.hypot(CX - shx, CY - shy) < 3.2)] = ci('B')
    return lay


# The coat's skirts from the waist (pixel corners): the near one's front edge runs down to the left over
# the near leg, the far one's down the far leg's outer side, so his trousers show between them.
SKIRT_N = [(113.5, 171), (124.5, 171), (122.5, 180), (119.5, 190), (117, 198), (114, 200), (110, 199.5), (108.5, 196), (109.5, 186), (111.5, 177)]
SKIRT_F = [(133, 171), (139.5, 171), (142.5, 179), (145.5, 192), (146, 199), (143, 198.5), (140.5, 196), (138.5, 188), (136.5, 180)]


# His tattered hem: how many cells each column of a skirt's hem is cut short, from its left column on
# (the pattern repeats), and the folds down each skirt: (x at the waist, x at the hem, first row).
HEM_N = [0, 2, 1, 0, 3, 1, 0, 2, 0, 1, 3, 0, 1]
HEM_F = [1, 0, 2, 0, 1, 3, 0, 1]
FOLDS_N = [(117, 113, 178), (121, 117, 184)]
FOLDS_F = [(140, 143, 178)]


def tattered(m, cuts):
    """A skirt with its hem cut ragged: each column ends `cuts[i]` cells short of its lowest cell."""
    out = m.copy()
    xs = np.nonzero(m.any(axis=0))[0]
    for i, x in enumerate(xs):
        ys = np.nonzero(m[:, x])[0]
        k = cuts[i % len(cuts)]
        if k:
            out[ys.max() - k + 1:ys.max() + 1, x] = False
    return out


def folds(lay, m, lines):
    """His folds down a skirt: a line of the coat's deep shade from the row given to the hem, a lit
    cell beside it on the side the light comes from."""
    ys = np.nonzero(m.any(axis=1))[0]
    y1 = ys.max()
    for x0, x1, y0 in lines:
        for y in range(y0, y1 + 1):
            x = int(round(x0 + (x1 - x0) * (y - y0) / max(1, y1 - y0)))
            if m[y, x] and not edge(m)[y, x]:
                lay[y, x] = ci('f')
                if m[y, x - 1] and not edge(m)[y, x - 1]:
                    lay[y, x - 1] = ci('t')


def trim(lay, m, side):
    """His gold trim down a front edge of the coat (side +1: the shape's right edge, -1: its left): the
    cell inside his line, lit gold where the light falls on it, his dark gold below."""
    for y in np.nonzero(m.any(axis=1))[0]:
        xs = np.nonzero(m[y])[0]
        if len(xs) < 3:
            continue
        x = xs[-2] if side > 0 else xs[1]
        lay[y, x] = ci('O' if side < 0 else 'J')


def tube_rows(y0, y1, cx0, cx1, hw0, hw1):
    """The cells of a straight tube down the rows y0..y1-1, its middle going from cx0 to cx1 and its half
    width from hw0 to hw1: for each row, (y, left, right), both inclusive."""
    out = []
    for y in range(y0, y1):
        f = (y - y0) / max(1, y1 - 1 - y0)
        cx, hw = cx0 + (cx1 - cx0) * f, hw0 + (hw1 - hw0) * f
        out.append((y, int(np.floor(cx - hw + 0.5)), int(np.floor(cx + hw - 0.5))))
    return out


def trousers(lay, y0, y1, cx0, cx1, hw0, hw1, far=False):
    """His pinstripe trousers down a leg: his black cloth with his grey stripes every second column (they
    follow the leg as it slants), the lit side to the left, his line on both sides."""
    rows = tube_rows(y0, y1, cx0, cx1, hw0, hw1)
    for y, a, b in rows:
        f = (y - y0) / max(1, y1 - 1 - y0)
        drift = int(np.floor((cx1 - cx0) * f + 0.5))
        for x in range(a, b + 1):
            k = x - a
            if x == a or x == b:
                ch = '0'
            elif k == 1:
                ch = '4' if far else '5'
            elif x == b - 1:
                ch = '2'
            else:
                ch = '4' if (x - drift) % 2 == 0 else '3'
            lay[y, x] = ci(LEGEND.get(ch, ch) if ch != '0' else LINE)


# Each leg: the trousers (y0, y1, x of the middle at y0 and at y1, half widths there; far: the shaded
# leg), and his tall boot painted by hand (x0, y0, rows): the cuff below the knee with its strap and
# buckle, the polished shaft with its shine a column in from the lit side, the foot (the near one seen
# from the front, the far one pointing ahead), the sole.
LEGS = {
    'N': {
        'trousers': [(172, 193, 120.5, 120.0, 5.5, 4.6)],
        'boot': (112, 193, [
            '...00000000.',  # 193
            '...05665430.',  # 194
            '...0qgG3320.',  # 195
            '...00000000.',  # 196
            '...05754320.',  # 197
            '...05754320.',  # 198
            '...05754320.',  # 199
            '...05754320.',  # 200
            '...05754320.',  # 201
            '...05754320.',  # 202
            '...05754320.',  # 203
            '...05744320.',  # 204
            '...05744320.',  # 205
            '...05744320.',  # 206
            '...05744320.',  # 207
            '..055744320.',  # 208
            '..056744320.',  # 209
            '.0567443220.',  # 210
            '.0567443320.',  # 211
            '.0567444320.',  # 212
            '.0566444320.',  # 213
            '.0555443220.',  # 214
            '.0555443220.',  # 215
            '.0222222220.',  # 216
            '..00000000..',  # 217
        ]),
    },
    'F': {
        'trousers': [(171, 189, 132.5, 137.6, 4.5, 4.5, True)],
        'boot': (131, 189, [
            '...00000000.....',  # 189
            '...05665430.....',  # 190
            '...0qgG3320.....',  # 191
            '...00000000.....',  # 192
            '...05654320.....',  # 193
            '...05654320.....',  # 194
            '...05654320.....',  # 195
            '...05654320.....',  # 196
            '...05644320.....',  # 197
            '..05654320......',  # 198
            '..05654320......',  # 199
            '..05644320......',  # 200
            '..05644320......',  # 201
            '..05644320......',  # 202
            '..05644320......',  # 203
            '..056544320.....',  # 204
            '..0565444320....',  # 205
            '..05654444320...',  # 206
            '..056544444320..',  # 207
            '..0555444443320.',  # 208
            '..0222222222220.',  # 209
            '...00000000000..',  # 210
        ]),
    },
}


def layers():
    ren = ren_pieces()
    out = {n: empty() for n in R.PART_NAMES}
    out['armF'] = sleeve('F')
    out['armN'] = sleeve('N')
    out['handF'] = ren['glove_f'].copy()
    out['handN'] = ren['glove_n'].copy()

    # The coat's body, collar to waist.
    t = out['torso']
    body = poly([(115, 149), (120, 146), (127, 147.5), (134, 146), (137.5, 148.5), (138, 160), (138.5, 174), (115, 174), (114, 160)])
    cel(t, body, across_rows(body), COAT_RAMP, COAT_BANDS)
    # The skirts, waist to the hem.
    near = tattered(poly(SKIRT_N), HEM_N)
    far = tattered(poly(SKIRT_F), HEM_F)
    cel(t, near, across_rows(near), COAT_RAMP, COAT_BANDS)
    cel(t, far, across_rows(far), 'njjf', [0.2, 0.62, 0.86])
    folds(t, near, FOLDS_N)
    folds(t, far, FOLDS_F)
    trim(t, near, +1)
    trim(t, far, -1)
    # The open front: his shirt, his cravat, the lapels edged in gold.
    paint(t, 118, 145, CHEST, LEGEND)

    # The legs: his pinstripe trousers into his tall boots.
    for s in 'NF':
        L = out['leg' + s]
        for args in LEGS[s]['trousers']:
            trousers(L, *args)
        x0, y0, rows = LEGS[s]['boot']
        paint(L, x0, y0, rows, LEGEND)

    # The lining between the legs.
    li = out['lining']
    back = poly([(121, 176), (136, 174), (138, 196), (122, 198)])
    cel(li, back, across_rows(back), 'heb', [0.3, 0.7])
    out['head'] = head()
    return out


# His face: the owner's Roman face (the male face standard: roman-head-from-ref.py's head, his pixels)
# where it sits on our male, in Scarlet's skin; his pixel (x, y) lands on our (x + 74, y + 123).
ROMAN_FACE_AT = (74, 123)


def roman_face():
    import importlib.util
    import roman_ref
    spec = importlib.util.spec_from_file_location('roman_head', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'roman-head-from-ref.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    a = roman_ref.native()
    m, c = mod.head(a)
    lay = empty()
    for y, x in zip(*np.nonzero(m)):
        L = float(R.luma(c[y, x].astype(float)[None])[0])
        ch = LINE if L < 30 else nearest(SKIN, L, 24)
        lay[y + ROMAN_FACE_AT[1], x + ROMAN_FACE_AT[0]] = ci(ch)
    return lay


HAIR_RAMP = 'GAwr'
HAIR_BANDS = [0.25, 0.6, 0.85]
HAIR_LINE = 'c'
# His hair: the mass over the skull, then his locks back to front (polyline, half width at the root and
# at the tip): the crown's tufts, the side locks over the ears down to the jaw and the strands sticking
# out at the sides, and last his fringe, its long lock falling between the eyes.
HAIR_MASS = [(117, 128), (121, 124.5), (131, 124.5), (136, 127.5), (138.5, 133), (137, 137), (119, 136), (115, 134)]
HAIR_LOCKS = [
    # the far side, behind: arcs from the crown down past the temple to the jaw
    ([(130, 127), (137, 129), (140.5, 134), (141, 138.5)], 3.5, 0.7),
    ([(132, 131), (137, 135), (139, 141), (138.5, 145.5)], 3.2, 0.7),
    ([(133, 134), (135.5, 140), (136, 147.5)], 2.8, 0.8),
    # the near side: arcs down over the ear to the jaw
    ([(122, 127), (115, 129), (112, 133), (111.5, 137.5)], 3.5, 0.7),
    ([(120, 131), (115, 135), (113, 140), (113.5, 143.5)], 3.2, 0.7),
    ([(118.5, 134), (116, 139.5), (115, 146.5)], 2.4, 0.7),
    # thin strands flying out at the sides
    ([(112, 133.5), (108.6, 134.5)], 1.0, 0.5),
    ([(113.5, 140), (110.6, 141.6)], 1.0, 0.5),
    ([(140, 134), (143.4, 135.4)], 1.0, 0.5),
    ([(138.5, 140.5), (141.6, 142.6)], 1.0, 0.5),
    # the crown's tufts
    ([(124, 129), (119, 125.5), (116.5, 125)], 3.0, 0.6),
    ([(130, 130), (134, 126.5), (137, 126.5)], 3.0, 0.6),
    ([(126, 130), (124, 125), (121, 122.5)], 3.4, 0.6),
    ([(128, 129), (129, 125), (131.5, 122.5)], 3.4, 0.6),
    # the fringe over the forehead, its long lock between the eyes last
    ([(129, 131), (131.5, 135), (133, 139.5)], 3.0, 0.7),
    ([(122, 131), (118.5, 135), (117, 139)], 2.6, 0.6),
    ([(124, 130), (121.5, 134), (120.5, 139)], 3.2, 0.7),
    ([(127, 130), (126, 135), (127.5, 141.5)], 3.0, 0.6),
]


def face():
    """His face (the 'noble' face shape's head): the owner's Roman face in Scarlet's skin, the eye shape
    draws the eyes on it."""
    return roman_face()


def head():
    lay = face()
    m = poly(HAIR_MASS)
    hair = m.copy()
    cel(lay, m, across_rows(m), HAIR_RAMP, HAIR_BANDS, HAIR_LINE, outline=False)
    for pts, r0, r1 in HAIR_LOCKS:
        m, u = stroke(pts, r0, r1)
        cel(lay, m, u, HAIR_RAMP, HAIR_BANDS, HAIR_LINE, outline=False)
        # where the lock lies over the hair before it, its edge is the dark parting between locks (on its
        # shaded side his darkest crimson, on its lit side the next one up); near its root a light
        lay[edge(m) & hair & (u >= 0.5)] = ci('i')
        lay[edge(m) & hair & (u < 0.5)] = ci('r')
        x0, y0 = pts[0]
        lay[m & ~edge(m) & (u < 0.3) & (np.hypot(CX - x0, CY - y0) < 3.5)] = ci('L')
        hair |= m
    lay[edge(hair)] = ci(HAIR_LINE)
    paint(lay, 122, 139, FACE, LEGEND)
    return lay


# His eyes on the face, from x 122, y 139 (the 'noble' eye shape, scarlet-eyes-from-ref.py, lifts them):
# his brown line over the lash, the heavy black lash (its inner end a light brown), his white and amber
# iris over his darker amber, the near eye's lower line; the far eye three cells at the face's edge.
FACE = [
    '....xxx...x.',  # 139
    '..00000v.000',  # 140
    '...wTTI..TI0',  # 141
    '....Mzz.....',  # 142
]
