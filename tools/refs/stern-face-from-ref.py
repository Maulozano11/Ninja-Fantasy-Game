"""The owner's broad man's face (docs/reference/bulky-owner-reference.jpg) as the 'stern' face shape and
'stern' eye shape (his words: "haz un nuevo tipo de seleccion de cara, copia el").

His picture is in his own pixels, one of them one fine pixel of ours (tools/refs/bulky_ref.py), and his
face sits where our face template sits on our bulky body: his lash line starts at our face anchor (49, 20).
This script lifts out of it:

  the face   his ear, cheeks, nose, mouth, jaw and chin with his skin shading and black line, from the
             row above his lash line (19) to the line under his chin. Where his hair crosses the face
             (the strands over the near cheek and between the eyes) and where his eyes are, his skin
             goes on (each hidden pixel takes his skin met first below it, then beside it), and the face
             is closed by his line where its edge was hair. Above it our skull is drawn, which his hair
             covers. Its pivot is the cell on our face anchor.
  the eyes   his eyes cell by cell over our template's eye cells (near eye 5 columns from the anchor,
             far eye 3 columns from 7 columns right of it, two rows from the lash line), with the
             template's letters so the face code reads them as it reads ours:
               L his lash line and the dark of his lids   w his white   d his dark iris   i his iris
               B his brow (in his hair's brown)           o D s b l: the face's own skin shows
             open as he drew them; lowered (reading: his white and iris take the lash's colour above
             them) and closed (knocked out: the lash line stays, the row under it is skin).

It writes src/sprite/sternFaceArt.ts and, with a second argument, a folder for his face beside the
pieces at 16x. The same picture always gives the same bytes:

  python3 -I tools/refs/stern-face-from-ref.py src/sprite/sternFaceArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

DOC = (
    "// The owner's broad man's face and eyes, his pixels (tools/refs/stern-face-from-ref.py from\n"
    '// docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# The face's rows: from the top of his forehead between the strands of his fringe to the line under his
# chin (the game draws our skull above his lash line and his face over it).
TOP, BOTTOM = 15, 29
# His eyes, cell by cell (near from x 49, far from x 56, rows 20 and 21) with our template's letters.
NEAR_AT = (49, 20)
FAR_AT = (56, 20)
MAP = {
    'near': [
        'LLLLB',  # 20  his lash line, and the brown of his brow at its end
        'LwidL',  # 21  the dark corner, his white, his iris, the dark of his lid
    ],
    'far': [
        'bLL',  # 20  his cheek, then the lash line
        'dLL',  # 21  his dark iris in shadow, the dark of his lid
    ],
}
# His skin and his iris: the character's skin and eye colour stand for them.
BASE = '#f2bd97'
IRIS = '#5a4b32'
# His hair's lit yellow: the hair colour moves his brow's brown as far as it moves his hair.
BROW_HAIR = '#f0cc74'
SKIN_LETTERS = 'oDsbl'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, K = R.labels(a)
    black = R.his_line(a, K)
    H, W, _ = a.shape
    face = masks['face'].copy()
    face[:TOP] = False
    face[BOTTOM + 1:] = False
    # His line under the chin (it is the collar's top edge too).
    face[BOTTOM, 50:58] |= K[BOTTOM, 50:58] == 'line'
    # The eye cells: lifted out as the eye shape, his skin goes on under them in the face.
    eye = np.zeros((H, W), bool)
    for side, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
        for r, row in enumerate(MAP[side]):
            for c, ch in enumerate(row):
                if ch not in SKIN_LETTERS:
                    eye[y0 + r, x0 + c] = True
    # The face's silhouette: every row from its first pixel to its last (hair strands crossing it).
    want = np.zeros((H, W), bool)
    for y in range(TOP, BOTTOM + 1):
        xs = np.nonzero(face[y])[0]
        if len(xs):
            want[y, xs.min():xs.max() + 1] = True
    have = face & ~eye
    # Above his lash line the face meets our skull: no line of his closes it there.
    top = np.zeros((H, W), bool)
    top[TOP:R.ANCHOR[1]] = True
    col, m = R.fill_hidden(a, K, have, want, np.array([0.0, 1.0]), black, top)
    head = R.piece('STERN_HEAD', "The owner's face (the 'stern' face shape), his pixels: ear, cheeks, nose, mouth, jaw and chin, his skin shading and black line, from the row above the lash line down; his skin goes on under his eyes and the hair crossing it. Its pivot is the cell on the face anchor.", col, m, R.ANCHOR, 0.0)

    # The eyes: one character per colour of his, shared by both eyes and every lid state.
    palette = {}
    def ch_of(c):
        h = R.hexc(c)
        for k, v in palette.items():
            if v == h:
                return k
        k = 'abcdefghijkmnpqrstuvwxyz'[len(palette)]
        palette[k] = h
        return k
    states = {'open': {}, 'lowered': {}, 'closed': {}}
    for side, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
        letters = MAP[side]
        rows = [''.join('.' if ch in SKIN_LETTERS else ch_of(a[y0 + r, x0 + c]) for c, ch in enumerate(row)) for r, row in enumerate(letters)]
        states['open'][side] = (letters, rows)
        # Lowered: the white and the iris take the colour of the lash above them.
        low_l = [letters[0], ''.join('L' if ch in 'wi' else ch for ch in letters[1])]
        low_r = [rows[0], ''.join(ch_of(a[y0, x0 + c]) if letters[1][c] in 'wi' else ch for c, ch in enumerate(rows[1]))]
        states['lowered'][side] = (low_l, low_r)
        # Closed: the lash line stays, the row under it is the face's skin.
        states['closed'][side] = ([letters[0], 'b' * len(letters[1])], [rows[0], '.' * len(rows[1])])
    eyes = ["/** His colours, one character each. */", 'export const STERN_EYE_COLORS: Record<string, string> = {']
    eyes += [f"  {k}: '{v}'," for k, v in palette.items()]
    eyes += ['};', '', "/** His eyes in each lid state: open as he drew them, lowered (reading) and closed (knocked out), made of his pixels. */",
             "export const STERN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for st in ('open', 'lowered', 'closed'):
        eyes.append(f'  {st}: {{')
        for side in ('near', 'far'):
            l, r = states[st][side]
            eyes.append(f'    {side}: {{ letters: {l!r}, rows: {r!r} }},'.replace('"', "'"))
        eyes.append('  },')
    eyes += ['};', '']
    header = [
        "/** His lit skin, which the character's skin colour stands for: every colour of his moves as far, his black line stays. */",
        f"export const STERN_SKIN = '{BASE}';",
        '',
        "/** His iris: the player's eye colour moves it as far. */",
        f"export const STERN_IRIS = '{IRIS}';",
        '',
        "/** His hair's lit yellow, which his brow's brown is painted with: the hair colour moves it as far. */",
        f"export const STERN_BROW_HAIR = '{BROW_HAIR}';",
        '',
    ] + eyes
    text = R.module(DOC, "import type { PaintedEye } from './eyeArt';\nimport type { PaintedPiece } from './painted';", header, [head])
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [(col, m)], os.path.join(study, 'stern-face@16.png'), box=(40, 12, 64, 32), k=16)
    print('face', int(m.sum()), 'px; eye colours', len(palette))


if __name__ == '__main__':
    main()
