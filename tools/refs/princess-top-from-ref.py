"""The princess's bodice and sleeves, from the owner's picture of her (docs/reference/princess-owner-reference.jpg),
as painted pieces that ride the rig: one top (top_rose_bodice, src/sprite/items/princessTop.ts).

His picture is drawn at our game's scale (tools/refs/princess_ref.py: one of his pixels is one fine pixel of our
sprite), so every pixel is lifted one for one, in his colours (princess_ref.quantize: the cluster centres of her
figure). His pixel (x, y) is at (x + 74, y + 122) of our 256 x 256 frame at our female idle frame 0: the offset
of her hair and face (tools/refs/princess-hair-from-ref.py), so the collar meets her chin and the near lock lies on
her chest as he drew them. There her upper body covers ours: her shoulders, puffs and sleeves sit on our arms.

What she wears above the waist, and the pieces (each pivots on its joint of our female rig at idle, and its angle
is that segment's angle there, so at idle every pixel of his is where he drew it; in other poses it turns with
its segment, src/sprite/painted.ts stampPiece):

  BODICE      the high lilac collar with its gold edge and dark centre, the bare skin under it to the bodice,
              the bodice (gold embroidered top, lilac with gold stripes, its point at the waist) and its pink
              side under the near arm, down to its V-shaped lower edge with the gold trim     neck      torso.top
  BODICE_TIP  the bodice from its lower rows down (the V over the skirt's top), drawn again
              over the skirt when no armour is worn                                           neck      torso.over
  SLEEVE_N    the near bare shoulder, the pink puff with its gold top band, the gold band     shoulderN nearArm.cloth
  CUFF_N      the big lilac puffed sleeve, the gold cuff and the frill under it                elbowN    nearArm.cloth
  SLEEVE_F    the far pink puff with its gold band                                            shoulderF farArm.cloth
  BODICE_SIDE_F  the far pink side under the far puff, drawn under the puff's columns below, so it
              shows only when the far arm moves away                                          neck      torso.top
  SLEEVE_F_SIDE  its columns by the bodice, drawn again over the body's edge (our torso is
              drawn over the far arm and reaches under them), under the bodice               shoulderF torso.top
  CUFF_F      the far lilac puffed sleeve and its gold cuff                                   elbowF    farArm.cloth

His far arm is raised to hold the sceptre up, ours hangs: the far lilac sleeve is the one piece not at his angle at
idle. It keeps his angle (his far elbow to wrist) and its pivot is its inner end, so it lies along our forearm from
the elbow with its cuff at our wrist (turned by RotSprite). The far puff is drawn as he drew it (his upper arm is
within 11 degrees of ours).

OWN says per row (his rows and columns) which piece takes which of his pixels (capital letters). Not hers to take
here: her hair (its near lock lies over the bodice's near edge and its far lock over the far shoulder, as
princess-hair-from-ref.py takes them), her face, her hands, the sceptre and the skirts under the bodice's lower
edge. What the hair, the arms and the raised far sleeve hide of these clothes is filled by continuing his pixels
(FILL: small letters; each cell takes the colour a rule gives from his own pixels, or his line):

  - under the near lock: the collar's near edge (his line), the skin between the shoulder and the collar, the
    bodice's top line and his gold neckline trim carried across, the near pink side carried up;
  - under the near arm: the near pink side carried up to the shoulder, with his line at the body's edge;
  - under the far puff and the raised far sleeve (shown at idle, since our far arm hangs): the far pink side, his
    pink of the gown's far panel just under the sleeve carried up, with his line at the body's edge and his gold
    trim and line along the bodice's lower edge, as on the near side;
  - under the far lock: the bare far shoulder in her skin with its line;
  - under the chin: the collar's top;
  - each sleeve's edges that the next piece covers (the puffs' and the far sleeve's inner edges): his line.

check() lays the pieces in the game's order at idle and makes sure every pixel taken from him comes out his. The
same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/princess-top-from-ref.py <out> [src/sprite/items/princessTopArt.ts]

It writes pieces@8.png into <out> (his crop | the pieces at idle | each piece alone, Spanish labels).
"""

