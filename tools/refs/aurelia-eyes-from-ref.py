"""Aurelia's eyes (docs/reference/aurelia-owner-reference.jpg) as the 'dawn' eye shape.

The owner's Aurelia (tools/refs/heroine_ref.py: 200 x 200 of his pixels, 9.66 picture pixels each)
is drawn at about twice our scale, so her eyes are not copied pixel for pixel as Aiden's were
(tools/refs/aiden-eyes-from-ref.py): each cell of our face template's eye cells (5 columns near, 3
far; three rows from the face anchor's row, the lash row) takes one of her pixels, the one that
stands for what that cell shows at our scale (MAP). Every pixel is hers, in her picture's colours
(heroine_ref.PALETTES['aurelia']); nothing is blended or redrawn.

Her near eye is 8 of her pixels wide and 5 tall (x 102-109, y 25-29): a thick navy-black lash two
rows deep that ends in a dark brown tip at the inner corner and runs down at the outer corner; under
it a pure white at the outer side, a mid blue iris with a white glint, a navy pupil, a light blue
at its inner side, a cyan lower half, a grey-shaded white under the outer corner and a pale cream at
the inner one. Her far eye (x 114-117) is the same eye turned away: a light blue and a mid blue
iris against a lash that runs down its outer side to the face's edge. At our scale (her 5 rows are
our 3, her 8 columns our 5) the near eye keeps the lash row with its brown tip, then the lash's
outer tail, the white, the blue, the pupil and the light blue, then the shaded white, the cyan
twice and the cream; the glint is one of her pixels too many (on her blue it would read as a white
eye). The far eye keeps her lash, her light blue over her mid blue and the lash's outer side.

The cells carry the template's letters, so the face, the eye options' code and Ocular Surge read
them as they read ours:

  L  her lash (and its brown tip)     h  her shaded white and cream    w  her white
  d  her mid blue and pupil           i  her light blue and cyan       (her iris moves the way the
                                                                        eye colour moves her mid
                                                                        blue, IRIS)
  o D s b l   the face's own skin there (no pixel of hers)

and two lid states the game needs that her picture does not show, made of her own pixels:

  lowered  (reading) the lid comes down over the top of the eye: her lash row moves down a row, the
           face's skin over it, the eye's lower row (her shaded white, cyan and cream) under it
  closed   (knocked out) the eye is shut: her lash row across the middle, the face's skin above and
           under it

Her brows are thin and brown, two rows over the lash under her bangs, as ours are: the face draws
our hair-coloured brows over her eyes. It writes, in <out>:

  study/eyes@16.png   her eyes at our scale, open, lowered and closed, at 16x (white where the
                      face's skin shows)
  study/hers@16.png   her eyes in her pixels, at 16x

and, with a second argument, the game's module (src/sprite/aureliaEyeArt.ts). The same picture always
gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/aurelia-eyes-from-ref.py <out> src/sprite/aureliaEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_ref as R  # noqa: E402

WHICH = 'aurelia'
# Each cell of our eye cells: (letter, her pixel (x, y)) or a skin letter alone (the face shows).
MAP = {
    'near': [
        # the lash row: her lash's second row (the thicker), out to its dark brown tip at the inner corner
        [('L', (102, 26)), ('L', (104, 26)), ('L', (105, 26)), ('L', (107, 26)), ('L', (109, 26))],
        # the lash's outer tail, her white, her mid blue, her navy pupil, her light blue
        [('L', (103, 27)), ('w', (104, 27)), ('d', (105, 27)), ('d', (107, 27)), ('i', (108, 27))],
        # the cheek under the outer corner, her shaded white, her cyan twice, her cream at the inner corner
        ['s', ('h', (104, 29)), ('i', (106, 29)), ('i', (107, 29)), ('h', (108, 29))],
    ],
    'far': [
        # her lash out to the face's edge (the template's outline)
        [('L', (115, 26)), ('L', (116, 26)), 'o'],
        # her light blue, the lash running down the eye's outer side
        [('i', (114, 28)), ('L', (116, 27)), 'o'],
        # her mid blue, the lash
        [('d', (115, 29)), ('L', (116, 29)), 'o'],
    ],
}
# The colour her iris follows: her mid blue (the iris's main colour, the one round her glint). A
# player who picks it keeps her pixels exactly; another eye colour moves them as far.
IRIS = '#226ba3'
# The face's skin under the lowered and closed lids (our CLOSED_EYES and lowered rows).
SKIN_ROWS = {'near': ('bbbbb', 'sbbbl'), 'far': ('bbo', 'bbo')}


def hers():
    """Her pixels as her picture's colours (hex), (H, W)."""
    N = R.native(WHICH)
    q = R.quantize(N, WHICH)
    pal = R.PALETTES[WHICH]
    return np.vectorize(lambda i: pal[i])(q)


