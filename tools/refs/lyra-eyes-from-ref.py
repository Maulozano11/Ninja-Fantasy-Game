"""The owner's Lyra's eyes (docs/reference/lyra-owner-reference.jpg) as the 'keen' eye shape.

Her picture is his own pixel art at about 1.8 of her pixels to one of ours across the head
(tools/refs/heroine_ref.py: the head comes down by 0.56 across and 0.51 down), so her eyes are not
lifted 1:1 as Aiden's were. They are brought down cell by cell: each of our face template's eye cells
takes the colour of ONE of her pixels in the block it covers (SRC), picked where the block's most
common colour would lose what reads at our size (her iris's lit green under the dark top, the white
of her far eye, her lash's black over its navy). So every pixel is one of her colours (her palette,
heroine_ref.PALETTES['lyra']), nothing is blended, and her eyes keep their shape:

  her near eye (her x 94-103, rows 24-32): a long thin brow, dark red-brown, from under her bangs down
  to the right, past the eye's inner corner to the lash's level (determined); a thick lash, black over
  navy, two of her rows, running down the outer corner and turning down in a black dot at the inner
  one; under it a mint-shaded white over a white, and a big iris (four of her pixels) dark teal at the
  top, bright and light green below
  her far eye (x 108-111), right at her face's edge: a short brow low over it, the lash, a fleck of
  white, the iris's green, the lash's navy down its outer side

Our cells: the near eye's five columns from the template's near-eye column (ex) and the far eye's
three from fx, three rows from the lash row (ny), as the template's; the brows above them. Across,
her near eye's columns 94-96 (outer corner and lash) make our first, 97 (white) the second, 98-99 and
100-101 (her iris) the third and fourth, 102-103 (inner corner) the fifth; her far eye's 109, 110 and
111 the far eye's three. Down, her rows 27-28 (lash) make our lash row, 29-30 and 31-32 the next two,
23-24 and 25-26 the two above (the brows). The cells are written with the template's letters, so the
face, the eye options' code and Ocular Surge read them as they read ours:

  B  her brow: hair-coloured, as our brows are (her reds move the way her hair's mid red does)
  L  her lash           h  her mint-shaded white     w  her white (and her far eye's fleck)
  d  her dark iris      i  her lit iris               (her iris moves the way her green does: the
                                                        player's eye colour; h follows it too, as our
                                                        shaded white takes the iris's tint)
  o D s b l             her skin there: no pixel of the eye; the face's own skin shows

and two lid states the game needs that her picture does not show, made of her own pixels:

  lowered  (reading) the lash comes down a row over the eye, the lid's skin above it; under it the
           eye's lower row as under her open lash
  closed   (knocked out) the lash line comes down a row across the shut eye; skin above and under it

Her brows stay where they are in all three.

It writes, in <out>:

  eyes@16.png   her eyes brought down, open, lowered and closed, at 16x (grey where the face's skin shows)
  hers@16.png   her own pixels there (her near eye x 92-112, rows 22-35), at 16x, in her colours

and, with a third argument, the game's module (src/sprite/lyraEyeArt.ts). The same picture always
gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/lyra-eyes-from-ref.py docs/reference/lyra-owner-reference.jpg <out> src/sprite/lyraEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_ref as H  # noqa: E402

WHICH = 'lyra'

# Each eye, cell by cell: the template's letter and the pixel of hers (x, y) whose colour it takes;
# None where her skin is (the face's own skin shows). Rows from the lash row, columns from the eye's
# first cell.
NEAR = [
    # her rows 27-28: the lash, black on top of navy; its inner end (her 101-103) fades into her skin
    [('L', (95, 28)), ('L', (97, 27)), ('L', (98, 28)), ('L', (100, 28)), ('b', None)],
    # her rows 29-30: the lash down the outer corner, her mint-shaded white, the iris's dark teal top,
    # and the lash's inner end, a black dot where it turns down at the inner corner
    [('L', (95, 29)), ('h', (96, 29)), ('d', (98, 29)), ('d', (101, 29)), ('L', (102, 29))],
    # her rows 31-32: her skin's shade at the outer corner, her white, the iris's bright and light green
    [('s', None), ('w', (97, 31)), ('i', (99, 31)), ('i', (101, 31)), ('l', None)],
]
FAR = [
    # her rows 27-28: the lash, its inner end in her red-brown
    [('L', (109, 28)), ('L', (110, 28)), ('L', (111, 28))],
    # her rows 29-30: the fleck of white under the lash, the lash's navy down the outer side
    [('w', (109, 30)), ('L', (110, 30)), ('L', (111, 30))],
    # her rows 31-32: the iris's green; the navy; her face's edge (the face's own outline there)
    [('i', (109, 32)), ('L', (110, 31)), ('o', None)],
]
# Her brows, from (columns, rows) off the eye's first cell and lash row: the near one from under her
# bangs (her x 95-99, row 24) two rows over the lash, down past the inner corner (her 99-103, rows
# 25-26) to a row over it; the far one short and low, a row over the lash (her 110-111, rows 25-26).
# Her near brow's last two pixels (her 103-104, row 27), at the lash's level past the inner corner,
# are left out: at our size they join the lash and read as a longer lash, not as the brow's end.
BROWS = {
    'near': ((0, -2), [
        [(95, 24), (97, 24), (99, 24), None, None],
        [None, None, None, (100, 25), (102, 26)],
    ]),
    'far': ((1, -1), [
        [(110, 26), (111, 26)],
    ]),
}
FEATURES = 'BLhwdi'
SKIN = 'oDsbl'
# The colours her eye and brows follow: her lit iris green (the iris's bright pixel, her (99, 31);
# the eye colour of her preset), and her hair's mid red (the lit face of most of her locks).
IRIS = '#4eb570'
BROW_HAIR = '#a6442d'


def her_colours():
    """Her pixels in her own colours: each native pixel's nearest colour of her palette, as hex."""
    N = H.native(WHICH)
    q = H.quantize(N, WHICH)
    P = H.PALETTES[WHICH]
    return lambda xy: P[int(q[xy[1], xy[0]])]


