"""Aurelia's skirt and sash from the owner's picture at our scale (the owner's fourth heroine).

docs/reference/aurelia-escala-juego-owner-reference.jpg is his Aurelia redrawn at our sprite scale
(1932 x 1932, 100 x 100 of his pixels of 19.32 picture pixels each, from 0: one of his pixels is one
fine pixel of ours). It is the reference ("perfectas"): her skirt and sash are his pixels, in his
colours (KEY: the medians of his cells, each cell the nearest of them). The big picture
(aurelia-owner-reference.jpg) only helped to read them.

Where it sits. His pixel (x, y) is ours (x + DX, y + DY) at our female's idle frame 0 (the second
female body), where all of her lies (tools/refs/aurelia_rig.py AT: his soles on ours), so his sash falls
on our waist, his belt and front panel on our hips and between our legs, his hems where he drew them
over his boots. None of his rows is left out (the owner, 2026-10-21: "tienes errores de pixeles
diferentes en faja cinturon y bolsa, en falda la pierna derecha y la capa estan mal unos pixeles esta
haciendo que la pierna se vea deforme": the rows the first layout left out bent his panels):

  front    his front panel (the gold border, the lattice under the belt, the white with its grey
           stripe, the tree over the point).
  near     his near side panel, flaring back from the hip behind the near leg, with the bit of skirt
           under the pouch. Its top NEAR_FRONT rows are also drawn over the near thigh: there his panel
           hangs over it, so only his slit shows the thigh.
  far      his far side panel, the white strip with its gold trim beside the far leg, from its gold
           edge under the belt (beside the front panel, over the top of the far thigh) down, where he
           drew it, beside his far boot (which stands where he drew it too). Its top FAR_FRONT rows are
           also drawn over the far hip and thigh: there his panel hangs over it, and our thigh is wider
           than his. Behind his far hand the panel is continued from his rows under the hand
           (FAR_HIDDEN), for poses where our far hand is elsewhere.
  lining   the pale grey lining behind and between the legs. His shows only between his legs and the
           panels (three strips); the rest is behind his legs and is continued from his strips row by
           row (each hidden cell the nearest of his lining cells in its row, each strip moved as the
           panel beside it), from under the belt down to its hem, his line under it; where his picture
           shows white ground or his line, so does the lining. Its rows follow the front panel's.
  waist    his gold sash band, the brown belt with its steel buckle, the pouch on the near hip, the
           red charm on its gold cord and the gold sash end draped round the near hip, ending at his
           far sleeve as he drew it.

What is not his skirt is left out: his legs and boots, the bare thighs in the slits (ours show
there), his hands, sleeves and staff.

Each piece is written with the columns it hangs from (the top rides the torso, the bottom hangs
below the hips; src/sprite/items/aureliaLower.ts moves them with the rig), so at rest every pixel is
as here. It writes the TypeScript module and, in <study>, the pieces at 8x:

  python3 -I tools/refs/aurelia-lower-from-ref.py src/sprite/items/aureliaLowerArt.ts <study>

The same picture always gives the same bytes.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

REF = 'docs/reference/aurelia-escala-juego-owner-reference.jpg'
PITCH = 19.32
# Each cell's colour is the median of its inside (this far from its edges: the JPEG's ringing).
INSET = 4

# His colours in the skirt and sash, one character each: the medians of his cells (the JPEG's noise
# grouped). Every cell is the nearest of these.
KEY = {
    # his line
    'k': '#030518',
    # his leathers
    'N': '#433031', 'n': '#553633', 'b': '#7b4d36', 'l': '#91664d', 'L': '#a9876a',
    # his golds, darkest first
    'p': '#926031', 'P': '#9d6a2e', 'O': '#ae7a2c', 'o': '#b8832c', 'g': '#ce9632', 'G': '#e2a838',
    'Y': '#f3bd48', 'y': '#fac856', 'z': '#fcd36f', 'Z': '#eac270', 'x': '#f0d190',
    # his greys: the lining and the shade of the white
    'u': '#88736f', 'V': '#99847d', 'F': '#a08a82', 'T': '#b29b88', 't': '#c9b8a6', 'c': '#cebdac',
    # his whites
    'A': '#e8dbcb', 'w': '#f5eddb', 'W': '#fdecc4',
    # not skirt (his skin), read so that no skirt cell takes them
    'j': '#c47c6d', 's': '#dd947e', 'v': '#f6c6a4',
    # the charm's red, the buckle's steel
    'r': '#7e1a1e', 'd': '#342b2c', 'e': '#5c5352', 'E': '#a2a8aa', 'h': '#e0e1e0',
    # his white ground
    '.': '#ffffff',
}
LINE = 'k'
SKIN = 'jsv'

# His pixel (x, y) is ours (x + DX, y + DY): where all of her lies (tools/refs/aurelia_rig.py).
from aurelia_rig import AT  # noqa: E402

DX, DY = AT['lower']

# What each colour is, for the item's colour slots (his line and the charm's red keep his).
_GOLD = {c: 'gold' for c in 'pPOogGYyzZx'}
_PANEL = {**_GOLD, **{c: 'cloth' for c in 'AwWtc'}, **{c: 'lining' for c in 'uVFT'}}
ROLE = {
    'front': _PANEL,
    'near': _PANEL,
    'far': _PANEL,
    'lining': {c: 'lining' for c in 'uVFTtc'},
    'waist': {**{c: 'sash' for c in 'pPOogGYyzZx'}, **{c: 'leather' for c in 'NnblL'}, **{c: 'buckle' for c in 'deEhAwWtcuVFT'}},
}
# The colours each slot recolours from: at these every pixel stays his.
BASE = {'cloth': 'w', 'gold': 'G', 'lining': 'u', 'sash': 'Y', 'leather': 'l', 'buckle': 'E'}

# Each piece in his picture: cells reached from its seeds (his x, y) without crossing his line, inside
# its box (x0, y0, x1, y1, both ends in), and his line round them. Read from his picture.
SEEDS = {
    'front': ([(54, 60)], (49, 47, 61, 84)),
    # the panel, and the skirt under the pouch
    'near': ([(30, 70), (44, 52)], (20, 50, 47, 91)),
    # the panel and the bits of its gold edge under the belt (his line breaks them)
    'far': ([(67, 70), (61, 52), (61, 54), (63, 54)], (60, 51, 72, 91)),
    # the strips between his near leg and the panel, between his legs, between his far leg and the panel
    'lining': ([(35, 75), (47, 80), (64, 75)], (30, 60, 70, 90)),
    # the sash band, the belt and its buckle, the pouch, the charm, the far belt, the drape
    'waist': ([(52, 43), (58, 42), (47, 43), (49, 44), (54, 46), (57, 47), (45, 46), (47, 49), (50, 50), (63, 47), (44, 55)], (36, 41, 66, 58)),
}
# His rows left out (front, far: each the same as the one above it; near: the rows below then move one
# column in). None: every row of his is laid where he drew it.
FRONT_DROP = []
NEAR_DROP = []
FAR_DROP = []
# The far panel stands where he drew it: his far boot does too, a narrow column between it and the front
# panel (aurelia-legs-from-ref.py), and our far thigh, which stands further out than his, goes under the
# boot's lace top. (No column moved: FAR_SHIFT would move it one column out below each of its rows.)
FAR_SHIFT = []
# The far panel's rows over the far thigh (his rows 49-61), drawn over the far hip and thigh too.
FAR_FRONT = 13
# The near panel's rows over the near thigh, drawn in front of it: his panel hangs over the top of the
# thigh by the hip, so only the slit below shows the thigh, where he drew it.
NEAR_FRONT = 13
# The far panel behind his far hand (his x 64-67, rows 52-55), filled by continuing his panel below
# the hand (his rows 57-60: its white, the shade by its outer line 'c', his line): our far hand hangs
# further out than his, so the panel shows there. His line round the hand stays (row 51 over it, row
# 56 under it, column 63 by its gold edge).
FAR_HIDDEN = {}
for _y in range(52, 56):
    FAR_HIDDEN.update({(64, _y): 'w', (65, _y): 'w', (66, _y): 'c', (67, _y): LINE})
# The lining: from this row of his (under the belt and the pouch) down to its hem.
LINING_TOP = 51
# The belt behind his far sleeve could run on to a column of ours (BELT_TO); our far arm now hangs where
# his does, so his belt ends at his far sleeve, where he drew it (None: not run on).
BELT_TO = None
BELT_ROWS = (44, 49)


def native():
    """His pixels: the median of each cell's inside, as an (H, W, 3) int array."""
    a = np.asarray(Image.open(REF).convert('RGB')).astype(np.int32)
    n = int(round(a.shape[0] / PITCH))
    out = np.zeros((n, n, 3), np.int32)
    for j in range(n):
        for i in range(n):
            c = a[int(j * PITCH) + INSET:int((j + 1) * PITCH) - INSET, int(i * PITCH) + INSET:int((i + 1) * PITCH) - INSET]
            out[j, i] = np.round(np.median(c.reshape(-1, 3), 0))
    return out


