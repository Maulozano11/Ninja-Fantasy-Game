"""Hair template generator: shapes -> shaded fine-pixel template (hair shades 0-5).

Template coordinates: col x, row y, anchor (AX, AY) = near-eye iris (14, 19).
Skull (male): top row 5, back col 5, face front col 22, brows row 16, lash row 18.

Primitives (z = stacking order, higher on top):
  Poly(pts)                      flat mass
  Spike(a, b, tip, bend)         triangle from base a-b to tip, sides bowed by `bend`
  Lock(p0, p1, p2, w0, w1)       quadratic strand, width w0 at the root to w1 at the tip
Shading = global ellipsoid form lit from the upper-left + per-strand lit side +
clump streaks, then rank-quantized to a target shade distribution.
"""
import math
import numpy as np

AX, AY = 14, 19
LIGHT2 = np.array([-0.6, -0.8])
LIGHT3 = np.array([-0.55, -0.72, 0.42])
LIGHT3 = LIGHT3 / np.linalg.norm(LIGHT3)


def qb(p0, p1, p2, t):
    return ((1 - t) ** 2) * np.array(p0) + 2 * (1 - t) * t * np.array(p1) + (t ** 2) * np.array(p2)


def point_in_poly(x, y, pts):
    c = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi:
                c = not c
    return c


class Prim:
    z = 0
    clump = 2.6   # strand clump width (px)
    streak = 0.6  # strength of clump streaks
    lit = 0.0     # extra brightness
    flow = None   # for Poly: streak direction

    def info(self, x, y):
        """(inside, u across -1..1, t along 0..1) for a point."""
        raise NotImplementedError


class Poly(Prim):
    def __init__(self, pts, z=0, flow=(1, 0.6), lit=0.0, streak=0.35):
        self.pts, self.z, self.lit, self.streak = pts, z, lit, streak
        f = np.array(flow, float)
        self.flow = f / np.linalg.norm(f)
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        self.bb = (min(xs), min(ys), max(xs), max(ys))

    def info(self, x, y):
        if not point_in_poly(x, y, self.pts):
            return None
        # streaks across the flow direction
        nrm = np.array([-self.flow[1], self.flow[0]])
        u = (x * nrm[0] + y * nrm[1])
        return (u, 0.5, 0.0)


class Strand(Prim):
    """A curved strand along a quadratic centreline with a width profile."""

    def __init__(self, p0, p1, p2, w0, w1, z=1, lit=0.0, streak=0.6, clump=3.2, hold=0.3, power=1.0, glint=0.15):
        self.p = [np.array(p0, float), np.array(p1, float), np.array(p2, float)]
        self.w0, self.w1, self.z, self.lit, self.streak, self.clump, self.hold = w0, w1, z, lit, streak, clump, hold
        self.power, self.glint = power, glint
        self.N = 48
        self.pts = np.array([qb(*self.p, i / self.N) for i in range(self.N + 1)])
        d = np.gradient(self.pts, axis=0)
        self.tan = d / np.maximum(1e-6, np.linalg.norm(d, axis=1))[:, None]
        r = max(w0, w1) / 2 + 1
        self.bb = (self.pts[:, 0].min() - r, self.pts[:, 1].min() - r, self.pts[:, 0].max() + r, self.pts[:, 1].max() + r)

    def width(self, t):
        if t <= self.hold:
            return self.w0
        k = (t - self.hold) / (1 - self.hold)
        return self.w1 + (self.w0 - self.w1) * (1 - k) ** self.power

    def info(self, x, y):
        q = np.array([x, y])
        d2 = ((self.pts - q) ** 2).sum(axis=1)
        i = int(d2.argmin())
        t = i / self.N
        tg = self.tan[i]
        dv = q - self.pts[i]
        if i == 0 and dv @ tg < -0.15:
            return None
        if i == self.N and dv @ tg > 0.1:
            return None
        hw = self.width(t) / 2
        if math.sqrt(d2[i]) > hw:
            return None
        n = np.array([-tg[1], tg[0]])
        across = dv @ n
        u = across / max(0.5, hw)
        # which side faces the light: flip u so that -1 is the lit side
        if n @ LIGHT2 < 0:
            u = -u
        else:
            u = u
        return (u * hw, t, u)


