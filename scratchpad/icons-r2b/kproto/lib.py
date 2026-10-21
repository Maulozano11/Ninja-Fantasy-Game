import math, sys
import numpy as np
from PIL import Image
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-r2b')
from oklab import oklab, hx

PAL = '#181639 #192351 #1b3067 #1d3d7f #1e4c90 #225da1 #2b6da9 #2b7dc0 #388fc7 #3ea0cf #48b2da #ca9d9a #53c6e3 #62d9ed #f5c6be #79e8f2 #a0f4f8 #d8fcff'.split()
LET = 'abcdefghijklmnopqr'
RGB = {LET[i]: hx(h) for i, h in enumerate(PAL)}
LL = {k: oklab(v[None])[0][0] for k, v in RGB.items()}
RAMP = 'abcdefghijkmnpqr'


class Canvas:
    def __init__(self, base):
        self.g = [list(r) for r in base]
        self.drawn = set()
        self.sparks = set()
        self.N = len(base)

    def get(self, x, y):
        return self.g[y][x] if 0 <= x < self.N and 0 <= y < self.N else None

    def put(self, x, y, c, draw=True):
        x, y = int(x), int(y)
        if 0 <= x < self.N and 0 <= y < self.N:
            self.g[y][x] = c
            if draw:
                self.drawn.add((x, y))

    def line(self, pts, c):
        for x, y in poly(pts):
            self.put(x, y, c)

    def wedge(self, b, t, wb, c, edge=None, tipc=None):
        L = math.hypot(t[0] - b[0], t[1] - b[1])
        ux, uy = (t[0] - b[0]) / L, (t[1] - b[1]) / L
        # normal pointing up (screen)
        nx, ny = -uy, ux
        if ny > 0 or (ny == 0 and nx > 0):
            nx, ny = -nx, -ny
        px = []
        for y in range(int(min(b[1], t[1])) - 3, int(max(b[1], t[1])) + 4):
            for x in range(int(min(b[0], t[0])) - 3, int(max(b[0], t[0])) + 4):
                vx, vy = x - b[0], y - b[1]
                al = vx * ux + vy * uy
                ac = vx * nx + vy * ny
                if al < -0.3 or al > L + 0.3:
                    continue
                half = (wb + (1 - wb) * max(0, min(1, al / L))) / 2
                if abs(ac) <= half:
                    px.append((x, y, al / L, ac / max(half, 0.5)))
        for x, y, f, s in px:
            col = c
            if tipc and f > 0.72:
                col = tipc
            self.put(x, y, col)
        if edge:
            # lit edge: the pixels of the wedge with no wedge pixel above along the normal
            S = {(x, y) for x, y, _, _ in px}
            for x, y, f, s in px:
                ax, ay = round(x + nx), round(y + ny)
                if (ax, ay) not in S and f < 0.85:
                    self.put(x, y, edge)

    def img(self):
        a = np.zeros((self.N, self.N, 3), np.uint8)
        for y in range(self.N):
            for x in range(self.N):
                a[y, x] = RGB[self.g[y][x]]
        return Image.fromarray(a)


def bres(x0, y0, x1, y1):
    out = []
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx - dy
    x, y = x0, y0
    while True:
        out.append((x, y))
        if x == x1 and y == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy; x += sx
        if e2 < dx:
            err += dx; y += sy
    return out


def poly(pts):
    raw = []
    for i in range(len(pts) - 1):
        seg = bres(*pts[i], *pts[i + 1])
        raw += seg if i == 0 else seg[1:]
    if len(pts) == 1:
        raw = list(pts)
    clean = []
    for i, b in enumerate(raw):
        a = clean[-1] if clean else None
        c = raw[i + 1] if i + 1 < len(raw) else None
        if a and c and abs(a[0] - c[0]) == 1 and abs(a[1] - c[1]) == 1 and (a[0] == b[0] or a[1] == b[1]):
            continue
        clean.append(b)
    return clean


def comps(g):
    N = len(g)
    lab = [[-1] * N for _ in range(N)]
    sizes = []
    for y in range(N):
        for x in range(N):
            if lab[y][x] >= 0:
                continue
            st = [(x, y)]; lab[y][x] = len(sizes); n = 0; mem = []
            while st:
                cx, cy = st.pop(); n += 1; mem.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        xx, yy = cx + dx, cy + dy
                        if 0 <= xx < N and 0 <= yy < N and lab[yy][xx] < 0 and g[yy][xx] == g[cy][cx]:
                            lab[yy][xx] = lab[y][x]; st.append((xx, yy))
            sizes.append(mem)
    return lab, sizes


def cleanup(cv, maxs=2, rounds=10):
    for _ in range(rounds):
        lab, sizes = comps(cv.g)
        ch = 0
        for mem in sizes:
            if len(mem) > maxs or any(p in cv.drawn for p in mem):
                continue
            col = cv.g[mem[0][1]][mem[0][0]]
            if any(cv.g[y][x] != col for x, y in mem):
                continue
            cnt = {}
            for x, y in mem:
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        v = cv.get(x + dx, y + dy)
                        if v and v != col and (x + dx, y + dy) not in mem:
                            cnt[v] = cnt.get(v, 0) + 1
            if not cnt:
                continue
            best = min(cnt, key=lambda v: (abs(LL[v] - LL[col]), -cnt[v]))
            for x, y in mem:
                cv.g[y][x] = best
            ch += 1
        if not ch:
            break


def small(cv):
    lab, sizes = comps(cv.g)
    allc = [m for m in sizes if len(m) <= 2]
    unl = [m for m in allc if not any(p in cv.sparks for p in m)]
    return len(allc), len(unl)
