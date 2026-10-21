# Builds horizontal (pointing right) weapon templates as ASCII.
import json, sys

def crystal():
    W, H = 52, 13; cy = 6
    g = [['.'] * W for _ in range(H)]
    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H: g[y][x] = c
    # pommel (crystal diamond)
    for y, cols in {-2: [1], -1: [0, 1, 2], 0: [0, 1, 2], 1: [0, 1, 2], 2: [1]}.items():
        for x in cols: put(x, cy + y, 'c' if y < 0 else 'b')
    put(1, cy - 1, 'd')
    # grip: dark leather with light wrap crosses
    for x in range(3, 11):
        for y in range(-2, 3):
            if abs(y) == 2: put(x, cy + y, 'k'); continue
            put(x, cy + y, 'w' if (x + y) % 3 == 0 else ('K' if y < 1 else 'k'))
    # crossguard with quillons curling toward the blade
    for y in range(-4, 5):
        put(11, cy + y, 'b'); put(12, cy + y, 'c'); put(13, cy + y, 'a')
    for (x, y, c) in [(12, -5, 'c'), (13, -5, 'b'), (13, -6, 'c'), (14, -6, 'd'), (12, 5, 'b'), (13, 5, 'a'), (13, 6, 'b'), (14, 6, 'a')]:
        put(x, cy + y, c)
    put(12, cy, 'd'); put(12, cy - 1, 'd')
    # blade
    x0, x1 = 14, W - 1
    L = x1 - x0
    for x in range(x0, x1 + 1):
        t = (x - x0) / L
        half = 4 if t < 0.74 else max(0, round(4 * (1 - (t - 0.74) / 0.26)))
        for y in range(-half, half + 1):
            if half == 0:
                put(x, cy, '4'); continue
            rel = y / half
            if y == -half: c = '3'
            elif y == -half + 1: c = '5'
            elif rel < -0.25: c = '4'
            elif abs(y) == 0: c = '5'
            elif y == 1: c = '2'
            elif y == half: c = '2'
            elif y == half - 1: c = '2' if half > 2 else '3'
            else: c = '3'
            # diagonal facet cracks
            if 0 < x - x0 < L - 6 and abs(y) < half - 1 and (x + 2 * y) % 7 == 0:
                c = str(max(1, int(c) - 2)) if c != '5' else '3'
            put(x, cy + y, c)
    # glints
    for (x, y) in [(20, -2), (29, 1), (37, -1), (44, 1)]:
        put(x, cy + y, '5')
    return {'rows': [''.join(r) for r in g], 'pivot': [5, cy]}

def katana():
    W, H = 52, 11; cy = 5
    g = [['.'] * W for _ in range(H)]
    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H: g[y][x] = c
    # tsuka (grip) with diamond wrap
    for x in range(0, 12):
        for y in range(-2, 3):
            if abs(y) == 2: put(x, cy + y, 'k'); continue
            put(x, cy + y, 'w' if (x + abs(y)) % 3 == 0 else 'K')
    put(0, cy, 'c')  # kashira cap
    # tsuba (round guard)
    for y in range(-4, 5):
        for x in (12, 13):
            put(x, cy + y, 'c' if x == 12 and y < 0 else ('b' if y < 2 else 'a'))
    put(12, cy - 4, 'd')
    # habaki
    for y in (-2, -1, 0, 1, 2): put(14, cy + y, 'g' if y < 1 else 'G')
    # blade: slight upward curve, back on top, bright edge at the bottom
    x0, x1 = 15, W - 1
    L = x1 - x0
    for x in range(x0, x1 + 1):
        t = (x - x0) / L
        off = -round(2.2 * t * t)
        half = 2 if t < 0.9 else 1
        rows = range(-half, half + 1)
        for y in rows:
            if y == -half: c = '2'
            elif y == half: c = '5' if t < 0.92 else '4'
            elif y == 0: c = '3' if (x // 4) % 2 else '4'
            else: c = '4'
            put(x, cy + y + off, c)
    return {'rows': [''.join(r) for r in g], 'pivot': [6, cy]}

def kunai():
    W, H = 22, 7; cy = 3
    g = [['.'] * W for _ in range(H)]
    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H: g[y][x] = c
    # ring
    for (x, y) in [(0, -1), (0, 0), (0, 1), (1, -2), (1, 2), (2, -1), (2, 1)]: put(x, cy + y, 'b')
    # wrapped handle
    for x in range(3, 10):
        for y in (-1, 0, 1):
            put(x, cy + y, 'w' if (x + y) % 2 == 0 else 'K')
    # leaf blade
    widths = [1, 2, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0]
    for i, hw in enumerate(widths):
        x = 10 + i
        for y in range(-hw, hw + 1):
            c = '5' if y == -hw + 1 or (hw == 0) else ('2' if y > 0 else '4')
            if y == -hw and hw > 0: c = '3'
            put(x, cy + y, c)
    return {'rows': [''.join(r) for r in g], 'pivot': [6, cy]}

out = {'crystal': crystal(), 'katana': katana(), 'kunai': kunai()}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
for k, t in out.items():
    print(k, t['pivot']); print('\n'.join(t['rows']))
