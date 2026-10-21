"""The owner's princess's head (docs/reference/princess-owner-reference.jpg) as the 'noble' face shape.

His princess is drawn at our scale (tools/refs/princess_ref.py: one of his pixels is one fine pixel
of ours), so her head is lifted 1:1. Her face is not ours: it is narrower on the far side (her far
eye one column closer to the near one, her face line one column in), her chin is smaller and a row
higher, and she has her own nose (a light over a shadow) and a soft three-pixel mouth. So she gets
her own face shape, made the way Aiden's was (tools/refs/aiden-head-from-ref.py):

  her pixels   the skin of her face, her nose, her mouth, the hair's shadow down her near cheek, the
               shadow under her near eye and her black line round the jaw and the far side, every
               colour as he painted it (his colour: the palette's colour within 8 of it, princess_ref.PALETTE_HEX,
               else the pixel as it is, as his nose's single light)
  her hair     covers her skull, her temples and her near cheek: there the head is continued in her
               skin, in our female skull's outline (MAP), so every hairstyle covers it as it covers
               our head; inside it her base skin, her cheek shadow next to the line on the skull's
               sides, her black line round it. Her near cheek is not guessed: between two strands of
               her hair he shows its edge (his line at x 43, rows 20-21, and x 44 on row 22, her skin
               inside it); the line under the hair runs from there into her jaw line at (48, 24)
  her features her eyes, lashes and brows are taken out and her base skin put there, so the eye
               options draw on her face as on ours (her own eyes are the 'noble' eye shape,
               tools/refs/princess-eyes-from-ref.py). Her mouth and nose stay: the face template
               draws no mouth on her face

Our face anchor on her: the template's first column and lash row are her near eye's first lash
column and lash row (49, 18), so her near eye is where ours is and her far eye (x 57) eight columns
on (ours nine): src/sprite/body.ts faceAnchor.

It writes, in <out>:

  head@8.png    the head lifted out, at 8x
  hers@8.png    his pixels there, at 8x

and, with a third argument, the game's module (src/sprite/princessHeadArt.ts): the head as a
PaintedPiece whose pivot is the cell on our face anchor, and the base skin he painted it in. The same
picture always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/princess-face-from-ref.py docs/reference/princess-owner-reference.jpg <out> src/sprite/princessHeadArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import princess_ref as P  # noqa: E402

# The head, cell by cell, in his pixels from (MAP_X, MAP_Y):
#   H  his pixel (skin, nose, mouth or his line), kept as he painted it
#   e  her eyes, lashes and brows: her base skin put there
#   s  the head under her hair: her base skin, her cheek shadow next to the line on the skull's sides
#   o  the head's outline under her hair: his black line
# The skull is our female head's outline at idle with her lash row on ours (our skull's top on her
# row 5, its sides on her x 42 and 59), so every hairstyle of ours covers it as it covers our head.
MAP_X, MAP_Y = 41, 5
MAP = [
    '.......oooooo........',  # 5  our female skull's top
    '.....oossssssoo......',  # 6
    '....osssssssssso.....',  # 7
    '...osssssssssssso....',  # 8
    '..osssssssssssssso...',  # 9
    '..osssssssssssssso...',  # 10
    '.ossssssssssssssso...',  # 11
    '.osssssssssssssssso..',  # 12
    '.osssssssssssssHsso..',  # 13  her forehead between the bangs
    '.osssssssssssssHHso..',  # 14
    '.ossssssssssssHHHHo..',  # 15
    '.osssssssssssHHHHso..',  # 16
    '.ossssssssseeeHHeeo..',  # 17  her brows
    '.ossssseeeeeeHHHeeH..',  # 18  her lashes; her far face line
    '.osssssHeeeeeHHHeeH..',  # 19  her eyes; the hair's shadow down her near cheek
    '..HHsssHHeeeHHHHeeH..',  # 20  her near cheek's edge between two strands; the shadow under her eye
    '..HHsssHHHHHHHHHHHH..',  # 21  her nose's light
    '...HsssHHHHHHHHHHHH..',  # 22  her nose's shadow
    '....oosHHHHHHHHHHHH..',  # 23
    '......oHHHHHHHHHHH...',  # 24  her mouth
    '.......HHHHHHHHHH....',  # 25
    '.......HHHHHHHHH.....',  # 26
    '..........HHHHH......',  # 27  her chin's line
]
# Our face anchor (the cell the template's columns and rows start from) in his pixels.
ANCHOR = (49, 18)
# Her colours the filled parts take: her cheek's shadow (the hair's shadow down her near cheek) and
# his black line (her far face line).
SHADOW_AT = (48, 21)
LINE_AT = (59, 21)
# The rows where the head is her skull (the cheek shadow runs along the line there, as on ours); under
# them her near cheek is lit to its edge, as his pixels between the strands show.
SKULL_ROWS = range(MAP_Y, 20)


def head():
    """The head's mask and colours (his colours), in his pixels; and her base skin."""
    N = P.native()
    q = P.quantize(N)
    # his colour: the palette's where it is within a JPEG step (the palette's tolerance), else his
    # pixel as it is (a colour he used once, as the light on her nose)
    a = np.where((np.abs(q - N).max(-1) <= 8)[..., None], q, N)
    fam = P.family(P.native())
    kind = np.full((P.SIZE, P.SIZE), '.', dtype='<U1')
    for j, row in enumerate(MAP):
        for i, ch in enumerate(row):
            kind[MAP_Y + j, MAP_X + i] = ch
    col = a.copy()
    mask = kind != '.'
    line = a[LINE_AT[1], LINE_AT[0]]
    # his line is one black: the JPEG's near-blacks round it are his line too
    col[(kind == 'H') & (fam == P.FAMILIES.index('line'))] = line

    # Her base skin: the commonest colour of her face.
    skin = (kind == 'H') & (fam == P.FAMILIES.index('skin'))
    cols, counts = np.unique(col[skin], axis=0, return_counts=True)
    base = cols[int(np.argmax(counts))]
    shadow = a[SHADOW_AT[1], SHADOW_AT[0]]

    for y, x in zip(*np.nonzero(kind == 's')):
        side = x <= ANCHOR[0] - 5 or x >= ANCHOR[0] + 8
        edge = any(kind[y + dy, x + dx] == 'o' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        col[y, x] = shadow if side and edge and y in SKULL_ROWS else base
    col[kind == 'o'] = line
    col[kind == 'e'] = base
    return mask, col, P.rgb_hex(base)


def main():
    ref, out = sys.argv[1], sys.argv[2]
    if os.path.abspath(ref) != os.path.abspath(P.REF):
        raise SystemExit(f'expected {P.REF}')
    os.makedirs(out, exist_ok=True)
    mask, col, base = head()
    rows, origin, palette = P.pack(col, mask)

    if len(sys.argv) > 3:
        doc = ("The owner's princess's head (the 'noble' face shape), his pixels: her face, nose, mouth and jaw, "
               'the hair\'s shadow down her near cheek and his black line; her skull and near cheek under her hair '
               'continued in her skin. The eye options draw her eyes and brows on it; the face template draws no mouth '
               'on it. Its pivot is the cell on the face anchor.')
        src = [
            "// The owner's princess's head shape, his pixels (tools/refs/princess-face-from-ref.py from",
            '// docs/reference/princess-owner-reference.jpg, drawn at our scale). Generated: rerun the script to change it.',
            '',
            "import type { PaintedPiece } from './painted';",
            '',
            "/** The skin colour he painted her head in: a player's skin moves every colour of it as far. */",
            f"export const NOBLE_SKIN = '{base}';",
            '',
            P.ts_piece('NOBLE_HEAD', doc, rows, origin, palette, ANCHOR, 0),
        ]
        tmp = sys.argv[3] + '.tmp'
        with open(tmp, 'w') as f:
            f.write('\n'.join(src))
        os.replace(tmp, sys.argv[3])

    rgba = np.zeros((P.SIZE, P.SIZE, 4), np.uint8)
    ox, oy = origin
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                rgba[oy + j, ox + i, :3] = P.rgb(palette[ch])
                rgba[oy + j, ox + i, 3] = 255
    box = (slice(MAP_Y - 2, MAP_Y + len(MAP) + 2), slice(MAP_X - 2, MAP_X + len(MAP[0]) + 2))
    P.save(rgba[box], os.path.join(out, 'head@8.png'))
    P.save(P.native()[box], os.path.join(out, 'hers@8.png'))
    print(len(rows), 'rows,', len(palette), 'colours, base', base, 'origin', origin)


if __name__ == '__main__':
    main()