def rgb(hx):
    return np.array([int(hx[1:3], 16), int(hx[3:5], 16), int(hx[5:7], 16)])


def classify(N):
    keys = list(KEY)
    pal = np.array([rgb(KEY[k]) for k in keys])
    d = np.abs(N[:, :, None, :] - pal[None, None]).max(3)
    return np.array(keys)[d.argmin(2)], d.min(2)


def flood(C, seeds, box, allow):
    x0, y0, x1, y1 = box
    m = np.zeros(C.shape, bool)
    st = []
    for x, y in seeds:
        assert C[y, x] in allow, f'seed ({x}, {y}) is {C[y, x]!r}'
        m[y, x] = True
        st.append((y, x))
    while st:
        a, b = st.pop()
        for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            p, q = a + da, b + db
            if y0 <= p <= y1 and x0 <= q <= x1 and not m[p, q] and C[p, q] in allow:
                m[p, q] = True
                st.append((p, q))
    return m


def with_line(C, m, box):
    """The region and his line round it (every cell of his line next to it, corners too)."""
    x0, y0, x1, y1 = box
    out = m.copy()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if C[y, x] == LINE and m[y - 1:y + 2, x - 1:x + 2].any():
                out[y, x] = True
    return out


# Where his skirt and sash are (x0, y0, x1, y1, inclusive): a cell of his cloth, gold or leather here that
# no piece's flood reaches (a strip of gold shut in by his line, as beside the near slit) goes to the piece
# whose cells are nearest (ORPHAN_REACH), so at rest no pixel of his is missing.
ORPHAN_BOX = (36, 41, 72, 92)
ORPHAN_REACH = 2
# The pieces that take them (not the near panel, whose inner edge sets where the lining starts).
ORPHAN_TO = ('front', 'far', 'waist')


