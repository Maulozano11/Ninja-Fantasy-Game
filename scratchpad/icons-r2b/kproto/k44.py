import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-r2b/kproto')
from lib import *

def gaussian_filter(a, s, mode=None):
    r = int(math.ceil(s * 2.5)); k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * s * s)); k /= k.sum()
    p = np.pad(a, r, mode='edge')
    t = np.stack([np.convolve(row, k, 'valid') for row in p])
    return np.stack([np.convolve(col, k, 'valid') for col in t.T]).T
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-r2b/'
rows = open(D + 'dbg0/kirin_thunder-44.txt').read().split('\n\n')[1].split()
N = 44
cv = Canvas(rows)

def inside(poly, x, y):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c

FACE = [(21.5, 14.5), (25, 13.6), (30, 13.8), (34, 14.6), (36, 15.2), (39, 15.6), (40.6, 17), (41, 20.5), (40.2, 22.6), (38.6, 23.6),
        (36, 26), (33.4, 27), (33.4, 33), (31.6, 35.4), (29, 35.4), (26.6, 33), (23.5, 27.5), (21.4, 23.5), (19.6, 20.5), (19.6, 17)]
NECK = [(12, 44), (14, 34), (20, 27), (24, 30), (29, 36), (33, 34), (34, 44)]
L = np.array([[LL[c] for c in r] for r in rows])
Ls = gaussian_filter(L, 1.0, mode='nearest')
FT = 'abcdefg'
for y in range(N):
    for x in range(N):
        if inside(FACE, x, y):
            continue
        t = int(round((Ls[y, x] - float(sys.argv[1] if len(sys.argv) > 1 else 0.33)) / 0.085))
        if inside(NECK, x, y):
            t += 1
        cv.put(x, y, FT[max(0, min(6, t))], draw=False)
cleanup(cv, 3)

# Mane spikes: base -> tip, width at base. Body lighter at the root, lit upper edge, dark seam under it.
SP = [
    ((20, 10.5), (1, 0.5), 3.0),
    ((22, 9), (9.5, 2), 2.6),
    ((24.5, 9.5), (16, 4), 2.2),
    ((26.5, 10.5), (19.5, 0), 2.6),
    ((30, 12.5), (27, 4), 2.2),
    ((19.5, 14), (3, 8.5), 2.8),
    ((20, 17), (0, 13.5), 3.0),
    ((19, 20.5), (1, 17.5), 2.8),
    ((18, 24), (0, 21), 2.6),
    ((17, 27.5), (1, 25), 2.4),
]
def spike(b, t, w):
    L = math.hypot(t[0] - b[0], t[1] - b[1])
    ux, uy = (t[0] - b[0]) / L, (t[1] - b[1]) / L
    nx, ny = -uy, ux
    if ny > 0 or (ny == 0 and nx > 0):
        nx, ny = -nx, -ny
    # seam under the spike: offset by half width + 1 along -normal, from the root to 65 % of the length
    off = w / 2 + 0.6
    s0 = (b[0] - nx * off, b[1] - ny * off)
    s1 = (b[0] + ux * L * 0.62 - nx * (off * 0.45), b[1] + uy * L * 0.62 - ny * (off * 0.45))
    cv.line([(round(s0[0]), round(s0[1])), (round(s1[0]), round(s1[1]))], SEAM)
    cv.wedge(b, t, w, BODY, edge=EDGE, tipc=TIP)
BODY, EDGE, TIP, SEAM = (sys.argv[2:6] if len(sys.argv) > 5 else ('j', 'n', 'h', 'c'))
for b, t, w in SP:
    spike(b, t, w)

def out(name):
    im = cv.img()
    im.save(D + 'kproto/' + name + '.png')
    big = im.resize((440, 440), Image.NEAREST)
    his = Image.open(D + 'out/ref/kirin_thunder.png').convert('RGB')
    his = his.crop((1, 1, his.width - 1, his.height - 1)).resize((44, 44), Image.BOX)
    s = Image.new('RGB', (440 * 2 + 8 + 120, 440), (20, 20, 24))
    s.paste(his.resize((440, 440), Image.NEAREST), (0, 0))
    s.paste(big, (448, 0))
    s.paste(im, (448 + 440 + 10, 10))
    s.paste(his, (448 + 440 + 10, 70))
    s.paste(im.resize((88, 88), Image.NEAREST), (448 + 440 + 10, 130))
    s.save(D + 'kproto/' + name + '-cmp.png')
    print(name, 'small', small(cv))


# Bolts: 1 px pale lines with white cores on their middle stretch.
def bolt(pts, core=(0.3, 0.7), c='q', w='r'):
    px = poly(pts)
    a, b = round(len(px) * core[0]), round(len(px) * core[1])
    for i, (x, y) in enumerate(px):
        cv.put(x, y, w if a <= i < b else c)
BOLTS = [
    [(43, 0), (42, 2), (40, 3), (39, 5), (37, 6), (36, 8), (35, 9)],
    [(36, 0), (35, 2), (35, 3), (34, 5)],
    [(33, 27), (36, 27), (38, 26), (40, 26), (41, 25), (43, 24)],
    [(37, 29), (39, 30), (41, 30), (43, 31)],
    [(34, 36), (36, 37), (37, 39), (39, 40), (40, 42), (42, 43)],
    [(0, 43), (1, 41), (2, 40), (3, 38), (5, 37), (6, 35), (8, 34)],
    [(14, 43), (15, 41), (16, 39), (18, 37), (19, 35)],
]
for b in BOLTS:
    bolt(b)

