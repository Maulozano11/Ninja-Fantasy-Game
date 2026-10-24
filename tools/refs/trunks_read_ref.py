"""The owner's two frames of Trunks reading (docs/reference/trunks-read-owner-reference.jpg), for
trunks-read-from-ref.py.

His picture (2000 x 1493, 2026-10-22) is our Trunks (the Trunks 2 look: lilac hair, the traveller's
hooded cape, the short-sleeved shirt with his bare arms, black fingerless gloves, the belt, green cargo
trousers, leather boots, the crystal greatsword stowed on the back) in our read pose, painted over by him,
sitting on a low grey rock: in the first frame an open book held before him in both gloved hands, in the
second the book shut, held in the far hand at the chest, the near forearm across. His words: "mira la
diferencia y copiala"; and of the waist, "tiene un bug que hace el esten pixeles muertos blancos en la
cintura entre el pantalon y el cinturon rellenalos".

His grid: his cells are about 17.3 picture pixels across and 16.8 down (the picture was stretched a little
more across than down), drifting over it; owner_paintover.native finds it in each frame's box. He drew
Trunks at OUR scale: one of his cells is one fine pixel of our sprite (his head, his cape, his boots lie
on our read frame's pixel for pixel), so every pixel is taken one for one, where he painted it over our
read frame (OFFSET; his boots and rock are the same pixels in both frames).

The boxes split his picture in the middle of the white gap between his two frames (picture columns 980 to
1034 are empty), so neither box holds anything of the other frame, and no part of his Trunks is near a
box's edge (FRAME_EDGE: his figure keeps clear of the box's outer cells, which the grid read leaves
half-read).

Every pixel of a frame belongs to one owner, the option of his Trunks that draws it: the hair, the face,
the cape, the shirt (with his bare arms), the gloves, the belt, the trousers, the boots, the stowed sword,
the book (the camp's prop) and the rock (the seat prop, seats.ts, never his Trunks'). ZONES says which:
a pixel takes the owner of the last zone it falls in whose rule takes its colour. His black line goes
with every owner it touches.
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_paintover as P  # noqa: E402

REF = os.path.join(P.REPO, 'docs', 'reference', 'trunks-read-owner-reference.jpg')
PITCH = (17.3, 16.8)
BOXES = [(0, 0, 1007, 1493), (1007, 0, 2000, 1493)]
# Frame k's cell (x, y) is our fine pixel (x + OFFSET[k][0], y + OFFSET[k][1]): his head and boots on our read
# frame's (he painted over it); in the second frame's box his boots and rock are one column further left.
OFFSET = [(83, 130), (84, 130)]
PAGE = (255, 255, 255)
PAGE_TOL = 40
TOL = 12
LINE = 45
# The box's outer cells the grid read leaves half-read; his figure keeps clear of them.
FRAME_EDGE = 2
NAMES = ['Leyendo (libro abierto)', 'Libro cerrado']

_CACHE = {}


def frame(k):
    """Frame k: (merged colours (rows, cols, 3), figure mask, line mask), the figure being his pixels that
    are not his white page."""
    if k in _CACHE:
        return _CACHE[k]
    a = P.native(REF, BOXES[k], PITCH)
    fg = np.abs(a - np.array(PAGE)).max(2) > PAGE_TOL
    H, W = fg.shape
    edge = np.zeros_like(fg)
    edge[:FRAME_EDGE] = edge[-FRAME_EDGE:] = True
    edge[:, :FRAME_EDGE] = edge[:, -FRAME_EDGE:] = True
    fg &= ~edge
    # His own whites inside the figure (the white of his eyes, the book's blank page) are his pixels;
    # the white at his waist is the gap he asked to have filled (fill_waist), not his figure.
    fg |= enclosed(fg) & ~P.inside(WAIST[k]['box'], H, W)
    m = P.merge(a, fg, TOL)
    line = fg & (m.max(2) < LINE)
    _CACHE[k] = (m, fg, line)
    return _CACHE[k]


# ---------------------------------------------------------------------------
# What each of his colours is (the rules ZONES apply)
# ---------------------------------------------------------------------------

def _hls(m):
    r, g, b = (m[..., i] / 255.0 for i in range(3))
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    light = (mx + mn) / 2
    d = mx - mn
    with np.errstate(divide="ignore", invalid="ignore"):
        sat = np.where(d == 0, 0, d / np.where(light > 0.5, 2 - mx - mn, mx + mn + 1e-9))
    hue = np.zeros_like(mx)
    rr = (mx == r) & (d > 0)
    gg = (mx == g) & (d > 0) & ~rr
    bb = (d > 0) & ~rr & ~gg
    hue[rr] = ((g - b)[rr] / d[rr]) % 6
    hue[gg] = (b - r)[gg] / d[gg] + 2
    hue[bb] = (r - g)[bb] / d[bb] + 4
    return hue * 60, light, sat


def skin(m):
    """His skin, lit and shaded (the light skin, its oranges and his reddish shadows), and the book's
    cream (the zones tell them apart)."""
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    return ((r > 190) & (g > 110) & (r - b > 40)) | ((r > 140) & (g < r * 0.66) & (r - b > 40))


def eye(m):
    """The blue of his eyes."""
    h, light, s = _hls(m)
    return (s > 0.8) & (h > 200) & (h < 240)


def lilac(m):
    """His hair's lilacs and its dark purples and navies (and the sword's steel blues)."""
    h, light, s = _hls(m)
    return (h >= 200) & (h <= 280) & ~eye(m) & (m.max(2) >= LINE)


def green(m):
    h, light, s = _hls(m)
    return (h >= 60) & (h <= 120) & (s >= 0.08)


def grey(m):
    """The rock's warm greys and the gloves' charcoal (low saturation)."""
    h, light, s = _hls(m)
    return (s < 0.2) & ~green(m) & (m.max(2) >= LINE)


def brown(m):
    """His browns, tans and maroons: the cape, the belt, the boots, the book's cover (not his skin)."""
    h, light, s = _hls(m)
    return ((h < 60) | (h > 300)) & (s >= 0.2) & ~skin(m) & (m.max(2) >= LINE)


