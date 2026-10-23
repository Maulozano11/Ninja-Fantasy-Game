"""The owner's two frames of his Trunks reading on a rock (docs/reference/trunks-read-owner-reference.jpg), as
the read pose of our male bodies, his answer for the Roman: "leer mira la referencia de trunks y copiala a leer
de romano". This script lifts his book and his hands: src/sprite/maleReadArt.ts (drawn by campfx.ts). His
joints are read off the same frames into rig.ts (READ_JOINTS).

His picture (2000 x 1493) holds two frames, split at picture column 1007 (the white gap between them):
- frame 1, "Leyendo": the open book held up before him in both gloved hands, the fingers over its lower edge;
- frame 2, "Libro cerrado": the book shut and tilted in the near hand at the chest, the near forearm across the
  body, the fingertips round the book's front.
Both are lifted, but the read plays only frame 2 (his decision, 2026-10-23: "pon como estas poniendo (libro
cerrado) en todas las poses de leer esa es la idea"; rig.ts READ_KEYS). Frame 1 is kept for a later pose.
His cells are about 17.3 picture pixels across and 16.8 down (the picture was stretched a little more across
than down); owner_paintover.py finds his grid where it drifts (native_xy below is its native() with a pitch per
axis). He painted over our read at our scale: one of his cells is one fine pixel of our sprite, his cell (x, y)
of frame k our pixel (x + OFFSET[k][0], y + OFFSET[k][1]) (his head on our read's head, his soles on our ground
line; in his second frame his boots and rock are one column further left in the frame's box).

- The book is his pixels, where he drew it (a prop: his colours). What his fingers hide of it is never shown:
  his hands are drawn over it in the same place.
- The hands are his hands' shape: his gloved hands (frame 1: both, the four fingers up over the book's edge;
  frame 2: the near hand under the book, its fingertips round the book's front, and the far hand's one
  fingertip at the book's left side). The Roman's hands are bare, so his glove's tones become the Roman's
  skin: every tone of his hand (his glove's greys and his fingertips' skin) is matched by brightness, as his
  tones are spread over his hand, to the tones of the owner's own Roman fists as they are spread over his fists
  (src/sprite/maleSkinArt.ts SKIN_HAND_N and SKIN_HAND_F, from his Roman paint-over). His black line stays his.
  campfx.ts recolours the skin to the character's skin as his Roman skin is (retintSkinLifted).

Every piece lands where he drew it in our frame. The same picture always gives the same bytes. From the
repository root:

  python3 -I tools/refs/roman-read-from-ref.py [src/sprite/maleReadArt.ts] [study.png]
"""

import colorsys
import os
import re
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_paintover as P  # noqa: E402

REF = os.path.join(P.REPO, 'docs', 'reference', 'trunks-read-owner-reference.jpg')
OUT = 'src/sprite/maleReadArt.ts'
SKIN = os.path.join(P.REPO, 'src', 'sprite', 'maleSkinArt.ts')
PITCH = (17.3, 16.8)
BOXES = [(0, 0, 1007, 1493), (1007, 0, 2000, 1493)]
OFFSET = [(83, 130), (84, 130)]
NAMES = ['Leyendo', 'Libro cerrado']
PAGE = (255, 255, 255)
PAGE_TOL = 40
TOL = 12
LINE = 45
# In his hands only black is his line: his glove's darkest charcoals (up to about #22251e) are the glove's
# creases and shadow, which become the Roman's skin's darkest tones.
HAND_LINE = 24
# Each piece's box in our frame (fine pixels, inclusive): the cells of his figure in it that are the piece's.
# Book: everything of his in its box that is not a hand's. Hands: his glove's greys in the box, his fingertips'
# skin in the skin box (the skin beside his gloves is his forearms, which are ours: the Roman's bracers), and
# his black line round them (the line cells touching them, inside the box).
BOOK = [(119, 163, 136, 173), (120, 160, 137, 175)]
HAND_N = [(114, 170, 123, 180), (117, 168, 131, 177)]
HAND_N_SKIN = [None, (125, 168, 131, 174)]
HAND_F = [(130, 172, 139, 180), (120, 166, 123, 170)]
HAND_F_SKIN = [None, (120, 166, 123, 170)]


