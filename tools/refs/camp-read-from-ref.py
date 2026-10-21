"""The read pose's book and hands from the owner's camp picture (docs/reference/camp-poses-owner-reference.webp).

His picture is our camp progress sheet (3 sheet pixels per fine pixel of our sprites) painted over by the
owner and saved smaller: his first "leer" (top left, Solen seated, one fist under the chin, the other hand
holding an open leather book up before the face) is in his picture's pixels at

    x = U + (i + 0.5) * PITCH,  y = V + (j + 0.5) * PITCH

for the fine pixel (i, j) of our sheet's figure, which is the pixel (81 + i, 129 + j) of our 256 x 256
frame of Solen's read pose as it was on the sheet (male, frame 0). PITCH, U and V were measured by
lining his figure's legs and feet (which he did not paint) up with our sheet's: 2.148 of his picture's
pixels to one fine pixel (his webp is our 2182 x 1248 sheet scaled to 896 rows, two columns cut out).

The picture is soft (resized and saved as webp), so his pixels are read as the mean of each fine
pixel's middle and sorted into his flat colours: the book's leathers, its page tops and his skin
(k-means over the book's box; `--study` prints that map and writes it beside his picture at 10x).
From that map, cleaned of the blur by hand:

  READ_BOOK      his open book, every pixel in his colours: the left board facing the viewer (a lighter
                 frame round a darker panel), the right board turned away (darker), the spine between,
                 the thick bottom edge, the cream page tops making a V (a thin line on the left, a broad
                 band rising to the upper right), the whole book leaning a little to the right as his
                 does. Its pivot is the far wrist, under his hand on the right board.
  READ_PAGE_TURN a page of the right half turning over to the left in three steps, in his page colours
                 and drawn over his book from the same pivot.
  HAND_CHIN      his fist under the chin, the forearm rising to it from the elbow (the rig draws the
                 forearm; the fist is stamped on the wrist).
  HAND_BOOK      his hand on the book's right board: the back of the hand, fingers up the cover.

The hands are written in our hand shades (o D s b l: line, dark, shadow, base, light), so they take the
character's skin and gloves like every hand of ours. Everything is in his picture's places: in our frame
his pixel (x, y) is (x, y + 1) (our face is one row lower than his), measured from the chin pixel
(rig.ts chinPixel, (120, 159) on the male).

    python3 -I tools/refs/camp-read-from-ref.py src/sprite/readArt.ts [--study <dir>]
"""

import sys

REF = 'docs/reference/camp-poses-owner-reference.webp'
PITCH = 2.1482
U, V = 66.37, 17.10
SHEET = (81, 129)
# His colours for the book (the k-means centres of his book's box that --study prints, 16 colours, seed 1,
# to within a unit), by role. The frame's
# two are read off his picture's own pixels instead (the frame is a pixel or two wide, so the means mix it
# with the line and the panel): its lit outer edge and the frame inside it.
BOOK_COLORS = {
    'o': '#1c0d0a',  # line
    'k': '#2b130d',  # deep shadow (spine, bottom edge)
    'g': '#39231b',  # shadow
    'm': '#401714',  # the right board's panel
    'n': '#532d24',  # the left board's panel
    'f': '#6e4a2b',  # frame
    'h': '#8e6d4d',  # lit frame
    'a': '#9e7668',  # lit edge
    'q': '#ae8f81',  # page tops in shadow
    'c': '#bfa696',  # page tops, half shadow
    'p': '#d0ccc1',  # page tops
    'P': '#ebe8dd',  # page tops in the light
}
# His book in his coordinates (rows from x = 115). Pivot: the far wrist, (134, 173).
BOOK_X0 = 115
BOOK = {
    158: '.......................ooo.',
    159: '......................ocPpo',
    160: '....................ocpPPco',
    161: '...................ocPPPaho',
    162: '....oqqpPPPpcoo...oqPPqgkko',
    163: '...oggghqqpPPPco.oqPpcgnno.',
    164: '...ohfnnnghqpPPPckPpannfno.',
    165: '...ohfffhhngkkapppahknfngo.',
    166: '...ohfnnnnhfffgfhggmffnfgo.',
    167: '..ohfnnnnnnnnnfkhmmmmfhggo.',
    168: '..ohfnnnnnnnnnfkhmmmmfhggo.',
    169: '..ohfnnnnnnnnnfkhmmmmfhggo.',
    170: '..ohfnnnnnnnnfkhmmmmfhggo..',
    171: '.ohfnnnnnnnnnfkhmmmmfhggo..',
    172: '.ohfnnnnnnnnnfkhmmmmfhggo..',
    173: '.ohfnnnnnnnnnfkhmmmmfhggo..',
    174: '.ohffnnnnnnnfkhmmmmfhggo...',
    175: '.offfffffffffkfffffffggo...',
    176: '..oggggggggggkggggggggo....',
    177: '...ooooooooooooooooooo.....',
}
PIVOT = (134, 173)
# The gutter at the bottom of the V, where a turning page is hinged.
GUTTER = (131, 164)
# A turning page's top edge sweeping round the spine, as (degrees from the right, counter-clockwise;
# length): lifting off the right half, pointing at the reader (seen end on, so shorter), settling onto
# the left half. The V's own arms are at about 34 and 165 degrees.
TURN = [(58, 8.5), (92, 6.0), (128, 8.5)]

