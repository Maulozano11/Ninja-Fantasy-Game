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
  HAND_CHIN      his hand under the chin, his pixels: two rows of lit skin lying level under the jaw,
                 outlined, from the wrist to the fingers' ends past the chin.
  FOREARM_CHIN   his forearm rising to it, his pixels: a broad block from the elbow (its lower left,
                 where the sleeve ends) up to the book's top left corner, lit along its right side with
                 a pale rim, in shadow along its top left edge; the wrist turns up from its top corner
                 to the hand.
  HAND_BOOK      his hand on the book's right board, his pixels: three fingers up the cover a pixel
                 apart with the board between them and a short one on the outside, the back of the
                 hand below them, in the darker, redder skin of a hand in shadow.

The hands and the forearm are his pixels at his size, read at each fine pixel's middle and sorted by
their brightness into his flat skin steps (o D s b l h on the near arm: line, dark, shadow, base, light,
rim; o k d m t on the book hand: line, darkest, dark, mid, lit), each step his colour: the mean of his
samples of it (inside cells; the line from its darker half, an edge step from its lighter half, the
rest being the webp's blur into what they border). `--study` writes his picture at our grid beside them.
A character's skin moves his colours as far as READ_SKIN (his base) is from it; gloves and sleeves take
his steps as their own shades (READ_STEPS). Everything is in his picture's places: in our frame his pixel
(x, y) is (x, y + 1) (our face is one row lower than his), measured from the chin pixel (rig.ts
chinPixel, (120, 159) on the male).

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

# His near arm and his hand on the book, as (x0, y0, rows) in his picture's pixels, one letter per fine
# pixel: his samples sorted by brightness into his steps (the Y thresholds in STEP_Y), cleaned of the
# webp's blur (a line under the jaw where the chin's line and the hand's top blur together; the edge
# cells that fall between two steps taken to the one the cells beside them are in).
# His hand under the chin: two rows of skin lying level under the jaw from the wrist to the fingers' ends
# past the chin, lit (the rim of light on top in the middle), its ends in shadow, outlined.
CHIN_HAND = (119, 158, [
    'oooooooo',
    'oDDbhlbso',
    'obbllllbDo',
    '.Doooooooo',
])
# His forearm: a broad block from the elbow at its lower left (where the sleeve ends, his line closing
# it) up to the book's top left corner, the lit side toward the book with a pale rim along it, the top
# left edge in shadow; the wrist turns up from its top corner to the hand under the chin. The line down
# its right side is the book's left edge (the book is drawn over it).
CHIN_FORE = (108, 160, [
    '..........o',
    '.........oDs',
    '........oDo',
    '......ooDbo',
    '....ooDshbo',
    '..ooDDbhhbo',
    '..osssllhbo',
    '.osbbbllho',
    'ossbblllho',
    'oosbblllho',
    '.oDsbllhDo',
    '..oDsbbbo',
    '...oDsDso',
    '....ooooo',
])
# His hand on the right board: three fingers up the cover a pixel apart with the board between them and a
# short one on the outside, lit at the tips of two; the back of the hand below them, lit toward the
# book's edge, outlined below and down its outer side.
BOOK_HAND = (131, 170, [
    '...d.t.d',
    '...m.m.d',
    '.d.t.d.d',
    'odmmmmdd',
    'okmmmtto',
    '.okdmmko',
    '.okdmko',
    '.ooooo',
])
# Brightness (Y) below which a sample is each step: the near arm, the book hand.
STEP_Y = {'arm': [(75, 'o'), (150, 'D'), (175, 's'), (195, 'b'), (205.5, 'l'), (999, 'h')],
          'book': [(70, 'o'), (112, 'k'), (128, 'd'), (150, 'm'), (999, 't')]}
# His colours for the steps (the means `--study` prints, to within a unit).
ARM_COLORS = {
    'o': '#27150f',  # line
    'D': '#9c7a68',  # dark
    's': '#ce9b86',  # shadow
    'b': '#e4ad93',  # base
    'l': '#f1bb9d',  # light
    'h': '#f4c4aa',  # rim
}
BOOK_HAND_COLORS = {
    'o': '#20120e',  # line
    'k': '#8c5e52',  # darkest
    'd': '#9d6f66',  # dark
    'm': '#bb786b',  # mid
    't': '#c48f87',  # lit
}
# His base skin, which a character's skin replaces.
SKIN = ARM_COLORS['b']
# His steps as our ramp shades (for gloves, sleeves and bracers on his shapes).
STEPS = {'o': 0, 'D': 1, 's': 2, 'b': 3, 'l': 4, 'h': 4, 'k': 1, 'd': 2, 'm': 3, 't': 4}
# The wrists (the rig's: chin pixel + READ_HOLD), his pixels: the pivots.
CHIN_WRIST = (117, 162)
HAND_WRIST = (134, 173)
# Under a glove that leaves the fingers bare: the hand under the chin up to its knuckles (this many
# pixels right of the wrist), the hand on the book below its fingers (this many rows below the wrist).
KNUCKLES = {'chin': 6, 'book': 0}


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
    def piece(name, spec, wrist, colors, doc):
        x0, y0, rows = spec
        return ['/**'] + [f' * {d}' for d in doc] + [' */', f'export const {name}: PaintedProp = {{',
                f'  pivot: [{wrist[0] - x0}, {wrist[1] - y0}],', '  rows: [', ts_rows(rows), '  ],',
                f'  colors: {colors},', '};', '']

    hexes = lambda d: '\n'.join(f"  {k}: '{v}'," for k, v in d.items())
    out += [
        '];',
        '',
        '/** His skin on the read pose\'s hands and forearm (his base, the \'b\' step): a character\'s skin moves them as far. */',
        f"export const READ_SKIN = '{SKIN}';",
        '',
        '/** His colours for the near arm\'s steps: line, dark, shadow, base, light, the pale rim. */',
        'export const READ_ARM_COLORS: Record<string, string> = {',
        hexes(ARM_COLORS),
        '};',
        '',
        '/** His colours for the hand on the book (a hand in shadow, darker and redder): line, darkest, dark, mid, lit. */',
        'export const READ_BOOK_HAND_COLORS: Record<string, string> = {',
        hexes(BOOK_HAND_COLORS),
        '};',
        '',
        '/** His steps as our ramp shades, for gloves, sleeves and bracers drawn on his shapes. */',
        'export const READ_STEPS: Record<string, number> = {',
        hexes(STEPS).replace("'", ''),
        '};',
        '',
    ]
    out += piece('HAND_CHIN', CHIN_HAND, CHIN_WRIST, 'READ_ARM_COLORS', [
        'His hand under the chin, his pixels at his size: two rows of skin lying level under the jaw from the',
        'wrist to the fingers\' ends past the chin, lit, its ends in shadow, outlined. Stamped unrotated, the',
        'pivot on the near wrist (its lower left, where the forearm\'s wrist turns up to it).'])
    out += piece('FOREARM_CHIN', CHIN_FORE, CHIN_WRIST, 'READ_ARM_COLORS', [
        'His forearm rising to the hand under the chin, his pixels at his size: a broad block from the elbow',
        'at its lower left (where the sleeve ends, closed by his line) up to the book\'s top left corner, lit',
        'toward the book with a pale rim, its top left edge in shadow; the wrist turns up from its top corner',
        'to the hand. The line down its right side is the book\'s left edge. Same pivot as HAND_CHIN.'])
    out += piece('HAND_BOOK', BOOK_HAND, HAND_WRIST, 'READ_BOOK_HAND_COLORS', [
        'His hand holding the book up by its right board, his pixels at his size: three fingers up the cover a',
        'pixel apart with the board between them and a short one on the outside, the back of the hand below',
        'them, outlined below and down its outer side. Stamped unrotated, the pivot on the far wrist (the',
        'book\'s pivot).'])
    out += [
        '/**',
        ' * Under a glove that leaves the fingers bare: the hand under the chin up to its knuckles (pixels right',
        ' * of the wrist), the hand on the book below its fingers (rows below the wrist).',
        ' */',
        f"export const READ_KNUCKLES = {{ chin: {KNUCKLES['chin']}, book: {KNUCKLES['book']} }};",
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
    study_hands(a, outdir)


def study_hands(a, outdir):
    """His near arm and book hand at our grid: his steps by brightness, the means per step, and his
    picture beside the cleaned maps in his colours (12x)."""
    import os

    import numpy as np
    from PIL import Image, ImageDraw

    def bil(x, y):
        x0, y0 = int(np.floor(x)), int(np.floor(y))
        fx, fy = x - x0, y - y0
        return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy)
                + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)

    def fine(sx, sy, r=0.25):
        """Our sprite pixel (sx, sy) of the sheet: his samples over its middle (+-r of a fine pixel)."""
        cx = U + (sx - SHEET[0] + 0.5) * PITCH - 0.5
        cy = V + (sy - SHEET[1] + 0.5) * PITCH - 0.5
        return np.mean([bil(xx, yy) for yy in np.linspace(cy - r * PITCH, cy + r * PITCH, 3)
                        for xx in np.linspace(cx - r * PITCH, cx + r * PITCH, 3)], 0)

    lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    for name, (x0, y0, x1, y1), steps in (('near arm', (106, 156, 130, 175), STEP_Y['arm']),
                                          ('book hand', (129, 168, 141, 179), STEP_Y['book'])):
        print(f'his {name}, steps by brightness (x from {x0}):')
        for y in range(y0, y1):
            row = ''
            for x in range(x0, x1):
                c = fine(x, y)
                warm = c[0] - c[2] > 25 and c[0] > 90
                Y = lum(c)
                row += 'o' if Y < steps[0][0] else ('.' if not warm else next(ch for t, ch in steps if Y < t))
            print('%4d ' % y + row)

    def cells(spec):
        x0, y0, rows = spec
        return {(x0 + i, y0 + j): ch for j, r in enumerate(rows) for i, ch in enumerate(r) if ch != '.'}

    arm = {**cells(CHIN_FORE), **cells(CHIN_HAND)}
    book = cells(BOOK_HAND)
    for name, cs in (('near arm', arm), ('book hand', book)):
        print(f'his {name}, mean per step:')
        by = {}
        for (x, y), ch in cs.items():
            inner = all(cs.get((x + dx, y + dy), '.') not in '.o' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            d = by.setdefault(ch, ([], []))
            d[1].append(fine(x, y))
            if inner:
                d[0].append(fine(x, y))
        for ch, (inner, every) in by.items():
            s = sorted(every, key=lambda c: c.sum())
            if ch == 'o':
                m = np.mean(s[:max(1, len(s) // 2)], 0)
            elif len(inner) >= 2:
                m = np.mean(inner, 0)
            else:
                m = np.mean(s[len(s) // 2:], 0)
            print(' ', ch, '#%02x%02x%02x' % tuple(int(round(v)) for v in m))
    k = 12
    x0, y0, x1, y1 = 104, 154, 142, 180
    W, H = (x1 - x0) * k, (y1 - y0) * k
    left = Image.new('RGB', (W, H))
    right = Image.new('RGB', (W, H))
    dl, dr = ImageDraw.Draw(left), ImageDraw.Draw(right)
    box = lambda x, y: [(x - x0) * k, (y - y0) * k, (x - x0 + 1) * k - 1, (y - y0 + 1) * k - 1]
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = tuple(int(round(v)) for v in fine(x, y))
            dl.rectangle(box(x, y), fill=c)
            dr.rectangle(box(x, y), fill=c)
    hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
    for cs, pal in ((arm, ARM_COLORS), (book, BOOK_HAND_COLORS)):
        for (x, y), ch in cs.items():
            dr.rectangle(box(x, y), fill=hexrgb(pal[ch]))
    im = Image.new('RGB', (W * 2 + 10, H))
    im.paste(left, (0, 0))
    im.paste(right, (W + 10, 0))
    im.save(os.path.join(outdir, 'camp-read-hands-study.png'))


if __name__ == '__main__':
    write(sys.argv[1])
    if '--study' in sys.argv:
        study(sys.argv[sys.argv.index('--study') + 1])