def native_xy(path, box, pitch):
    """owner_paintover.native with a pitch per axis (across, down): his pixels in the picture's box, the median
    of each cell's middle; a cell with nothing read takes the cell before it in its row."""
    img = np.asarray(Image.open(path).convert('RGB')).astype(np.float64)
    X0, Y0, X1, Y1 = box
    a = img[Y0:Y1, X0:X1]
    H, W, _ = a.shape
    ex = np.zeros((H, W))
    ey = np.zeros((H, W))
    ex[:, 1:] = np.abs(np.diff(a, axis=1)).sum(2)
    ey[1:, :] = np.abs(np.diff(a, axis=0)).sum(2)
    Y, X = np.mgrid[Y0:Y1, X0:X1].astype(np.float64)
    u = P._fit_axis(ex, X, Y, X, pitch[0])
    v = P._fit_axis(ey, X, Y, Y, pitch[1])
    iu = np.floor(u).astype(int)
    iv = np.floor(v).astype(int)
    lo, hi = P.MIDDLE
    ok = (u - iu > lo) & (u - iu < hi) & (v - iv > lo) & (v - iv < hi)
    iu0, iv0 = iu.min(), iv.min()
    nx, ny = iu.max() - iu0 + 1, iv.max() - iv0 + 1
    key = ((iv - iv0) * nx + (iu - iu0))[ok]
    pix = a[ok]
    order = np.argsort(key, kind='stable')
    key = key[order]
    pix = pix[order]
    out = np.zeros((ny * nx, 3))
    got = np.zeros(ny * nx, bool)
    starts = np.flatnonzero(np.r_[True, key[1:] != key[:-1]])
    ends = np.r_[starts[1:], len(key)]
    for s, e in zip(starts, ends):
        out[key[s]] = np.median(pix[s:e], 0)
        got[key[s]] = True
    out = np.clip(np.round(out), 0, 255).astype(int).reshape(ny, nx, 3)
    got = got.reshape(ny, nx)
    for j in range(ny):
        for i in range(1, nx):
            if not got[j, i] and got[j, i - 1]:
                out[j, i] = out[j, i - 1]
                got[j, i] = True
    return out


_FRAMES = {}


def frame(k):
    """His frame k in our frame's coordinates: (colours (256, 256, 3), figure mask (256, 256)). His white page
    round the figure is not his figure; his own whites inside it (the book's pages) are."""
    if k in _FRAMES:
        return _FRAMES[k]
    a = native_xy(REF, BOXES[k], PITCH)
    fg = np.abs(a - np.array(PAGE)).max(2) > PAGE_TOL
    H, W = fg.shape
    fg[:2] = fg[-2:] = False
    fg[:, :2] = fg[:, -2:] = False
    m = P.merge(a, fg, TOL)
    col = np.zeros((256, 256, 3), int)
    mask = np.zeros((256, 256), bool)
    ox, oy = OFFSET[k]
    col[oy:oy + H, ox:ox + W] = m
    mask[oy:oy + H, ox:ox + W] = fg
    _FRAMES[k] = (col, mask)
    return _FRAMES[k]


def kind(c, line=LINE):
    """'#' his black line (every channel below `line`), 'g' his glove's greys, 's' his skin, 'o' anything else
    (book, clothes)."""
    r, g, b = (int(v) for v in c)
    if max(r, g, b) < line:
        return '#'
    h, light, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if s < 0.2 and light < 0.4:
        return 'g'
    if (r > 190 and g > 110 and r - b > 40 and not (g > 160 and b > 110 and r - b < 90)) or (r > 140 and g < r * 0.66 and r - b > 40):
        return 's'
    return 'o'


def in_box(b, y, x):
    return b[0] <= x <= b[2] and b[1] <= y <= b[3]


