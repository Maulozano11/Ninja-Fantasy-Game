"""The owner's hair from his Roman paint-over (docs/reference/roman-owner-reference.jpg) as a hairstyle.

The owner asked for it on 2026-10-23, seeing his Roman look in the game with our default head: "porque no
tenemos la forma de cabeza y cuello de romano en el juego ? cambialo inmediatamente me gusta mas el de mi
dibujo". His Roman picture is our male painted over in his own pixels (tools/refs/roman_ref.py: one of his
pixels is one fine pixel of our sprites). His hair is dark and spiky: a crown of blue-black locks lit in
blue-grey, spikes standing out over the back of the head and the far temple, strands falling over the
forehead, locks framing the ear and a tail of locks down the nape, all inside his black line. This script
lifts it out of his pixels:

  front   every pixel of his hair, as he drew it: his blue-blacks and greys, and his black line round the
          locks and between them. Not his face's own pixels (his forehead, ear, cheek and jaw and their
          line: the 'roman' face, tools/refs/roman-head-from-ref.py) nor his brow-and-lash line, whites and
          irises (the 'roman' eyes, tools/refs/roman-eyes-from-ref.py): where his picture shows face, the
          head and the eye options show. The strands' line over his forehead and cheek is the hair's (the
          head carries his skin over it).
  shade   the shadow his locks cast on his forehead, in his skin's colours (the head leaves it out, so a
          bald head is clean): drawn on the head under the hair, it follows the character's skin.
  back    the same hair with what his face hides filled in: behind the forehead between the strands of
          his fringe and behind his ear his hair goes on (each hidden pixel takes the colour of the
          nearest lock above it, so his locks run on down). Drawn behind the head, it shows only where a
          head is narrower than his; it is also his head's outline at the top (the game trims the skull
          to it).

Both are registered on his face: their pivot is the cell of his on our face anchor (his head is at his own
height on our male, the head 3 px up, tools/refs/roman-head-from-ref.py HEAD_UP), so on his face every
pixel is where he drew it, and the hair turns with the head in every pose as the head does.

It writes, in <out>:

  study/hair@8.png    the front lifted out, at 8x
  study/back@8.png    the back, the filled-in pixels marked
  study/his@8.png     his head there, at 8x

and, with a third argument, the game's module (src/sprite/items/romanHairArt.ts). The same picture always
gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/roman-hair-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/items/romanHairArt.ts
"""

import importlib.util
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import roman_ref as R  # noqa: E402


