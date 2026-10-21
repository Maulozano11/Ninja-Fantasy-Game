"""The owner's eyes from his Joven salvaje paint-over (docs/reference/joven-salvaje-owner-reference.jpg) as
the 'wild' eye shape ("Salvaje", provisional name).

The owner (2026-10-21): "en la referencia nueva de joven salvaje tambien copia los ojos como un nuevo tipo
de ojos". He painted them over our face template's eyes (tools/refs/youth_ref.py: our face anchor, the
near eye's lash start, is his pixel FACE_AT): a scowling brow in his hair's navy-black, slanting down
toward the nose over the near eye (two rows: the anchor's row and the one above), a lash line a row under
the anchor (as his Aiden eyes have it), and under it two rows of eye: on the near eye a shaded white, his
pink light on the iris, a dark red and his lash's corner, then a white, two reds and a white; on the far
eye a dark red and a greyer white over a red. The near eye's lash runs a column past the template's eye
cells on each side, so his pixels are laid from a column left of the template's eye and a row above it
(PaintedEye.at); the template's own cells take the letters below.

This script lifts both eyes out of his pixels, cell by cell (MAP), and writes them with these marks:

  B  his brow (follows the hair colour, as his Aiden brows do)
  L  his lash line and the dark corners of his eyes (stays as he painted it)
  h  his shaded white       w  his white
  d  his dark iris          i  his red iris and its pink light (they move the way our red eye colour, the
                               one he painted them over, does)
  o D s b l                  his skin there: no pixel of the eye; the face's own skin shows (these
                             letters, darkest to lightest, are his shading on our skin's tones)

and the two lid states the game needs, made of his own pixels:

  lowered  (reading) the lid comes down over the top row of the eye: each of its whites and irises
           takes his lash's colour above it; the bottom row (white, irises) shows under it
  closed   (knocked out) the eye is shut: his lash line over it, under it the face's skin

and writes the game's module (src/sprite/wildEyeArt.ts) and, with a second argument, study pictures of
his eyes and the lifted states at 16x. The same picture always gives the same bytes. Run from the repo
root with python3 -I:

  python3 -I tools/refs/youth-eyes-from-ref.py src/sprite/wildEyeArt.ts [study dir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import youth_ref as Y  # noqa: E402

# Our face anchor (the near eye's template cells start here) in his pixels, and where the far eye's
# cells start (9 columns on, as on our face template).
FACE_AT = Y.face_anchor()
NEAR_AT = FACE_AT
FAR_AT = (FACE_AT[0] + 9, FACE_AT[1])
# Each eye's block of his pixels starts a column left and a row above its template cells.
AT = (-1, -1)
# His eyes, cell by cell from the block's corner: the near eye 7 columns (x 47-53), the far eye 4 (x
# 56-59, the last the face's edge: the face's own), five rows (22-26). Marks as in the docstring; the skin letters are his shading there.
MAP = {
    'near': [
        'BBBBsls',  # 22  his brow; his forehead
        'lsDBBBl',  # 23  his lid's crease, his brow running down toward the nose
        'LLLLLLL',  # 24  his lash line
        'LhhidLs',  # 25  his lash's outer corner, shaded whites, his pink light, a dark red, the inner corner
        'lDwiiwl',  # 26  the shadow under his lid, white, red, red, white
    ],
    'far': [
        'ssbo',  # 22  his temple (the strand of hair above is his hair's); the face's edge
        'sBBo',  # 23  his brow
        'LLLo',  # 24  his lash line
        'Ldho',  # 25  the inner corner, a dark red, a greyer white
        'liso',  # 26  his red under it
    ],
}
FEATURES = 'BLhwdi'
SKIN = 'oDsbl'
# The colour his iris follows: he painted it over our red eye colour (#d81b2a, Solen's, the eye colour of
# the sprite he painted over).
IRIS = '#d81b2a'


def lifted(a):
    """Each eye's marks and his colours (None where his skin is), open."""
    out = {}
    for name, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
        bx, by = x0 + AT[0], y0 + AT[1]
        rows = MAP[name]
        col = [[tuple(int(v) for v in a[by + r, bx + c]) if ch in FEATURES else None for c, ch in enumerate(row)] for r, row in enumerate(rows)]
        out[name] = ([list(r) for r in rows], col)
    return out