def his_pieces(C):
    allow = set(KEY) - set(SKIN) - {LINE, '.'}
    out = {}
    fills = {}
    for name, (seeds, box) in SEEDS.items():
        fills[name] = flood(C, seeds, box, allow)
    # his cells no flood reached go to the nearest piece of ORPHAN_TO
    claimed = np.zeros(C.shape, bool)
    for name, (_, box) in SEEDS.items():
        claimed |= fills[name] if name == 'lining' else with_line(C, fills[name], box)
    x0, y0, x1, y1 = ORPHAN_BOX
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if claimed[y, x] or C[y, x] not in allow:
                continue
            best = None
            for name in ORPHAN_TO:
                ys, xs = np.nonzero(fills[name][max(0, y - ORPHAN_REACH):y + ORPHAN_REACH + 1, max(0, x - ORPHAN_REACH):x + ORPHAN_REACH + 1])
                if len(ys):
                    d = int(np.min(np.maximum(np.abs(ys + max(0, y - ORPHAN_REACH) - y), np.abs(xs + max(0, x - ORPHAN_REACH) - x))))
                    if best is None or d < best[0]:
                        best = (d, name)
            if best:
                fills[best[1]][y, x] = True
    for name, (seeds, box) in SEEDS.items():
        m = fills[name]
        if name != 'lining':
            m = with_line(C, m, (min(box[0], x0), min(box[1], y0), max(box[2], x1), max(box[3], y1)))
        out[name] = m
    return out


def row_map(y0, y1, drop):
    """His rows y0..y1 without `drop`: the list of his rows, one per row of ours, top down."""
    return [y for y in range(y0, y1 + 1) if y not in drop]


