"""Hair template generator v2: strands -> shaded fine-pixel template (shades 0-5).

Template coordinates: col x, row y; the anchor (AX, AY) = near-eye iris (14, 19).
Female skull: top row 5, back col 5, face front col 22, brows row 16, eyes rows 18-20, chin row 27.

Shading (per pixel of the owning strand), then rank-quantized:
  form light (head ellipsoid lit from the upper left)
  + strand cylinder (lit edge / shadow edge across each strand)
  + sub-clumps (thin dark grooves along wide strands)
  + root / tip darkening, cast shadow under strands lying on top
  + gloss: the anime "angel ring", broken per strand
Lines: outline 0 (lit rim 1), separation 1 where a strand lies over another one.
"""
import math
import numpy as np

AX, AY = 14, 19
CYL = 0.2
FORM = 0.85
L2 = np.array([-0.62, -0.78])
L2 = L2 / np.linalg.norm(L2)
L3 = np.array([-0.5, -0.7, 0.5])
L3 = L3 / np.linalg.norm(L3)


def bez(ctrl, t):
    p = [np.array(c, float) for c in ctrl]
    while len(p) > 1:
        p = [(1 - t) * p[i] + t * p[i + 1] for i in range(len(p) - 1)]
    return p[0]


def pip(x, y, pts):
    c = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            if x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                c = not c
    return c


class Prim:
    z = 0
    lit = 0.0
    gloss = True
    groove = 0.0     # spacing of thin strand lines in px (0 = none)
    g0, g1 = 0.2, 0.9  # strand lines only along this part of the length
    line = True      # draw a separation line where it lies over lower strands
    line_t0 = 0.0    # ...only from this far along the strand
    line_t1 = 1.01   # ...and up to this far
    shadow = True    # casts a shadow on what lies below

    def info(self, x, y):
        raise NotImplementedError


class Strand(Prim):
    """Lock along a bezier centreline (3 or 4 points), width w0 at the root easing to w1 at the tip."""

    def __init__(self, ctrl, w0, w1=0.6, z=1, hold=0.35, power=1.0, lit=0.0, groove=0.0, gloss=True, line=True,
                 shadow=True, root_dark=True, tip_dark=True, wob=0.0, seed=0, line_t0=0.0, g0=0.2, g1=0.9,
                 lines=None, nlines=None, streak=None, ring_dy=None, line_t1=1.01, floor=0, wave=None):
        self.ctrl = ctrl
        self.floor = floor
        self.line_t0, self.line_t1, self.g0, self.g1 = line_t0, line_t1, g0, g1
        rng = np.random.default_rng(int(seed * 7 + w0 * 13 + ctrl[0][0] * 3 + ctrl[0][1] * 5))
        if lines is None:
            # staggered strand lines across wide locks: evenly spaced, each running a different stretch
            n = nlines if nlines is not None else max(0, int((w0 - 1.2) / 2.2))
            lines = []
            for i in range(n):
                uu = -1 + 2 * (i + 1) / (n + 1) + rng.uniform(-0.12, 0.12)
                ta = rng.uniform(g0, g0 + 0.25)
                tb = rng.uniform(max(ta + 0.25, g1 - 0.25), g1)
                lines.append((uu, ta, tb))
        self.lines = lines
        self.streak = streak
        self.ring_dy = ring_dy if ring_dy is not None else rng.uniform(-0.7, 0.7)
        self.w0, self.w1, self.z, self.hold, self.power, self.lit = w0, w1, z, hold, power, lit
        self.groove, self.gloss, self.line, self.shadow = groove, gloss, line, shadow
        self.root_dark, self.tip_dark, self.wob, self.seed = root_dark, tip_dark, wob, seed
        self.N = 80
        self.pts = np.array([bez(ctrl, i / self.N) for i in range(self.N + 1)])
        d = np.gradient(self.pts, axis=0)
        self.tan = d / np.maximum(1e-6, np.linalg.norm(d, axis=1))[:, None]
        if wave:
            # waves: the centreline swings side to side, growing from nothing at the root
            amp, periods, phase = wave
            for i in range(self.N + 1):
                t = i / self.N
                env = min(1.0, t / 0.3)
                n = np.array([-self.tan[i][1], self.tan[i][0]])
                self.pts[i] = self.pts[i] + n * amp * env * math.sin(2 * math.pi * periods * t + phase)
            d = np.gradient(self.pts, axis=0)
            self.tan = d / np.maximum(1e-6, np.linalg.norm(d, axis=1))[:, None]
        r = max(w0, w1) / 2 + 1
        self.bb = (self.pts[:, 0].min() - r, self.pts[:, 1].min() - r, self.pts[:, 0].max() + r, self.pts[:, 1].max() + r)
        seg = np.linalg.norm(np.diff(self.pts, axis=0), axis=1)
        self.len = seg.sum()

    def width(self, t):
        if t <= self.hold:
            w = self.w0
        else:
            k = (t - self.hold) / (1 - self.hold)
            w = self.w1 + (self.w0 - self.w1) * (1 - k) ** self.power
        if self.wob:
            w *= 1 + self.wob * math.sin(t * 9 + self.seed)
        return w

    def info(self, x, y):
        q = np.array([x, y])
        d2 = ((self.pts - q) ** 2).sum(axis=1)
        i = int(d2.argmin())
        t = i / self.N
        tg = self.tan[i]
        dv = q - self.pts[i]
        if i == 0 and dv @ tg < -0.1:
            return None
        if i == self.N and dv @ tg > 0.05:
            return None
        hw = self.width(t) / 2
        dist = math.sqrt(d2[i])
        if dist > hw:
            return None
        n = np.array([-tg[1], tg[0]])
        across = dv @ n
        # u: -1 on the edge facing the light, +1 on the far edge
        u = across / max(0.5, hw)
        if n @ L2 > 0:
            u = -u
        return dict(t=t, u=u, hw=hw, across=across * (1 if n @ L2 <= 0 else -1))


