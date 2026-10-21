"""The owner's eyes (docs/reference/aiden-owner-reference.jpg) as the 'valiant' eye shape.

His Aiden is our Aiden painted over in his own pixels (tools/refs/aiden_ref.py). He painted the eyes
one row lower than our template's and lidded them heavily: a short brown brow sits right on the lash
line, the lash line is a cold navy-black running the width of each eye (a grey fleck of white under
it on the near eye), and under it a single row: on the near eye a white, a dark red and a red; on
the far eye a greyer white, a dark red and the lash's outer corner. This script lifts both eyes out of
his pixels, cell by cell over our face template's eye cells (MAP), and writes them with the
template's letters, so the face, the eye options' code and Ocular Surge read them as they read ours:

  B  his brow: hair-coloured, as our brows are (his browns move the way his hair's mid brown does)
  L  his lash line          h  his shaded white       w  his white
  d  his dark iris          i  his red iris           (his iris moves the way our red eye colour,
                                                       the one he painted it over, does)
  o D s b l                 his skin there: no pixel of the eye; the face's own skin shows (his on
                            his head, our template's letter on ours)

and two lid states the game needs that his picture does not show, made of his own pixels:

  lowered  (reading) the lid comes down over the top of the eye: his grey fleck of white under the
           lash takes the lash's colour beside it, as our lowered lids cover the top row
  closed   (knocked out) the eye is shut: the lash line runs on across it in his lash colours, and the
           row under it is skin (the far eye keeps his line's outer corner)

and writes, in <out>:

  study/eyes@16.png   his eyes lifted out, open, lowered and closed, at 16x
  study/his@16.png    his face there, at 16x

and, with a third argument, the game's module (src/sprite/eyeArt.ts). The same picture always gives
the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/aiden-eyes-from-ref.py docs/reference/aiden-owner-reference.jpg <out> src/sprite/eyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np

import aiden_ref as R

# The eyes, cell by cell, in his pixels: our template's near eye (5 columns) and far eye (3 columns),
# three rows from the face anchor's row. On his head (the 'valiant' face shape) the near eye starts a
# column right of the anchor and the far eye 8 columns right of it: his near eye at x 49, his far at 56,
# both from row 19 (the row above his lash line).
NEAR_AT = (49, 19)
FAR_AT = (56, 19)
MAP = {
    'near': [
        'sBBBb',  # 19  his brow over the near eye: a reddish brown, a dark and a mid brown
        'LhLLL',  # 20  the lash line, a grey fleck of white under it
        'swdis',  # 21  the white, his dark red and his red; his cheek shadow at the inner corner
    ],
    'far': [
        'sBo',  # 19  his far brow, a dark brown between his temple and the face's line
        'LLL',  # 20  the lash line, out to the face's edge
        'hdL',  # 21  a greyer white, his dark red, the lash's outer corner
    ],
}
FEATURES = 'BLhwdi'
# The colours his eyes follow: his red iris was painted over our red eye colour (the tomoe red of
# Aiden's dojutsu, #d81b2a, which is also the creator's red swatch); his brows are in his hair's browns,
# whose mid brown (the lit face of most of his locks, the Valiant Spikes' colour) is #76391b.
IRIS = '#d81b2a'
BROW_HAIR = '#76391b'


def eyes(a):
    """Each eye's letters and his colours (None where his skin is), open."""
    out = {}
    for name, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
        rows = MAP[name]
        col = [[tuple(int(v) for v in a[y0 + r, x0 + c]) if ch in FEATURES else None for c, ch in enumerate(row)] for r, row in enumerate(rows)]
        out[name] = (list(rows), col)
    return out


def lidded(open_eyes, closed):
    """The lowered or closed lid, from his open eye: cells of the opening take his lash colour beside
    them (on the lash row) or the face's skin (under it)."""
    out = {}
    for name, (rows, col) in open_eyes.items():
        rows = [list(r) for r in rows]
        col = [list(r) for r in col]
        lash = 1
        for c, ch in enumerate(rows[lash]):
            if ch != 'L':
                # his lash colour from the nearest lash pixel beside it (left first)
                src = next(col[lash][q] for d in range(1, len(rows[lash])) for q in (c - d, c + d) if 0 <= q < len(rows[lash]) and rows[lash][q] == 'L')
                rows[lash][c] = 'L'
                col[lash][c] = src
        if closed:
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
        "// The owner's eyes, his pixels (tools/refs/aiden-eyes-from-ref.py from",
        '// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        '/** One of his eyes over our face template\'s eye cells (5 columns near, 3 far; rows from the face anchor\'s row). */',
        'export interface PaintedEye {',
        "  /** The template's letters: B brow, L lash, h/w white, d/i iris; o D s b l the face's own skin. */",
        '  letters: string[];',
        "  /** His pixels: one character per colour of his (VALIANT_EYE_COLORS); '.' where the face's skin shows. */",
        '  rows: string[];',
        '}',
        '',
        '/** His colours, one character each. */',
        'export const VALIANT_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in hexes.items()]
    out += ['};', '']
    docs = {
        'open': 'His eyes as he painted them: the brow on the row above the lash line, the white and red iris under it.',
        'lowered': 'Reading: the lid comes down over the top of the eye (his fleck of white under the lash takes the lash\'s colour).',
        'closed': 'Knocked out: the lash line runs on across the shut eye in his lash colours; under it the face\'s skin.',
    }
    out += ['/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            'export const VALIANT_EYES: Record<\'open\' | \'lowered\' | \'closed\', { near: PaintedEye; far: PaintedEye }> = {']
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** The eye colour he painted his red iris over (our red): the player's eye colour moves his iris as far. */",
            f"export const VALIANT_IRIS = '{IRIS}';", '',
            "/** His hair's mid brown, which his brows are painted in the browns of: the hair colour moves them as far. */",
            f"export const VALIANT_BROW_HAIR = '{BROW_HAIR}';", '']
    src = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(src)
    os.replace(tmp, path)


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native(ref)
    opened = eyes(a)
    states = {'open': opened, 'lowered': lidded(opened, False), 'closed': lidded(opened, True)}
    seen = palette(states.values())
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], states, seen)

    # The study: his face, and each state's eyes over a grey ground (white where the face's skin shows).
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
