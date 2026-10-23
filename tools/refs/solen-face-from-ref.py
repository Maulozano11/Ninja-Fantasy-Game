"""The owner's face on his Solen (docs/reference/solen-owner-reference.jpg) as the 'founder' face shape.

His Solen is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one fine
pixel of our sprites). He kept our face template's place (the lash row on our face anchor's row, both eyes in
the template's cells) and repainted it: a warmer skin with a rosy shadow down the near cheek and under the
jaw, heavy black lash rows, a pale white and two dark reds in the near eye, a dark red and a red in the far
eye (one more at its inner corner), a soft three-pixel mouth, his ear and his black line round the jaw and
the chin. This script lifts the head out of his pixels:

  his pixels    the skin of his face and ear, his eyes and mouth and his black line, every colour as he
                painted it (the white of his near eye too, which is as light as the paper round him)
  under hair    where his hair covers the face (the fringe over the brow, the sideburn before the ear, the
                hair beside the far cheek) the face goes on in his skin: each such cell takes his nearest
                skin in its row, toward the middle of the face, and his black line where it is the face's
                edge, so another hairstyle never shows a hole
  the skull     above the face his hair covers our male skull: there the head is our skull's outline
                (SKULL, as the 'valiant' head has it) in his skin and his line, so every hairstyle covers
                it as it covers our head

It writes the game's module (src/sprite/founderFaceArt.ts): the head as a PaintedPiece pivoting on the cell
of our face anchor, the skin he painted it in (the base his skin pieces share, solen-tunic-from-ref.py) and
his iris red (his eye pixels follow the eye colour from it), and, in <study>, his head beside it at 8x. The
same picture always gives the same bytes:

  python3 -I tools/refs/solen-face-from-ref.py src/sprite/founderFaceArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import solen_ref as R  # noqa: E402

# Our face anchor (the template's first column and its lash row) at our male idle frame 0, in his pixels.
ANCHOR = (49, 19)
# Our male skull above the face, in his pixels from (SKULL_X, SKULL_Y): 's' skin, 'o' line (the 'valiant'
# head's skull, tools/refs/aiden-head-from-ref.py MAP, on the same frame cells).
SKULL_X, SKULL_Y = 41, 7
SKULL = [
    '......oooooooo......',  # 7
    '....oossssssssoo....',  # 8
    '...osssssssssssso...',  # 9
    '..osssssssssssssso..',  # 10
    '..osssssssssssssso..',  # 11
    '.osssssssssssssssso.',  # 12
    '.osssssssssssssssso.',  # 13
    '.osssssssssssssssso.',  # 14
    '.osssssssssssssssso.',  # 15
    '.osssssssssssssssso.',  # 16
    '.osssssssssssssssso.',  # 17
    '.osssssssssssssssso.',  # 18
]
# The face below the skull: for each row, the first and last column of his head (ear to far cheek line, then
# the jaw narrowing to the chin's line).
FACE = {19: (43, 59), 20: (43, 59), 21: (43, 59), 22: (44, 59), 23: (45, 59), 24: (46, 59), 25: (47, 58), 26: (47, 57), 27: (47, 57), 28: (49, 56)}
# His pixels that belong to the head: his skin and its shadows, his eyes and his line (not his hair, which is
# the hair's, nor the cowl's grey under the chin).
KEEP = ('skin', 'red', 'leather', 'line', 'white', 'stud')


def head(a, skin):
    H, W, _ = a.shape
    K = R.kinds(a)
    hair_on = R.background(a)
    mask = np.zeros((H, W), bool)
    col = a.copy()
    his = np.zeros((H, W), bool)
    line = R.his_line(a)
    for y in range(SKULL_Y, SKULL_Y + len(SKULL)):
        for i, ch in enumerate(SKULL[y - SKULL_Y]):
            x = SKULL_X + i
            if ch == '.':
                continue
            mask[y, x] = True
            if K[y, x] in KEEP and K[y, x] != 'line' and not hair_on[y, x]:
                his[y, x] = True  # his forehead between the strands of his fringe
            else:
                col[y, x] = line if ch == 'o' else skin
    # His line round his forehead's patches (his brows over the eyes) is his too.
    near = np.zeros((H, W), bool)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            near |= np.roll(np.roll(his, dy, 0), dx, 1)
    for y in range(SKULL_Y, SKULL_Y + len(SKULL)):
        for x in range(SKULL_X, SKULL_X + len(SKULL[0])):
            if mask[y, x] and K[y, x] == 'line' and near[y, x]:
                col[y, x] = a[y, x]
                his[y, x] = True
    for y, (x0, x1) in FACE.items():
        for x in range(x0, x1 + 1):
            mask[y, x] = True
            if K[y, x] in KEEP and not hair_on[y, x]:
                his[y, x] = True
    # Under his hair: his nearest skin in the row toward the middle of the face; the face's edge his line.
    mid = 53
    for y, (x0, x1) in FACE.items():
        for x in range(x0, x1 + 1):
            if his[y, x]:
                continue
            if x in (x0, x1) or y == max(FACE):
                col[y, x] = line
                continue
            step = 1 if x < mid else -1
            q = x
            while x0 <= q <= x1 and not (his[y, q] and K[y, q] == 'skin'):
                q += step
            col[y, x] = a[y, q] if x0 <= q <= x1 else skin
    return mask, col, his


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, _ = R.pieces(a)
    skin = R.middle(a, masks, cols, ['arm_n', 'arm_f'], ('skin',), 0.8)
    rgb = np.array([int(skin[i:i + 2], 16) for i in (1, 3, 5)])
    mask, col, his = head(a, rgb)
    # His iris: the lightest red of his eyes (the colour the eye colour turns them from).
    eyes = [(R.luma(col[y, x][None])[0], R.hexc(col[y, x])) for y, x in zip(*np.nonzero(mask)) if 19 <= y <= 21 and R.kind(col[y, x]) == 'red']
    iris = max(eyes)[1]
    rows, origin, palette = R.pack(col, mask)
    kinds = {h: R.kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]) for h in palette.values()}
    names = ' | '.join(f"'{k}'" for k in R.KINDS)
    src = [
        "// The owner's face on his Solen, his pixels (tools/refs/solen-face-from-ref.py from",
        '// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from './painted';",
        '',
        "/** The skin he painted it in (his skin pieces' base): a player's skin moves every colour of it as far. */",
        f"export const FOUNDER_SKIN = '{skin}';",
        '',
        "/** His iris red: the eye colour moves his eyes' reds as far. */",
        f"export const FOUNDER_IRIS = '{iris}';",
        '',
        '/** What each of his colours is (tools/refs/solen_ref.py kind). */',
        f'export const FOUNDER_FACE_KIND: Record<string, {names}> = {{',
    ]
    src += [f"  '{h}': '{kinds[h]}'," for h in sorted(kinds)] + ['};', '']
    doc = ("The owner's head on his Solen (the 'founder' face shape), his pixels: his ear, cheeks, jaw and chin, his "
           'eyes and mouth, his skin shading and black line; under his hair the face and our skull go on in his skin. '
           'Its pivot is the cell on the face anchor.')
    src.append(R.ts_piece('FOUNDER_HEAD', doc, rows, origin, palette, ANCHOR, 0))
    if out_ts:
        R.write(out_ts, '\n'.join(src))
    if study:
        os.makedirs(study, exist_ok=True)
        marked = {'face': mask}
        filled = {'face': mask & ~his}
        R.study(a, marked, {'face': col}, ['face'], os.path.join(study, 'face@8.png'), (38, 4, 64, 31), filled)
    print(len(rows), 'rows,', len(palette), 'colours, skin', skin, 'iris', iris, 'origin', origin)


if __name__ == '__main__':
    main()
