"""The owner's Cazador 2 face (docs/reference/cazador2-owner-reference.jpg) as the 'huntress' face shape.

His picture is our second Hunter-nin painted over in his own pixels (tools/refs/cazador2_ref.py). Her face
shows in three places he painted: her forehead between the strands over her brow, the band from her brow
down to the top of her half mask (her lid crease, the skin between and beside her eyes, under her near eye
and on her far cheek), and a sliver of cheek beside her near temple. This script lifts the head out of his
pixels:

  his pixels   every pixel of her face he shows (cazador2_ref.FACE_CELLS), as he painted it
  her eyes     the eye cells (the eyes are drawn by the eye shape over them: the 'huntress' eyes are his,
               tools/refs/cazador2-eyes-from-ref.py) take her lit skin, so a shut eye is her skin
  her hair     covers her skull and temples: there the head is continued in her lit skin, in our female
               skull's outline at idle frame 0 (MAP), so every hairstyle, hers and ours, covers it as it
               covers our head; her shadow along the line on the back and far sides, her line round it
  her mask     covers her lower face: there it is continued in her skin, in the mask's own outline (the
               mask lies on her face, so its edge is her jaw and chin), joined to our female jaw's near
               side under her hair; the mouth is our face template's, drawn on it

and writes src/sprite/huntressHeadArt.ts: the head as a PaintedPiece whose pivot is the cell on our face
anchor (her near eye's lash start, cazador2_ref.FACE), and the skin colour he painted her in (her arms',
cazador2_ref.his_skin, which the Cazador 2's skin is), so a player's skin moves her face as far. In <study>
it writes the head at 8x beside his. The same picture always gives the same bytes:

  python3 -I tools/refs/cazador2-head-from-ref.py src/sprite/huntressHeadArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import cazador2_ref as C  # noqa: E402

# The head, cell by cell, in his pixels from (MAP_X, MAP_Y):
#   H  his pixel, as he painted it
#   e  an eye cell (the eye shape draws the eye there): her lit skin
#   s  under her hair or mask: her lit skin, her shadow next to the line on the back and far sides
#   o  the outline under her hair or mask: her line
MAP_X, MAP_Y = 42, 5
MAP = [
    '......oooooo........',  # 5   our female skull's top
    '....oossssssoo......',  # 6
    '...osssssssssso.....',  # 7
    '..osssssssssssso....',  # 8
    '.osssssssssssssso...',  # 9
    '.osssssssssssssso...',  # 10
    'ossssssssssssssso...',  # 11
    'osssssssssssssssso..',  # 12
    'osssssssssssssssso..',  # 13
    'osssssssssHHssssso..',  # 14  her forehead between the strands
    'ossssssssHHHHsssso..',  # 15
    'osssssssssssHHssso..',  # 16
    'osssssssHHHHHHHsso..',  # 17  her lid crease and brow
    'ossHssseeeeeHHHHeeo.',  # 18  the lash row; her near cheek by the temple, the skin between her eyes
    'ossHsssHeeeeHHHeeeo.',  # 19  the eyes
    '.osHssssHHeeHHsHeHo.',  # 20  under the near eye; her far cheek; the mask's top edge covers the rest
    '..osssssssssssssso..',  # 21  her lower face under the mask, in its outline
    '...osssssssssssssso.',  # 22
    '....ossssssssssssso.',  # 23
    '.....ossssssssssso..',  # 24
    '......oooossssso....',  # 25
    '..........ooooo.....',  # 26  her chin, the mask's last row
]
# Her shadow (the lid crease over her near eye) and her line (beside her near eye).
SHADOW_AT = (51, 15)
LINE_AT = (49, 17)


def head(a):
    """The head's mask and colours, in his pixels."""
    kind = np.full((C.SIZE, C.SIZE), '.', dtype='<U1')
    for j, row in enumerate(MAP):
        for i, ch in enumerate(row):
            kind[MAP_Y + j, MAP_X + i] = ch
    his = kind == 'H'
    if (his & ~C.FACE_CELLS).any() or (C.FACE_CELLS & ~his & (kind != 'e')).any():
        raise SystemExit('MAP does not hold her face as cazador2_ref.FACE_CELLS has it')
    col = a.copy()
    mask = kind != '.'

    # Her lit skin: the commonest light colour of her face (colours within 3 counted as one, as pack does).
    seen = []
    for y, x in zip(*np.nonzero(kind == 'H')):
        c = a[y, x]
        if C.luma(c[None])[0] < 140:
            continue
        for k, (ref, n) in enumerate(seen):
            if np.abs(ref.astype(int) - c).max() <= 3:
                seen[k] = (ref, n + 1)
                break
        else:
            seen.append((c, 1))
    lit = max(seen, key=lambda s: s[1])[0]
    shadow = a[SHADOW_AT[1], SHADOW_AT[0]]
    line = a[LINE_AT[1], LINE_AT[0]]
    fx = C.FACE[0]
    for y, x in zip(*np.nonzero(kind == 's')):
        side = x <= fx - 5 or x >= fx + 8
        edge = any(kind[y + dy, x + dx] == 'o' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        col[y, x] = shadow if side and edge else lit
    col[kind == 'e'] = lit
    col[kind == 'o'] = line
    return mask, col, kind


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, _filled, _K, _bg = C.pieces(a)
    skin = C.his_skin(a, masks, cols)
    mask, col, kind = head(a)
    rows, origin, palette = C.pack(col, mask)
    if out_ts:
        doc = ("Her head (the 'huntress' face shape), his pixels: her forehead, brow, eye band and cheeks as he "
               'painted them, the rest (under her hair and mask) continued in her skin and line; the face template '
               'draws the eyes and mouth on it. Its pivot is the cell on the face anchor.')
        src = [
            "// The owner's Cazador 2 face, his pixels (tools/refs/cazador2-head-from-ref.py from",
            '// docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.',
            '',
            "import type { PaintedPiece } from './painted';",
            '',
            "/** The skin colour he painted her in (her arms'): a player's skin moves every colour of her face as far. */",
            f"export const HUNTRESS_SKIN = '{skin}';",
            '',
            C.ts_piece('HUNTRESS_HEAD', doc, rows, origin, palette, C.FACE, 0),
        ]
        C.write(out_ts, '\n'.join(src))
    if study:
        os.makedirs(study, exist_ok=True)
        box = (slice(MAP_Y - 2, MAP_Y + len(MAP) + 2), slice(MAP_X - 2, MAP_X + len(MAP[0]) + 2))
        his = np.full(a.shape, 255, np.uint8)
        his[C.FACE_CELLS] = a[C.FACE_CELLS]
        ours = np.full(a.shape, 255, np.uint8)
        ours[mask] = col[mask]
        k = 8
        h, w = his[box].shape[:2]
        sheet = Image.new('RGB', (w * k * 2 + k, h * k), 'white')
        sheet.paste(Image.fromarray(his[box]).resize((w * k, h * k), Image.NEAREST), (0, 0))
        sheet.paste(Image.fromarray(ours[box]).resize((w * k, h * k), Image.NEAREST), (w * k + k, 0))
        sheet.save(os.path.join(study, 'head@8.png'))
    print(len(rows), 'rows,', len(palette), 'colours, skin', skin, 'origin', origin)


if __name__ == '__main__':
    main()