# His hand under the chin (rows from x = 117): the forearm rises to the wrist at its lower left and the
# hand lies level under the jaw, its fingers reaching forward past the chin, lit on top, their ends in
# dark skin. Pivot on the wrist (117, 162).
CHIN_X0, CHIN_Y0 = 117, 158
CHIN = [
    '....ooooooo...',
    '..oobllllllbo.',
    '.osbbllllbbsDo',
    'osbbbbbbsDDoo.',
    'os.ooooooo....',
]
CHIN_WRIST = (117, 162)
# His hand on the right board (rows from x = 130), as his picture shows it at its own resolution: four
# fingers up the cover a pixel apart with the board between them, the outer one shortest, their tips
# lit; the back of the hand broad below them, lit in the middle, narrowing to the wrist; its outer
# side on the board's edge. Pivot on the wrist (134, 173), in the palm, so the forearm behind it
# stays hidden.
HAND_X0, HAND_Y0 = 130, 168
HAND = [
    '.....o.o..',
    '...o.l.lo.',
    '.o.l.b.bo.',
    '.l.b.b.bo.',
    'obsbsbssDo',
    'osbbllbsDo',
    '.obbbbbsDo',
    '..osbbsDo.',
    '...ossDo..',
    '....ooo...',
]
HAND_WRIST = (134, 173)


def page(deg, length):
    """A turning page's top edge: a strip two pixels wide from the gutter, light on its upper side, outlined."""
    import math
    cx, cy = GUTTER
    a = math.radians(deg)
    dx, dy = math.cos(a), -math.sin(a)
    # the side the light comes from (upper left)
    nx, ny = -dy, dx
    if nx * -0.7 + ny * -0.7 < 0:
        nx, ny = -nx, -ny
    cells = {}
    for k in range(1, int(length * 4) + 1):
        t = k / 4
        x, y = cx + 0.5 + dx * t, cy + 0.5 + dy * t
        cells[(int(math.floor(x)), int(math.floor(y)))] = 'P'
        x2, y2 = x - nx * 1.0, y - ny * 1.0
        c2 = (int(math.floor(x2)), int(math.floor(y2)))
        if c2 not in cells:
            cells[c2] = 'q'
    out = dict(cells)
    for (x, y) in cells:
        for ex, ey in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + ex, y + ey)
            if n not in cells and n[1] <= cy:
                out[n] = 'o'
    return out


def rows_of(cells):
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    rows = []
    for y in range(y0, y1 + 1):
        rows.append(''.join(cells.get((x, y), '.') for x in range(x0, x1 + 1)).rstrip('.'))
    return rows, (x0, y0)


def ts_rows(rows):
    return '\n'.join(f"    '{r}'," for r in rows)