import colorsys
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import princess_ref as P  # noqa: E402

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

# His pixel (x, y) is our (x + 74, y + 122) at our female idle frame 0 (her hair's and face's offset).
OFF = (74, 122)

# Which piece takes which of his pixels, per his row: (letter, x0, x1) inclusive.
#   B bodice   N near sleeve (shoulder and puff)   M near cuff (lilac sleeve)   F far puff   G far cuff
OWN = {
    27: [('B', 49, 52)],
    28: [('B', 49, 55)],
    29: [('N', 43, 45), ('B', 50, 57)],
    30: [('N', 42, 45), ('B', 51, 58)],
    31: [('N', 41, 46), ('B', 51, 59)],
    32: [('N', 39, 46), ('B', 51, 60)],
    33: [('N', 39, 46), ('B', 51, 60)],
    34: [('N', 39, 45), ('B', 51, 60), ('F', 61, 62)],
    35: [('N', 38, 45), ('B', 50, 60), ('F', 61, 63)],
    36: [('N', 37, 45), ('B', 50, 61), ('F', 62, 64)],
    37: [('N', 36, 46), ('B', 51, 61), ('F', 62, 65)],
    38: [('N', 36, 46), ('B', 47, 47), ('B', 51, 61), ('F', 62, 65)],
    39: [('N', 36, 46), ('B', 47, 47), ('B', 51, 61), ('F', 62, 65)],
    40: [('N', 37, 46), ('B', 47, 47), ('B', 50, 60), ('F', 61, 64)],
    41: [('N', 38, 46), ('B', 47, 59), ('F', 60, 65)],
    42: [('N', 37, 44), ('B', 45, 59), ('F', 60, 62), ('G', 63, 68)],
    43: [('M', 36, 44), ('B', 45, 59), ('G', 60, 71)],
    44: [('M', 35, 43), ('B', 44, 59), ('G', 60, 70)],
    45: [('M', 33, 43), ('B', 44, 59), ('G', 60, 70)],
    46: [('M', 32, 43), ('B', 44, 59), ('G', 60, 70)],
    47: [('M', 31, 43), ('B', 50, 59), ('G', 60, 70)],
    48: [('M', 31, 43), ('B', 50, 59), ('G', 62, 71)],
    49: [('M', 31, 43), ('B', 52, 58), ('G', 63, 68)],
    50: [('M', 31, 43), ('B', 54, 57), ('G', 64, 67)],
    51: [('M', 31, 43), ('B', 55, 57)],
    52: [('M', 33, 43)],
    53: [('M', 32, 42)],
    54: [('M', 37, 41)],
}
PIECE_OF = {'B': 'BODICE', 'N': 'SLEEVE_N', 'M': 'CUFF_N', 'F': 'SLEEVE_F', 'G': 'CUFF_F'}
# Pieces made of fills only.
FILLED = ('BODICE_SIDE_F',)

# Her near lock and far lock lie over these (his rows and columns, inclusive; as princess-hair-from-ref.py's
# STRAND_ROWS and the locks of its HEAD_ROWS): none of his pixels there is the bodice's.
HAIR_OVER = {26: [(43, 48), (59, 63)], 27: [(43, 48), (59, 63)], 28: [(44, 48), (59, 62)], 29: [(46, 49), (59, 62)],
             30: [(46, 50), (59, 63)], 31: [(47, 50), (60, 63)], 32: [(47, 50), (61, 63)], 33: [(47, 50), (61, 63)],
             34: [(46, 50)], 35: [(46, 49)], 36: [(46, 49)], 37: [(47, 50)], 38: [(48, 50)], 39: [(48, 50)], 40: [(48, 49)]}

# What is filled, per piece: (rule, cells). Cells are his (x, y). Rules:
#   line          his black line
#   skin          the nearest of his skin pixels in the piece (the same row first)
#   row           the nearest of his pixels in the piece in the same row (not his line; the left one on a tie)
#   down          the first of his pixels in the piece below it in its column (not his line), else `row`
#   panel         the far panel's pink: his pixel 3, 6 or 9 rows down in the column, the first that is gown pink
#                 (his gown's far panel just under the raised sleeve, carried up a fold at a time)
#   gold          the bodice's lower edge trim: his gold beside it on that edge


