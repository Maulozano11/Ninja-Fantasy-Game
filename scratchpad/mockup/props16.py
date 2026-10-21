"""16-bit interactable and ambient sprites for the battle mockup (native pixels, RGBA).
Each maker returns (rgba uint8 array, (offset_x, offset_y)) so that the sprite's base lands on (x, y)."""
import math
import numpy as np
from scene import BARK, DIRT, GRASS, LEAF, ROCK, WATER, WOOD, hexrgb, mask_ellipse, mask_poly, pal, quant, vnoise

METAL = pal('#23262e', '#3b404b', '#5a606d', '#808797', '#aab1bf', '#d9dde6')
RED = pal('#3a0d10', '#6b1419', '#9c1d22', '#c9302c', '#e85a43', '#f79a6a')
CANVAS = pal('#3b3226', '#5e5240', '#827359', '#a49474', '#c3b48f', '#ddd0aa')
STONE = pal('#2a2a30', '#43434b', '#5e5d64', '#7c7a7e', '#9c9897', '#bdb7ae')
FIRE = pal('#7a1a0c', '#c0391a', '#ec6a1f', '#f8a332', '#fdd66b', '#fff6c8')


def canvas(w, h):
    return np.zeros((h, w, 4), float), np.mgrid[0:h, 0:w]


def put(c, m, rgb):
    c[m, :3] = rgb[m] if rgb.ndim == 3 else rgb
    c[m, 3] = 255


def edge_of(m):
    return m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))


def done(c, x, y, ax, ay):
    return c.clip(0, 255).astype(np.uint8), (x - ax, y - ay)


def barrel(x, y, explosive=True, seed=1):
    w, h = 16, 21
    c, (yy, xx) = canvas(w, h)
    body = mask_ellipse(8, 10.5, 7.2, 10.5, w, h) & (yy > 1) & (yy < h - 1)
    v = 0.78 - (xx - 1) / 14 * 0.62 + (vnoise(h, w, 2, seed) - 0.5) * 0.2
    v -= ((xx % 3) == 0) * 0.12
    put(c, body, quant(np.clip(v, 0, 1), WOOD))
    for by in (4, 15):
        band = body & (np.abs(yy - by) < 1)
        put(c, band, quant(np.clip(0.8 - (xx - 1) / 14 * 0.6, 0, 1), METAL))
    top = mask_ellipse(8, 2.6, 6.4, 2.2, w, h)
    put(c, top, quant(np.full((h, w), 0.55), WOOD))
    put(c, edge_of(top) & (yy < 3), np.array(WOOD[1]))
    if explosive:
        tag = (np.abs(xx - 8) <= 2) & (yy >= 6) & (yy <= 13)
        put(c, tag, np.array(hexrgb('#efe6cf')))
        mark = tag & (((xx == 8) & (yy >= 7) & (yy <= 12)) | ((yy == 8) & (np.abs(xx - 8) <= 1)) | ((yy == 11) & (xx == 7)))
        put(c, mark, np.array(RED[2]))
    put(c, edge_of(body | top), np.array(WOOD[0]))
    return done(c, x, y, 8, h - 1)


def crate(x, y, seed=2):
    w, h = 18, 17
    c, (yy, xx) = canvas(w, h)
    topf = mask_poly([(1, 4), (4, 0), (17, 0), (14, 4)], w, h)
    front = (xx >= 1) & (xx <= 14) & (yy >= 4) & (yy <= 16)
    side = mask_poly([(14, 4), (17, 0), (17, 12), (14, 16)], w, h) & ~front
    put(c, topf, quant(np.full((h, w), 0.78), WOOD))
    v = 0.6 + (vnoise(h, w, 2, seed) - 0.5) * 0.25 - ((yy - 4) % 4 == 0) * 0.15
    put(c, front, quant(np.clip(v, 0, 1), WOOD))
    put(c, side, quant(np.full((h, w), 0.3), WOOD))
    brace = front & ((np.abs((xx - 1) - (yy - 4) * 13 / 12) < 1.0))
    put(c, brace, np.array(WOOD[4]))
    frame = front & ((xx <= 2) | (xx >= 13) | (yy <= 5) | (yy >= 15))
    put(c, frame, np.array(WOOD[2]))
    put(c, edge_of(topf | front | side), np.array(WOOD[0]))
    return done(c, x, y, 8, h - 1)


