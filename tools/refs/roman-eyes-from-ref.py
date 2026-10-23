"""The owner's eyes from his Roman paint-over (docs/reference/roman-owner-reference.jpg) as the 'roman' eye shape.

The owner asked for his face on 2026-10-21 ("copia la cara"); his eyes are its eye option, as Aiden's
are the 'valiant' eyes (tools/refs/aiden-eyes-from-ref.py). He painted them under a heavy black line that
is brow and lash in one, the width of each eye; under it a single row: on the near eye a white, his red
and a dark red between his cheek's shadows, on the far eye a greyer white, a dark red and his face's
black line. They sit where the 'valiant' eyes sit on our face template (the line a row under the
template's lash row, the iris on the template's iris row), so they fit every face shape; on his head
(the 'roman' face shape, tools/refs/roman-head-from-ref.py, moved down HEAD_UP rows) they land on his
own pixels. This script lifts both eyes out of his pixels, cell by cell over our face template's eye
cells (MAP), and writes them with the template's letters:

  L  his brow-and-lash line   h  his shaded white     w  his white
  d  his dark iris            i  his red iris         (his iris moves the way our red eye colour, the
                                                       one he painted it over, does)
  o D s b l                   his skin there: no pixel of the eye; the face's own skin shows (his on
                              his head, our template's letter on ours)

and the two lid states the game needs, made of his own pixels as the 'valiant' eyes' are:

  lowered  (reading) the lid over the top of the eye: his line already runs the whole width of each
           eye, so it is his open eye
  closed   (knocked out) the eye is shut: under his line the face's skin (the far eye keeps his line's
           outer corner)

and writes, in <out>:

  study/eyes@16.png   his eyes lifted out, open, lowered and closed, at 16x
  study/his@16.png    his face there, at 16x

and, with a third argument, the game's module (src/sprite/romanEyeArt.ts). The same picture always gives
the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/roman-eyes-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/romanEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import roman_ref as R  # noqa: E402

# The eyes, cell by cell, in his pixels: our template's near eye (5 columns) and far eye (3 columns),
# three rows from the face anchor's row. On his head the anchor is at (49, 16) in his pixels (the head
# moved down 3 rows, roman-head-from-ref.py): the near eye starts a column right of it, the far eye 8.
NEAR_AT = (50, 16)
FAR_AT = (57, 16)
MAP = {
    'near': [
        'sbbbb',  # 16  his forehead under the hair: the face's skin
        'LLLLL',  # 17  his brow-and-lash line
        'swids',  # 18  his cheek's shadow, the white, his red and dark red, his cheek's shadow
    ],
    'far': [
        'bbo',  # 16  the face's skin, out to its line
        'LLL',  # 17  his brow-and-lash line, out to the face's edge
        'hdL',  # 18  a greyer white, his dark red, his face's line
    ],
}
FEATURES = 'Lhwdi'
# The colour his iris follows: he painted it over our red eye colour (#d81b2a, the creator's red swatch,
# the eye colour of the sprite he painted over).
IRIS = '#d81b2a'


def eyes(a):
    """Each eye's letters and his colours (None where his skin is), open."""
    out = {}
    for name, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
        rows = MAP[name]
        col = [[tuple(int(v) for v in a[y0 + r, x0 + c]) if ch in FEATURES else None for c, ch in enumerate(row)] for r, row in enumerate(rows)]
        out[name] = (list(rows), col)
    return out


def closed(open_eyes):
    """The shut eye: under his line, the whites and irises become the face's skin."""
    out = {}
    for name, (rows, col) in open_eyes.items():
        rows = [list(r) for r in rows]
        col = [list(r) for r in col]
        for c, ch in enumerate(rows[2]):
            if ch in 'hwdi':
                rows[2][c] = 'b'
                col[2][c] = None
        out[name] = ([''.join(r) for r in rows], col)
    return out


def palette(states):
    """One character per colour of his (colours within 3 share one, as aiden_ref.pack does)."""
    chars = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    seen = []
    for state in states:
        for name in ('near', 'far'):
            for row in state[name][1]:
                for c in row:
                    if c is not None and not any(max(abs(c[i] - ref[i]) for i in range(3)) <= 3 for _, ref in seen):
                        seen.append((chars[len(seen)], c))
    return seen


def encode(col, seen):
    def ch(c):
        if c is None:
            return '.'
        return next(k for k, ref in seen if max(abs(c[i] - ref[i]) for i in range(3)) <= 3)

    return [''.join(ch(c) for c in row) for row in col]


def write_ts(path, states, seen):
    hexes = {k: '#%02x%02x%02x' % ref for k, ref in seen}
    out = [
        "// The owner's Roman eyes, his pixels (tools/refs/roman-eyes-from-ref.py from",
        '// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** His colours, one character each. */',
        'export const ROMAN_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in hexes.items()]
    out += ['};', '']
    docs = {
        'open': 'His eyes as he painted them: the brow-and-lash line on the row under the anchor, the white and the irises under it.',
        'lowered': 'Reading: his line already runs the width of each eye, so the lowered lid is his open eye.',
        'closed': "Knocked out: his line over the shut eye; under it the face's skin.",
    }
    out += ['/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const ROMAN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** The eye colour he painted his red iris over (our red): the player's eye colour moves his iris as far. */",
            f"export const ROMAN_IRIS = '{IRIS}';", '']
    R.write(path, '\n'.join(out))


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native(ref)
    opened = eyes(a)
    states = {'open': opened, 'lowered': opened, 'closed': closed(opened)}
    seen = palette(states.values())
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], states, seen)

    box = (slice(NEAR_AT[1] - 3, NEAR_AT[1] + 6), slice(NEAR_AT[0] - 3, FAR_AT[0] + 6))
    R.save(a[box], os.path.join(out, 'study', 'his@16.png'), k=16)
    h, w = 9, FAR_AT[0] - NEAR_AT[0] + 9
    sheet = np.full((h * 3 + 2, w, 3), 200, np.int32)
    for k, eyes_ in enumerate(states.values()):
        for name, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
            rows, col = eyes_[name]
            for r, row in enumerate(col):
                for c, px in enumerate(row):
                    sheet[k * (h + 1) + 3 + r, x0 - NEAR_AT[0] + 3 + c] = px if px is not None else (255, 255, 255)
    R.save(sheet, os.path.join(out, 'study', 'eyes@16.png'), k=16)
    print(len(seen), 'colours:', ' '.join('%s=#%02x%02x%02x' % ((k,) + ref) for k, ref in seen))


if __name__ == '__main__':
    main()
