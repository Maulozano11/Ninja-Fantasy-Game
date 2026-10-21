"""Aurelia's hair (docs/reference/aurelia-owner-reference.jpg) as a hairstyle: 'hair_dawn_bun'.

Her picture is the owner's pixel art at about 2.5 times our scale (heroine_ref.py: 200 x 200 of her
pixels, 198 tall, ours 91). Her hair is blonde, gathered back into a big braided bun at the back of
the head, with a gold ornament (a flower of gold petals round a dark heart, and a gold pin under it)
where the bun meets the hair swept back from the brow; side-swept bangs falling to the brows in
strands; a long lock in front of her ear down to her collar on the near side, and one beside her far
cheek. All of it inside her black line on the top and the back, her browns on the far side.

Her hair is brought down to our scale with the study's head map (heroine_ref.SEGMENTS['aurelia']
['head']: her eyes on ours, her hair top a pixel over our skull, her chin on ours) and redrawn pixel by
pixel in her colours only (each a colour of PALETTES['aurelia'], checked below): her line, her twelve
blondes and browns, her golds. Where our face is not hers it is fitted to ours:

  near lock  our near eye sits two columns left of where the head map puts hers, so her lock (and the
             ear before it) come in three columns: the lock runs down in front of our cheek with a
             column of skin between it and our eye, as hers does, and her ear is the column of our
             skin between it and the bun.
  far lock   our far cheek is a column wider than hers: her lock hangs beside it, behind the face
             (BACK only) down to the jaw, so it shows only past our cheek on every face shape; its
             tip, under the jaw, is drawn in front.
  bangs      her strands end on the row over our lash line, as hers end on hers.

The rows below are the result (the starting point was her pixels through the head map, one colour
per cell by coverage, line and gold kept; then cleaned by hand against her picture). This script
writes them as the game's module:

  FRONT   every pixel of her hair over the head (hairFront): bun, ornament, crown, bangs, the near
          lock, the far side down to the jaw, the far lock's tip
  BACK    behind the head (hairBack): the front, the far lock beside the cheek, and what her bangs
          hide filled in (each hidden pixel takes the colour of the nearest of her pixels above it,
          so her strands run on under the face); it is also her head's outline above the eyes (the
          game trims our skull to it)

Both have their pivot on our face anchor (body.ts faceAnchor: the near eye's first column and its
lash row), so they frame the eyes on every body and in every pose. Writes, in <out>:

  hair.json           rows, palette, pivot, her line, the ornament's colours and the two bases
  study/hers@8.png    her picture through the head map over the same box, at 8x
  study/front@8.png   the front, at 8x
  study/back@8.png    the back, the filled-in pixels marked

and, with a third argument, the game's module (src/sprite/items/aureliaHairArt.ts). The same rows
always give the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/aurelia-hair-from-ref.py <out> [src/sprite/items/aureliaHairArt.ts]
"""

import json
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heroine_ref as R  # noqa: E402

# Her colours in the hair, one character each.
KEY = {
    # her line
    'k': '#030101',
    # her blondes and browns, lightest first
    'i': '#feefc6', 'h': '#f9dfac', 'c': '#e6c593', 'y': '#d8b286', 't': '#c79e76', 'q': '#b38761',
    'm': '#a17354', 'J': '#8e6447', 'j': '#86583d', 'I': '#794f38', 'H': '#6c4427', 'E': '#4a312c',
    'D': '#36221f',
    # her golds, lightest first: the ornament and the pin
    'f': '#fcd77a', 'Z': '#ecc268', 'X': '#deb05c', 'U': '#d4a251', 'R': '#c4934c', 'N': '#a9793c',
    'P': '#966536', 'F': '#583622',
}
LINE = 'k'
ORNAMENT = 'fZXURNPF'
# Her mid blonde, the lit face of most of her locks: the hair colour slot's default (recoloured, her
# other blondes and browns move as it does). Her gold the same for the ornament.
HAIR_BASE = 'c'
ORNAMENT_BASE = 'Z'

# Where the rows sit in our female body's frame at idle frame 0 (the left column, the top row), and
# our face anchor there (body.ts faceAnchor: the near eye's first column, its lash row).
ORIGIN = (110, 126)
ANCHOR = (123, 141)
# Her bangs show her brow between their strands from this row down to the lash row.
FILL_FROM = 136