def Spike(a, b, tip, z=1, bend=0.0, lit=0.0, streak=0.25, clump=3.0, power=0.75):
    """A spike: strand from the base midpoint to the tip, root width = |a-b|, tapering to ~0.6."""
    a, b, tip = np.array(a, float), np.array(b, float), np.array(tip, float)
    m = (a + b) / 2
    w = np.linalg.norm(a - b)
    axis = tip - m
    n = np.array([-axis[1], axis[0]]) / max(1e-6, np.linalg.norm(axis))
    ctrl = m + axis * 0.5 + n * bend
    return Strand(m, ctrl, tip, w, 0.6, z=z, lit=lit, streak=streak, clump=clump, hold=0.0, power=power)


class Ellipse(Prim):
    def __init__(self, cx, cy, rx, ry, z=0, lit=0.0, streak=0.3, flow=(1, 0.5)):
        self.c, self.r, self.z, self.lit, self.streak = (cx, cy), (rx, ry), z, lit, streak
        f = np.array(flow, float)
        self.flow = f / np.linalg.norm(f)
        self.bb = (cx - rx, cy - ry, cx + rx, cy + ry)

    def info(self, x, y):
        dx = (x - self.c[0]) / self.r[0]
        dy = (y - self.c[1]) / self.r[1]
        if dx * dx + dy * dy > 1:
            return None
        nrm = np.array([-self.flow[1], self.flow[0]])
        return (x * nrm[0] + y * nrm[1], 0.5, 0.0)


