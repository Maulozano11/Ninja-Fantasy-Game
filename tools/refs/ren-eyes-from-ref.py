"""The owner's eyes on his Ren (docs/reference/ren-owner-reference.jpg) as the 'night' eye shape.

His Ren is our Ren painted over in his own pixels (tools/refs/ren_ref.py). His eyes sit under a full
lash line of his black (the face anchor's row), a row lower than ours: on the near eye a shaded white,
two dark blues and a dark red-brown lid corner, and under them a white and two bright blues; on the far
eye a dark lid, a blue and his line, and under them a dark blue, a grey white and the dark outline of
his far cheek. This script lifts both eyes out of his pixels, cell by cell over our face template's eye
cells (MAP: the near eye's 5 columns from x 49, the far eye's 3 from x 57, rows 19-21), with the
template's letters, so the face and the eye options' code read them as they read ours:

  L  his lash line and lid    h  his shaded white       w  his white
  d  his dark blue iris       i  his bright blue iris   (his iris moves the way the eye colour does
                                                         from IRIS, his bright blue)
  D  his dark lid corner      s  his skin there: no pixel of the eye; the face's own skin shows

and two lid states the game needs that his picture does not show, made of his own pixels:

  lowered  (reading) the lid comes down over the top row of the eye: its cells take his lash colour
           beside them
  closed   (knocked out) the eye is shut: the lash colour runs across the top row too, and the row
           under it is the face's skin (the far eye keeps the dark outline of his cheek)

It writes the game's module (src/sprite/nightEyeArt.ts) and, with a second argument, a folder, his
eyes lifted out in each state at 16x beside his face. The same picture always gives the same bytes:

  python3 -I tools/refs/ren-eyes-from-ref.py src/sprite/nightEyeArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import ren_ref as R  # noqa: E402

NEAR_AT = (49, 19)
FAR_AT = (57, 19)
MAP = {
    'near': [
        'LLLLL',  # 19  his lash line across the eye
        'LhddD',  # 20  his line, a shaded white, two dark blues, the dark lid corner
        'swiis',  # 21  his white and two bright blues; his cheek on both sides
    ],
    'far': [
        'LLL',  # 19  the lash line
        'LiL',  # 20  the dark lid, a blue, his line
        'dhL',  # 21  a dark blue, a grey white, the dark outline of his far cheek
    ],
}
FEATURES = 'LhwdiD'
# His bright blue: the eye colour his iris is painted in; the player's eye colour moves his blues as far.
IRIS_AT = (52, 21)


def eyes(a):
    out = {}
    for name, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
        rows = MAP[name]
        col = [[tuple(int(v) for v in a[y0 + r, x0 + c]) if ch in FEATURES else None for c, ch in enumerate(row)] for r, row in enumerate(rows)]
        out[name] = (list(rows), col)
    return out


def lidded(open_eyes, closed):
    """The lowered or closed lid, from his open eye: the top row's opening takes his lash colour beside
    it; closed, the row under it is the face's skin (his cheek's outline stays)."""
    out = {}
    for name, (rows, col) in open_eyes.items():
        rows = [list(r) for r in rows]
        col = [list(r) for r in col]
        top = 1
        for c, ch in enumerate(rows[top]):
            if ch in 'hwdi':
                src = next(col[top][q] for d in range(1, len(rows[top])) for q in (c - d, c + d) if 0 <= q < len(rows[top]) and rows[top][q] == 'L')
                rows[top][c] = 'L'
                col[top][c] = src
        if closed:
            for c, ch in enumerate(rows[2]):
                if ch in 'hwdi':
                    rows[2][c] = 'b'
                    col[2][c] = None
        out[name] = ([''.join(r) for r in rows], col)
    return out


def palette(states):
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
        "// The owner's eyes on his Ren, his pixels (tools/refs/ren-eyes-from-ref.py from",
        '// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** His colours, one character each. */',
        'export const NIGHT_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in hexes.items()]
    out += ['};', '']
    docs = {
        'open': 'His eyes as he painted them: the lash line on the anchor row, the white and blue iris under it.',
        'lowered': 'Reading: the lid comes down over the top row of the eye (its cells take his lash colour).',
        'closed': "Knocked out: his lash colour runs across the top row too; under it the face's skin.",
    }
    out += ['/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const NIGHT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** His bright blue, the eye colour his iris is painted in: the player's eye colour moves his blues as far. */",
            f"export const NIGHT_IRIS = '{iris}';", '']
    R.write(path, '\n'.join(out))


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    opened = eyes(a)
    states = {'open': opened, 'lowered': lidded(opened, False), 'closed': lidded(opened, True)}
    seen = palette(states.values())
    iris = R.hexc(a[IRIS_AT[1], IRIS_AT[0]])
    write_ts(out_ts, states, seen, iris)
    if study:
        os.makedirs(study, exist_ok=True)
        box = (slice(NEAR_AT[1] - 3, NEAR_AT[1] + 6), slice(NEAR_AT[0] - 3, FAR_AT[0] + 6))
        h, w = 9, FAR_AT[0] - NEAR_AT[0] + 9
        sheet = np.full((h * 4 + 3, w, 3), 200, np.int32)
        sheet[:h] = a[box]
        for k, eyes_ in enumerate(states.values()):
            for name, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
                rows, col = eyes_[name]
                for r, row in enumerate(col):
                    for c, px in enumerate(row):
                        sheet[(k + 1) * (h + 1) + 3 + r, x0 - NEAR_AT[0] + 3 + c] = px if px is not None else (255, 255, 255)
        R.save(sheet, os.path.join(study, 'eyes@16.png'), k=16)
    print(len(seen), 'colours, iris', iris)


if __name__ == '__main__':
    main()