def eyes(hexes):
    """Each eye open: (letters rows, colour rows with None where the face's skin shows)."""
    out = {}
    for name, rows in MAP.items():
        letters, cols = [], []
        for row in rows:
            letters.append(''.join(c if isinstance(c, str) else c[0] for c in row))
            cols.append([None if isinstance(c, str) else str(hexes[c[1][1], c[1][0]]) for c in row])
        out[name] = (letters, cols)
    return out


def lidded(open_eyes, closed):
    """The lowered or closed lid, from her open eye: her lash row moves down a row; over it the face's
    skin, under it the eye's lower row (lowered) or the face's skin (closed)."""
    out = {}
    for name, (letters, cols) in open_eyes.items():
        top, bottom = SKIN_ROWS[name]
        n = len(letters[0])
        rows_l = [top, letters[0], bottom if closed else letters[2]]
        rows_c = [[None] * n, cols[0], [None] * n if closed else cols[2]]
        out[name] = (rows_l, rows_c)
    return out


def palette(states):
    """One character per colour of hers the eyes use, in her palette's order (darkest first)."""
    used = {c for st in states for name in ('near', 'far') for row in st[name][1] for c in row if c}
    chars = 'abcdefghijklmnopqrstuvwxyz'
    return {h: chars[k] for k, h in enumerate(h for h in R.PALETTES[WHICH] if h in used)}


def encode(cols, pal):
    return [''.join('.' if c is None else pal[c] for c in row) for row in cols]


def write_ts(path, states, pal):
    out = [
        "// Aurelia's eyes, the owner's pixels brought down to our scale (tools/refs/aurelia-eyes-from-ref.py",
        '// from docs/reference/aurelia-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** Her colours, one character each. */',
        'export const DAWN_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{h}'," for h, k in pal.items()]
    out += ['};', '']
    docs = {
        'open': 'Her eyes at our scale: the lash row with its brown inner tip; her white, blue, pupil and light blue; her shaded white, cyan and cream.',
        'lowered': 'Reading: her lash comes down a row over the eye; under it the eye\'s lower row.',
        'closed': 'Knocked out: her lash across the shut eye, the face\'s skin above and under it.',
    }
    out += ['/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template\'s own eye cells and rows. */',
            'export const DAWN_EYES: Record<\'open\' | \'lowered\' | \'closed\', { near: PaintedEye; far: PaintedEye }> = {']
    for state, st in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            letters, cols = st[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in letters)}],',
                    f'      rows: [{", ".join(repr(r) for r in encode(cols, pal))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** Her mid blue, the colour her iris follows: the player's eye colour moves her iris as far. */",
            f"export const DAWN_IRIS = '{IRIS}';", '']
    src = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(src)
    os.replace(tmp, path)


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    hexes = hers()
    opened = eyes(hexes)
    states = {'open': opened, 'lowered': lidded(opened, False), 'closed': lidded(opened, True)}
    pal = palette(states.values())
    if len(sys.argv) > 2:
        write_ts(sys.argv[2], states, pal)

    # The study: her eyes in her pixels, and each state at our scale (the far eye 9 columns right of
    # the near one's first, as on our face) over white where the face's skin shows.
    N = R.native(WHICH)
    R.save(N[22:32, 99:121], os.path.join(out, 'study', 'hers@16.png'), k=16)
    w, h = 12, 3
    sheet = np.full((h * 3 + 4, w + 2, 3), 200, np.int32)
    for k, st in enumerate(states.values()):
        for name, x0 in (('near', 0), ('far', 9)):
            for r, row in enumerate(st[name][1]):
                for c, px in enumerate(row):
                    sheet[1 + k * (h + 1) + r, 1 + x0 + c] = rgb(px) if px else (255, 255, 255)
    R.save(sheet, os.path.join(out, 'study', 'eyes@16.png'), k=16)
    print(len(pal), 'colours:', ' '.join(f'{k}={h}' for h, k in pal.items()))


if __name__ == '__main__':
    main()
