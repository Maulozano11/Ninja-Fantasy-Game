# Open grimoire (pages toward the viewer) + 7x7 emblems per chakra nature. gen2.py out.png
from PIL import Image
BOOK = [
    '.....ppp...ppp.....',
    '..pppPPPpq.qpPPppp..',
]
# build procedurally: 20 wide, gutter between cols 9 and 10
W = 20
topl = [3, 2, 2, 1, 1, 1, 0, 0, 0, 1]          # page top per column, left page
top = topl + topl[::-1]
PH = 9
H = max(top) + PH + 3
g = [['.'] * W for _ in range(H)]
for x in range(W):
    t = top[x]
    left = x < 10
    gx = 9.5 - x if left else x - 9.5
    for y in range(t, t + PH):
        if gx < 1: ch = 'Q'
        elif gx < 2: ch = 'q'
        elif left: ch = 'P' if gx < 7 and y - t < 6 else 'p'
        else: ch = 'p' if gx < 7 else 'q'
        g[y][x] = ch
    g[t + PH][x] = 'e'               # stacked page edges
    g[t + PH + 1][x] = 'c' if left else 'k'
# cover corners stick out at the outer bottom; spine dips at the gutter
for x in (9, 10):
    g[top[x] + PH + 2][x] = 'k'
for y in range(top[0] + 2, top[0] + PH + 2):
    pass
# text on the left page
for x in range(2, 8):
    t = top[x]
    for k, y in enumerate((t + 2, t + 4, t + 6)):
        if (x + 2 * k) % 5:
            g[y][x] = 'i'
rows = [''.join(r) for r in g]
EM = {
    'fire':     ['...E...', '..EE...', '..EEE..', '.EEeEE.', '.EeeeE.', '.EeeeE.', '..EEE..'],
    'embers':   ['...E...', '.E.E.E.', '..EEE..', 'EEEeEEE', '..EEE..', '.E.E.E.', '...E...'],
    'lightning':['....EE.', '...EE..', '..EE...', '.EEEEE.', '...EE..', '..EE...', '.EE....'],
    'wind':     ['..EE...', '.E..E..', '....E..', '..EE.E.', '.E...E.', '.E..E..', '..EE...'],
    'water':    ['...E...', '..EEE..', '..EeE..', '.EeeeE.', '.EeeeE.', '.EeeeE.', '..EEE..'],
    'shadow':   ['..EEE..', '.EE....', 'EE.....', 'EE.....', 'EE.....', '.EE....', '..EEE..'],
    'spirit':   ['..EEE..', '.EeeeE.', '.E.e.E.', '.EeeeE.', '.EeeeE.', '.EeEeE.', '.E.E.E.'],
    'light':    ['E..E..E', '.E.E.E.', '..EEE..', 'EEEeEEE', '..EEE..', '.E.E.E.', 'E..E..E'],
    'void':     ['..EEE..', '.E...E.', 'E..E..E', 'E.EEE.E', 'E..E..E', '.E...E.', '..EEE..'],
}
pal = {'P': (250, 244, 222), 'p': (232, 222, 196), 'q': (200, 188, 160), 'Q': (150, 136, 112), 'e': (214, 200, 168),
       'c': (122, 62, 40), 'k': (92, 44, 30), 'i': (90, 74, 58), 'E': (150, 240, 160), 'e2': (60, 190, 90), '.': (40, 40, 52)}
k = 12
names = list(EM)
im = Image.new('RGB', ((W + 2) * k * len(names), (H + 2) * k), (30, 30, 40))
for n, name in enumerate(names):
    rr = [list(r) for r in rows]
    em = EM[name]
    for j, r in enumerate(em):
        for i, ch in enumerate(r):
            if ch != '.':
                rr[top[13] + 1 + j][11 + i] = 'E' if ch == 'E' else 'e2'
    for y, r in enumerate(rr):
        for x, ch in enumerate(r):
            for a in range(k):
                for b in range(k):
                    im.putpixel(((W + 2) * k * n + (x + 1) * k + b, (y + 1) * k + a), pal[ch])
im.save(__import__('sys').argv[1])
for r in rows: print(r)
