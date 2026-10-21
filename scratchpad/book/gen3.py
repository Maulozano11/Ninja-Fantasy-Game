# Grimoire held open toward the viewer: cream pages on the left, the dark inner cover with a glowing
# emblem on the right, glow rim. gen3.py out.png
import sys
from PIL import Image
W = 19
GUT = 9
topl = [3, 2, 2, 1, 1, 1, 0, 0, 0]       # left page top per column (cols 0..8)
topr = [0, 0, 0, 1, 1, 1, 2, 2, 3]       # right panel top (cols 10..18)
PH = 10
H = 3 + PH + 2
g = [['.'] * W for _ in range(H)]
for x in range(W):
    if x < GUT:
        t = topl[x]
        for y in range(t, t + PH):
            r = y - t
            g[y][x] = 'Q' if x == GUT - 1 else ('q' if x == GUT - 2 or r == PH - 1 else ('P' if r < 6 and x > 1 else 'p'))
        g[t + PH][x] = 'e'                # page edges
        g[t + PH + 1][x] = 'k'            # cover under the pages
    elif x == GUT:
        for y in range(0, PH + 2):
            g[y][x] = 'o'                 # spine/gutter
    else:
        t = topr[x - GUT - 1]
        for y in range(t, t + PH + 1):
            g[y][x] = 'c' if (x - GUT) % 9 and y - t not in (0, PH) else 'C' if y - t == 0 else 'k'
        g[t + PH + 1][x] = 'k'
# text lines on the left page
for x in range(1, 7):
    t = topl[x]
    for k, y in enumerate((t + 2, t + 4, t + 6, t + 8)):
        if (x + 2 * k) % 5 != 0:
            g[y][x] = 'i'
rows = [''.join(r) for r in g]
for r in rows: print("    '%s'," % r)
EM = {
    'fire':     ['...E...', '..EE...', '..EEE..', '.EEeEE.', '.EeeeE.', '.EeeeE.', '..EEE..'],
    'embers':   ['...E...', '.E.E.E.', '..EEE..', 'EEEeEEE', '..EEE..', '.E.E.E.', '...E...'],
    'lightning':['....EE.', '...EE..', '..EE...', '.EEEEE.', '...EE..', '..EE...', '.EE....'],
    'wind':     ['.EE.EE.', 'EeeEeeE', 'EeeEeeE', '.EEEEE.', 'EeeEeeE', 'EeeEeeE', '.EE.EE.'],
    'water':    ['...E...', '..EEE..', '..EeE..', '.EeeeE.', '.EeeeE.', '.EeeeE.', '..EEE..'],
    'shadow':   ['..EEE..', '.EE....', 'EE.....', 'EE.....', 'EE.....', '.EE....', '..EEE..'],
    'spirit':   ['..EEE..', '.EeeeE.', '.E.e.E.', '.EeeeE.', '.EeeeE.', '.EeEeE.', '.E.E.E.'],
    'light':    ['E..E..E', '.E.E.E.', '..EEE..', 'EEEeEEE', '..EEE..', '.E.E.E.', 'E..E..E'],
    'void':     ['..EEE..', '.E...E.', 'E..E..E', 'E.EEE.E', 'E..E..E', '.E...E.', '..EEE..'],
}
GLOW = {'fire': (232, 50, 30), 'embers': (242, 124, 24), 'lightning': (240, 200, 24), 'wind': (61, 188, 72), 'water': (54, 160, 240),
        'shadow': (74, 62, 176), 'spirit': (165, 76, 224), 'light': (244, 241, 228), 'void': (120, 40, 160)}
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
k = 10
names = list(EM)
im = Image.new('RGB', ((W + 4) * k * len(names), (H + 4) * k), (30, 30, 40))
for n, name in enumerate(names):
    gl = GLOW[name]
    cover = mix(gl, (20, 16, 24), 0.72)
    pal = {'P': (250, 244, 222), 'p': (232, 222, 196), 'q': (200, 188, 160), 'Q': (150, 136, 112), 'e': (214, 200, 168),
           'c': cover, 'C': mix(cover, (255, 255, 255), 0.15), 'k': mix(cover, (0, 0, 0), 0.4), 'o': mix(cover, (0, 0, 0), 0.6),
           'i': (90, 74, 58), 'E': mix(gl, (255, 255, 255), 0.55), 'e2': gl, 'R': gl, '.': (30, 30, 40)}
    rr = [list(r) for r in rows] 
    for j, r in enumerate(EM[name]):
        for i, ch in enumerate(r):
            if ch != '.':
                rr[3 + j][11 + i] = 'E' if ch == 'E' else 'e2'
    # glow rim: empty pixels next to the book
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