def place(C, m, drop, dx_of, oy=None):
    """A piece of his on our frame: {(our x, our y): char}, his rows without `drop`, each moved dx_of(his y)."""
    ys = np.nonzero(m.any(1))[0]
    rows = row_map(int(ys.min()), int(ys.max()), drop)
    top = int(ys.min()) + DY if oy is None else oy
    out = {}
    for k, y in enumerate(rows):
        for x in np.nonzero(m[y])[0]:
            out[(int(x) + DX + dx_of(y), top + k)] = str(C[y, x])
    return out


def near_dx(y):
    return sum(1 for d in NEAR_DROP if y > d)


def far_dx(y):
    return sum(1 for d in FAR_SHIFT if y > d)


def build():
    N = native()
    C, dist = classify(N)
    for (x, y), ch in FAR_HIDDEN.items():
        C[y, x] = ch
        dist[y, x] = 0
    H = his_pieces(C)
    worst = max(int(dist[m & (C != LINE)].max()) for m in H.values())
    P = {}
    P['front'] = place(C, H['front'], FRONT_DROP, lambda y: 0)
    P['near'] = place(C, H['near'], NEAR_DROP, near_dx)
    P['far'] = place(C, H['far'], FAR_DROP, far_dx)
    P['waist'] = place(C, H['waist'], [], lambda y: 0)
    # the belt runs on behind his far sleeve: each of its rows' last colour before his line, repeated
    w = P['waist']
    for y in range(BELT_ROWS[0] + DY, BELT_ROWS[1] + DY + 1) if BELT_TO is not None else ():
        xs = [x for (x, yy) in w if yy == y]
        x_end = max(xs)
        body = [x for x in xs if w[(x, y)] != LINE]
        last = w[(max(body), y)] if body else LINE
        for x in range(x_end, BELT_TO):
            w[(x, y)] = last if y not in (BELT_ROWS[0] + DY, BELT_ROWS[1] + DY) else LINE
        w[(BELT_TO, y)] = LINE
    P['lining'] = lining(C, H, P)
    return N, C, H, P, worst


def lining(C, H, P):
    """The lining in our frame: between the near panel and the far panel, from under the belt to the
    hem; each cell his lining's nearest cell in its row (his strips moved as the panels beside them)."""
    m = H['lining']
    ys = np.nonzero(m.any(1))[0]
    rows = row_map(LINING_TOP, int(ys.max()), FRONT_DROP)
    near_strip = lambda x: x < 40  # noqa: E731  his strip between the near leg and the panel
    far_strip = lambda x: x > 60  # noqa: E731  his strip between the far leg and the panel
    # his visible lining cells per row, moved as their panels
    vis = {}
    for y in range(int(ys.min()), int(ys.max()) + 1):
        for x in np.nonzero(m[y])[0]:
            x = int(x)
            mx = x + DX + (near_dx(y) if near_strip(x) else far_dx(y) if far_strip(x) else 0)
            vis.setdefault(y, []).append((mx, str(C[y, x])))
    # his hem: per strip, the first row under its lowest cell
    hem_his = {}
    for y, cells in vis.items():
        for x, _ in cells:
            hem_his[x] = max(hem_his.get(x, 0), y)
    out = {}
    near = P['near']
    far = P['far']
    top = LINING_TOP + DY
    for k, y in enumerate(rows):
        oy = top + k
        # from just behind the near panel's inner edge to just behind the far panel's outer edge (in a
        # row without the panel, its nearest row's)
        left = max(x for (x, yy) in near if yy == nearest_row(near, oy)) - 2
        right = max(x for (x, yy) in far if yy == nearest_row(far, oy)) - 1
        src = vis.get(y) or vis[min(vis, key=lambda q: abs(q - y))]
        for x in range(left, right + 1):
            out[(x, oy)] = min(src, key=lambda c: (abs(c[0] - x), c[0]))[1]
    # the hem: per column, the lowest row of his nearest strip cell, mapped to our rows; his line under it
    ours_of = {y: top + k for k, y in enumerate(rows)}
    hem = {}
    cols = sorted({x for x, _ in out})
    hx = sorted(hem_his)
    for x in cols:
        nearest = min(hx, key=lambda q: (abs(q - x), q))
        hy = hem_his[nearest]
        while hy not in ours_of:
            hy -= 1
        hem[x] = ours_of[hy]
    for (x, y) in list(out):
        if y > hem[x]:
            del out[(x, y)]
    for x in cols:
        out[(x, hem[x] + 1)] = LINE
    # where his picture shows the lining's place (not hidden behind his legs or panels), it is his: his
    # white ground stays empty and his line is his line (the continued hem ends where he drew it)
    for (x, y) in list(out):
        hx, hy = x - DX, y - DY
        if 0 <= hx < C.shape[1] and 0 <= hy < C.shape[0]:
            if C[hy, hx] == '.':
                del out[(x, y)]
            elif C[hy, hx] == LINE:
                out[(x, y)] = LINE
    return out