def cells(*spans):
    return [(x, y) for (y, x0, x1) in spans for x in range(x0, x1 + 1)]


FILL = {
    'BODICE': [
        # under the chin: the collar's top
        ('down', cells((27, 53, 55))),
        # under the near lock: the collar's near edge, the skin between the shoulder and the collar, the bodice's
        # top line and his gold neckline trim carried across, and the near pink side carried up
        ('line', [(48, 28), (49, 29), (50, 30), (50, 31)]),
        ('skin', cells((29, 46, 48), (30, 47, 49), (31, 47, 49), (32, 47, 50), (33, 47, 50))),
        ('line', cells((34, 44, 50))),
        ('row', cells((35, 46, 49))),
        ('down', cells((36, 46, 49), (37, 47, 50), (38, 48, 50), (39, 48, 50), (40, 48, 49))),
        # under the near arm: the near pink side carried up to the shoulder, his line at the body's edge
        ('down', cells((35, 44, 45), (36, 44, 45), (37, 44, 46), (38, 44, 46), (39, 44, 46), (40, 44, 46),
                       (41, 44, 46), (42, 44, 44), (43, 44, 44))),
        ('line', cells((35, 43, 43), (36, 43, 43), (37, 43, 43), (38, 43, 43), (39, 43, 43), (40, 43, 43),
                       (41, 43, 43), (42, 43, 43), (43, 43, 43))),
        # under the far lock: the bare far shoulder
        ('line', cells((30, 59, 61), (31, 62, 62), (32, 63, 63), (33, 63, 63))),
        ('skin', cells((31, 60, 61), (32, 61, 62), (33, 61, 62))),
        # under the raised far sleeve (shown at idle, our far arm hangs): the far pink side, his line at the body's
        # edge, the gold trim and line along the bodice's lower edge. Above it the far puff is beside the bodice as
        # he drew it (the far arm is behind the body: nothing of the bodice may lie over it there).
        ('panel', cells((43, 60, 62), (44, 60, 62), (45, 60, 62))),
        ('line', cells((42, 63, 63), (43, 63, 63), (44, 63, 63), (45, 63, 63))),
        ('gold', cells((46, 60, 61))),
        ('line', cells((46, 62, 63), (47, 60, 62))),
    ],
    'BODICE_SIDE_F': [
        # under the far puff: the far pink side, his line at the body's edge (the puff's columns by the bodice are
        # drawn over it, so at idle the puff is his; when the far arm moves away the bodice's side is there)
        ('panel', cells((35, 61, 62), (36, 62, 62), (37, 62, 62), (38, 62, 62), (39, 62, 62), (40, 61, 62),
                        (41, 60, 62), (42, 60, 62))),
        ('line', cells((35, 63, 63), (36, 63, 63), (37, 63, 63), (38, 63, 63), (39, 63, 63), (40, 63, 63),
                       (41, 63, 63))),
    ],
    'SLEEVE_N': [],
    'CUFF_N': [
        # its top under the gold band
        ('line', cells((42, 37, 44))),
    ],
    'SLEEVE_F': [
        # its top under the far lock, its inner edge under the bodice's
        ('line', cells((33, 61, 62))),
        ('line', [(60, 34), (60, 35), (61, 36), (61, 37), (61, 38), (61, 39), (60, 40), (59, 41)]),
    ],
    'CUFF_F': [
        # its top under the far puff's band, its inner end under the bodice's edge
        ('line', cells((42, 60, 62), (43, 59, 59), (44, 59, 59), (45, 59, 59), (46, 59, 59), (47, 59, 59))),
    ],
}

# The bodice's lower rows (his rows from TIP_FROM): drawn again over the skirt when no armour is worn.
TIP_FROM = 45

