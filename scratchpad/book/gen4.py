# The example's grimoire at our size: open toward the caster, so the viewer sees the outside of both
# covers (left one turned away, right one almost facing front) and the page tops. gen4.py out.png
import sys
from PIL import Image
W, H = 25, 17
def inside(poly, x, y):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c
g = [['.'] * W for _ in range(H)]
def fill(poly, ch):
    for y in range(H):
        for x in range(W):
            if inside(poly, x + 0.5, y + 0.5):
                g[y][x] = ch
# left cover (turned away), right cover (facing front), page tops
fill([(2.0, 4.0), (9.0, 8.0), (9.6, 16.0), (7.0, 15.0)], 'k')
fill([(9.0, 8.0), (24.0, 4.6), (24.0, 14.6), (10.0, 16.6)], 'c')
fill([(1.2, 2.2), (9.4, 6.6), (9.0, 8.2), (2.0, 4.2)], 'p')
fill([(9.4, 6.6), (12.0, 2.4), (23.2, 2.2), (24.2, 3.8), (24.0, 4.8), (9.0, 8.2)], 'P')
# page-edge lines along the right page block and the left one
for x in range(12, 24):
    for y in range(H):
        if g[y][x] == 'P' and (x + 2 * y) % 4 == 0 and y > 2:
            g[y][x] = 'p'
for y in range(H):
    for x in range(W):
        if g[y][x] == 'p' and (x + y) % 3 == 0:
            g[y][x] = 'q'
# the edge where page tops meet the right cover reads as a dark line, plus the spine
for x in range(W):
    for y in range(1, H):
        if g[y][x] == 'c' and g[y - 1][x] in 'Pp':
            g[y][x] = 'o'
for y in range(7, 17):
    x = int(round(9.0 + (y - 7) * 0.08))
    if 0 <= x < W and g[y][x] != '.':
        g[y][x] = 'o'
# a lit band along the right cover's outer edge, a shadow along the bottom
for y in range(H):
    for x in range(W - 1, -1, -1):
        if g[y][x] == 'c':
            g[y][x] = 'C'; break
for x in range(W):
    for y in range(H - 1, -1, -1):
        if g[y][x] in 'ck':
            g[y][x] = 'k' if g[y][x] == 'c' else 'o'; break
rows = [''.join(r) for r in g]
for r in rows: print("    '%s'," % r)
EM = {
    'wind':     ['.EE.EE.', 'EeeEeeE', 'EeeEeeE', '.EEEEE.', 'EeeEeeE', 'EeeEeeE', '.EE.EE.'],
    'fire':     ['...E...', '..EE...', '..EEE..', '.EEeEE.', '.EeeeE.', '.EeeeE.', '..EEE..'],
}
gl = (61, 188, 72)
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
cover = mix(gl, (20, 16, 24), 0.72)
pal = {'P': mix((250, 244, 222), gl, 0.15), 'p': mix((226, 216, 190), gl, 0.15), 'q': mix((196, 184, 156), gl, 0.15),
       'c': cover, 'C': mix(cover, (255, 255, 255), 0.18), 'k': mix(cover, (0, 0, 0), 0.35), 'o': mix(cover, (0, 0, 0), 0.65),
       'E': mix(gl, (255, 255, 255), 0.55), 'e': gl, 'R': gl, 'S': (243, 195, 156), 's': (200, 140, 110), 'O': (40, 20, 20), '.': (30, 30, 40)}
k = 14
im = Image.new('RGB', ((W + 4) * k * 2, (H + 8) * k), (30, 30, 40))
for n, name in enumerate(EM):
    rr = [list(r) for r in rows]
    for j, r in enumerate(EM[name]):
        for i, ch in enumerate(r):
            if ch != '.':
                rr[6 + j][14 + i] = ch
    big = [['.'] * (W + 2) for _ in range(H + 2)]
    for y in range(H):
        for x in range(W):
            big[y + 1][x + 1] = rr[y][x]
    for y in range(H + 2):
        for x in range(W + 2):
            if big[y][x] == '.' and any(0 <= y + dy < H + 2 and 0 <= x + dx < W + 2 and big[y + dy][x + dx] not in '.R' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                big[y][x] = 'R'
    for y, r in enumerate(big):
        for x, ch in enumerate(r):
            for a in range(k):
                for b in range(k):
                    im.putpixel(((W + 4) * k * n + (x + 1) * k + b, (y + 1) * k + a), pal[ch])
im.save(sys.argv[1])
