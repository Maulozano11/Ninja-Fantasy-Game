"""Aurelia's hair from the owner's picture at our scale, as a hairstyle: 'hair_dawn_bun'.

docs/reference/aurelia-escala-juego-owner-reference.jpg is his Aurelia redrawn at our sprite scale
(1932 x 1932, 100 x 100 of his pixels of 19.32 picture pixels each, from 0: one of his pixels is one
fine pixel of our sprites). It is the reference ("perfectas"): her hair is copied from it pixel for
pixel, in his colours. The big picture (aurelia-owner-reference.jpg) only helps to read it.

Her hair: blonde, gathered back into a braided bun at the back of the head with a gold ornament (gold
dots on a dark brown patch), the crown swept back from the brow, side-swept bangs falling to the
brows in strands, a long lock in front of her ear down to the collar on the near side and one beside
her far cheek down to the jaw; her black line on the top and the back, her brown on the front edge.

Where it sits. His near eye's lash row and its first cell (his (51, 16), the brown inner tip of the
lash) land on our face anchor (body.ts faceAnchor: the near eye's first column, its lash row), so his
pixel (x, y) is ours (x + 72, y + 125) at the female idle frame 0. Then his skull top, crown, near
lock and bun fall on our head as they fall on his. Only one thing is not his: our face is two
columns wider than his at the eyes (his far eye is at his face's far edge, ours two columns further
on). So the far side moves out with it: from the brow (row 11) one column, from the bangs' lower
rows (row 13) two, the cells it leaves are his own pixels just before them repeated (his strands
run on), and from the lash row down only the far lock moves (the cells it leaves are our face). His
far lock then sits right after our far eye's dark edge, as his sits after his.

What is not hair is left out: his face, ear, eyes and the collar under the locks. The shaded skin of
his brow between his bang strands is kept (SKIN, in the player's skin colour in the game), so that
our brows, which his bangs cover, do not show through there.

  FRONT   every pixel of her hair and the brow's skin between her strands (hairFront: over the head)
  BACK    the front with the skin between her bang strands filled (each such cell takes the nearest
          of her colours above it: her strands run on under the brow, behind the face). It is drawn
          behind the head and is also her head's outline above the eyes: the game trims our skull to
          it, so our skull does not show past her hair (her crown is a row lower than our skull)

Writes, in <out>:

  hair.json             rows, palette, pivot, her line, the ornament's colours and the two bases
  study/hers@8.png      his picture over the same box, at 8x (his pixels, before the far side moves)
  study/front@8.png     the front, at 8x
  study/back@8.png      the back, the filled-in pixels marked

and, with a third argument, the game's module (src/sprite/items/aureliaHairArt.ts). The same picture
always gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/aurelia-hair-from-ref.py <out> [src/sprite/items/aureliaHairArt.ts]
"""

import json
import os
import re
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aiden_ref import save  # noqa: E402

REF = 'docs/reference/aurelia-escala-juego-owner-reference.jpg'
PITCH = 19.32
# Each cell's colour is the median of its inside (this far from its edges: the JPEG's ringing).
INSET = 4