def eyes(col_of):
    """Each eye's letters and her colours (None where her skin is), open."""
    out = {}
    for name, cells in (('near', NEAR), ('far', FAR)):
        rows = [''.join(ch for ch, _ in row) for row in cells]
        col = [[col_of(xy) if xy is not None else None for _, xy in row] for row in cells]
        for r, row in enumerate(cells):
            for ch, xy in row:
                assert (ch in FEATURES) == (xy is not None), (name, r, ch)
        out[name] = (rows, col)
    return out


def lidded(open_eyes, closed):
    """The lowered or closed lid, from her open eye: the lash row comes down a row (taking her lash's
    colours there), the row it leaves is the lid's skin; lowered keeps the eye's lower row under it,
    closed makes it skin. Cells that are her face's edge (o) stay as they are."""
    out = {}
    for name, (rows0, col0) in open_eyes.items():
        rows = [list(r) for r in rows0]
        col = [list(r) for r in col0]
        for c in range(len(rows0[0])):
            if rows0[0][c] == 'o':
                continue
            rows[0][c], col[0][c] = 'b', None
            if rows0[1][c] != 'o':
                rows[1][c], col[1][c] = rows0[0][c], col0[0][c]
            if closed and rows0[2][c] in FEATURES:
                rows[2][c], col[2][c] = 'b', None
        out[name] = ([''.join(r) for r in rows], col)
    return out


def brows(col_of):
    return {name: (at, [[col_of(xy) if xy is not None else None for xy in row] for row in cells]) for name, (at, cells) in BROWS.items()}


def palette(states, brow):
    """One character per colour of hers, in order of first use."""
    chars = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    seen = []

    def add(c):
        if c is not None and c not in [h for _, h in seen]:
            seen.append((chars[len(seen)], c))

    for state in states:
        for name in ('near', 'far'):
            for row in state[name][1]:
                for c in row:
                    add(c)
    for name in ('near', 'far'):
        for row in brow[name][1]:
            for c in row:
                add(c)
    return seen


