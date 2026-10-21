# Detailed grimoire (seen from outside, open toward the caster), larger: gen6.py out.png
import sys
from PIL import Image
W, H = 32, 21
def inside(poly, x, y):
    c = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c
g = [['.'] * W for _ in range(H)]
def fill(poly, ch, cond=None):
    for y in range(H):
        for x in range(W):
            if inside(poly, x + 0.5, y + 0.5) and (cond is None or cond(x, y)):
                g[y][x] = ch
S = 1.28
def P(pts): return [(x * S, y * S) for x, y in pts]
LC = P([(1.6, 4.0), (9.2, 8.0), (9.8, 16.4), (6.6, 15.2)])       # left cover (turned away)
RC = P([(9.2, 8.0), (24.0, 4.4), (24.0, 14.6), (10.2, 16.6)])     # right cover (facing front)
LP = P([(0.8, 1.4), (9.6, 6.0), (9.2, 8.4), (1.6, 4.4)])          # left page block top
RP = P([(9.6, 6.0), (11.8, 1.6), (23.0, 1.4), (24.2, 2.8), (24.0, 4.6), (9.2, 8.4)])  # right page block top
fill(LC, 'k'); fill(RC, 'c'); fill(LP, 'p'); fill(RP, 'P')
# page layers: rows of page edges on both blocks (alternate light/darker lines following the slant)
for y in range(H):
    for x in range(W):
        if g[y][x] == 'P':
            # distance below the right block's top edge, roughly
            k = (y * 1.0 + (x - 12) * 0.06)
            if int(k) % 2 == 1 and x > 13: g[y][x] = 'p'
        elif g[y][x] == 'p':
            if (x + 2 * y) % 3 == 0: g[y][x] = 'q'
# the line where the right page block meets its cover, and the spine (double line)
for x in range(W):
    for y in range(1, H):
        if g[y][x] == 'c' and g[y - 1][x] in 'Pp': g[y][x] = 'o'
for y in range(8, 21):
    x = 11 if y < 15 else 12
    if g[y][x] != '.': g[y][x] = 'o'
    if 0 <= x + 1 < W and g[y][x + 1] in 'c': g[y][x + 1] = 'C'
# spine bands near the bottom
for y in (16, 18):
    for x in (11, 12, 13):
        if g[y][x] != '.': g[y][x] = 'B'
# lit outer edge of the right cover, dark bottom edges
for y in range(H):
    for x in range(W - 1, -1, -1):
        if g[y][x] == 'c': g[y][x] = 'C'; break
for x in range(W):
    for y in range(H - 1, -1, -1):
        if g[y][x] in 'ckC': g[y][x] = 'o'; break
# inset border on the right cover: cells of 'c' two px inside its edges
def in_rc(x, y): return g[y][x] in 'cC' or g[y][x] == 'B'
for y in range(H):
    for x in range(W):
        if g[y][x] != 'c': continue
        near = [(x + dx, y + dy) for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)]
        edge2 = any(not (0 <= a < W and 0 <= b < H) or g[b][a] in '.oPpqQ' for a, b in near if max(abs(a - x), abs(b - y)) == 2)
        edge1 = any(not (0 <= a < W and 0 <= b < H) or g[b][a] in '.oPpqQ' for a, b in near if max(abs(a - x), abs(b - y)) == 1)
        if edge2 and not edge1: g[y][x] = 'b'
# inset border on the left cover too (1 px inside)
for y in range(H):
    for x in range(W):
        if g[y][x] != 'k': continue
        ring = [(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
        r2 = [(x + dx, y + dy) for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2) if max(abs(dx), abs(dy)) == 2]
        if not any(not (0 <= a < W and 0 <= b < H) or g[b][a] in '.oPpq' for a, b in ring) and any(not (0 <= a < W and 0 <= b < H) or g[b][a] in '.oPpq' for a, b in r2):
            g[y][x] = 'm'
# metal corners at the outer corners of both covers
for (x, y) in [(29, 6), (30, 6), (30, 7), (29, 17), (30, 17), (30, 16), (2, 6), (3, 6), (2, 7), (9, 19), (10, 19), (9, 18)]:
    if 0 <= y < H and 0 <= x < W and g[y][x] != '.': g[y][x] = 'g'
rows = [''.join(r) for r in g]
for r in rows: print("    '%s'," % r)
gl = (61, 188, 72)
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
cover = mix(gl, (20, 16, 24), 0.72)
pal = {'P': mix((250, 244, 222), gl, 0.15), 'p': mix((226, 216, 190), gl, 0.15), 'q': mix((196, 184, 156), gl, 0.15), 'Q': (150, 140, 120),
       'c': cover, 'C': mix(cover, (255, 255, 255), 0.18), 'k': mix(cover, (0, 0, 0), 0.35), 'o': mix(cover, (0, 0, 0), 0.65),
       'b': mix(cover, (255, 255, 255), 0.28), 'm': mix(cover, (255, 255, 255), 0.12), 'B': mix(cover, (255, 255, 255), 0.3),
       'g': (230, 190, 80), 'R': gl, 'r': mix(gl, (0, 0, 0), 0.3), '.': (30, 30, 40)}
k = 14
im = Image.new('RGB', ((W + 4) * k, (H + 4) * k), (30, 30, 40))
big = [['.'] * (W + 2) for _ in range(H + 2)]
for y in range(H):
    for x in range(W): big[y + 1][x + 1] = rows[y][x]
for y in range(H + 2):
    for x in range(W + 2):
        if big[y][x] == '.' and any(0 <= y + dy < H + 2 and 0 <= x + dx < W + 2 and big[y + dy][x + dx] not in '.R' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            big[y][x] = 'R'
for y, r in enumerate(big):
    for x, ch in enumerate(r):
        for a in range(k):
            for b in range(k):
                im.putpixel(((x + 1) * k + b, (y + 1) * k + a), pal[ch])
im.save(sys.argv[1])