# His colours in the hair, one character each: the medians of his cells (the JPEG's noise grouped,
# each group the median of its cells). Every cell of the hair is the nearest of these.
KEY = {
    # his line
    'k': '#030519',
    # his browns and blondes, darkest first
    'b': '#553a32', 'c': '#6d4a32', 'e': '#7e523d', 'g': '#926446', 'n': '#d0a474', 'u': '#e6c08a',
    'w': '#f6daa2', 'x': '#fae1be', 'z': '#fbeecc',
    # his golds: the ornament
    'l': '#dda83a', 't': '#fdd258',
    # not hair (his ear line, skin, eyes, collar): read so that no hair cell takes them
    'a': '#241a23', 'p': '#e4967d', 'v': '#f5c7a6', 's': '#eca68b', 'j': '#c07265', 'd': '#225484',
    'f': '#286794', 'm': '#54a4c8', 'o': '#66b2d0', 'y': '#dbe4e7', 'A': '#f6efdd', 'r': '#c1b09c',
    'q': '#f6bc48', 'h': '#b0772c', 'i': '#be8830', 'W': '#ffffff',
}
HAIR = 'kbcegnuwxzlt'
# His brow's skin, shaded, where it shows between his bang strands (his rows FILL_FROM to the lash
# row): kept in the front so that our brows, which his bangs cover, do not show there. It follows
# the player's skin the way his lit skin (SKIN_BASE) moves.
SKIN = 'p'
SKIN_BASE = 'v'
LINE = 'k'
ORNAMENT = 'lt'
# His mid blonde, the lit face of most of his strands: the hair colour slot's default (recoloured,
# his other blondes and browns move as it does). His bright gold the same for the ornament.
HAIR_BASE = 'w'
ORNAMENT_BASE = 't'

# His pixel (x, y) is ours (x + DX, y + DY): his lash's first cell (51, 16) on our face anchor.
HIS_ANCHOR = (51, 16)
ANCHOR = (123, 141)
DX, DY = ANCHOR[0] - HIS_ANCHOR[0], ANCHOR[1] - HIS_ANCHOR[1]

# Which of his cells are hair, row by row (his rows 3-26): ranges of his columns, both ends in, and
# 'F' for the far lock (it moves with our wider face). Inside a range only his hair colours are taken
# (the skin between his bang strands is left out). Read from his picture: his ear (45-46, rows
# 16-18), face, eyes, the jaw's line and the gold collar under the near lock are in no range; nor is
# the brown tip of a bang strand between his eyes (55, 16), which would lie on our near eye.
MASK = {
    3: [(42, 46)], 4: [(41, 54)], 5: [(40, 57)], 6: [(39, 58)], 7: [(39, 59)], 8: [(38, 60)],
    9: [(38, 61)], 10: [(38, 61)], 11: [(38, 62)], 12: [(38, 62)], 13: [(38, 62)], 14: [(38, 62)],
    15: [(38, 62)],
    16: [(39, 44), (47, 50), (60, 62, 'F')],
    17: [(40, 44), (47, 50), (60, 62, 'F')],
    18: [(40, 44), (47, 50), (60, 61, 'F')],
    19: [(40, 50), (59, 61, 'F')],
    20: [(41, 51), (59, 61, 'F')],
    21: [(42, 50), (60, 60, 'F')],
    22: [(43, 50), (59, 60, 'F')],
    23: [(47, 50), (58, 59, 'F')],
    24: [(46, 50), (57, 59, 'F')],
    25: [(49, 50), (58, 59, 'F')],
    26: [(58, 58, 'F')],
}
# How far the far side moves (our columns) from each row on, and from which of his columns.
FAR_COL = 60
SHIFT = [(11, 1), (13, 2)]
# From the lash row down only the far lock moves (the cells it leaves are our face).
LOCK_FROM = 16
# His bangs show his brow between their strands from this row of his down to the lash row.
FILL_FROM = 13
# On her own face (the face shape 'aurelia', tools/refs/aurelia-face-from-ref.py) the hair is his, where he
# drew it: nothing moves (her face is his width), and the brown tip of the bang strand between his eyes is
# taken too (it lies beside her near eye, as he drew it).
HIS_ONLY = {(55, 16)}