def nearest_row(px, y):
    """The row of a placed piece nearest `y` (`y` itself when the piece has it)."""
    return min({yy for _, yy in px}, key=lambda q: (abs(q - y), q))


def to_rows(px):
    xs = [x for x, _ in px]
    ys = [y for _, y in px]
    x0, y0 = min(xs), min(ys)
    W, H = max(xs) - x0 + 1, max(ys) - y0 + 1
    g = [['.'] * W for _ in range(H)]
    for (x, y), ch in px.items():
        g[y - y0][x - x0] = ch
    return (x0, y0), [''.join(r) for r in g]


HANG = {'lining': True, 'far': True, 'near': True, 'front': True, 'waist': False}
# Rows at the top whose edges have no line of his (they go under the belt).
OPEN_TOP = {'lining': 2, 'far': 0, 'near': 0, 'front': 1, 'waist': 0}
ORDER = ['lining', 'far', 'near', 'front', 'waist']
# How many columns each piece hangs from (evenly across it).
NCOLS = {'lining': 4, 'far': 2, 'near': 3, 'front': 2, 'waist': 3}


def columns(name, origin, rows):
    (ox, oy), H, W = origin, len(rows), len(rows[0])
    n = NCOLS[name]
    xs = [ox + round(W * i / (n - 1)) for i in range(n)]
    return [(x, oy, x, oy + H) for x in xs]


def fill_rows(rows):
    """For each pixel of his line on the piece's edge (next to an empty pixel or the piece's border),
    the colour just inside it (the nearest pixel that is not his line), '.' elsewhere: the game puts
    that colour where such a pixel is pulled inside the moved piece."""
    H, W = len(rows), len(rows[0])
    at = lambda x, y: rows[y][x] if 0 <= x < W and 0 <= y < H else '.'  # noqa: E731
    out = []
    for y in range(H):
        row = ''
        for x in range(W):
            ch = rows[y][x]
            edge = ch == LINE and any(at(x + dx, y + dy) == '.' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if not edge:
                row += '.'
                continue
            inner = LINE
            for d in range(1, 4):
                near = [at(x + dx * d, y + dy * d) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1))]
                near = [c for c in near if c not in '.' + LINE]
                if near:
                    inner = near[0]
                    break
            row += inner
        out.append(row)
    return out


DOCS = {
    'lining': 'The pale grey lining behind and between her legs, continued from his strips, with its hem.',
    'far': 'The far side panel: the white strip with its gold trim beside the far leg.',
    'near': 'The near side panel flaring back from the hip behind the near leg, its gold hem, and the skirt under the pouch.',
    'front': 'The front panel under the belt: the gold border, the lattice, the white with its grey stripe, the tree over the point.',
    'waist': 'The gold sash band, the belt with its steel buckle, the pouch, the red charm and the draped sash end.',
}