def campfire(x, y, seed=3):
    w, h = 26, 30
    c, (yy, xx) = canvas(w, h)
    # stones ring
    for k in range(7):
        a = math.pi * (0.05 + k / 6 * 0.9)
        sx, sy = 13 + math.cos(a) * 10, 26 + math.sin(a) * 2.2 - 1
        m = mask_ellipse(sx, sy, 2.4, 1.8, w, h)
        put(c, m, quant(np.clip(0.75 - (yy - sy + 2) / 5, 0, 1), STONE))
        put(c, edge_of(m), np.array(STONE[0]))
    # crossed logs
    for (x0, y0, x1, y1) in [(5, 26, 20, 21), (21, 26, 6, 21)]:
        for t in np.linspace(0, 1, 30):
            px, py = int(x0 + (x1 - x0) * t), int(y0 + (y1 - y0) * t)
            c[py - 1:py + 1, px, :3] = BARK[2]
            c[py - 1:py + 1, px, 3] = 255
            c[py + 1, px, :3] = BARK[0]
            c[py + 1, px, 3] = 255
    # flames: three tongues, hot core
    fl = np.zeros((h, w), bool)
    for (fx, fh, fw) in [(13, 20, 5.5), (9, 13, 3.5), (17, 14, 3.6)]:
        tip = 24 - fh
        fl |= mask_poly([(fx - fw, 24), (fx - fw * 0.6, 24 - fh * 0.45), (fx - 0.5, tip), (fx + fw * 0.4, 24 - fh * 0.55), (fx + fw, 24)], w, h)
    heat = np.clip(1 - (24 - yy) / 22 - np.abs(xx - 13) / 14, 0, 1)
    put(c, fl, quant(np.clip(heat * 1.25 + 0.15, 0, 1), FIRE))
    put(c, edge_of(fl), np.array(FIRE[1]))
    return done(c, x, y, 13, 27)


def tent(x, y, seed=4):
    w, h = 54, 40
    c, (yy, xx) = canvas(w, h)
    front = mask_poly([(4, 38), (22, 2), (40, 38)], w, h)
    side = mask_poly([(22, 2), (40, 38), (52, 32), (36, 2)], w, h) & ~front
    door = mask_poly([(16, 38), (22, 18), (28, 38)], w, h)
    v = 0.72 - (yy / 40) * 0.25 - (np.abs(xx - 22) / 30) * 0.15 + (vnoise(h, w, 3, seed) - 0.5) * 0.12
    put(c, front, quant(np.clip(v, 0, 1), CANVAS))
    put(c, side, quant(np.clip(v - 0.3, 0, 1), CANVAS))
    put(c, door, np.array(hexrgb('#1b1612')))
    seam = front & (np.abs(xx - 22) < 0.6) & (yy < 18)
    put(c, seam, np.array(CANVAS[1]))
    put(c, edge_of(front | side), np.array(CANVAS[0]))
    # pegs and ropes
    for (px, py) in [(2, 39), (46, 37)]:
        c[py - 3:py + 1, px, :3] = WOOD[2]
        c[py - 3:py + 1, px, 3] = 255
    return done(c, x, y, 26, 38)


def stone_lantern(x, y, lit=True):
    w, h = 18, 36
    c, (yy, xx) = canvas(w, h)
    parts = [((2, 32), (16, 35), 0.45), ((6, 20), (12, 32), 0.6), ((3, 18), (15, 21), 0.55), ((4, 11), (14, 18), 0.6)]
    for (x0, y0), (x1, y1), v0 in parts:
        m = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
        put(c, m, quant(np.clip(v0 + 0.3 - (xx - x0) / max(1, x1 - x0) * 0.45, 0, 1), STONE))
        put(c, edge_of(m), np.array(STONE[0]))
    win = (xx >= 7) & (xx < 11) & (yy >= 13) & (yy < 17)
    put(c, win, np.array(FIRE[4] if lit else STONE[0]))
    roof = mask_poly([(0, 11), (4, 6), (14, 6), (18, 11)], w, h)
    put(c, roof, quant(np.clip(0.75 - xx / 18 * 0.5, 0, 1), STONE))
    put(c, edge_of(roof), np.array(STONE[0]))
    fin = mask_ellipse(9, 4, 2, 2.4, w, h)
    put(c, fin, np.array(STONE[3]))
    return done(c, x, y, 9, 35)