def native(path):
    """His pixels: the median of each cell's inside, as an (H, W, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
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
    """Each of his cells as the nearest of his colours (KEY), and how far it was."""
    keys = list(KEY)
    pal = np.array([rgb(KEY[k]) for k in keys])
    d = np.abs(N[:, :, None, :] - pal[None, None]).max(3)
    idx = d.argmin(2)
    return np.array(keys)[idx], d.min(2)


def shift_at(y):
    s = 0
    for y0, v in SHIFT:
        if y >= y0:
            s = v
    return s


def build():
    N = native(REF)
    lab, dist = classify(N)
    rows = sorted(MASK)
    W = 72
    H = rows[-1] + 1
    hers = np.full((H, W), '.', dtype='<U1')  # his hair in his own places
    lock = np.zeros((H, W), bool)  # his far lock
    moved = np.full((H, W), '.', dtype='<U1')  # with the far side moved
    worst = 0
    for y in rows:
        for rg in MASK[y]:
            for x in range(rg[0], rg[1] + 1):
                ch = lab[y, x]
                if ch not in HAIR and not (ch in SKIN and FILL_FROM <= y < HIS_ANCHOR[1]):
                    continue
                worst = max(worst, int(dist[y, x]))
                hers[y, x] = ch
                lock[y, x] = len(rg) > 2
    exact = hers.copy()
    for x, y in sorted(HIS_ONLY):
        assert lab[y, x] in HAIR, (x, y)
        exact[y, x] = lab[y, x]
    for y in rows:
        s = shift_at(y)
        for x in range(W):
            ch = hers[y, x]
            if ch == '.':
                continue
            far = (x >= FAR_COL and y < LOCK_FROM) or lock[y, x]
            moved[y, x + (s if far else 0)] = ch
        if s and y < LOCK_FROM:
            # the cells the far side leaves: his own pixels just before it, repeated
            for k in range(s):
                if hers[y, FAR_COL - s + k] != '.':
                    moved[y, FAR_COL + k] = hers[y, FAR_COL - s + k]
    back, filled = fill_back(moved)
    exact_back, _ = fill_back(exact)
    return N, hers, moved, back, filled, worst, exact, exact_back


def fill_back(front):
    """The front with the skin between her bang strands filled: each such cell the nearest of her colours above it."""
    back = front.copy()
    back[np.isin(back, list(SKIN))] = '.'
    filled = np.zeros(back.shape, bool)
    for y in range(FILL_FROM, HIS_ANCHOR[1]):
        cols = np.nonzero(back[y] != '.')[0]
        for x in range(cols[0], cols[-1] + 1):
            if back[y, x] != '.':
                continue
            above = next((back[q, x] for q in range(y - 1, -1, -1) if back[q, x] not in ('.', LINE)), None)
            assert above, f'nothing above ({x}, {y})'
            back[y, x] = above
            filled[y, x] = True
    return back, filled


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    N, hers, front, back, filled, worst, exact, exact_back = build()
    # his own, where he drew it (her face): its box and pivot (his lash's first cell)
    ey, ex = np.nonzero(exact_back != '.')
    ey0, ey1, ex0, ex1 = ey.min(), ey.max() + 1, ex.min(), ex.max() + 1
    his_meta = {
        'pivot': [HIS_ANCHOR[0] - int(ex0), HIS_ANCHOR[1] - int(ey0)],
        'front': [''.join(r) for r in exact[ey0:ey1, ex0:ex1]],
        'back': [''.join(r) for r in exact_back[ey0:ey1, ex0:ex1]],
    }
    yy, xx = np.nonzero(back != '.')
    y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    front, back, filled, hers = front[y0:y1, x0:x1], back[y0:y1, x0:x1], filled[y0:y1, x0:x1], hers[y0:y1, x0:x1]
    ox, oy = int(x0) + DX, int(y0) + DY  # the box's top left in our frame
    used = sorted(set(back[back != '.'].tolist()) | set(front[front != '.'].tolist()), key=list(KEY).index)
    meta = {
        'source': REF,
        'origin': [ox, oy],
        'pivot': [ANCHOR[0] - ox, ANCHOR[1] - oy],
        'front': [''.join(r) for r in front],
        'back': [''.join(r) for r in back],
        'palette': {ch: KEY[ch] for ch in used},
        'line': LINE,
        'ornament': ''.join(ch for ch in ORNAMENT if ch in used),
        'skin': ''.join(ch for ch in SKIN if ch in used),
        'skinBase': KEY[SKIN_BASE],
        'hairBase': KEY[HAIR_BASE],
        'ornamentBase': KEY[ORNAMENT_BASE],
        'his': his_meta,
    }
    tmp = os.path.join(out, 'hair.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'hair.json'))
    if len(sys.argv) > 2:
        write_ts(meta, sys.argv[2])

    def rgba(grid, mark=None):
        im = np.zeros(grid.shape + (4,), np.uint8)
        for (j, i), ch in np.ndenumerate(grid):
            if ch != '.':
                im[j, i, :3] = rgb(KEY[ch])
                im[j, i, 3] = 255
                if mark is not None and mark[j, i] and (i + j) % 2:
                    im[j, i] = [0, 200, 255, 255]
        return im

    save(rgba(front), os.path.join(out, 'study', 'front@8.png'))
    save(rgba(back, filled), os.path.join(out, 'study', 'back@8.png'))
    save(N[y0:y1, x0:x1], os.path.join(out, 'study', 'hers@8.png'))
    print('front', int((front != '.').sum()), 'px; back', int((back != '.').sum()), 'px (', int(filled.sum()), 'filled );',
          len(used), 'colours; worst cell', worst, 'off its colour; origin', (ox, oy))


def write_ts(meta, path):
    """The hair as the game's module (src/sprite/items/aureliaHairArt.ts)."""
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    px, py = meta['pivot']
    out = [
        "// Aurelia's hair, the owner's pixels at our scale (tools/refs/aurelia-hair-from-ref.py from",
        '// docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** His colours, one character each (both parts share them). */',
        'const AURELIA_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    for part, name, doc in (
        ('front', 'AURELIA_HAIR_FRONT', "Every pixel of her hair: the bun and its ornament, the crown, the bangs, the near lock and the far lock. Its pivot is the cell on our face anchor (the near eye's first column, its lash row)."),
        ('back', 'AURELIA_HAIR_BACK', "The front with the skin between her bang strands filled, drawn behind the head; also her head's outline above the eyes."),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        out += [f"    '{rw}'," for rw in meta[part]]
        out += ['  ],', '  colors: AURELIA_HAIR_COLORS,', '};', '']
    hx, hy = meta['his']['pivot']
    for part, name, doc in (
        ('front', 'AURELIA_HAIR_FRONT_HIS', "On her own face (the face shape 'aurelia'): every pixel of her hair where he drew it, nothing moved for a wider face, with the bang tip beside her near eye. Its pivot is the cell on the face anchor."),
        ('back', 'AURELIA_HAIR_BACK_HIS', 'Her own front with the skin between her bang strands filled: drawn behind the head, and her head\'s outline above the eyes.'),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{hx}, {hy}],', '  rows: [']
        out += [f"    '{rw}'," for rw in meta['his'][part]]
        out += ['  ],', '  colors: AURELIA_HAIR_COLORS,', '};', '']
    out += [
        '/** His black line: kept as he drew it when the hair is recoloured. */',
        f"export const AURELIA_HAIR_LINE = '{meta['line']}';",
        '',
        "/** His golds (the ornament): they follow the ornament's colour slot. */",
        f"export const AURELIA_HAIR_ORNAMENT = '{meta['ornament']}';",
        '',
        "/** His brow's shaded skin between her bang strands: it follows the player's skin. */",
        f"export const AURELIA_HAIR_SKIN = '{meta['skin']}';",
        '',
        "/** His lit skin: the skin his brow's shade is measured from. */",
        f"export const AURELIA_SKIN_BASE = '{meta['skinBase']}';",
        '',
        "/** His mid blonde, the lit face of most of her strands: the hair colour slot's default; his other blondes and browns follow it. */",
        f"export const AURELIA_HAIR_BASE = '{meta['hairBase']}';",
        '',
        "/** His bright gold: the ornament colour slot's default; his other gold follows it. */",
        f"export const AURELIA_ORNAMENT_BASE = '{meta['ornamentBase']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