# Our female rig at idle frame 0 (princess_ref.OUR_JOINTS), in our frame's fine pixels.
J = P.OUR_JOINTS
# Each piece: its joint (the pivot) and its segment (its angle), and the game's drawing order.
JOINT = {
    'BODICE': ('neck', ('pelvis', 'neck')),
    'BODICE_TIP': ('neck', ('pelvis', 'neck')),
    'BODICE_SIDE_F': ('neck', ('pelvis', 'neck')),
    'SLEEVE_N': ('shoulderN', ('shoulderN', 'elbowN')),
    'CUFF_N': ('elbowN', ('elbowN', 'wristN')),
    'SLEEVE_F': ('shoulderF', ('shoulderF', 'elbowF')),
    'SLEEVE_F_SIDE': ('shoulderF', ('shoulderF', 'elbowF')),
    'CUFF_F': ('elbowF', ('elbowF', 'wristF')),
}
ORDER = ['CUFF_F', 'SLEEVE_F', 'BODICE_SIDE_F', 'SLEEVE_F_SIDE', 'BODICE', 'CUFF_N', 'SLEEVE_N']
# The far puff's columns our torso's edge covers at idle (his columns up to this one).
SIDE_TO = 63
# The far lilac sleeve: his far forearm's angle (his far elbow to wrist, princess_ref.JOINTS), and its pivot in
# his pixels: its inner end on his forearm's line, so the sleeve runs from our elbow to our wrist.
CUFF_F_ANGLE = float(np.degrees(np.arctan2(P.JOINTS['wristF'][1] - P.JOINTS['elbowF'][1], P.JOINTS['wristF'][0] - P.JOINTS['elbowF'][0])))
CUFF_F_PIVOT = (60, 44)

DOCS = {
    'BODICE': 'The bodice: the high lilac collar with its gold edge, the bare skin under it, the gold embroidered top, '
              'the lilac and gold body to its point, its pink side under the near arm and, under the raised far '
              'sleeve, the far one (pivot: the base of the neck).',
    'BODICE_TIP': "The bodice's lower rows, its V over the skirt's top: drawn again over the skirt when no armour is "
                  'worn (pivot: the base of the neck).',
    'BODICE_SIDE_F': "The bodice's far pink side under the far puff, drawn under the puff's columns by the bodice: it "
                     'shows when the far arm moves away (pivot: the base of the neck).',
    'SLEEVE_N': 'The near sleeve: the bare shoulder, the pink puff with its gold top band and the gold band under it '
                '(pivot: the near shoulder).',
    'CUFF_N': 'The near lilac puffed sleeve, its gold cuff and the frill under it (pivot: the near elbow).',
    'SLEEVE_F': 'The far pink puff with its gold band (pivot: the far shoulder).',
    'SLEEVE_F_SIDE': "The far puff's columns by the bodice, drawn again over the body's edge under the bodice; it moves "
                     'with the far arm (pivot: the far shoulder).',
    'CUFF_F': "The far lilac puffed sleeve and its gold cuff, at his raised arm's angle: it is turned down along our "
              'forearm (pivot: its inner end, on the far elbow).',
}


def spans_set(rows):
    return {(x, y) for y, ss in rows.items() for a, b in ss for x in range(a, b + 1)}