def hand_cells(col, mask, box, skin_box):
    """His hand in the box: its greys, its skin in the skin box, and his line cells touching them (8-way)."""
    cells = set()
    for y in range(box[1], box[3] + 1):
        for x in range(box[0], box[2] + 1):
            if not mask[y, x]:
                continue
            c = kind(col[y, x], HAND_LINE)
            if c == 'g' or (c == 's' and skin_box and in_box(skin_box, y, x)):
                cells.add((y, x))
    line = set()
    for (y, x) in cells:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (y + dy, x + dx)
                if q not in cells and in_box(box, *q) and mask[q] and kind(col[q], HAND_LINE) == '#':
                    line.add(q)
    return cells | line


def book_cells(col, mask, box, hands):
    """His book in the box: every cell of his figure in it that is not a hand's (his pages' whites included,
    being inside the figure's outline)."""
    out = set()
    for y in range(box[1], box[3] + 1):
        for x in range(box[0], box[2] + 1):
            inside = mask[y, x] or (mask[y, :x].any() and mask[y, x + 1:].any())
            if inside and (y, x) not in hands:
                out.add((y, x))
    return out


def his_fist_tones():
    """The tones of his Roman fists (maleSkinArt.ts SKIN_HAND_N, SKIN_HAND_F) as many times as he used them."""
    text = open(SKIN).read()
    tones = []
    for name in ('SKIN_HAND_N', 'SKIN_HAND_F'):
        block = text[text.index(f'export const {name}'):]
        block = block[:block.index('\n};')]
        rows = re.findall(r"^    '([^']*)',$", block[block.index('rows:'):block.index('colors:')], re.M)
        colors = dict(re.findall(r"^    (\w): '(#[0-9a-f]{6})',$", block[block.index('colors:'):], re.M))
        for row in rows:
            tones += [colors[ch] for ch in row if ch != '.']
    return tones


def lum(hexs):
    r, g, b = (int(hexs[i:i + 2], 16) for i in (1, 3, 5))
    return 0.299 * r + 0.587 * g + 0.114 * b


def match_tones(his, roman):
    """Each of his hand's tones (not his line) -> the Roman fist tone at the same place in the brightness order:
    his tones spread over his hand as his Roman fist tones are spread over his fists."""
    rs = sorted(roman, key=lambda h: (lum(h), h))
    counts = {}
    for h in his:
        counts[h] = counts.get(h, 0) + 1
    order = sorted(counts, key=lambda h: (lum(h), h))
    out = {}
    seen = 0
    n = len(his)
    for h in order:
        mid = (seen + counts[h] / 2) / n
        out[h] = rs[min(len(rs) - 1, int(mid * len(rs)))]
        seen += counts[h]
    return out