def ts_module(ps):
    out = [
        "// Aurelia's skirt and sash, the owner's pixels at our scale (tools/refs/aurelia-lower-from-ref.py",
        '// from docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        '/** A piece of his on our female at idle frame 0 and the columns it hangs from (src/sprite/items/aureliaLower.ts). */',
        'export interface DawnPiece {',
        "  /** One character per colour of his ('.' is empty). */",
        '  rows: string[];',
        "  /** For each pixel of his line on the piece's edge, the colour just inside it ('.' elsewhere). */",
        '  fill: string[];',
        '  /** The top-left pixel on our female at idle frame 0 (fine pixels of the 256 x 256 frame). */',
        '  origin: [number, number];',
        '  /** The columns it hangs from at rest, left to right: [top x, top y, bottom x, bottom y] (fine-pixel edges). */',
        '  cols: [number, number, number, number][];',
        '  /** Whether the bottoms of the columns hang (follow the thighs a little) or ride the torso with the tops. */',
        '  hang: boolean;',
        '  /** Rows at the top whose edges have no line of his (they go under the belt). */',
        '  openTop: number;',
        '  /** Rows at the top also drawn in front of their leg (the far panel over the far thigh, the near one over the near thigh). */',
        '  front: number;',
        '  /** His colour of each character. */',
        '  colors: Record<string, string>;',
        "  /** The colour slot each character's colour belongs to (missing: his always, as his line and the charm's red). */",
        '  roles: Record<string, string>;',
        '}',
        '',
        '/** His line. */',
        f"export const DAWN_LINE = '{KEY[LINE]}';",
        '/** The colours the slots recolour from (at these every pixel stays his). */',
        'export const DAWN_BASE: Record<string, string> = {',
    ]
    out += [f"  {k}: '{KEY[v]}'," for k, v in BASE.items()]
    out += ['};', '']
    for name in ORDER:
        (ox, oy), rows = ps[name]
        used = sorted({c for r in rows for c in r if c != '.'}, key=lambda c: list(KEY).index(c))
        out.append(f'/** {DOCS[name]} */')
        out.append(f'export const DAWN_{name.upper()}: DawnPiece = {{')
        out.append('  rows: [')
        out += [f"    '{r}'," for r in rows]
        out.append('  ],')
        out.append('  fill: [')
        out += [f"    '{r}'," for r in fill_rows(rows)]
        out.append('  ],')
        out.append(f'  origin: [{ox}, {oy}],')
        out.append('  cols: [' + ', '.join(f'[{a}, {b}, {c}, {d}]' for a, b, c, d in columns(name, (ox, oy), rows)) + '],')
        out.append(f"  hang: {'true' if HANG[name] else 'false'},")
        out.append(f'  openTop: {OPEN_TOP[name]},')
        out.append(f"  front: {FAR_FRONT if name == 'far' else NEAR_FRONT if name == 'near' else 0},")
        out.append('  colors: { ' + ', '.join(f"{c}: '{KEY[c]}'" for c in used) + ' },')
        roles = {c: ROLE[name][c] for c in used if c in ROLE[name]}
        out.append('  roles: { ' + ', '.join(f"{c}: '{v}'" for c, v in roles.items()) + ' },')
        out.append('};')
        out.append('')
    return '\n'.join(out).rstrip('\n') + '\n'


def study(N, H, ps, d):
    """His pieces in his picture and ours on our frame, at 8x."""
    def save(a, path, k=8):
        tmp = path + '.tmp.png'
        Image.fromarray(a).resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST).save(tmp)
        os.replace(tmp, path)
    box = (96, 160, 152, 222)
    img = np.full((256, 256, 3), (214, 222, 214), np.uint8)
    for name in ORDER:
        (ox, oy), rows = ps[name]
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch != '.':
                    img[oy + j, ox + i] = rgb(KEY[ch])
    save(img[box[1]:box[3], box[0]:box[2]], os.path.join(d, 'aurelia-lower-pieces@8.png'))
    his = np.full((100, 100, 3), (214, 222, 214), np.uint8)
    for name in ORDER:
        his[H[name]] = N[H[name]]
    save(his[box[1] - DY:box[3] - DY, box[0] - DX:box[2] - DX], os.path.join(d, 'aurelia-lower-his@8.png'))


def main(out_ts, study_dir):
    N, C, H, P, worst = build()
    ps = {name: to_rows(P[name]) for name in ORDER}
    for name in ORDER:
        (ox, oy), rows = ps[name]
        for r in rows:
            for ch in r:
                assert ch == '.' or ch in KEY and ch not in SKIN, (name, ch)
    text = ts_module(ps)
    tmp = out_ts + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, out_ts)
    os.makedirs(study_dir, exist_ok=True)
    study(N, H, ps, study_dir)
    print('worst cell', worst, 'off its colour;', ', '.join(f'{n} {ps[n][0]} {len(ps[n][1][0])}x{len(ps[n][1])}' for n in ORDER))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