def log(x, y, seed=5):
    w, h = 34, 12
    c, (yy, xx) = canvas(w, h)
    body = (xx >= 3) & (xx <= 28) & (yy >= 2) & (yy <= 10)
    v = 0.75 - (yy - 2) / 8 * 0.55 + (vnoise(h, w, 2, seed) - 0.5) * 0.2 - ((xx + yy) % 7 == 0) * 0.1
    put(c, body, quant(np.clip(v, 0, 1), BARK))
    end = mask_ellipse(29, 6, 3.4, 4.6, w, h)
    rings = np.hypot(xx - 29, (yy - 6) * 0.75)
    put(c, end, quant(np.clip(0.75 - (rings.astype(int) % 2) * 0.2, 0, 1), WOOD))
    put(c, edge_of(body | end), np.array(BARK[0]))
    # moss and two mushrooms
    moss = body & (yy <= 3) & (vnoise(h, w, 1, seed + 3) > 0.45)
    put(c, moss, np.array(GRASS[4]))
    for mx in (7, 11):
        c[0:2, mx - 1:mx + 2, :3] = RED[3]
        c[0, mx, :3] = hexrgb('#f6e8d4')
        c[0:2, mx - 1:mx + 2, 3] = 255
        c[2, mx, :3] = hexrgb('#e8dcc4')
        c[2, mx, 3] = 255
    return done(c, x, y, 16, 10)


def signpost(x, y):
    w, h = 26, 30
    c, (yy, xx) = canvas(w, h)
    post = (xx >= 11) & (xx <= 13) & (yy >= 6)
    put(c, post, quant(np.clip(0.7 - (xx - 11) / 3 * 0.5, 0, 1), WOOD))
    board = mask_poly([(2, 4), (20, 4), (25, 8.5), (20, 13), (2, 13)], w, h)
    put(c, board, quant(np.clip(0.75 - yy / 30, 0, 1), WOOD))
    for (gx, gy) in [(5, 7), (7, 7), (9, 9), (12, 7), (15, 9), (17, 7)]:
        c[gy:gy + 2, gx, :3] = WOOD[0]
    put(c, edge_of(board | post), np.array(WOOD[0]))
    return done(c, x, y, 12, 29)