def hexs(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def piece(cells, col, recolor=None):
    """A piece: its first cell (x, y) in our frame, its rows and colours (one character per colour)."""
    if not cells:
        return None
    ys = [c[0] for c in cells]
    xs = [c[1] for c in cells]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    pal = {}
    rows = []
    for y in range(y0, y1 + 1):
        row = ''
        for x in range(x0, x1 + 1):
            if (y, x) not in cells:
                row += '.'
                continue
            h = hexs(col[y, x])
            if recolor and kind(col[y, x], HAND_LINE) != '#':
                h = recolor[h]
            if h not in pal:
                pal[h] = chars[len(pal)]
            row += pal[h]
        rows.append(row)
    return {'at': (x0, y0), 'rows': rows, 'colors': {v: k for k, v in pal.items()}}


def lift():
    roman = his_fist_tones()
    out = {'book': [], 'handN': [], 'handF': []}
    for k in range(2):
        col, mask = frame(k)
        hn = hand_cells(col, mask, HAND_N[k], HAND_N_SKIN[k])
        hf = hand_cells(col, mask, HAND_F[k], HAND_F_SKIN[k])
        bk = book_cells(col, mask, BOOK[k], hn | hf)
        his = [hexs(col[c]) for c in sorted(hn | hf) if kind(col[c], HAND_LINE) != '#']
        tones = match_tones(his, roman)
        out['book'].append(piece(bk, col))
        out['handN'].append(piece(hn, col, tones))
        out['handF'].append(piece(hf, col, tones))
    return out


def ts_piece(p, indent='  '):
    if p is None:
        return f'{indent}null,\n'
    s = f'{indent}{{\n{indent}  at: [{p["at"][0]}, {p["at"][1]}],\n{indent}  rows: [\n'
    for r in p['rows']:
        s += f"{indent}    '{r}',\n"
    s += f'{indent}  ],\n{indent}  colors: {{\n'
    for ch, h in p['colors'].items():
        s += f"{indent}    {ch}: '{h}',\n"
    return s + f'{indent}  }},\n{indent}}},\n'


def module(out):
    s = (
        "// The owner's book and hands from his two frames of his Trunks reading (tools/refs/roman-read-from-ref.py from\n"
        '// docs/reference/trunks-read-owner-reference.jpg), for the male read (rig.ts READ_MALE, campfx.ts). Generated:\n'
        '// rerun the script to change it.\n\n'
        '/** One of his pieces where he drew it in our frame: its first cell at fine pixel `at`. */\n'
        'export interface ReadPiece {\n  at: [number, number];\n  rows: string[];\n  colors: Record<string, string>;\n}\n\n'
        "/** His Roman skin's base (maleSkinArt.ts MALE_SKIN_BASE): the hands' tones are his Roman fists' tones in it. */\n"
        f"export const READ_SKIN_BASE = '#f3c39c';\n\n"
        f"/** Below this brightness (each channel) a colour of his hands is his black line, never recoloured. */\n"
        f'export const READ_LINE = {HAND_LINE};\n\n'
    )
    docs = {
        'book': "/** His book in each of his frames ('Leyendo': open, held up; 'Libro cerrado': shut, tilted at the chest), his colours. */",
        'handN': "/** His near hand in each frame: his hand's shape, his glove's tones as the Roman's skin (his Roman fists' tones). */",
        'handF': "/** His far hand in each frame (in 'Libro cerrado' only its fingertip beside the book; the hand is behind it). */",
    }
    names = {'book': 'READ_BOOK', 'handN': 'READ_HAND_N', 'handF': 'READ_HAND_F'}
    for key in ('book', 'handN', 'handF'):
        s += docs[key] + '\n'
        s += f'export const {names[key]}: ({"ReadPiece" if key == "book" else "ReadPiece | null"})[] = [\n'
        for p in out[key]:
            s += ts_piece(p)
        s += '];\n\n'
    return s.rstrip('\n') + '\n'


def study(path, out):
    """His two frames and the lifted pieces side by side at 8x (for review)."""
    K = 8
    tiles = []
    for k in range(2):
        col, mask = frame(k)
        box = (100, 150, 145, 190)
        w, h = box[2] - box[0], box[3] - box[1]
        a = np.full((h, w, 3), 255, np.uint8)
        b = np.full((h, w, 3), 230, np.uint8)
        for y in range(h):
            for x in range(w):
                if mask[box[1] + y, box[0] + x]:
                    a[y, x] = col[box[1] + y, box[0] + x]
        for key in ('book', 'handN', 'handF'):
            p = out[key][k]
            if not p:
                continue
            for j, row in enumerate(p['rows']):
                for i, ch in enumerate(row):
                    if ch != '.':
                        x, y = p['at'][0] + i - box[0], p['at'][1] + j - box[1]
                        hx = p['colors'][ch]
                        b[y, x] = [int(hx[q:q + 2], 16) for q in (1, 3, 5)]
        tiles += [a, b]
    row = np.concatenate([np.pad(t, ((0, 0), (0, 2), (0, 0)), constant_values=255) for t in tiles], 1)
    Image.fromarray(row).resize((row.shape[1] * K, row.shape[0] * K), Image.NEAREST).save(path)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    pieces = lift()
    with open(out, 'w') as f:
        f.write(module(pieces))
    if len(sys.argv) > 2:
        study(sys.argv[2], pieces)


if __name__ == '__main__':
    main()