def lift():
    """Each piece as {(x, y): (r, g, b)} in his pixels, the cells taken from him, and his line colour."""
    N = P.native()
    fig = P.figure()
    fam = P.family(N)
    Q = P.quantize(N)
    is_line = fam == P.FAMILIES.index('line')
    is_skin = fam == P.FAMILIES.index('skin')
    col = lambda x, y: tuple(int(v) for v in Q[y, x])
    line = col(*next((x, y) for y in range(100) for x in range(100) if fig[y, x] and is_line[y, x]))
    hair = spans_set(HAIR_OVER)

    out = {n: {} for n in list(PIECE_OF.values()) + list(FILLED)}
    taken = {n: set() for n in list(PIECE_OF.values()) + list(FILLED)}
    for y, ss in OWN.items():
        for ch, a, b in ss:
            name = PIECE_OF[ch]
            for x in range(a, b + 1):
                if not fig[y, x] or (x, y) in hair:
                    continue
                out[name][x, y] = col(x, y)
                taken[name].add((x, y))
    # Nothing is taken twice.
    seen = {}
    for name, cs in taken.items():
        for c in cs:
            assert c not in seen, (c, name, seen.get(c))
            seen[c] = name

    def his(name, x, y):
        return (x, y) in taken[name] and not is_line[y, x]

    def nearest_row(name, x, y, pred=lambda x, y: True):
        best = None
        for (px, py) in sorted(taken[name]):
            if py != y or not his(name, px, py) or not pred(px, py):
                continue
            d = (abs(px - x), px > x)
            if best is None or d < best[0]:
                best = (d, (px, py))
        return best and best[1]

    def nearest(name, x, y, pred):
        best = None
        for (px, py) in sorted(taken[name]):
            if not his(name, px, py) or not pred(px, py):
                continue
            d = (abs(py - y) * 4 + abs(px - x), py, px)
            if best is None or d < best[0]:
                best = (d, (px, py))
        return best and best[1]

    for name, rules in FILL.items():
        for rule, cs in rules:
            for (x, y) in cs:
                assert (x, y) not in taken[name], (name, rule, x, y)
                if rule == 'line':
                    v = line
                elif rule == 'skin':
                    v = col(*nearest(name, x, y, lambda px, py: is_skin[py, px]))
                elif rule == 'row':
                    v = col(*nearest_row(name, x, y))
                elif rule == 'down':
                    src = next(((x, q) for q in range(y + 1, 60) if his(name, x, q)), None)
                    v = col(*(src or nearest_row(name, x, y)))
                elif rule == 'panel':
                    src = next((x, y + k) for k in (3, 6, 9, 12, 15) if fam[y + k, x] == P.FAMILIES.index('gown'))
                    v = col(*src)
                elif rule == 'gold':
                    v = col(*nearest_row(name, x, y + 1, lambda px, py: fam[py, px] == P.FAMILIES.index('gold')))
                else:
                    raise ValueError(rule)
                out[name][x, y] = v
    tip = {(x, y): v for (x, y), v in out['BODICE'].items() if y >= TIP_FROM}
    out['BODICE_TIP'] = tip
    taken['BODICE_TIP'] = {c for c in taken['BODICE'] if c[1] >= TIP_FROM}
    out['SLEEVE_F_SIDE'] = {(x, y): v for (x, y), v in out['SLEEVE_F'].items() if x <= SIDE_TO}
    taken['SLEEVE_F_SIDE'] = {c for c in taken['SLEEVE_F'] if c[0] <= SIDE_TO}
    return out, taken, line, N, Q, fig


def angle_of(a, b):
    return float(np.degrees(np.arctan2(J[b][1] - J[a][1], J[b][0] - J[a][0])))


def at_idle(out):
    """Every piece in our frame at idle, in the game's order: {(x, y): colour} (his cells moved by OFF; the far
    sleeve is turned, so it is left out here)."""
    top = {}
    for name in ORDER:
        if name == 'CUFF_F':
            continue
        for (x, y), v in out[name].items():
            top[x + OFF[0], y + OFF[1]] = v
    return top


def check(out, taken):
    """Every pixel taken from him (but the raised far sleeve's) comes out his at idle."""
    top = at_idle(out)
    bad = []
    for name in ORDER:
        if name == 'CUFF_F':
            continue
        for (x, y) in taken[name]:
            if top.get((x + OFF[0], y + OFF[1])) != out[name][x, y]:
                bad.append((name, (x, y)))
    return bad


CHARS = 'kabcdefghijlmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def hexs(c):
    return '#%02x%02x%02x' % tuple(c)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def kind_of(c, line, skins):
    """What a colour of his is, for the colour slots: line, skin, gold, lilac or pink."""
    if c == line or lum(c) < 40:
        return 'line'
    r, g, b = (v / 255 for v in c)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    h *= 360
    # her skin's tones are warm (orange-pink); the pale gold lights and the rose shadows the skin family also
    # takes in are gold and pink
    if c in skins and h < 35:
        return 'skin'
    if 15 <= h <= 65:
        return 'gold'
    if 230 <= h < 325:
        return 'lilac'
    return 'pink'


