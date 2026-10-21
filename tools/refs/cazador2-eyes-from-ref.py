"""The owner's Cazador 2 eyes (docs/reference/cazador2-owner-reference.jpg) as the 'huntress' eye shape.

His picture is our second Hunter-nin painted over in his own pixels (tools/refs/cazador2_ref.py). Her eyes sit
on our template's eye rows: a navy-black lash line across the near eye on the face anchor's row, under it a
dark red corner, a white and her dark grey-green iris, and under that her light grey-green iris over the top
of her mask; the far eye, against her far cheek, a dark red corner, a dark iris and a grey white, her light
iris under it. This script lifts both eyes out of his pixels, cell by cell over our face template's eye cells
(MAP), and writes them with the template's letters, so the face and the eye options' code read them as they
read ours:

  L  her lash line and dark red corners    h  her grey white    w  her white
  d  her dark iris                         i  her light iris    (her iris moves the way the eye colour
                                                                  moves the light grey-green she has)
  o D s b l                                her skin there: no pixel of the eye; the face's own skin shows
                                           (hers on her head, our template's letter on ours)

and two lid states the game needs that his picture does not show, made of her own pixels:

  lowered  (reading) the lid comes down a row: her lash line moves down over the white and the dark iris
           (the far eye's dark red corner stays), skin above it, her light iris under it
  closed   (knocked out) as lowered, and the row under the lash is skin

Her near eye is on the face anchor (cazador2_ref.FACE); her far eye starts 8 columns right of it (on her
head, the 'huntress' face shape; our faces put it 9 columns right, as they put every far eye). It writes
src/sprite/huntressEyeArt.ts and, in <study>, her eyes in each state at 16x beside her face. The same picture
always gives the same bytes:

  python3 -I tools/refs/cazador2-eyes-from-ref.py src/sprite/huntressEyeArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import cazador2_ref as C  # noqa: E402

NEAR_AT = C.FACE
FAR_AT = (C.FACE[0] + 8, C.FACE[1])
MAP = {
    'near': [
        'LLLLL',  # 18  the lash line
        'sLwdd',  # 19  her cheek, the dark red corner, the white, her dark iris
        'sbbii',  # 20  under it her skin and her light iris (the mask's edge covers the first cell)
    ],
    'far': [
        'sLL',  # 18  her cheek, the lash line (under her hair at rest)
        'Ldh',  # 19  the dark red corner, her dark iris, a grey white
        'sio',  # 20  her light iris between her skin and the face's edge
    ],
}
FEATURES = 'Lhwdi'
# Her light iris, the colour the eye colour moves her iris from (the Cazador 2's eye colour).
IRIS_AT = (53, 20)


def eyes(a):
    """Each eye's letters and his colours (None where her skin is), open."""
    out = {}
    for name, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
        rows = MAP[name]
        col = [[tuple(int(v) for v in a[y0 + r, x0 + c]) if ch in FEATURES else None for c, ch in enumerate(row)] for r, row in enumerate(rows)]
        out[name] = (list(rows), col)
    return out


def lidded(open_eyes, closed):
    """The lid a row down, from her open eye: the lash row's lash on the row under it (where that row has no
    lash of its own), her skin over it; shut, her skin under it too."""
    out = {}
    for name, (rows, col) in open_eyes.items():
        rows = [list(r) for r in rows]
        col = [list(r) for r in col]
        for c, ch in enumerate(rows[0]):
            if ch == 'L' and rows[1][c] != 'L':
                rows[1][c] = 'L'
                col[1][c] = col[0][c]
            if ch in FEATURES:
                rows[0][c] = 'b'
                col[0][c] = None
        for c, ch in enumerate(rows[1]):
            if ch in 'hwdi':
                # the lash beside it (left first)
                src = next(q for d in range(1, len(rows[1])) for q in (c - d, c + d) if 0 <= q < len(rows[1]) and rows[1][q] == 'L')
                rows[1][c] = 'L'
                col[1][c] = col[1][src]
        if closed:
            for c, ch in enumerate(rows[2]):
                if ch in FEATURES:
                    rows[2][c] = 'b'
                    col[2][c] = None
        out[name] = ([''.join(r) for r in rows], col)
    return out


def palette(states):
    """One character per colour of his (colours within 3 share one, as cazador2_ref.pack does)."""
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


def write_ts(path, states, seen, iris):
    hexes = {k: '#%02x%02x%02x' % ref for k, ref in seen}
    out = [
        "// The owner's Cazador 2 eyes, his pixels (tools/refs/cazador2-eyes-from-ref.py from",
        '// docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** Her colours, one character each. */',
        'export const HUNTRESS_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in hexes.items()]
    out += ['};', '']
    docs = {
        'open': 'Her eyes as he painted them: the lash line on the anchor row, the white and dark iris under it, her light iris under that.',
        'lowered': 'Reading: the lid comes down a row, her lash line over the white and the dark iris.',
        'closed': 'Knocked out: the lid down a row as when reading, the face\'s skin over and under it.',
    }
    out += ['/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            'export const HUNTRESS_EYES: Record<\'open\' | \'lowered\' | \'closed\', { near: PaintedEye; far: PaintedEye }> = {']
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** Her light iris, the eye colour her iris is painted in: the player's eye colour moves her iris as far. */",
            f"export const HUNTRESS_IRIS = '{iris}';", '']
    C.write(path, '\n'.join(out))


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    opened = eyes(a)
    states = {'open': opened, 'lowered': lidded(opened, False), 'closed': lidded(opened, True)}
    seen = palette(states.values())
    iris = C.hexc(a[IRIS_AT[1], IRIS_AT[0]])
    if out_ts:
        write_ts(out_ts, states, seen, iris)
    if study:
        # His face there, then each state's eyes over a grey ground (white where the face's skin shows).
        os.makedirs(study, exist_ok=True)
        x0, y0 = NEAR_AT[0] - 3, NEAR_AT[1] - 3
        w, h = FAR_AT[0] - NEAR_AT[0] + 7, 8
        sheet = np.full((h * 4 + 3, w, 3), 200, np.uint8)
        sheet[:h] = a[y0:y0 + h, x0:x0 + w]
        for k, eyes_ in enumerate(states.values()):
            for name, (ex, ey) in (('near', NEAR_AT), ('far', FAR_AT)):
                _rows, col = eyes_[name]
                for r, row in enumerate(col):
                    for c, px in enumerate(row):
                        sheet[(k + 1) * (h + 1) + 3 + r, ex - x0 + c] = px if px is not None else (255, 255, 255)
        Image.fromarray(sheet).resize((w * 16, sheet.shape[0] * 16), Image.NEAREST).save(os.path.join(study, 'eyes@16.png'))
    print(len(seen), 'colours:', ' '.join('%s=#%02x%02x%02x' % ((k,) + ref) for k, ref in seen), 'iris', iris)


if __name__ == '__main__':
    main()