def lowered(eyes):
    """Reading: the eye's top row (the one under the lash) takes the lash's colours above it."""
    out = {}
    for name, (marks, col) in eyes.items():
        marks = [list(r) for r in marks]
        col = [list(r) for r in col]
        for c, ch in enumerate(marks[3]):
            if ch in 'hwdi':
                marks[3][c] = 'L'
                col[3][c] = col[2][c]
        out[name] = (marks, col)
    return out


def closed(eyes):
    """Knocked out: under his lash line, the whites and irises become the face's skin (his shading there:
    the row under the lash the skin's base, the row under that its light)."""
    out = {}
    for name, (marks, col) in eyes.items():
        marks = [list(r) for r in marks]
        col = [list(r) for r in col]
        for r, under in ((3, 'b'), (4, 'l')):
            for c, ch in enumerate(marks[r]):
                if ch in 'hwdi':
                    marks[r][c] = under
                    col[r][c] = None
        out[name] = (marks, col)
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


def letters(marks, name):
    """The template's own cells (the near eye's 5 columns, the far eye's 3, from the anchor's row down):
    what the face template draws there under his pixels."""
    w = 5 if name == 'near' else 3
    return [''.join(r[-AT[0]:-AT[0] + w]) for r in marks[-AT[1]:]]


def write_ts(path, states, seen):
    hexes = {k: '#%02x%02x%02x' % ref for k, ref in seen}
    out = [
        "// The owner's Joven salvaje eyes, his pixels (tools/refs/youth-eyes-from-ref.py from",
        f'// {Y.REF}). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/**',
        " * One of his eyes whose pixels reach past the face template's eye cells: `rows` (his pixels) and `marks`",
        " * (what each is: B brow, L lash, h/w white, d/i iris, o D s b l the face's skin) start `at` columns and",
        " * rows from the template's eye cells; `letters` are the template's own cells, as on PaintedEye.",
        ' */',
        'export interface WideEye extends PaintedEye {',
        '  at: [number, number];',
        '  marks: string[];',
        '}',
        '',
        '/** His colours, one character each. */',
        'export const WILD_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in hexes.items()]
    out += ['};', '']
    docs = {
        'open': 'His eyes as he painted them: the brow over the anchor\'s row, the lash line under it, two rows of white and iris.',
        'lowered': "Reading: the lid over the eye's top row (his lash's colours); the bottom row shows under it.",
        'closed': "Knocked out: his lash line over the shut eye; under it the face's skin.",
    }
    out += ['/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const WILD_EYES: Record<'open' | 'lowered' | 'closed', { near: WideEye; far: WideEye }> = {"]
    for state, eyes in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            marks, col = eyes[name]
            m = [''.join(r) for r in marks]
            out += [f'    {name}: {{',
                    f'      letters: [{", ".join(repr(r) for r in letters(marks, name))}],',
                    f'      at: [{AT[0]}, {AT[1]}],',
                    f'      marks: [{", ".join(repr(r) for r in m)}],',
                    f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** The eye colour he painted his red iris over (our red): the player's eye colour moves his iris as far. */",
            f"export const WILD_IRIS = '{IRIS}';", '']
    Y.write(path, '\n'.join(out))


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study_dir = sys.argv[2] if len(sys.argv) > 2 else None
    a = Y.native()
    opened = lifted(a)
    states = {'open': opened, 'lowered': lowered(opened), 'closed': closed(opened)}
    seen = palette(states.values())
    if out_ts:
        write_ts(out_ts, states, seen)
    if study_dir:
        os.makedirs(study_dir, exist_ok=True)
        x0, y0 = NEAR_AT[0] + AT[0] - 2, NEAR_AT[1] + AT[1] - 2
        w, h = FAR_AT[0] - NEAR_AT[0] + 7, 9
        Y.save(a[y0:y0 + h, x0:x0 + w], os.path.join(study_dir, 'wild-eyes-his@16.png'), k=16)
        sheet = np.full((h * 3 + 2, w, 3), 200, np.int32)
        for k, eyes in enumerate(states.values()):
            for name, (ex, ey) in (('near', NEAR_AT), ('far', FAR_AT)):
                _marks, col = eyes[name]
                for r, row in enumerate(col):
                    for c, px in enumerate(row):
                        sheet[k * (h + 1) + 2 + r, ex + AT[0] - x0 + c] = px if px is not None else (255, 255, 255)
        Y.save(sheet, os.path.join(study_dir, 'wild-eyes@16.png'), k=16)
    print(len(seen), 'colours:', ' '.join('%s=#%02x%02x%02x' % ((k,) + ref) for k, ref in seen))


if __name__ == '__main__':
    main()