def cream(m):
    """The book's pages and the buckle's cream."""
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    return (r > 190) & (g > 160) & (b > 110) & (r - b < 90)


def white(m):
    """His whites: the white of the eyes, the book's blank page."""
    return m.min(2) > 230


def either(*rules):
    return lambda m: np.logical_or.reduce([f(m) for f in rules])


def box(x0, y0, x1, y1):
    """Cells x0..x1-1, y0..y1-1 as a polygon of corners."""
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


# ---------------------------------------------------------------------------
# Who draws each pixel
# ---------------------------------------------------------------------------

# Per frame, in its own cells: (owner, polygon, rule). A pixel takes the owner of the last zone it falls in
# whose rule takes its colour; a pixel no zone takes goes with the nearest owner (owner_paintover.own_lines).
ZONES = {
    # Leyendo: the open book in both gloved hands, the far forearm bare under it
    0: [
        ('cape', box(0, 14, 50, 80), brown),
        ('hair', box(21, 2, 52, 26), lilac),
        ('held', [(9, 7), (16, 7), (24, 15), (24, 18), (18, 19), (9, 11)], either(lilac, grey)),
        ('face', box(27, 14, 47, 32), either(skin, eye, white)),
        ('top', box(15, 26, 52, 62), lilac),
        ('top', box(15, 32, 56, 56), skin),
        ('hands', box(30, 40, 41, 51), grey),
        ('hands', box(46, 40, 58, 52), grey),
        ('book', box(36, 34, 55, 44), either(cream, brown)),
        # the book's ribbon, hanging between his hands
        ('book', box(44, 44, 46, 53), brown),
        ('waist', box(18, 48, 40, 56), either(brown, cream)),
        ('waist', box(35, 55, 40, 66), brown),
        ('bottom', box(15, 48, 56, 78), green),
        ('feet', box(26, 72, 58, 90), brown),
        ('seat', box(0, 63, 44, 90), either(grey, lilac)),
        ('cape', box(0, 60, 26, 78), brown),
    ],
    # Libro cerrado: the book shut in the far hand at the chest, the near forearm across
    1: [
        ('cape', box(0, 14, 50, 80), brown),
        ('hair', box(20, 2, 50, 26), lilac),
        ('held', [(8, 7), (13, 7), (21, 15), (21, 18), (16, 19), (8, 11)], either(lilac, grey)),
        ('face', box(25, 14, 45, 32), either(skin, eye, white)),
        ('top', box(15, 26, 50, 62), lilac),
        ('top', box(15, 32, 50, 56), skin),
        ('book', box(37, 31, 52, 41), either(cream, brown, grey)),
        ('hands', box(33, 40, 46, 47), either(grey, lilac)),
        ('hands', box(42, 31, 47, 36), skin),
        ('hands', box(37, 36, 40, 41), skin),
        ('hands', box(42, 39, 47, 45), skin),
        ('waist', box(17, 47, 40, 56), either(brown, cream)),
        ('waist', box(34, 55, 39, 65), brown),
        ('bottom', box(14, 48, 55, 78), green),
        ('feet', box(25, 72, 57, 90), brown),
        ('seat', box(0, 63, 43, 90), either(grey, lilac)),
        ('cape', box(0, 60, 25, 78), brown),
    ],
}