def write(path):
    book_rows = [BOOK[y] for y in sorted(BOOK)]
    y0 = min(BOOK)
    bp = (PIVOT[0] - BOOK_X0, PIVOT[1] - y0)
    turns = []
    for deg, length in TURN:
        rows, (x0, ty0) = rows_of(page(deg, length))
        turns.append((rows, (PIVOT[0] - x0, PIVOT[1] - ty0), deg))
    colors = '\n'.join(f"    {k}: '{v}'," for k, v in BOOK_COLORS.items())
    out = [
        "// The read pose's book and hands, lifted from the owner's camp picture",
        '// (docs/reference/camp-poses-owner-reference.webp, his first "leer") by',
        '// tools/refs/camp-read-from-ref.py. Generated: rerun the script to change it.',
        '',
        "import type { PixelTemplate } from './rotsprite';",
        '',
        '/** A prop painted in his colours: one character per colour; \'.\' is empty. */',
        'export interface PaintedProp extends PixelTemplate {',
        '  colors: Record<string, string>;',
        '}',
        '',
        '/** His colours for the book (and its turning pages): line, shadows, panels, frames, page tops. */',
        'export const READ_BOOK_COLORS: Record<string, string> = {',
        colors,
        '};',
        '',
        '/**',
        ' * His open book, held up before the face and tilted toward it: the left board facing the viewer',
        ' * (a lighter frame round a darker panel), the right board turned away, the spine between them, the',
        ' * thick bottom edge, and the cream page tops making a V, a thin line on the left and a broad band',
        ' * rising to the upper right. The pivot is the far wrist, under his hand on the right board.',
        ' */',
        'export const READ_BOOK: PaintedProp = {',
        f'  pivot: [{bp[0]}, {bp[1]}],',
        '  rows: [',
        ts_rows(book_rows),
        '  ],',
        '  colors: READ_BOOK_COLORS,',
        '};',
        '',
        '/**',
        ' * A page of the right half turning over to the left, in three steps (lifting off, standing over the',
        ' * spine, settling onto the left half), hinged at the bottom of the V. Stamped over the book at its',
        ' * pivot, in its colours.',
        ' */',
        'export const READ_PAGE_TURN: PaintedProp[] = [',
    ]
    for rows, pv, deg in turns:
        out += ['  {', f'    pivot: [{pv[0]}, {pv[1]}],', '    rows: [']
        out += [f"      '{r}'," for r in rows]
        out += ['    ],', '    colors: READ_BOOK_COLORS,', '  },']
    out += [
        '];',
        '',
        '/**',
        ' * His fist under the chin: the hand at the end of the forearm rising from the elbow turns level',
        ' * under the chin, the back of the curled fingers lit on top where the chin rests on them, the',
        ' * finger ends below. In our hand shades (o D s b l), stamped unrotated, the pivot on the wrist at',
        ' * its lower left.',
        ' */',
        'export const HAND_CHIN: PixelTemplate = {',
        f'  pivot: [{CHIN_WRIST[0] - CHIN_X0}, {CHIN_WRIST[1] - CHIN_Y0}],',
        '  rows: [',
        ts_rows(CHIN),
        '  ],',
        '};',
        '',
        '/**',
        ' * His hand holding the book up by its right board: the back of the hand over the cover, the fingers',
        ' * up the board with dark skin between them, the light on their tips and knuckles. In our hand',
        ' * shades, stamped unrotated, the pivot on the wrist under it.',
        ' */',
        'export const HAND_BOOK: PixelTemplate = {',
        f'  pivot: [{HAND_WRIST[0] - HAND_X0}, {HAND_WRIST[1] - HAND_Y0}],',
        '  rows: [',
        ts_rows(HAND),
        '  ],',
        '};',
        '',
    ]
    with open(path, 'w') as f:
        f.write('\n'.join(out))


def study(outdir):
    """His first leer at our fine pixels, sorted into 16 of his colours, beside our book at 10x."""
    import os

    import numpy as np
    from PIL import Image

    a = np.asarray(Image.open(REF).convert('RGB')).astype(float)

    def box(cx, cy, r=0.55):
        acc = np.zeros(3)
        for yy in np.linspace(cy - r, cy + r, 5):
            for xx in np.linspace(cx - r, cx + r, 5):
                x0, y0 = int(np.floor(xx)), int(np.floor(yy))
                fx, fy = xx - x0, yy - y0
                acc += (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy)
                        + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)
        return acc / 25

    his = np.zeros((95, 69, 3))
    for j in range(95):
        for i in range(69):
            his[j, i] = box(U + (i + 0.5) * PITCH, V + (j + 0.5) * PITCH)
    # the book's box in our frame
    bx0, by0, bx1, by1 = 114, 156, 143, 180
    reg = his[by0 - SHEET[1]:by1 - SHEET[1], bx0 - SHEET[0]:bx1 - SHEET[0]].reshape(-1, 3)
    rng = np.random.default_rng(1)
    C = reg[rng.choice(len(reg), 16, replace=False)]
    for _ in range(60):
        L = ((reg[:, None] - C[None]) ** 2).sum(2).argmin(1)
        for c in range(16):
            if (L == c).any():
                C[c] = reg[L == c].mean(0)
    C = C[np.argsort(C @ np.array([0.299, 0.587, 0.114]))]
    L = ((reg[:, None] - C[None]) ** 2).sum(2).argmin(1).reshape(by1 - by0, bx1 - bx0)
    chars = '0123456789abcdef'
    print('his book, 16 colours (x from %d):' % bx0)
    for j in range(by1 - by0):
        print('%3d ' % (by0 + j) + ''.join(chars[v] for v in L[j]))
    for c in range(16):
        print(chars[c], '#%02x%02x%02x' % tuple(int(round(v)) for v in C[c]))
    os.makedirs(outdir, exist_ok=True)
    k = 10
    left = Image.fromarray(np.clip(his, 0, 255).astype(np.uint8)).resize((69 * k, 95 * k), Image.NEAREST)
    ours = np.tile(np.array([38, 42, 58.]), (95, 69, 1))
    hexrgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
    for y, r in BOOK.items():
        for i, ch in enumerate(r):
            if ch != '.':
                ours[y - SHEET[1], BOOK_X0 + i - SHEET[0]] = hexrgb(BOOK_COLORS[ch])
    right = Image.fromarray(ours.astype(np.uint8)).resize((69 * k, 95 * k), Image.NEAREST)
    im = Image.new('RGB', (69 * k * 2 + 10, 95 * k))
    im.paste(left, (0, 0))
    im.paste(right, (69 * k + 10, 0))
    im.save(os.path.join(outdir, 'camp-read-study.png'))


if __name__ == '__main__':
    write(sys.argv[1])
    if '--study' in sys.argv:
        study(sys.argv[sys.argv.index('--study') + 1])