def write_ts(out, taken, line, fam_skin, path):
    used = sorted({v for name in DOCS for v in out[name].values()}, key=lambda c: (lum(c), c))
    kinds = {v: kind_of(v, line, fam_skin) for v in used}
    lines = [
        "// The princess's bodice and sleeves (top_rose_bodice): the owner's pixels from his picture of her at our game's",
        '// scale (docs/reference/princess-owner-reference.jpg, one of his pixels is one of ours), cut by',
        '// tools/refs/princess-top-from-ref.py into one piece per segment of the rig, pivot on its joint at our female',
        "// idle, angle the segment's there. Generated: rerun the script to change it.",
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
    ]
    for name in DOCS:
        cs = out[name]
        xs = [x for x, _ in cs]
        ys = [y for _, y in cs]
        x0, y0 = min(xs), min(ys)
        # His line is k, then his colours darkest first.
        own = sorted(set(cs.values()), key=lambda c: (c != line, lum(c), c))
        ch = {v: CHARS[i] for i, v in enumerate(own)}
        rows = [''.join(ch[cs[x, y]] if (x, y) in cs else '.' for x in range(x0, max(xs) + 1)) for y in range(y0, max(ys) + 1)]
        jn, seg = JOINT[name]
        if name == 'CUFF_F':
            pivot = (CUFF_F_PIVOT[0] - x0, CUFF_F_PIVOT[1] - y0)
            angle = CUFF_F_ANGLE
        else:
            px, py = J[jn]
            pivot = (int(np.floor(px)) - OFF[0] - x0, int(np.floor(py)) - OFF[1] - y0)
            angle = angle_of(*seg)
        lines += [f'/** {DOCS[name]} */', f'export const PRINCESS_{name}: PaintedPiece = {{',
                  f'  pivot: [{pivot[0]}, {pivot[1]}],', f'  angle: {angle:.2f},', '  rows: [']
        lines += [f"    '{r}'," for r in rows]
        lines += ['  ],', '  colors: {']
        lines += [f"    {ch[v]}: '{hexs(v)}'," for v in own]
        lines += ['  },', '};', '']
    docs = {
        'pink': "Her gown's pinks (the puffs and the bodice's sides), the slot\'s colour first, then light to dark: the Dress slot moves them from the first.",
        'lilac': 'Her lilacs (the collar, the bodice and the sleeves), the slot\'s colour first, then light to dark: the Lilac slot moves them from the first.',
        'gold': 'Her golds (the embroidery, the bands and the cuffs), the slot\'s colour first, then light to dark: the Gold slot moves them from the first.',
        'skin': 'Her skin (the bare shoulders and the skin under the collar), the base first: the player\'s skin moves them from the first.',
    }
    # How often he used each colour in these clothes (his pixels, not the filled ones).
    count = {}
    for name in DOCS:
        if name in ('BODICE_TIP', 'SLEEVE_F_SIDE', 'BODICE_SIDE_F'):
            continue
        for c in taken[name]:
            count[out[name][c]] = count.get(out[name][c], 0) + 1
    for kind in ('pink', 'lilac', 'gold', 'skin'):
        vs = sorted([v for v in used if kinds[v] == kind], key=lambda v: (-lum(v), v))
        # the slot's colour: the one he used most of the fabric's lit face (HLS lightness at least a half; his
        # darker tones are its folds and shadows)
        lit = [v for v in vs if colorsys.rgb_to_hls(*(c / 255 for c in v))[1] >= 0.5]
        main = max(lit, key=lambda v: (count.get(v, 0), -lum(v)))
        vs.remove(main)
        vs.insert(0, main)
        lines.append(f'/** {docs[kind]} */')
        lines.append(f"export const PRINCESS_TOP_{kind.upper()} = [{', '.join(repr(hexs(v)) for v in vs)}];".replace('"', "'"))
        lines.append('')
    ln = sorted([v for v in used if kinds[v] == 'line'], key=lambda c: (lum(c), c))
    lines.append('/** His black line and his darkest darks: no slot moves them. */')
    lines.append(f"export const PRINCESS_TOP_LINE = [{', '.join(repr(hexs(v)) for v in ln)}];".replace('"', "'"))
    lines.append('')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    os.replace(tmp, path)
    return kinds