# The white dead pixels at his waist, between the trousers and the belt (the owner: "tiene un bug que hace
# el esten pixeles muertos blancos en la cintura entre el pantalon y el cinturon rellenalos"), per frame in
# its own cells: the box they lie in and, where the white opens out past the far hip (the second frame,
# whose far arm is up at the book), the corner of the far thigh's top line from which that line goes on up
# on its own slant to close the hip (fill_waist).
WAIST = {
    0: {'box': box(37, 46, 47, 55)},
    1: {'box': box(36, 45, 47, 54), 'corner': (40, 51)},
}


def owners(k):
    """Frame k's owner per pixel, and each owner's mask with his line round it (owner_paintover.own_lines)."""
    m, fg, line = frame(k)
    H, W = fg.shape
    own = np.full((H, W), '', object)
    for owner, poly, rule in ZONES[k]:
        z = P.inside(poly, H, W) & fg & ~line
        z &= rule(m)
        own[z] = owner
    own, masks = P.own_lines(rock_specks(own), fg, line)
    return own, rock_gaps(masks)


# The fewest pixels a patch of his rock has: a speck of a rock's grey inside his clothes (a dark shade of
# the trousers) is the clothes', not the rock's, so leaving the rock out never opens a hole in him.
ROCK_LEAST = 12


def rock_gaps(masks, owner='seat'):
    """masks with every pixel of the rock that would leave a dead pixel in his figure once the rock is left
    out (a 1 px crack across or down between his pixels, or a pocket of 4 or fewer they wall in: the rock
    showing between his cape and his leg) given to the owner beside it, in his colour. Returns a copy."""
    masks = {o: mk.copy() for o, mk in masks.items()}
    others = [o for o in sorted(masks) if o != owner]
    H, W = masks[owner].shape
    while True:
        fig = np.logical_or.reduce([masks[o] for o in others])
        rock = masks[owner] & ~fig
        on = lambda y, x: 0 <= y < H and 0 <= x < W and fig[y, x]
        dead = set()
        for y, x in zip(*np.nonzero(rock)):
            if (on(y, x - 1) and on(y, x + 1)) or (on(y - 1, x) and on(y + 1, x)):
                dead.add((y, x))
        # pockets: rock cells (side by side) of 4 or fewer, walled in by his figure
        seen = np.zeros((H, W), bool)
        for y0, x0 in zip(*np.nonzero(rock)):
            if seen[y0, x0]:
                continue
            comp, open_ = [(y0, x0)], False
            seen[y0, x0] = True
            for y, x in comp:
                for q in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if not (0 <= q[0] < H and 0 <= q[1] < W):
                        open_ = True
                    elif rock[q] and not seen[q]:
                        seen[q] = True
                        comp.append(q)
                    elif not rock[q] and not fig[q]:
                        open_ = True
            if not open_ and len(comp) <= 4:
                dead.update(comp)
        if not dead:
            return masks
        for y, x in sorted(dead):
            for q in ((y - 1, x), (y, x - 1), (y, x + 1), (y + 1, x)):
                if on(*q):
                    o = next(o for o in others if masks[o][q])
                    masks[o][y, x] = True
                    break