def fence(x, y, n=4, seed=6):
    w, h = n * 14 + 4, 18
    c, (yy, xx) = canvas(w, h)
    rails = ((yy == 6) | (yy == 7) | (yy == 12) | (yy == 13)) & (xx >= 1) & (xx < w - 1)
    put(c, rails, quant(np.clip(0.65 - (yy % 6) * 0.08, 0, 1), WOOD))
    for k in range(n + 1):
        px = 1 + k * 14
        post = (xx >= px) & (xx <= px + 2) & (yy >= 2)
        put(c, post, quant(np.clip(0.75 - (xx - px) / 3 * 0.45, 0, 1), WOOD))
    put(c, edge_of(c[..., 3] > 0), np.array(WOOD[0]))
    return done(c, x, y, w // 2, 17)


def lily(x, y, flower=False, seed=7):
    w, h = 12, 7
    c, (yy, xx) = canvas(w, h)
    pad = mask_ellipse(6, 4, 5.2, 2.4, w, h) & ~mask_poly([(6, 4), (11, 2), (11, 5)], w, h)
    put(c, pad, quant(np.clip(0.7 - (yy - 2) / 5 * 0.4, 0, 1), GRASS))
    put(c, edge_of(pad), np.array(GRASS[1]))
    if flower:
        for (fx, fy, col) in [(5, 1, '#f3b6cc'), (6, 1, '#fbe3ea'), (7, 1, '#f3b6cc'), (6, 0, '#fbe3ea'), (6, 2, '#f7d36b')]:
            c[fy, fx, :3] = hexrgb(col)
            c[fy, fx, 3] = 255
    return done(c, x, y, 6, 5)


def butterfly(x, y, col='#f2b84b'):
    w, h = 7, 5
    c, _ = canvas(w, h)
    rgb = hexrgb(col)
    for (px, py) in [(0, 0), (1, 0), (0, 1), (1, 1), (2, 1), (5, 0), (6, 0), (4, 1), (5, 1), (6, 1), (1, 3), (5, 3), (2, 2), (4, 2)]:
        c[py, px, :3] = rgb if py < 3 else rgb * 0.7
        c[py, px, 3] = 255
    c[1:4, 3, :3] = hexrgb('#2a2228')
    c[1:4, 3, 3] = 255
    return done(c, x, y, 3, 4)


def bird(x, y, s=1):
    w, h = 9 * s, 4 * s
    c, _ = canvas(w, h)
    pts = [(0, 0), (1, 1), (2, 2), (3, 2), (4, 3), (5, 2), (6, 2), (7, 1), (8, 0)]
    for (px, py) in pts:
        c[py * s:(py + 1) * s, px * s:(px + 1) * s, :3] = hexrgb('#1d2a2a')
        c[py * s:(py + 1) * s, px * s:(px + 1) * s, 3] = 255
    return done(c, x, y, 4 * s, 2 * s)


def river_rock(x, y, w=16, h=8, seed=8):
    cw, ch = w + 6, h + 4
    c, (yy, xx) = canvas(cw, ch)
    m = mask_ellipse(cw / 2, ch - 3, w / 2, h - 1, cw, ch) & (yy < ch - 2)
    put(c, m, quant(np.clip(0.8 - (xx - 3) / w * 0.4 - (yy - 2) / h * 0.4, 0, 1), STONE))
    put(c, edge_of(m), np.array(STONE[0]))
    foam = (yy == ch - 2) & (xx > 1) & (xx < cw - 1)
    put(c, foam, np.array(WATER[7]))
    for k in range(3):
        c[ch - 1, 2 + k * 6:4 + k * 6, :3] = WATER[6]
        c[ch - 1, 2 + k * 6:4 + k * 6, 3] = 255
    return done(c, x, y, cw // 2, ch - 2)


def flowers(x, y, w=26, seed=11, cols=('#f4e27a', '#f2f2ea', '#e7a1c0')):
    r = np.random.default_rng(seed)
    cw, ch = w + 4, 10
    c, _ = canvas(cw, ch)
    for k in range(int(w * 0.7)):
        px = int(r.uniform(1, cw - 2))
        py = int(r.uniform(3, ch - 1))
        c[py:ch - 1, px, :3] = GRASS[2]
        c[py:ch - 1, px, 3] = 255
        if r.random() < 0.45:
            col = hexrgb(r.choice(list(cols)))
            c[py - 1, px, :3] = col
            c[py - 1, px, 3] = 255
            if px + 1 < cw:
                c[py - 1, px + 1, :3] = col * 0.8
                c[py - 1, px + 1, 3] = 255
    return done(c, x, y, cw // 2, ch - 1)


def pebbles(x, y, n=5, seed=12):
    r = np.random.default_rng(seed)
    cw, ch = 30, 8
    c, (yy, xx) = canvas(cw, ch)
    for k in range(n):
        px, py = r.uniform(3, cw - 3), r.uniform(3, ch - 2)
        rw = r.uniform(1.5, 3.2)
        m = mask_ellipse(px, py, rw, rw * 0.7, cw, ch)
        put(c, m, quant(np.clip(0.8 - (yy - py + rw) / (2 * rw) * 0.5, 0, 1), STONE))
        put(c, edge_of(m), np.array(STONE[1]))
    return done(c, x, y, cw // 2, ch - 1)


def mushrooms(x, y, seed=13):
    r = np.random.default_rng(seed)
    cw, ch = 14, 8
    c, _ = canvas(cw, ch)
    for k in range(4):
        px = int(r.uniform(2, cw - 3))
        hgt = int(r.uniform(2, 4))
        c[ch - 1 - hgt:ch - 1, px, :3] = hexrgb('#e8dcc4')
        c[ch - 1 - hgt:ch - 1, px, 3] = 255
        cap = RED[3] if r.random() < 0.6 else hexrgb('#c79a5a')
        c[ch - 2 - hgt, px - 1:px + 2, :3] = cap
        c[ch - 2 - hgt, px - 1:px + 2, 3] = 255
        c[ch - 2 - hgt, px, :3] = hexrgb('#f6e8d4') if r.random() < 0.5 else cap
    return done(c, x, y, cw // 2, ch - 1)
