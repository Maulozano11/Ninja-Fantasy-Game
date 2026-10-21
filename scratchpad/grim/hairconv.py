"""Converts the hair in the grimoire example (native.png, 1 px per 10 px block) to a hair template.
hairconv.py FACTOR OUT_JSON [--show]"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.join(HERE, '..', 'dbz'))
from convert import scale2x

nat = np.asarray(Image.open(os.path.join(HERE, 'native.png'))).astype(int)
X0, Y0, X1, Y1 = 70, 10, 124, 62
IRIS = (94, 45)


def cls(c):
    r, g, b = c
    if r > 140 and r > b + 30: return 's'
    if g > r + 30 and g > b + 10 and g > 70: return 'G'
    if r + g + b < 40: return 'o'
    if b - g >= 12 and g - r <= 10: return 'h'
    if g - r >= 6: return '.'
    return '?'


H, W = Y1 - Y0, X1 - X0
C = [[cls(nat[Y0 + y, X0 + x]) for x in range(W)] for y in range(H)]
# background: '.' or '?' reachable from the crop border through '.'/'?'
bg = [[False] * W for _ in range(H)]
stack = [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
while stack:
    x, y = stack.pop()
    if not (0 <= x < W and 0 <= y < H) or bg[y][x] or C[y][x] not in '.?':
        continue
    bg[y][x] = True
    stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]


def keep(x, y):
    """Hair only: everything above the brows; below them only beside the face and the lock between the eyes."""
    X, Y = X0 + x, Y0 + y
    if Y <= 43:
        return True
    if X <= 87:
        return Y <= 55
    if X >= 108:
        return Y <= 52
    return 98 <= X <= 99 and Y <= 46


def shade(x, y):
    c = C[y][x]
    r, g, b = nat[Y0 + y, X0 + x]
    if c == 'o': return 1
    if c == 'h': return 2 if r + g + b < 60 else 3
    if c == 'G': return 5 if g > 170 else 4
    if c in '.?' and not bg[y][x]: return 4
    return None


grid = [[(shade(x, y) if keep(x, y) else None) for x in range(W)] for y in range(H)]
# drop the face/neck: skin is never hair, and a dark pixel touching skin below the brow is a face line
for y in range(H):
    for x in range(W):
        if grid[y][x] == 1 and Y0 + y > 43 and 84 <= X0 + x <= 107 and any(0 <= x + dx < W and 0 <= y + dy < H and C[y + dy][x + dx] == 's' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            grid[y][x] = None
# keep the biggest connected part and anything at least 10% of it
comp = [[-1] * W for _ in range(H)]
sizes = []
for y in range(H):
    for x in range(W):
        if grid[y][x] is None or comp[y][x] >= 0: continue
        k = len(sizes); st = [(x, y)]; comp[y][x] = k; n = 0
        while st:
            cx, cy = st.pop(); n += 1
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < W and 0 <= ny < H and grid[ny][nx] is not None and comp[ny][nx] < 0:
                        comp[ny][nx] = k; st.append((nx, ny))
        sizes.append(n)
big = max(sizes)
for y in range(H):
    for x in range(W):
        if grid[y][x] is not None and sizes[comp[y][x]] < 0.1 * big:
            grid[y][x] = None

f = float(sys.argv[1])
if f == 1:
    out = grid
else:
    s8 = scale2x(scale2x(scale2x(grid)))
    H8, W8 = len(s8), len(s8[0])
    Ht, Wt = int(round(H8 / 8 * f)), int(round(W8 / 8 * f))
    out = []
    for ty in range(Ht):
        row = []
        for tx in range(Wt):
            ya, yb = int(ty * 8 / f), max(int(ty * 8 / f) + 1, int((ty + 1) * 8 / f))
            xa, xb = int(tx * 8 / f), max(int(tx * 8 / f) + 1, int((tx + 1) * 8 / f))
            votes = {}
            for yy in range(ya, min(yb, H8)):
                for xx in range(xa, min(xb, W8)):
                    v = s8[yy][xx]; votes[v] = votes.get(v, 0) + 1
            tot = sum(votes.values()); empty = votes.get(None, 0)
            if empty * 2 >= tot:
                row.append(None)
            else:
                votes.pop(None, None)
                row.append(max(votes, key=lambda k: (votes[k], -k)))
        out.append(row)
Ho, Wo = len(out), len(out[0])
rows = []
for y in range(Ho):
    r = ''
    for x in range(Wo):
        v = out[y][x]
        if v is None:
            r += '.'; continue
        edge = any(not (0 <= x + dx < Wo and 0 <= y + dy < Ho) or out[y + dy][x + dx] is None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        r += '0' if edge else str(v)
    rows.append(r)
top = next(i for i, r in enumerate(rows) if set(r) != {'.'})
bot = len(rows) - next(i for i, r in enumerate(reversed(rows)) if set(r) != {'.'})
rows = rows[top:bot]
left = min(len(r) - len(r.lstrip('.')) for r in rows)
right = max(len(r.rstrip('.')) for r in rows)
rows = [r[left:right] for r in rows]
fa = [int(round((IRIS[0] - X0) * f)) - left, int(round((IRIS[1] - Y0) * f)) - top]
print(len(rows[0]), 'x', len(rows), 'anchor', fa)
for i, r in enumerate(rows):
    print('%2d %s%s' % (i, r, '  <- eye' if i == fa[1] else ''))
json.dump({'f': rows, 'fa': fa}, open(sys.argv[2], 'w'))