def rock_specks(own, owner='seat'):
    """own with every patch of the rock (side by side) smaller than ROCK_LEAST given back to his figure
    (to the nearest owner, owner_paintover.own_lines)."""
    own = own.copy()
    H, W = own.shape
    seen = np.zeros((H, W), bool)
    for y0, x0 in zip(*np.nonzero(own == owner)):
        if seen[y0, x0]:
            continue
        comp = [(y0, x0)]
        seen[y0, x0] = True
        for y, x in comp:
            for q in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= q[0] < H and 0 <= q[1] < W and not seen[q] and own[q] == owner:
                    seen[q] = True
                    comp.append(q)
        if len(comp) < ROCK_LEAST:
            for q in comp:
                own[q] = ''
    return own


def enclosed(fg):
    """The cells of his white that the figure walls in (not reached from the box's edge)."""
    H, W = fg.shape
    out = ~fg.copy()
    seen = np.zeros_like(fg)
    stack = [(y, x) for y in range(H) for x in (0, W - 1)] + [(y, x) for x in range(W) for y in (0, H - 1)]
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= H or x >= W or seen[y, x] or fg[y, x]:
            continue
        seen[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return out & ~seen


def fill_waist(k, m, fg, line, own):
    """The white at his waist filled with his own cloth, the way his Roman skirt's cloth was continued
    behind the fist (the owner: never a square block, cut on the cloth's own slant). Each white cell takes
    the cloth he drew to its left in its row: a line that runs along the row (the belt's edge, the thigh's
    top line) runs on, a line that only crosses it (the shirt's edge) is stepped over to the cloth behind
    it. Where the white opens out past the far hip, the far thigh's top line goes on up from its corner one
    column a row, as he drew it below, until it meets the arm above, his black line along it, and only the
    cells inside it are filled. Returns {(x, y): (hex, owner)}, the filled cells, the line ones included."""
    H, W = fg.shape
    spec = WAIST[k]
    zone = P.inside(spec['box'], H, W)
    # his black: the line colour he used most
    lines, counts = np.unique(m[line].reshape(-1, 3), axis=0, return_counts=True)
    black = P.hexs(lines[np.argmax(counts)])
    cells = set(zip(*np.nonzero(enclosed(fg) & zone)))
    edge = set()
    if 'corner' in spec:
        cx, cy = spec['corner']
        # his line below the corner moves one column a row down to the left: that slant goes on up
        assert line[cy, cx] and line[cy + 1, cx - 1] and line[cy + 2, cx - 2], 'the far thigh\'s top line'
        y = cy
        while True:
            ex = cx + (cy - y)
            if y < cy:
                if fg[y, ex]:
                    break
                edge.add((y, ex))
            x = ex - 1 if y < cy else int(np.nonzero(line[y, :cx + 1])[0].max()) - 1
            while x >= 0 and not fg[y, x] and zone[y, x]:
                cells.add((y, x))
                x -= 1
            # the line closes on the arm above once that arm's line is next to it
            if y < cy and fg[y - 1, ex - 1]:
                break
            y -= 1
        for y in range(cy + 1, cy + 3):
            x = cx - (y - cy) - 1
            while x >= 0 and not fg[y, x] and zone[y, x]:
                cells.add((y, x))
                x -= 1
    col = {}
    who = {}
    for (y, x) in sorted(cells | edge, key=lambda c: (c[0], c[1])):
        if (y, x) in edge:
            continue
        got = lambda q: (col[(y, q)], who[(y, q)]) if (y, q) in col else ((P.hexs(m[y, q]), own[y, q]) if fg[y, q] else None)
        isline = lambda q: (got(q) is not None and got(q)[0] == black) if (y, q) in col else bool(line[y, q])
        q = x - 1
        if isline(q) and isline(q - 1):
            src = got(q)
        else:
            while q >= 0 and isline(q):
                q -= 1
            src = got(q)
        assert src is not None, (k, x, y)
        hx, ow = src
        if not ow:
            # a line cell's owner: the owner of the cloth next to it along the row
            r = q - 1
            while r >= 0 and (got(r) is None or not got(r)[1]):
                r -= 1
            ow = got(r)[1]
        col[(y, x)] = hx
        who[(y, x)] = ow
    for (y, x) in edge:
        col[(y, x)] = black
        who[(y, x)] = who.get((y, x - 1)) or who.get((y + 1, x - 1))
    return {(x, y): (col[(y, x)], who[(y, x)]) for (y, x) in col}