def _script(name):
    """One of the sibling scripts (their file names have dashes), for its cell maps."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), name)
    spec = importlib.util.spec_from_file_location(name.replace('-', '_')[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


HEAD = _script('roman-head-from-ref.py')
EYES = _script('roman-eyes-from-ref.py')

# Where his hair is: from the tip of the spike on the crown (row 3) to the end of the tail at the nape (row
# 23); the shoulder guard's line starts on row 24.
BOX = (30, 2, 66, 24)  # x0, y0, x1, y1 (exclusive)
# A pixel in the middle of the crown: his hair is what joins it.
SEED = (50, 8)
# His forehead shows between the strands of his fringe down to this row (the row over his eyes); his ear,
# framed by the locks over and behind it, is the skin left of his cheek, rows 15 to 19.
FOREHEAD_TO = 16
EAR_BOX = (44, 15, 48, 20)


def face_cells(kinds='H'):
    """The cells that are his face's own (the head's cells of these kinds: 'H' his pixels) and his eyes'
    (the eyes' features), in his pixels."""
    m = np.zeros((100, 100), bool)
    for j, row in enumerate(HEAD.MAP):
        for i, ch in enumerate(row):
            if ch in kinds:
                m[HEAD.MAP_Y + j, HEAD.MAP_X + i] = True
    eyes = np.zeros((100, 100), bool)
    for name, (x0, y0) in (('near', EYES.NEAR_AT), ('far', EYES.FAR_AT)):
        for r, row in enumerate(EYES.MAP[name]):
            for c, ch in enumerate(row):
                if ch in EYES.FEATURES:
                    eyes[y0 + r, x0 + c] = True
    return m, eyes


def lift(a):
    """The front and back masks and the colours (his, and his continued where the back is hidden)."""
    H, W, _ = a.shape
    bg = R.background(a) | (R.luma(a) > 225)
    K = np.array([[R.kind(a[y, x]) for x in range(W)] for y in range(H)])
    ys, xs = np.mgrid[0:H, 0:W]
    x0, y0, x1, y1 = BOX
    box = (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)
    line = box & ~bg & (K == 'line')
    blue = box & ~bg & (K == 'hair')
    face, eyes = face_cells()

    # The hair: his blue-blacks joined to the crown (through them and his line).
    hair = np.zeros((H, W), bool)
    seen = np.zeros((H, W), bool)
    stack = [(SEED[1], SEED[0])]
    while stack:
        y, x = stack.pop()
        if seen[y, x] or not (blue[y, x] or line[y, x]):
            continue
        seen[y, x] = True
        if blue[y, x]:
            hair[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]

    def n4(m):
        p = np.pad(m, 1)
        return [p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]

    # His line round the hair: line pixels touching his blues, then the line spikes standing out past them
    # (each touching the line already taken and the white around him), then the pixels that close his line
    # between two taken ones. Not the face's own line nor the eyes' (the head and the eye options draw them).
    mine = line & ~face & ~eyes
    ink = mine & np.logical_or.reduce(n4(hair))
    while True:
        more = mine & ~ink & np.logical_or.reduce(n4(ink)) & np.logical_or.reduce(n4(bg))
        if not more.any():
            break
        ink |= more
    ink |= mine & ~ink & (np.sum(n4(ink), axis=0) >= 2)
    # The strands' line over his face: the head carries his skin over every pixel of his features
    # ('e' cells) that is not an eye's, so his line there is the hair's.
    strands, _ = face_cells('e')
    ink |= line & strands & ~eyes
    front = hair | ink

    # The back: the front, and what his face hides behind the fringe and the ear.
    hidden = np.zeros((H, W), bool)
    for y in range(y0, FOREHEAD_TO + 1):
        cols = np.nonzero(front[y])[0]
        if len(cols):
            hidden[y, cols[0]:cols[-1] + 1] = True
    ex0, ey0, ex1, ey1 = EAR_BOX
    hidden[ey0:ey1, ex0:ex1] = True
    hidden &= ~bg & ~front
    col = a.copy()
    filled = front.copy()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not hidden[y, x]:
                continue
            # the nearest of his blues above it (his locks run on down), else beside it
            src = next((col[q, x] for q in range(y - 1, y0 - 1, -1) if filled[q, x] and not line[q, x] and (hair[q, x] or hidden[q, x])), None)
            if src is None:
                src = next(col[y, q] for d in range(1, W) for q in (x - d, x + d) if 0 <= q < W and hair[y, q])
            col[y, x] = src
            filled[y, x] = True
    return front, front | hidden, hidden, col, hair, line


def shade(a, front):
    """The shadow his locks cast on his face: his skin pixels under the hair's reach (the skull's and the
    features' cells of the head) that the head lifts in another colour (it carries his base skin there)."""
    _mask, head_col = HEAD.head(a)
    K = np.array([[R.kind(a[y, x]) for x in range(a.shape[1])] for y in range(a.shape[0])])
    under, _ = face_cells('se')
    _, eyes = face_cells()
    diff = np.abs(head_col - a).max(axis=2) > 3
    # (his darkest shadow there sorts as a brown, 'leather')
    return under & ~eyes & ~front & np.isin(K, ('skin', 'leather')) & diff


def base_colour(a, hair):
    """His blue of middle lightness (half his hair's pixels lighter, half darker): the colour slot's
    default; recoloured, every other colour of his hair moves the way it does."""
    found = sorted((float(R.luma(a[y, x])), R.hexc(a[y, x])) for y, x in zip(*np.nonzero(hair)))
    return found[len(found) // 2][1]


def write_ts(path, front_rows, back_rows, pivot, palette, line_chars, base, shade_part):
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    px, py = pivot
    out = [
        "// The owner's hair on his Roman, his pixels (tools/refs/roman-hair-from-ref.py from",
        '// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of his (both parts share them). */',
        'const ROMAN_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['};', '']
    for rows, name, doc in (
        (front_rows, 'ROMAN_HAIR_FRONT', "Every pixel of his hair, over the head: his blue-blacks and greys and his black line. Its pivot is the cell on our face anchor (the near eye's lash start)."),
        (back_rows, 'ROMAN_HAIR_BACK', "His hair with what his face hides filled in (behind the forehead between the strands of his fringe, and behind his ear), drawn behind the head; also his head's outline at the top."),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        out += [f"    '{rw}'," for rw in rows]
        out += ['  ],', '  colors: ROMAN_HAIR_COLORS,', '};', '']
    rows, (sx, sy), spal = shade_part
    out += [
        "/** The shadow his locks cast on his forehead, in his skin's colours (he painted it in the head's skin): drawn on the head, it follows the character's skin. */",
        'export const ROMAN_HAIR_SHADE: PaintedPart = {',
        f'  pivot: [{sx}, {sy}],',
        '  rows: [',
    ]
    out += [f"    '{rw}'," for rw in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(k)}: '{v}'," for k, v in spal.items()]
    out += ['  },', '};', '']
    out += [
        '/** His black line: kept as he drew it when the hair is recoloured. */',
        f"export const ROMAN_HAIR_LINE = '{line_chars}';",
        '',
        "/** His blue of middle lightness: the colour slot's default; his other colours follow it. */",
        f"export const ROMAN_HAIR_BASE = '{base}';",
        '',
    ]
    R.write(path, '\n'.join(out))


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native(ref)
    H, W, _ = a.shape
    front, back, hidden, col, hair, line = lift(a)
    rows, origin, palette = R.pack(col, back)
    ox, oy = origin
    front_rows = [''.join(ch if front[oy + j, ox + i] else '.' for i, ch in enumerate(rw)) for j, rw in enumerate(rows)]
    # His line keeps its colour when the hair is recoloured; his blues follow the base.
    line_chars = ''.join(ch for ch, h in palette.items() if R.kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]) == 'line')
    base = base_colour(a, hair)
    assert base in palette.values(), 'the base colour is not one of his colours'
    pivot = (HEAD.ANCHOR[0] - ox, HEAD.ANCHOR[1] - oy)
    cast = shade(a, front)
    srows, (sox, soy), spal = R.pack(a, cast)
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], front_rows, rows, pivot, palette, line_chars, base, (srows, (HEAD.ANCHOR[0] - sox, HEAD.ANCHOR[1] - soy), spal))

    def rgba(rws, mark=None):
        im = np.zeros((H, W, 4), np.uint8)
        for j, rw in enumerate(rws):
            for i, ch in enumerate(rw):
                if ch != '.':
                    h = palette[ch]
                    im[oy + j, ox + i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
                    if mark is not None and mark[oy + j, ox + i] and (i + j) % 2:
                        im[oy + j, ox + i] = [0, 200, 255, 255]
        return im[BOX[1]:BOX[3], BOX[0]:BOX[2]]

    R.save(rgba(front_rows), os.path.join(out, 'study', 'hair@8.png'))
    R.save(rgba(rows, hidden), os.path.join(out, 'study', 'back@8.png'))
    R.save(a[BOX[1]:BOX[3] + 2, BOX[0]:BOX[2]], os.path.join(out, 'study', 'his@8.png'))
    print('front', int(front.sum()), 'px; back', int(back.sum()), 'px; shade', int(cast.sum()), 'px;', len(palette), 'colours; line', line_chars, '; base', base, '; pivot', pivot)


if __name__ == '__main__':
    main()