# Peach sparks: 2-3 px diagonal dashes, warm core and a dimmer end.
for pts in [[(39, 9), (38, 10), (37, 11)], [(42, 9), (41, 10)], [(37, 31), (38, 32)], [(36, 37), (36, 38)]]:
    for i, (x, y) in enumerate(pts):
        cv.put(x, y, 'o' if i < len(pts) - 1 else 'l'); cv.sparks.add((x, y))

# The head.
HEAD = {}
def P(c, pts):
    for p in pts:
        HEAD[p] = c
def H(c, y, x0, x1):
    for x in range(x0, x1 + 1):
        HEAD[(x, y)] = c
# Upper jaw band between eye and gum, and the snout front.
H('k', 19, 27, 34); H('k', 20, 29, 37); H('k', 21, 33, 36); H('m', 21, 37, 38); H('m', 22, 37, 39)
H('n', 19, 37, 40); H('n', 20, 38, 40); H('m', 21, 39, 40)
# Forehead: his light, a highlight where his is brightest.
H('m', 15, 22, 34); H('n', 16, 21, 26); H('m', 16, 27, 29); H('p', 15, 24, 26); H('k', 14, 23, 33); H('m', 17, 20, 25); H('k', 18, 21, 31)
# Snout bridge and horn.
H('n', 16, 30, 35); H('p', 17, 32, 35); H('n', 18, 32, 33); H('p', 18, 37, 40); H('q', 17, 37, 40); H('p', 16, 37, 40)
P('q', [(37, 13), (37, 14), (38, 15), (37, 15)]); P('p', [(38, 14), (39, 15), (38, 16)]); P('r', [(37, 15)])
P('b', [(36, 13), (36, 14), (36, 15), (38, 13), (39, 14), (40, 15), (41, 16), (41, 17), (41, 18), (41, 19), (41, 20), (41, 21), (40, 22), (39, 23)])
# Brow line, the eye under a lit lid.
P('a', [(28, 17), (29, 17), (30, 17)]); P('b', [(26, 17), (27, 17), (31, 17)]); P('d', [(32, 18), (33, 18)])
P('b', [(34, 18)]); P('a', [(35, 18), (36, 18)]); P('d', [(37, 19)]); P('r', [(35, 17), (36, 17)]); P('i', [(35, 19), (36, 19)])
# Gum (curved, stepping down to the front) and the fangs.
P('a', [(23, 20), (24, 20), (25, 20), (26, 20), (27, 20), (28, 20), (29, 21), (30, 21), (31, 21), (32, 21), (33, 22), (34, 22), (35, 22), (36, 22), (37, 23), (38, 23)])
P('b', [(20, 20), (21, 20), (22, 20)])
for x, n in [(30, 2), (32, 3), (34, 2), (36, 3), (38, 2)]:
    g = 21 if x <= 32 else 22 if x <= 36 else 23
    for k in range(n):
        HEAD[(x, g + 1 + k)] = 'r' if k < n - 1 else 'q'
for x in (31, 33, 35, 37):
    g = 21 if x <= 32 else 22 if x <= 36 else 23
    HEAD[(x, g + 1)] = 'h'
    if (x, g + 2) not in HEAD: HEAD[(x, g + 2)] = 'j'
# Mouth core and halo.
for y in range(22, 26):
    for x in range(25, 29):
        HEAD[(x, y)] = 'q' if (x in (25, 28) and y in (22, 25)) else 'r'
P('p', [(24, 22), (24, 23), (24, 24), (24, 25), (29, 22), (29, 23), (29, 24), (29, 25), (25, 21), (26, 21), (27, 21), (28, 21), (25, 26), (26, 26), (27, 26), (28, 26)])
P('m', [(24, 21), (24, 26), (29, 26), (23, 22), (23, 23)])
# Breath below the fangs.
H('n', 25, 31, 37); H('p', 26, 29, 33); H('n', 26, 34, 36); H('m', 27, 29, 32)
# Lower jaw: outline, body, three upward fangs.
P('a', [(21, 21), (22, 22), (22, 23), (23, 24), (23, 25), (23, 26), (24, 27), (24, 28), (25, 29), (25, 30), (26, 31), (27, 32), (28, 33), (29, 34), (30, 34), (31, 34), (32, 33), (33, 32), (33, 31), (33, 30), (33, 29), (33, 28)])
P('i', [(23, 23), (24, 27) if False else (23, 23)])
P('j', [(25, 27), (25, 28), (26, 29), (26, 30), (27, 31), (28, 32), (29, 33), (30, 33), (31, 33), (32, 32), (32, 31), (32, 30), (32, 29), (32, 28)])
P('h', [(26, 28), (27, 30), (28, 31), (29, 32), (31, 32), (31, 31)])
P('r', [(27, 29), (29, 31), (31, 30)]); P('q', [(27, 28), (29, 30), (31, 29)])
H('m', 27, 25, 28); H('n', 28, 28, 31); H('m', 29, 28, 30); H('k', 28, 26, 27); H('m', 30, 28, 28); H('m', 30, 30, 30)
for (x, y), c in HEAD.items():
    cv.put(x, y, c)
cleanup(cv, 2)
out(sys.argv[6] if len(sys.argv) > 6 else 'step3')