def font(size, bold=False):
    try:
        return ImageFont.truetype(BOLD if bold else FONT, size)
    except OSError:
        return ImageFont.load_default()


def picture(out, taken, N, fig, path, k=8):
    """His crop | the pieces at idle (the far sleeve at his angle, as taken) | each piece alone; Spanish labels."""
    x0, y0, x1, y1 = 28, 24, 78, 58
    W, H = x1 - x0, y1 - y0
    bg = (236, 233, 226)

    def tile(cs):
        a = np.zeros((H, W, 3), np.uint8)
        a[:] = bg
        for (x, y), v in cs.items():
            if x0 <= x < x1 and y0 <= y < y1:
                a[y - y0, x - x0] = v
        return a

    crop = np.zeros((H, W, 3), np.uint8)
    crop[:] = bg
    for y in range(y0, y1):
        for x in range(x0, x1):
            if fig[y, x]:
                crop[y - y0, x - x0] = N[y, x]
    allp = {}
    for name in ORDER:
        allp.update(out[name])
    filled = {}
    for name in ORDER:
        for c, v in out[name].items():
            if c not in taken[name]:
                filled[c] = (255, 40, 200)
    marked = dict(allp)
    marked.update(filled)
    titles = [('Tu dibujo', 'tus píxeles'), ('Las piezas', 'como las dibujaste'), ('Lo rellenado', 'en magenta: lo que tapa el pelo, los brazos o la manga levantada')]
    tiles = [crop, tile(allp), tile(marked)]
    names = {'BODICE': 'Corpiño + cuello alto', 'BODICE_TIP': 'Punta del corpiño', 'SLEEVE_N': 'Manga cercana (hombro y abullonado)',
             'CUFF_N': 'Manga cercana (lila y puño)', 'SLEEVE_F': 'Manga lejana (abullonado)', 'CUFF_F': 'Manga lejana (lila y puño)'}
    for name in ('BODICE', 'SLEEVE_N', 'CUFF_N', 'SLEEVE_F', 'CUFF_F', 'BODICE_TIP'):
        tiles.append(tile(out[name]))
        titles.append((names[name], f'{len(taken[name])} tuyos + {len(out[name]) - len(taken[name])} rellenados'))
    cols = 3
    tw, th = W * k, H * k
    pad, head = 16, 46
    rows = (len(tiles) + cols - 1) // cols
    img = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + head + pad) + pad + 40), (250, 248, 242))
    d = ImageDraw.Draw(img)
    d.text((pad, 10), 'Corpiño y mangas de la princesa: tus píxeles, uno por uno (8x)', fill=(30, 30, 30), font=font(22, True))
    for i, (t, (a, b)) in enumerate(zip(tiles, titles)):
        cx = pad + (i % cols) * (tw + pad)
        cy = 40 + pad + (i // cols) * (th + head + pad)
        d.text((cx, cy), a, fill=(30, 30, 30), font=font(18, True))
        d.text((cx, cy + 22), b, fill=(90, 90, 90), font=font(13))
        img.paste(Image.fromarray(t).resize((tw, th), Image.NEAREST), (cx, cy + head))
    img.save(path)


def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    out, taken, line, N, Q, fig = lift()
    bad = check(out, taken)
    for b in bad:
        print('not his at idle:', b)
    picture(out, taken, Q, fig, os.path.join(out_dir, 'pieces@8.png'))
    for name in DOCS:
        print(name, 'cells', len(out[name]), 'his', len(taken[name]), 'colours', len(set(out[name].values())))
    if bad:
        raise SystemExit('pieces are not his picture at idle')
    if len(sys.argv) > 2:
        fam = P.family(N)
        skins = {tuple(int(v) for v in Q[y, x]) for y in range(100) for x in range(100) if fig[y, x] and fam[y, x] == P.FAMILIES.index('skin')}
        kinds = write_ts(out, taken, line, skins, sys.argv[2])
        for v, kd in sorted(kinds.items(), key=lambda t: (t[1], lum(t[0]))):
            print(kd, hexs(v))


if __name__ == '__main__':
    main()