class Mass(Prim):
    """Flat hair mass (polygon, or a membership fn with a bbox) under the strands, shaded by the form only."""

    def __init__(self, pts, z=0, lit=0.0, flow=(0.3, 1), groove=0.0, gloss=True, fn=None, bb=None):
        self.pts, self.z, self.lit, self.groove, self.gloss, self.fn = pts, z, lit, groove, gloss, fn
        f = np.array(flow, float)
        self.flow = f / np.linalg.norm(f)
        if fn is not None:
            self.bb = bb
        else:
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            self.bb = (min(xs), min(ys), max(xs), max(ys))
        self.line = False
        self.shadow = False
        self.lines, self.streak, self.ring_dy = [], None, 0.0

    def info(self, x, y):
        if self.fn is not None:
            if not self.fn(x, y):
                return None
        elif not pip(x, y, self.pts):
            return None
        nrm = np.array([-self.flow[1], self.flow[0]])
        return dict(t=0.5, u=0.0, hw=3.0, across=x * nrm[0] + y * nrm[1])


class Blob(Prim):
    """Ellipse (a bun, a tie): shaded as its own small sphere; optional coil grooves."""

    def __init__(self, cx, cy, rx, ry, z=0, lit=0.0, coil=0, gloss=True, line=True, braid=0.0):
        self.c, self.r, self.z, self.lit, self.coil, self.gloss = (cx, cy), (rx, ry), z, lit, coil, gloss
        self.braid = braid
        self.bb = (cx - rx, cy - ry, cx + rx, cy + ry)
        self.line, self.shadow, self.groove = line, True, 0
        self.lines, self.streak, self.ring_dy = [], None, 0.0

    def info(self, x, y):
        dx = (x - self.c[0]) / self.r[0]
        dy = (y - self.c[1]) / self.r[1]
        rr = dx * dx + dy * dy
        if rr > 1:
            return None
        return dict(t=0.5, u=0.0, hw=3.0, across=0.0, blob=(dx, dy))