def encode(col, seen):
    key = {h: k for k, h in seen}
    return [''.join(key[c] if c is not None else '.' for c in row) for row in col]


def write_ts(path, states, brow, seen):
    out = [
        "// The owner's Lyra's eyes, her colours (tools/refs/lyra-eyes-from-ref.py from",
        '// docs/reference/lyra-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** Her colours, one character each. */',
        'export const KEEN_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in seen]
    out += ['};', '']
    docs = {
        'open': 'Her eyes at our scale: the lash black over navy, down the outer corner and turning down at the inner one, her mint-shaded white and white, the iris dark teal over bright and light green; the far eye\'s fleck of white over its green.',
        'lowered': 'Reading: her lash comes down a row over the eye; under it the eye\'s lower row.',
        'closed': 'Knocked out: her lash comes down a row across the shut eye; skin above and under it.',
    }
    out += ['/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template\'s own eye cells and rows. */',
            "export const KEEN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** Her brows, in her hair's reds: from `at` (columns, rows) off each eye's first cell and the lash row, her pixels ('.' none). */",
            "export const KEEN_BROWS: Record<'near' | 'far', { at: readonly [number, number]; rows: string[] }> = {"]
    for name in ('near', 'far'):
        at, col = brow[name]
        out += [f'  {name}: {{ at: [{at[0]}, {at[1]}], rows: [{", ".join(repr(r) for r in encode(col, seen))}] }},']
    out += ['};', '',
            "/** Her lit iris green, the colour her iris follows: the player's eye colour moves her iris as far. */",
            f"export const KEEN_IRIS = '{IRIS}';", '',
            "/** Her hair's mid red, which her brows are drawn in the reds of: the hair colour moves them as far. */",
            f"export const KEEN_BROW_HAIR = '{BROW_HAIR}';", '']
    src = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(src)
    os.replace(tmp, path)


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def main():
    ref, out = sys.argv[1], sys.argv[2]
    assert os.path.abspath(ref) == os.path.abspath(H.REFS[WHICH]), 'expects ' + H.REFS[WHICH]
    os.makedirs(out, exist_ok=True)
    col_of = her_colours()
    opened = eyes(col_of)
    states = {'open': opened, 'lowered': lidded(opened, False), 'closed': lidded(opened, True)}
    brow = brows(col_of)
    seen = palette(states.values(), brow)
    assert all(h in H.PALETTES[WHICH] for _, h in seen)
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], states, brow, seen)

    # The study: each state's eyes and brows over a grey ground (lighter grey where the face's skin
    # shows), the near eye from column 2, the far one 9 columns on (as on our template); and her
    # own pixels there.
    h, w = 7, 16
    sheet = np.full((h * 3 + 2, w, 3), 120, np.int32)
    for k, eyes_ in enumerate(states.values()):
        top = k * (h + 1) + 2
        for name, x0 in (('near', 2), ('far', 11)):
            rows, col = eyes_[name]
            for r, row in enumerate(col):
                for c, px in enumerate(row):
                    sheet[top + r, x0 + c] = hexrgb(px) if px is not None else (200, 200, 200)
            (dx, dy), bcol = brow[name]
            for r, row in enumerate(bcol):
                for c, px in enumerate(row):
                    if px is not None:
                        sheet[top + dy + r, x0 + dx + c] = hexrgb(px)
    H.save(sheet, os.path.join(out, 'eyes@16.png'), k=16)
    P = H.rgb(WHICH)
    q = H.quantize(H.native(WHICH), WHICH)
    H.save(P[q[22:36, 92:113]], os.path.join(out, 'hers@16.png'), k=16)
    print(len(seen), 'colours:', ' '.join(f'{k}={v}' for k, v in seen))


if __name__ == '__main__':
    main()