def generate(prims, W=34, H=34, form=(13.5, 11.5, 12.5, 12.0), dist=(0.34, 0.31, 0.22, 0.09, 0.04),
             ss=4, keep=None, gloss=None, under=None, seed=1, lit_rim=True, inner_lines=True, pad=6):
    W += 2 * pad
    H += 2 * pad
    """Returns (rows, owner, value) for the primitives.

    form: ellipsoid (cx, cy, rx, ry) for the global light.
    gloss: optional (cx, cy, rx, ry, thickness, strength) highlight arc on the form.
    under: optional fn(x, y) -> darkening for undersides (bangs, nape).
    keep: optional fn(x, y) -> bool, pixels allowed (others dropped).
    """
    owner = -np.ones((H, W), int)
    cover = np.zeros((H, W))
    val = np.zeros((H, W))
    U = np.zeros((H, W))
    T = np.zeros((H, W))
    order = sorted(range(len(prims)), key=lambda i: prims[i].z)
    rng = np.random.default_rng(seed)
    for r in range(H):
        for c in range(W):
            votes = {}
            hits = 0
            for j in range(ss):
                for i in range(ss):
                    x = c - pad + (i + 0.5) / ss
                    y = r - pad + (j + 0.5) / ss
                    top = None
                    for k in reversed(order):
                        p = prims[k]
                        bb = p.bb
                        if x < bb[0] or x > bb[2] or y < bb[1] or y > bb[3]:
                            continue
                        inf = p.info(x, y)
                        if inf is not None:
                            top = (k, inf)
                            break
                    if top:
                        hits += 1
                        votes.setdefault(top[0], []).append(top[1])
            if hits / (ss * ss) < 0.5:
                continue
            k = max(votes, key=lambda q: (len(votes[q]), prims[q].z))
            owner[r, c] = k
            infs = votes[k]
            U[r, c] = np.mean([q[0] for q in infs])
            T[r, c] = np.mean([q[1] for q in infs])
            side = np.mean([q[2] for q in infs])
            p = prims[k]
            x, y = c - pad + 0.5, r - pad + 0.5
            fx, fy, rx, ry = form
            nx_, ny_ = (x - fx) / rx, (y - fy) / ry
            nz = math.sqrt(max(0.0, 1 - nx_ * nx_ - ny_ * ny_))
            nrm = np.array([nx_, ny_, nz])
            nrm /= max(1e-6, np.linalg.norm(nrm))
            lam = max(0.0, nrm @ LIGHT3)
            t = T[r, c]
            is_strand = isinstance(p, Strand)
            if is_strand:
                sideterm = 0.22 if side < -0.15 else (-0.16 if side > 0.4 else 0.0)
                tipdark = -0.12 if t > 0.85 else 0.0
                root = -0.1 if t < 0.1 else 0.0
                glint = p.glint if (0.15 < t < 0.55 and -0.85 < side < -0.3) else 0.0
            else:
                sideterm = tipdark = root = glint = 0.0
            ph = U[r, c] / p.clump + 0.25 * math.sin(t * 4.0 + k * 1.7)
            f = ph - math.floor(ph)
            clump = 0.12 if f < 0.45 else (-0.14 if f > 0.8 else 0.0)
            v = 0.62 * lam + sideterm + p.streak * clump + tipdark + root + glint + p.lit
            if gloss:
                gx, gy, grx, gry, th, st = gloss
                dd = math.sqrt(((x - gx) / grx) ** 2 + ((y - gy) / gry) ** 2)
                if abs(dd - 1) < th:
                    v += st * (1 - abs(dd - 1) / th)
            if under:
                v -= under(x, y)
            val[r, c] = v
    mask = owner >= 0
    if keep is not None:
        for r in range(H):
            for c in range(W):
                if mask[r, c] and not keep(c - pad, r - pad):
                    mask[r, c] = False
                    owner[r, c] = -1
    shade = np.full((H, W), -1)
    # silhouette outline
    out = np.zeros((H, W), bool)
    lit_edge = np.zeros((H, W), bool)
    for r in range(H):
        for c in range(W):
            if not mask[r, c]:
                continue
            outside = []
            for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                rr, cc = r + dr, c + dc
                if rr < 0 or cc < 0 or rr >= H or cc >= W or not mask[rr, cc]:
                    outside.append((dc, dr))
            if outside:
                out[r, c] = True
                if lit_rim and all(d in ((-1, 0), (0, -1)) for d in outside) and val[r, c] > np.percentile(val[mask], 55):
                    lit_edge[r, c] = True
    # inner lines: pixel of a strand whose right/down neighbour belongs to a lower strand
    inner = np.zeros((H, W), bool)
    if inner_lines:
        for r in range(H):
            for c in range(W):
                if not mask[r, c] or out[r, c]:
                    continue
                k = owner[r, c]
                for dc, dr in ((1, 0), (0, 1)):
                    rr, cc = r + dr, c + dc
                    if rr < H and cc < W and mask[rr, cc]:
                        k2 = owner[rr, cc]
                        if k2 != k and prims[k2].z < prims[k].z:
                            inner[r, c] = True
    interior = mask & ~out & ~inner
    vals = val[interior]
    order_v = np.sort(vals)
    cuts = np.cumsum(dist)[:-1]
    th = [order_v[min(len(order_v) - 1, int(q * len(order_v)))] for q in cuts]
    for r in range(H):
        for c in range(W):
            if not mask[r, c]:
                continue
            if out[r, c]:
                shade[r, c] = 1 if lit_edge[r, c] else 0
            elif inner[r, c]:
                shade[r, c] = 1
            else:
                v = val[r, c]
                s = 1 + sum(v > t for t in th)
                shade[r, c] = s
    for _ in range(2):
        fix = []
        for r in range(1, H - 1):
            for c in range(1, W - 1):
                s0 = shade[r, c]
                if s0 < 1 or out[r, c] or inner[r, c]:
                    continue
                nb = [shade[r + dr, c + dc] for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)) if shade[r + dr, c + dc] >= 1]
                if len(nb) == 4 and all(n != s0 for n in nb):
                    vals_n = sorted(nb)
                    fix.append((r, c, vals_n[1] if abs(vals_n[1] - s0) <= abs(vals_n[2] - s0) else vals_n[2]))
        for r, c, v in fix:
            shade[r, c] = v
    rows = [''.join('.' if shade[r, c] < 0 else str(shade[r, c]) for c in range(W)) for r in range(H)]
    # trim empty rows/cols, keep the anchor
    top = 0
    while top < H and set(rows[top]) == {'.'}:
        top += 1
    bot = H
    while bot > top and set(rows[bot - 1]) == {'.'}:
        bot -= 1
    left = 0
    while left < W and all(rw[left] == '.' for rw in rows[top:bot]):
        left += 1
    right = W
    while right > left and all(rw[right - 1] == '.' for rw in rows[top:bot]):
        right -= 1
    rows = [rw[left:right] for rw in rows[top:bot]]
    return rows, (AX + pad - left, AY + pad - top)


def shade_hist(rows):
    cnt = [0] * 6
    for rw in rows:
        for ch in rw:
            if ch != '.':
                cnt[int(ch)] += 1
    tot = sum(cnt[1:]) or 1
    return [round(100 * x / tot) for x in cnt[1:]]