# The hair over the head: columns 110-139, rows 126-153.
FRONT = [
    '..............................',  # 126
    '.......kkkkk.kkkkkk...........',  # 127
    '......khhcymkhhhmyykk.........',  # 128
    '.....kmyyImhiihhcytttkk.......',  # 129
    '....kyihtIihhhcchhhytyck......',  # 130
    '...ktcicHcchicchhcyhchyhk.....',  # 131
    '...ktchHtchccJhhcchhhhcchE....',  # 132
    '..kyjcyHyychjhhhyhhhhhhchj....',  # 133
    '..kyjyHqIfHfjiiccihiiihtihJ...',  # 134
    '..ktyjHcZffHHchmccichhhjhhJ...',  # 135
    '...kttHcPXDRfZcqchchjhjjchj...',  # 136
    '...kyZHtDUDUNjqcJyyjcyJjhcj...',  # 137
    '..kIqqfHjhhcJtJJtj.Jq.Jjytj...',  # 138
    '..ktqJHZjhhcJjjjj.tj..jJtyj...',  # 139
    '..kqymIyIhcj....jjj...jJtyj...',  # 140
    '...kmyD.Ihcj.............yj...',  # 141
    '...kmmJ.jhcj.............yj...',  # 142
    '....kmJ.Iccj..................',  # 143
    '....ktDJIchj..................',  # 144
    '....kmEJIyhj..................',  # 145
    '.....kIkmyhj..................',  # 146
    '......kqkJhj..................',  # 147
    '.......kkJhj..................',  # 148
    '.........kyhI.................',  # 149
    '..........Jhj.........yj......',  # 150
    '..........Jcj.........yj......',  # 151
    '..........jcj.........Jyj.....',  # 152
    '...........j...........I......',  # 153
]
# The far lock beside our far cheek, behind the face (BACK only): row -> (first column, pixels).
FAR = {
    141: (134, 'Jyj'), 142: (134, 'Jyj'), 143: (133, 'Jyj'), 144: (133, 'jcj'), 145: (132, 'Jcj'),
    146: (132, 'jcI'), 147: (132, 'mcj'), 148: (132, 'Icj'), 149: (131, 'Jcj'),
}