def generate(prims, form, gloss=None, dist=(0.24, 0.36, 0.28, 0.12), W=40, H=44, pad=8, ss=4,
             cast=1.6, rim=True, under=None, extra=None, clean=2, seed=3, ring_hi=5, keep=None):
    """form: (cx, cy, rx, ry) head ellipsoid for the global light.
    gloss: (cy, x0, x1, curve, half_thickness): ring y(x) = cy + curve * ((x - mid)/half)^2, drawn as shades 4-5.
    under: fn(x, y) -> darkening.  extra: fn(x, y, prim) -> value delta.
    dist: share of the interior per base shade 1..4 (the ring adds the 5s)."""
    W2, H2 = W + 2 * pad, H + 2 * pad
    owner = -np.ones((H2, W2), int)
    infos = [[None] * W2 for _ in range(H2)]
    order = sorted(range(len(prims)), key=lambda i: prims[i].z)
    for r in range(H2):
        for c in range(W2):
            votes = {}
            hits = 0
            for j in range(ss):
                for i in range(ss):
                    x = c - pad + (i + 0.5) / ss
                    y = r - pad + (j + 0.5) / ss
                    for k in reversed(order):
                        p = prims[k]
                        bb = p.bb
                        if x < bb[0] or x > bb[2] or y < bb[1] or y > bb[3]:
                            continue
                        inf = p.info(x, y)
                        if inf is not None:
                            votes.setdefault(k, []).append(inf)
                            hits += 1
                            break
            if hits * 2 < ss * ss:
                continue
            k = max(votes, key=lambda q: (len(votes[q]), prims[q].z))
            owner[r, c] = k
            vs = votes[k]
            infos[r][c] = {key: (float(np.mean([v[key] for v in vs])) if key != 'blob' else tuple(np.mean([v[key] for v in vs], axis=0)))
                           for key in vs[0]}
    if keep is not None:
        for r in range(H2):
            for c in range(W2):
                if owner[r, c] >= 0 and not keep(c - pad + 0.5, r - pad + 0.5) and not getattr(prims[owner[r, c]], 'free', False):
                    owner[r, c] = -1
    mask = owner >= 0
    val = np.zeros((H2, W2))
    groove = np.zeros((H2, W2), bool)
    deep = np.zeros((H2, W2), bool)
    hi = np.zeros((H2, W2), int)
    fx, fy, frx, fry = form
    for r in range(H2):
        for c in range(W2):
            if not mask[r, c]:
                continue
            k = owner[r, c]
            p = prims[k]
            inf = infos[r][c]
            x, y = c - pad + 0.5, r - pad + 0.5
            nx_, ny_ = (x - fx) / frx, (y - fy) / fry
            rr = nx_ * nx_ + ny_ * ny_
            if rr > 1:
                s = 1 / math.sqrt(rr)
                nx_, ny_ = nx_ * s, ny_ * s
            nz = math.sqrt(max(0.0, 1 - nx_ * nx_ - ny_ * ny_))
            lam = max(0.0, np.array([nx_, ny_, nz]) @ L3)
            v = FORM * lam + p.lit
            t, u = inf['t'], inf['u']
            if 'blob' in inf:
                bx, by = inf['blob']
                bz = math.sqrt(max(0.0, 1 - bx * bx - by * by))
                bl = max(0.0, np.array([bx, by, bz]) @ L3)
                v = 0.4 * lam + 0.65 * bl + p.lit
                if p.coil:
                    ang = math.atan2(by, bx)
                    rad = math.sqrt(bx * bx + by * by)
                    sp = rad * p.coil + ang / (2 * math.pi)
                    ph = sp % 1.0
                    if ph > 0.8 and rad > 0.3:
                        deep[r, c] = getattr(p, 'braid', 0) > 0
                        groove[r, c] = True
                    elif getattr(p, 'braid', 0) and rad > 0.25:
                        # braid: each turn of the coil is a row of plaited segments, lit where a segment
                        # starts and creased where the next one tucks under it
                        arc = (ang + math.pi) * rad * (p.r[0] + p.r[1]) / 2
                        # plaits slant across the turn: the crease runs diagonally from one ring edge to the other
                        sf = (arc / p.braid + 0.5 * math.floor(sp) + 0.45 * ph) % 1.0
                        if sf > 0.74:
                            deep[r, c] = True
                        elif sf < 0.34:
                            hi[r, c] = max(hi[r, c], 1)
            elif isinstance(p, Strand):
                v += -CYL * u
                if u > 0.6:
                    v -= 0.1
                if p.root_dark and t < 0.12:
                    v -= 0.15 * (1 - t / 0.12)
                if p.tip_dark and t > 0.8:
                    v -= 0.2 * (t - 0.8) / 0.2
                hw = inf['hw']
                for (uu, ta, tb) in p.lines:
                    if ta <= t <= tb and abs(inf['u'] - uu) * hw < 0.5:
                        groove[r, c] = True
                if p.streak and p.streak[0] <= t <= p.streak[1] and u < -0.35:
                    hi[r, c] = max(hi[r, c], 1)
            if p.groove and 'blob' not in inf and inf['hw'] * 2 >= p.groove * 1.2 and p.g0 <= t <= p.g1:
                # a few thin strand lines along wide strands, wandering a little
                a = inf['across'] + 0.45 * math.sin(t * 6.5 + k * 1.9)
                ph = (a / p.groove + 0.37 * k) % 1.0
                if ph > 1 - 1.0 / p.groove * 0.9:
                    groove[r, c] = True
            if gloss and p.gloss:
                gcy, gx0, gx1, curve, th = gloss
                mid, half = (gx0 + gx1) / 2, (gx1 - gx0) / 2
                if gx0 <= x <= gx1:
                    yy = gcy + curve * ((x - mid) / half) ** 2 + (p.ring_dy if isinstance(p, Strand) else 0)
                    d = abs(y - yy)
                    if d < th and not (isinstance(p, Strand) and u > 0.35):
                        core = d < 0.55 and (not isinstance(p, Strand) or u < -0.1)
                        hi[r, c] = max(hi[r, c], 2 if core else 1)
            if under:
                v -= under(x, y)
            if extra:
                v += extra(x, y, p)
            val[r, c] = v
    if cast:
        sh = np.zeros((H2, W2), bool)
        for r in range(H2):
            for c in range(W2):
                if not mask[r, c]:
                    continue
                zk = prims[owner[r, c]].z
                for step in (1, 2):
                    if step > cast + 0.5:
                        break
                    rr = int(round(r + L2[1] * step))
                    cc = int(round(c + L2[0] * step))
                    if 0 <= rr < H2 and 0 <= cc < W2 and mask[rr, cc]:
                        p2 = prims[owner[rr, cc]]
                        if p2.z > zk and p2.shadow and infos[rr][cc]['t'] <= p2.line_t1:
                            sh[r, c] = True
                            break
        val[sh] -= 0.22
    out = np.zeros((H2, W2), bool)
    rimpx = np.zeros((H2, W2), bool)
    inner = np.zeros((H2, W2), bool)
    for r in range(H2):
        for c in range(W2):
            if not mask[r, c]:
                continue
            outs = []
            for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                rr, cc = r + dr, c + dc
                if rr < 0 or cc < 0 or rr >= H2 or cc >= W2 or not mask[rr, cc]:
                    outs.append((dc, dr))
            if outs:
                out[r, c] = True
                if rim and all(d in ((-1, 0), (0, -1)) for d in outs):
                    rimpx[r, c] = True
                continue
            k = owner[r, c]
            for dc, dr in ((-1, 0), (0, -1), (1, 0), (0, 1)):
                rr, cc = r + dr, c + dc
                k2 = owner[rr, cc]
                if k2 != k and prims[k2].z > prims[k].z and prims[k2].line:
                    t2 = infos[rr][cc]['t']
                    if prims[k2].line_t0 <= t2 <= prims[k2].line_t1 and dc * L2[0] + dr * L2[1] > 0.2:
                        inner[r, c] = True
                        break
    interior = mask & ~out & ~inner
    vals = np.sort(val[interior])
    cuts = np.cumsum(dist)[:-1]
    th = [vals[min(len(vals) - 1, int(q * len(vals)))] for q in cuts]
    shade = np.full((H2, W2), -1)
    for r in range(H2):
        for c in range(W2):
            if not mask[r, c]:
                continue
            if out[r, c]:
                shade[r, c] = 1 if (rimpx[r, c] and val[r, c] > th[1]) else 0
            elif inner[r, c]:
                shade[r, c] = 1
            else:
                s = 1 + sum(val[r, c] > t for t in th)
                if deep[r, c]:
                    s = max(1, s - 2)
                elif groove[r, c]:
                    s = max(1, s - 1)
                elif hi[r, c] == 2:
                    s = max(s, ring_hi if s >= 2 else 3)
                elif hi[r, c] == 1:
                    s = max(s, min(4, s + 1))
                fl = getattr(prims[owner[r, c]], 'floor', 0)
                if fl:
                    s = max(s, fl)
                shade[r, c] = s
    for _ in range(clean):
        fix = []
        for r in range(1, H2 - 1):
            for c in range(1, W2 - 1):
                s0 = shade[r, c]
                if s0 < 1 or out[r, c] or inner[r, c]:
                    continue
                nb = [shade[r + dr, c + dc] for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                nb = [n for n in nb if n >= 1]
                if len(nb) == 4 and all(n != s0 for n in nb):
                    srt = sorted(nb, key=lambda n: (abs(n - s0), n))
                    fix.append((r, c, srt[0]))
        for r, c, v in fix:
            shade[r, c] = v
    rows = [''.join('.' if shade[r, c] < 0 else str(shade[r, c]) for c in range(W2)) for r in range(H2)]
    top = 0
    while top < H2 and set(rows[top]) == {'.'}:
        top += 1
    bot = H2
    while bot > top and set(rows[bot - 1]) == {'.'}:
        bot -= 1
    left = 0
    while left < W2 and all(rw[left] == '.' for rw in rows[top:bot]):
        left += 1
    right = W2
    while right > left and all(rw[right - 1] == '.' for rw in rows[top:bot]):
        right -= 1
    rows = [rw[left:right] for rw in rows[top:bot]]
    return rows, (AX + pad - left, AY + pad - top)


def hist(rows):
    cnt = [0] * 6
    for rw in rows:
        for ch in rw:
            if ch != '.':
                cnt[int(ch)] += 1
    tot = sum(cnt) or 1
    return [round(100 * x / tot) for x in cnt]


def silhouette(rows, anchor):
    """Membership fn + bbox (generator coords) of an existing template's pixels."""
    fa_x, fa_y = anchor
    H, W = len(rows), max(len(r) for r in rows)

    def inside(x, y):
        c = int(math.floor(x)) + fa_x - AX
        r = int(math.floor(y)) + fa_y - AY
        return 0 <= r < H and 0 <= c < len(rows[r]) and rows[r][c] != '.'
    bb = (AX - fa_x, AY - fa_y, AX - fa_x + W, AY - fa_y + H)
    return inside, bb


def own(prims, W=40, H=44, pad=8, ss=4, keep=None):
    """Supersampled ownership: (owner, infos) on the padded canvas."""
    W2, H2 = W + 2 * pad, H + 2 * pad
    owner = -np.ones((H2, W2), int)
    infos = [[None] * W2 for _ in range(H2)]
    order = sorted(range(len(prims)), key=lambda i: prims[i].z)
    for r in range(H2):
        for c in range(W2):
            votes = {}
            hits = 0
            for j in range(ss):
                for i in range(ss):
                    x = c - pad + (i + 0.5) / ss
                    y = r - pad + (j + 0.5) / ss
                    for k in reversed(order):
                        p = prims[k]
                        bb = p.bb
                        if x < bb[0] or x > bb[2] or y < bb[1] or y > bb[3]:
                            continue
                        inf = p.info(x, y)
                        if inf is not None:
                            votes.setdefault(k, []).append(inf)
                            hits += 1
                            break
            if hits * 2 < ss * ss:
                continue
            k = max(votes, key=lambda q: (len(votes[q]), prims[q].z))
            if keep is not None and not keep(c - pad + 0.5, r - pad + 0.5) and not getattr(prims[k], 'free', False):
                continue
            owner[r, c] = k
            vs = votes[k]
            infos[r][c] = {key: (float(np.mean([v[key] for v in vs])) if key != 'blob' else tuple(np.mean([v[key] for v in vs], axis=0)))
                           for key in vs[0]}
    return owner, infos


def cel(prims, form, ring=None, levels=(0.3, 0.62), W=40, H=44, pad=8, ss=4, keep=None, under=None, extra=None,
        wedge=0.45, wedge_t=0.35, zig=0.18, cast=True, rim=True, clean=2, cuts=None):
    """Cel-shaded hair: smooth light zones from the head form (shades 2/3/4), shadow wedges on the far side of
    each strand toward its tip, the gloss ring (4-5) whose lower edge runs down the lit side of each strand
    (a zigzag), separation lines (1) and the outline (0)."""
    W2, H2 = W + 2 * pad, H + 2 * pad
    owner, infos = own(prims, W, H, pad, ss, keep)
    mask = owner >= 0
    fx, fy, frx, fry = form
    shade = np.full((H2, W2), -1)
    lamv = np.zeros((H2, W2))
    for r in range(H2):
        for c in range(W2):
            if not mask[r, c]:
                continue
            k = owner[r, c]
            p = prims[k]
            inf = infos[r][c]
            x, y = c - pad + 0.5, r - pad + 0.5
            nx_, ny_ = (x - fx) / frx, (y - fy) / fry
            rr = nx_ * nx_ + ny_ * ny_
            if rr > 1:
                s = 1 / math.sqrt(rr)
                nx_, ny_ = nx_ * s, ny_ * s
            nz = math.sqrt(max(0.0, 1 - nx_ * nx_ - ny_ * ny_))
            lam = max(0.0, np.array([nx_, ny_, nz]) @ L3) + p.lit
            if under:
                lam -= under(x, y)
            if extra:
                lam += extra(x, y, p)
            if 'blob' in inf:
                bx, by = inf['blob']
                bz = math.sqrt(max(0.0, 1 - bx * bx - by * by))
                lam = 0.35 * lam + 0.75 * max(0.0, np.array([bx, by, bz]) @ L3) + p.lit
            lamv[r, c] = lam
    # zone thresholds: either absolute levels, or shares of the hair (cuts = fractions for shade 2|3 and 3|4)
    if cuts is not None:
        vals = np.sort(lamv[mask])
        levels = tuple(vals[min(len(vals) - 1, int(q * len(vals)))] for q in cuts)
    for r in range(H2):
        for c in range(W2):
            if not mask[r, c]:
                continue
            k = owner[r, c]
            p = prims[k]
            inf = infos[r][c]
            x, y = c - pad + 0.5, r - pad + 0.5
            lam = lamv[r, c]
            s = 2 if lam < levels[0] else (3 if lam < levels[1] else 4)
            t, u = inf['t'], inf['u']
            if isinstance(p, Strand):
                # shadow wedge: the far side of the strand, widening toward the tip
                if t > wedge_t and u > 1 - wedge * (t - wedge_t) / (1 - wedge_t) * 2:
                    s -= 1
                if p.tip_dark and t > 0.9:
                    s -= 1
                for (uu, ta, tb) in p.lines:
                    if ta <= t <= tb and abs(u - uu) * inf['hw'] < 0.5:
                        s -= 1
                if p.streak and p.streak[0] <= t <= p.streak[1] and u < -0.45:
                    s += 1
            if 'blob' in inf and p.coil:
                bx, by = inf['blob']
                ang = math.atan2(by, bx)
                rad = math.sqrt(bx * bx + by * by)
                if (rad * p.coil + ang / (2 * math.pi)) % 1.0 > 0.8 and rad > 0.3:
                    s -= 1
            if ring and p.gloss:
                gcy, gx0, gx1, curve, th = ring
                mid, half = (gx0 + gx1) / 2, (gx1 - gx0) / 2
                if gx0 <= x <= gx1:
                    yy = gcy + curve * ((x - mid) / half) ** 2 + (p.ring_dy if isinstance(p, Strand) else 0)
                    d = y - yy
                    lit_side = (not isinstance(p, Strand)) or u < 0.2
                    # the lower edge zigzags: on the lit side of a strand the band runs further down
                    low = th + (zig * 10 * max(0.0, -u) if isinstance(p, Strand) else 0)
                    if -th <= d <= low and lit_side:
                        core = abs(d) < 0.6 and (not isinstance(p, Strand) or u < -0.15)
                        s = max(s, 5 if core else 4)
            shade[r, c] = max(1, min(5, s))
    # cast shadow under strands lying on top
    if cast:
        sh = []
        for r in range(H2):
            for c in range(W2):
                if not mask[r, c]:
                    continue
                zk = prims[owner[r, c]].z
                rr, cc = int(round(r + L2[1] * 1.3)), int(round(c + L2[0] * 1.3))
                if 0 <= rr < H2 and 0 <= cc < W2 and mask[rr, cc] and prims[owner[rr, cc]].z > zk and prims[owner[rr, cc]].shadow:
                    sh.append((r, c))
        for r, c in sh:
            shade[r, c] = max(1, shade[r, c] - 1)
    for _ in range(clean):
        fix = []
        for r in range(1, H2 - 1):
            for c in range(1, W2 - 1):
                s0 = shade[r, c]
                if s0 < 1:
                    continue
                nb = [shade[r + dr, c + dc] for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                nb = [n for n in nb if n >= 1]
                if len(nb) == 4 and all(n != s0 for n in nb):
                    srt = sorted(nb, key=lambda n: (abs(n - s0), n))
                    fix.append((r, c, srt[0]))
        for r, c, v in fix:
            shade[r, c] = v
    # lines last, so they stay crisp
    for r in range(H2):
        for c in range(W2):
            if not mask[r, c]:
                continue
            outs = []
            for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                rr, cc = r + dr, c + dc
                if rr < 0 or cc < 0 or rr >= H2 or cc >= W2 or not mask[rr, cc]:
                    outs.append((dc, dr))
            if outs:
                lit = rim and all(d in ((-1, 0), (0, -1)) for d in outs) and lamv[r, c] >= levels[1]
                shade[r, c] = -2 if not lit else -3  # marked: outline 0 / lit rim 1
                continue
            k = owner[r, c]
            for dc, dr in ((-1, 0), (0, -1), (1, 0), (0, 1)):
                k2 = owner[r + dr, c + dc]
                if k2 >= 0 and k2 != k and prims[k2].z > prims[k].z and prims[k2].line:
                    if infos[r + dr][c + dc]['t'] >= prims[k2].line_t0 and dc * L2[0] + dr * L2[1] > 0.2:
                        shade[r, c] = -4  # separation line
                        break
    shade[shade == -2] = 0
    shade[shade == -3] = 1
    shade[shade == -4] = 1
    rows = [''.join('.' if shade[r, c] < 0 else str(shade[r, c]) for c in range(W2)) for r in range(H2)]
    top = 0
    while top < H2 and set(rows[top]) == {'.'}:
        top += 1
    bot = H2
    while bot > top and set(rows[bot - 1]) == {'.'}:
        bot -= 1
    left = 0
    while left < W2 and all(rw[left] == '.' for rw in rows[top:bot]):
        left += 1
    right = W2
    while right > left and all(rw[right - 1] == '.' for rw in rows[top:bot]):
        right -= 1
    rows = [rw[left:right] for rw in rows[top:bot]]
    return rows, (AX + pad - left, AY + pad - top)
