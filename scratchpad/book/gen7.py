# Detailed grimoire, 1.25x the approved shape: gen7.py out.png  (prints rows + emblem box)
import sys
from PIL import Image
S = 1.25
W, H = 31, 22
def inside(poly, x, y):
    c = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c
g = [['.'] * W for _ in range(H)]
def P(pts): return [(x * S, y * S) for x, y in pts]
def fill(poly, ch):
    for y in range(H):
        for x in range(W):
            if inside(poly, x + 0.5, y + 0.5): g[y][x] = ch
LC = P([(1.6, 4.0), (9.2, 8.0), (9.8, 16.8), (6.6, 15.6)])
RC = P([(9.2, 8.0), (24.0, 4.4), (24.0, 14.8), (10.2, 16.9)])
LP = P([(0.8, 1.4), (9.6, 6.0), (9.2, 8.4), (1.6, 4.4)])
RP = P([(9.6, 6.0), (11.8, 1.6), (23.0, 1.4), (24.2, 2.8), (24.0, 4.6), (9.2, 8.4)])
fill(LC, 'k'); fill(RC, 'c'); fill(LP, 'p'); fill(RP, 'P')
def at(x, y): return g[y][x] if 0 <= x < W and 0 <= y < H else '.'
# left page block: fanned page edges (diagonal lines)
for y in range(H):
    for x in range(W):
        if g[y][x] == 'p' and (x + 2 * y) % 3 == 0: g[y][x] = 'q'
# right page block: a line of page edges just above where it meets the cover, darker toward the far end
for y in range(H):
    for x in range(W):
        if g[y][x] == 'P' and at(x, y + 2) == 'c' and at(x, y + 1) == 'P': g[y][x] = 'p'
for y in range(H):
    for x in range(W):
        if g[y][x] in 'Pp' and x >= W - 4: g[y][x] = 'q' if g[y][x] == 'p' else 'p'
# where pages meet the right cover: a dark line
for x in range(W):
    for y in range(1, H):
        if g[y][x] == 'c' and at(x, y - 1) in 'Ppq': g[y][x] = 'o'
# spine: a dark line with a lit edge to its right
spine = {}
for y in range(H):
    xs = [x for x in range(W) if g[y][x] == 'c']
    if xs and y >= 9:
        x0 = xs[0]
        spine[y] = x0
        g[y][x0] = 'o'
        if at(x0 + 1, y) == 'c': g[y][x0 + 1] = 'C'
# outer lit edge (right) and dark bottom edges
for y in range(H):
    for x in range(W - 1, -1, -1):
        if g[y][x] == 'c': g[y][x] = 'C'; break
for x in range(W):
    for y in range(H - 1, -1, -1):
        if g[y][x] in 'ckC': g[y][x] = 'o'; break
# inset border: right-cover cells whose 8-neighbourhood touches the cover's edge cells (non 'c')
edge = lambda ch: ch not in 'cb'
for y in range(H):
    for x in range(W):
        if g[y][x] != 'c': continue
        nb = [at(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
        if any(ch in 'oC.' for ch in nb): g[y][x] = 'd'      # shadow ring right inside the edge
for y in range(H):
    for x in range(W):
        if g[y][x] != 'c': continue
        nb = [at(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
        if any(ch == 'd' for ch in nb): g[y][x] = 'b'        # the raised border line
# left cover: a lit inset line along its outer edge
for y in range(H):
    for x in range(W):
        if g[y][x] == 'k' and at(x - 1, y) in '.o' and at(x + 1, y) == 'k': g[y][x + 1] = 'm'
# metal corner fittings on the outer corners
corners = []
ys = [y for y in range(H) for x in range(W) if g[y][x] in 'Cbd']
for y in range(H):
    for x in range(W - 1, -1, -1):
        if g[y][x] == 'C':
            corners.append((x, y)); break
top_c = corners[0]; bot_c = corners[-1]
for (x, y), dy in ((top_c, 1), (bot_c, -1)):
    for (a, b) in ((x, y), (x - 1, y), (x, y + dy), (x - 1, y + dy)):
        if at(a, b) != '.': g[b][a] = 'g'
    g[y + dy][x - 1] = 'G'
# spine bands
for y in sorted(spine)[-6::3]:
    x = spine[y]
    for a in (x - 1, x, x + 1):
        if at(a, y) != '.': g[y][a] = 'B'
rows = [''.join(r) for r in g]
while set(rows[0]) == {'.'}: rows.pop(0)
while set(rows[-1]) == {'.'}: rows.pop()
for i, r in enumerate(rows): print("    '%s', // %d" % (r, i))
# where the border's inside is: print bbox of 'c' cells
cs = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'c']
print('inside c bbox', min(x for x, _ in cs), min(y for _, y in cs), max(x for x, _ in cs), max(y for _, y in cs))
gl = (61, 188, 72)
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
cover = mix(gl, (20, 16, 24), 0.72)
pal = {'P': mix((250, 244, 222), gl, 0.15), 'p': mix((226, 216, 190), gl, 0.15), 'q': mix((196, 184, 156), gl, 0.15),
       'c': cover, 'C': mix(cover, (255, 255, 255), 0.2), 'd': mix(cover, (0, 0, 0), 0.3), 'k': mix(cover, (0, 0, 0), 0.35), 'o': mix(cover, (0, 0, 0), 0.65),
       'b': mix(cover, (255, 255, 255), 0.25), 'm': mix(cover, (255, 255, 255), 0.08), 'B': mix(cover, (255, 255, 255), 0.35),
       'g': (230, 190, 80), 'G': (150, 110, 40), 'R': gl, '.': (30, 30, 40)}
k = 14
Hh = len(rows)
im = Image.new('RGB', ((W + 4) * k, (Hh + 4) * k), (30, 30, 40))
big = [['.'] * (W + 2) for _ in range(Hh + 2)]
for y in range(Hh):
    for x in range(W): big[y + 1][x + 1] = rows[y][x]
for y in range(Hh + 2):
    for x in range(W + 2):
        if big[y][x] == '.' and any(0 <= y + dy < Hh + 2 and 0 <= x + dx < W + 2 and big[y + dy][x + dx] not in '.R' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            big[y][x] = 'R'
for y, r in enumerate(big):
    for x, ch in enumerate(r):
        for a in range(k):
            for b in range(k):
                im.putpixel(((x + 1) * k + b, (y + 1) * k + a), pal[ch])
im.save(sys.argv[1])