def build():
    pal = set(R.PALETTES['aurelia'])
    for ch, hx in KEY.items():
        assert hx in pal, f'{ch} {hx} is not one of her colours'
    ox, oy = ORIGIN
    W = len(FRONT[0])
    assert all(len(r) == W for r in FRONT), 'rows of unequal length'
    for r in FRONT:
        for ch in r:
            assert ch == '.' or ch in KEY, f'unknown character {ch!r}'
    front = np.array([list(r) for r in FRONT])
    back = front.copy()
    for y, (x0, s) in FAR.items():
        for i, ch in enumerate(s):
            if back[y - oy, x0 - ox + i] == '.':
                back[y - oy, x0 - ox + i] = ch
    # What her bangs hide, from the brow down to the lash row: between the first and last of her
    # pixels on each row, each empty cell takes the nearest of her colours above it (her strands run
    # on down). Above the brow her hair is whole (the notch on her crown is her outline, not a gap).
    filled = np.zeros(back.shape, bool)
    for j in range(back.shape[0]):
        if oy + j < FILL_FROM:
            continue
        if oy + j >= ANCHOR[1]:
            break
        cols = np.nonzero(back[j] != '.')[0]
        if not len(cols):
            continue
        for i in range(cols[0], cols[-1] + 1):
            if back[j, i] != '.':
                continue
            above = next((back[q, i] for q in range(j - 1, -1, -1) if back[q, i] != '.' and back[q, i] != LINE), None)
            back[j, i] = above or next(back[j, q] for d in range(1, W) for q in (i - d, i + d) if 0 <= q < W and back[j, q] != '.')
            filled[j, i] = True
    return front, back, filled


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    front, back, filled = build()
    # down to the box her hair fills
    yy, xx = np.nonzero(back != '.')
    y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    front, back, filled = front[y0:y1, x0:x1], back[y0:y1, x0:x1], filled[y0:y1, x0:x1]
    ox, oy = ORIGIN[0] + int(x0), ORIGIN[1] + int(y0)
    used = sorted(set(back[back != '.'].tolist()), key=list(KEY).index)
    meta = {
        'source': R.REFS['aurelia'],
        'origin': [ox, oy],
        'pivot': [ANCHOR[0] - ox, ANCHOR[1] - oy],
        'front': [''.join(r) for r in front],
        'back': [''.join(r) for r in back],
        'palette': {ch: KEY[ch] for ch in used},
        'line': LINE,
        'ornament': ''.join(ch for ch in ORNAMENT if ch in used),
        'hairBase': KEY[HAIR_BASE],
        'ornamentBase': KEY[ORNAMENT_BASE],
    }
    tmp = os.path.join(out, 'hair.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'hair.json'))
    if len(sys.argv) > 2:
        write_ts(meta, sys.argv[2])

    def rgba(grid, mark=None):
        im = np.zeros(grid.shape + (4,), np.uint8)
        for (j, i), ch in np.ndenumerate(grid):
            if ch != '.':
                hx = KEY[ch]
                im[j, i] = [int(hx[1:3], 16), int(hx[3:5], 16), int(hx[5:7], 16), 255]
                if mark is not None and mark[j, i] and (i + j) % 2:
                    im[j, i] = [0, 200, 255, 255]
        return im

    R.save(rgba(front), os.path.join(out, 'study', 'front@8.png'))
    R.save(rgba(back, filled), os.path.join(out, 'study', 'back@8.png'))
    # her picture through the head map over the same box: the native pixel under each cell's middle
    H, W = front.shape
    N = R.native('aurelia')
    seg = R.SEGMENTS['aurelia']['head']
    ys, xs = np.mgrid[0:H, 0:W]
    pts = np.stack([(xs + ox + 0.5).ravel(), (ys + oy + 0.5).ravel()], 1)
    hp = np.floor(R.backward(seg, pts)).astype(int)
    hers = np.full((H * W, 3), 255, np.int32)
    ok = (hp[:, 0] >= 0) & (hp[:, 0] < N.shape[1]) & (hp[:, 1] >= 0) & (hp[:, 1] < N.shape[0])
    hers[ok] = N[hp[ok, 1], hp[ok, 0]]
    R.save(hers.reshape(H, W, 3), os.path.join(out, 'study', 'hers@8.png'))
    print('front', int((front != '.').sum()), 'px; back', int((back != '.').sum()), 'px (', int(filled.sum()), 'filled );', len(used), 'colours')


def write_ts(meta, path):
    """The hair as the game's module (src/sprite/items/aureliaHairArt.ts)."""
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    px, py = meta['pivot']
    out = [
        "// Aurelia's hair, the owner's pixels brought down to our scale (tools/refs/aurelia-hair-from-ref.py",
        '// from docs/reference/aurelia-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** Her colours, one character each (both parts share them). */',
        'const AURELIA_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    for part, name, doc in (
        ('front', 'AURELIA_HAIR_FRONT', "Every pixel of her hair over the head: the bun, the ornament, the crown, the bangs, the near lock and the far side. Its pivot is the cell on our face anchor (the near eye's first column, its lash row)."),
        ('back', 'AURELIA_HAIR_BACK', 'The front with the far lock beside the cheek and what her bangs hide filled in, drawn behind the head; also her head\'s outline above the eyes.'),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        out += [f"    '{rw}'," for rw in meta[part]]
        out += ['  ],', '  colors: AURELIA_HAIR_COLORS,', '};', '']
    out += [
        '/** Her black line: kept as she drew it when the hair is recoloured. */',
        f"export const AURELIA_HAIR_LINE = '{meta['line']}';",
        '',
        "/** Her golds (the ornament and the pin): they follow the ornament's colour slot. */",
        f"export const AURELIA_HAIR_ORNAMENT = '{meta['ornament']}';",
        '',
        "/** Her mid blonde, the lit face of most of her locks: the hair colour slot's default; her other blondes and browns follow it. */",
        f"export const AURELIA_HAIR_BASE = '{meta['hairBase']}';",
        '',
        "/** Her gold: the ornament colour slot's default; her other golds follow it. */",
        f"export const AURELIA_ORNAMENT_BASE = '{meta['ornamentBase']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
