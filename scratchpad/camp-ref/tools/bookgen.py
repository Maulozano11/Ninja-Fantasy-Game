# Generator for the read pose's book template (seen from outside, held up open toward the reader)
# and its page-turn overlays. Prints TS-ready rows.
import sys

TOPS = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 4, 3, 3, 2, 2, 1, 1, 0, 0, 0]
BOTS = [18] * 13 + [19] + [18] * 4 + [17] * 6
SP = 13
TOP = 3  # extra rows above the book for the page turn
W, H = len(TOPS), max(BOTS) + 1


def book():
    g = [['.'] * W for _ in range(H)]
    for x in range(W):
        t, b = TOPS[x], BOTS[x]
        if x in (0, W - 1):
            for y in range(t, b + 1):
                g[y][x] = 'o'
            continue
        g[t][x] = 'o'
        g[b][x] = 'o'
        g[t + 1][x] = 'P'
        g[t + 2][x] = 'p' if x < SP else 'q'
        g[t + 3][x] = 'k'
        for y in range(t + 4, b):
            if x < SP:
                ch = 'C' if x == 1 else 'c'
                if 3 <= x <= 11 and t + 5 <= y <= b - 3:
                    ch = 'f'
                if y == b - 1:
                    ch = 'm'
            elif x == SP:
                ch = 'k'
            else:
                ch = 'f' if x == SP + 1 else 'e'
                if y == b - 1:
                    ch = 'd'
            g[y][x] = ch
    return g


def page(points):
    """A lifted page: its top edge along `points` (x, y book rows, may be negative), lit P with a q under it, outlined."""
    g = {}
    for x, y in points:
        g[(x, y)] = 'P'
    for x, y in points:
        if (x, y + 1) not in g:
            g[(x, y + 1)] = 'q'
    cells = dict(g)
    for (x, y) in list(cells):
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            k = (x + dx, y + dy)
            if k not in cells and k not in g:
                g[k] = 'o'
    return g


def show(g, rows_from, rows_to):
    out = []
    for y in range(rows_from, rows_to):
        out.append(''.join(g.get((x, y), '.') for x in range(W)))
    return out


b = book()
print('BOOK pivot', 18, 17)
for r in b:
    print(f"    '{r_}'," if False else "    '" + ''.join(r) + "',")
turns = [
    # rising off the right half
    [(14, 3), (15, 2), (16, 1), (17, 0), (18, -1), (19, -2)],
    # standing over the spine
    [(13, 3), (13, 2), (13, 1), (13, 0), (13, -1), (13, -2)],
    # settling onto the left half
    [(12, 3), (11, 2), (10, 1), (9, 0), (8, 0), (7, -1)],
]
for t in turns:
    g = page(t)
    ys = [y for (_, y) in g]
    print('TURN rows from', min(ys), 'pivot y', 17 - min(ys))
    for r in show(g, min(ys), max(ys) + 1):
        print("      '" + r + "',")
if len(sys.argv) > 1:
    # composite preview of book + each turn, for bookdesign.py
    for i, t in enumerate([None] + turns):
        g = {(x, y): b[y][x] for y in range(H) for x in range(W) if b[y][x] != '.'}
        if t:
            for k, ch in page(t).items():
                if ch == 'o' and k in g and g[k] != 'o':
                    continue
                g[k] = ch
        with open(f'{sys.argv[1]}-{i}.txt', 'w') as f:
            for y in range(-TOP, H):
                f.write(''.join(g.get((x, y), '.') for x in range(W)) + '\n')
