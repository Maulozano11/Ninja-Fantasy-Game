"""Shared helpers for the painted scene backdrops (tools/scenes/*.py).

A scene is painted as layers. Each layer is baked at S x the world resolution (1 m = 57 px at 1x)
as fields, not colours:

    mat   material index per pixel (-1 = empty), see Mat
    val   lightness 0..1 from the scene's lighting (moon, ambient, texture)
    obj   object id (parts drawn later sit in front; used for 1 px inner lines)
    warm  firelight 0..1 (picked into warm palette rows)

resolve() downsamples a layer to 1x by majority vote per S x S block (no colour blending between
materials, so edges stay crisp), then turns every pixel into a palette colour: the lightness picks
a ramp step with clustered noise on the band edges (2-3 px strokes, never per-pixel speckle), the
firelight picks one of four warm rows. Everything ends up quantised to the material palettes.
"""
import math

import numpy as np
from PIL import Image

S = 2  # bake supersampling
OUTLINE = np.array([7, 6, 11], float)


# ------------------------------------------------------------------ colour

def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def mixc(a, b, t):
    return np.asarray(a, float) * (1 - t) + np.asarray(b, float) * t


# Firelight: a warm tint multiplied in and a little added, per warm level (0 = moon only).
FIRE_TINT = np.array([1.9, 1.4, 0.92])
FIRE_ADD = np.array([58, 34, 14], float)
WARM_LEVELS = [0.0, 0.32, 0.62, 0.95]


def warm_color(c, g):
    c = np.asarray(c, float)
    lum = (c @ np.array([0.3, 0.59, 0.11])) / 255
    out = c * (1 - g) + c * FIRE_TINT * g + FIRE_ADD * g * (0.5 + 0.9 * lum)
    return np.clip(out, 0, 255)


MATS = []


class Mat:
    """A material: a ramp of colours from dark to light (lightness 0..1 maps across it).

    alpha: opacity of every pixel (mist uses < 255). outline: the layer's outline pass draws a dark
    rim around it. warm: firelight can tint it. lines: dark 1 px inner lines where objects overlap.
    jit / cell: how far band edges wander (in steps) and the size of the strokes (1x px).
    """

    def __init__(self, name, cols, alpha=255, outline=True, warm=True, jit=0.7, cell=2.2, rim=0, line=None):
        self.name = name
        self.cols = np.array([hexrgb(c) if isinstance(c, str) else np.asarray(c, float) for c in cols])
        self.n = len(self.cols)
        self.alpha = alpha
        self.outline = outline
        self.jit = jit
        self.cell = cell
        self.rim = rim
        self.rows = np.stack([np.array([warm_color(c, g) if warm else c for c in self.cols]) for g in WARM_LEVELS])
        self.line = mixc(self.cols[0], OUTLINE, 0.55) if line is None else hexrgb(line)
        self.id = len(MATS)
        MATS.append(self)


# ------------------------------------------------------------------ noise (deterministic)

def hash2(ix, iy, seed=0):
    ix = np.asarray(ix).astype(np.int64)
    iy = np.asarray(iy).astype(np.int64)
    h = (ix * 374761393 + iy * 668265263 + (seed * 2147483647 & 0xffffffff)) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    h = h ^ (h >> 16)
    return h / 4294967296.0


def noise(x, y, cell=4.0, seed=0):
    """Smooth value noise in [0, 1) at arbitrary coordinates (arrays or scalars)."""
    fx = np.asarray(x, float) / cell
    fy = np.asarray(y, float) / cell
    x0 = np.floor(fx)
    y0 = np.floor(fy)
    tx = fx - x0
    ty = fy - y0
    sx = tx * tx * (3 - 2 * tx)
    sy = ty * ty * (3 - 2 * ty)
    a = hash2(x0, y0, seed)
    b = hash2(x0 + 1, y0, seed)
    c = hash2(x0, y0 + 1, seed)
    d = hash2(x0 + 1, y0 + 1, seed)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy


def fbm(x, y, cell=8.0, octaves=3, seed=0):
    s = 0.0
    amp = 1.0
    tot = 0.0
    for o in range(octaves):
        s = s + noise(x, y, cell / 2 ** o, seed + o * 101) * amp
        tot += amp
        amp *= 0.5
    return s / tot


def rnd(seed, i, j=0):
    """A deterministic random number in [0, 1) for integer keys."""
    return float(hash2(i * 7 + 3, j * 13 + 5, seed))


def smoothstep(a, b, t):
    x = np.clip((np.asarray(t, float) - a) / (b - a), 0, 1)
    return x * x * (3 - 2 * x)


# ------------------------------------------------------------------ lighting

def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


# Screen x right, y down, z toward the viewer. The moon is high and to the right.
MOON_L = unit([0.55, -0.6, 0.58])


def moon_light(nx, ny, nz, ambient=0.16, ldir=None):
    L = MOON_L if ldir is None else ldir
    l = np.maximum(0, nx * L[0] + ny * L[1] + nz * L[2])
    return ambient + (1 - ambient) * l


def cushions(X, Y, cell, seed, squash=1.2):
    """Nearest point of a jittered grid (a Voronoi field): offsets (du, dv) in [-1, 1] from the
    cushion's centre, for moss and lichen bumps that read as round clumps."""
    gx = np.floor(X / cell)
    gy = np.floor(Y / cell)
    best = np.full(X.shape, 1e9)
    du = np.zeros(X.shape)
    dv = np.zeros(X.shape)
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            cx = (gx + ox + 0.15 + 0.7 * hash2(gx + ox, gy + oy, seed)) * cell
            cy = (gy + oy + 0.15 + 0.7 * hash2(gx + ox, gy + oy, seed + 1)) * cell
            rr = cell * (0.62 + 0.3 * hash2(gx + ox, gy + oy, seed + 2))
            d = np.hypot(X - cx, (Y - cy) * squash) / rr
            take = d < best
            best = np.where(take, d, best)
            du = np.where(take, (X - cx) / rr, du)
            dv = np.where(take, (Y - cy) * squash / rr, dv)
    return du, dv, best


# ------------------------------------------------------------------ layers

class Layer:
    """Fields of one scene layer at S x resolution; drawing calls take 1x coordinates."""

    def __init__(self, W, H):
        self.W, self.H = W, H
        self.mat = np.full((H * S, W * S), -1, np.int16)
        self.val = np.zeros((H * S, W * S), np.float32)
        self.obj = np.zeros((H * S, W * S), np.int32)
        self.warm = np.zeros((H * S, W * S), np.float32)
        self.lines = [False]
        self.nobj = 0

    def new_obj(self, lines=True):
        self.nobj += 1
        self.lines.append(lines)
        return self.nobj

    def box(self, x0, y0, x1, y1):
        """Clipped bake-grid slice for a 1x box, with the 1x coordinates of each sample's centre."""
        X0 = max(0, int(math.floor(x0 * S)))
        Y0 = max(0, int(math.floor(y0 * S)))
        X1 = min(self.W * S, int(math.ceil(x1 * S)) + 1)
        Y1 = min(self.H * S, int(math.ceil(y1 * S)) + 1)
        if X1 <= X0 or Y1 <= Y0:
            return None
        ys = (np.arange(Y0, Y1) + 0.5) / S
        xs = (np.arange(X0, X1) + 0.5) / S
        X, Y = np.meshgrid(xs, ys)
        return (slice(Y0, Y1), slice(X0, X1)), X, Y

    def put(self, sl, mask, mat, val, obj, warm=None):
        if not np.any(mask):
            return
        m = self.mat[sl]
        m[mask] = mat.id if isinstance(mat, Mat) else mat
        v = self.val[sl]
        v[mask] = (val[mask] if np.ndim(val) else val)
        o = self.obj[sl]
        o[mask] = obj
        if warm is not None:
            w = self.warm[sl]
            w[mask] = warm[mask] if np.ndim(warm) else warm

    def full(self):
        ys = (np.arange(self.H * S) + 0.5) / S
        xs = (np.arange(self.W * S) + 0.5) / S
        X, Y = np.meshgrid(xs, ys)
        return (slice(None), slice(None)), X, Y

    # -------------------------------------------------------------- resolve to 1x

    def resolve(self, seed=1):
        H, W = self.H, self.W
        k = S * S

        def blocks(a):
            return a.reshape(H, S, W, S).transpose(0, 2, 1, 3).reshape(H, W, k)

        m = blocks(self.mat)
        v = blocks(self.val)
        o = blocks(self.obj)
        wm = blocks(self.warm)
        cnt = np.zeros((H, W, k))
        for j in range(k):
            cnt[..., j] = (m == m[..., j:j + 1]).sum(-1)
        # Ties between empty and filled go to the filled samples (shapes stay bold at 1x); among
        # filled ones the front-most object wins.
        score = cnt + (m >= 0) * 0.5 + o * 1e-7
        pick = np.argmax(score, -1)[..., None]
        M = np.take_along_axis(m, pick, -1)[..., 0]
        O = np.take_along_axis(o, pick, -1)[..., 0]
        same = (m == M[..., None]) & (o == O[..., None])
        ns = np.maximum(1, same.sum(-1))
        V = (v * same).sum(-1) / ns
        Wm = (wm * same).sum(-1) / ns
        res = Resolved(W, H, M, O, V, Wm, self.lines, seed)
        return res


class Resolved:
    """A layer at 1x: material, object, lightness, warmth, and the palette step chosen per pixel."""

    def __init__(self, W, H, M, O, V, Wm, lines, seed):
        self.W, self.H = W, H
        self.M, self.O, self.V, self.Wm = M, O, V, Wm
        self.lines = np.array(lines, bool)
        ys, xs = np.mgrid[0:H, 0:W]
        self.xs, self.ys = xs, ys
        self.step = np.zeros((H, W), np.int16)
        self.wl = np.zeros((H, W), np.int16)
        self.rgb = np.zeros((H, W, 3), float)
        self.a = np.zeros((H, W), np.uint8)
        self.over = np.zeros((H, W), bool)
        for mat in MATS:
            sel = M == mat.id
            if not sel.any():
                continue
            nz = noise(xs[sel], ys[sel], mat.cell, seed + mat.id * 13) - 0.5
            st = np.floor(V[sel] * mat.n + nz * mat.jit * 2)
            self.step[sel] = np.clip(st, 0, mat.n - 1)
            nz2 = noise(xs[sel], ys[sel], 3.4, seed + 977) - 0.5
            wl = np.floor(Wm[sel] * 3 + 0.5 + nz2 * 0.6)
            self.wl[sel] = np.clip(wl, 0, 3)
        self.paint()

    def paint(self):
        for mat in MATS:
            sel = (self.M == mat.id) & ~self.over
            if not sel.any():
                continue
            self.rgb[sel] = mat.rows[self.wl[sel], self.step[sel]]
            self.a[sel] = mat.alpha

    def bump(self, sel, d):
        """Moves the chosen pixels d steps along their ramps (clamped) and repaints them."""
        for mat in MATS:
            s2 = sel & (self.M == mat.id)
            if s2.any():
                self.step[s2] = np.clip(self.step[s2] + d, 0, mat.n - 1)
        self.paint()

    def opaque(self):
        return self.M >= 0

    def rim(self, dx=1, dy=-1, amount=1, only=None):
        """Silhouette pixels whose (dx, dy) neighbour is empty catch the light (moon rim)."""
        op = self.opaque()
        nb = np.zeros_like(op)
        H, W = op.shape
        ys = slice(max(0, -dy), H - max(0, dy))
        xs = slice(max(0, -dx), W - max(0, dx))
        ys2 = slice(max(0, dy), H - max(0, -dy))
        xs2 = slice(max(0, dx), W - max(0, -dx))
        nb[ys, xs] = op[ys2, xs2]
        sel = op & ~nb
        rimmat = np.zeros_like(op)
        for mat in MATS:
            if mat.rim:
                rimmat |= self.M == mat.id
        sel &= rimmat
        if only is not None:
            sel &= only
        self.bump(sel, amount)

    def inner_lines(self):
        """Where an object lies in front of another, the pixel of the one behind becomes a dark line."""
        H, W = self.M.shape
        op = self.opaque()
        line_col = np.zeros((H, W, 3))
        hit = np.zeros((H, W), bool)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            O2 = np.full((H, W), -1)
            M2 = np.full((H, W), -1)
            ys = slice(max(0, -dy), H - max(0, dy))
            xs = slice(max(0, -dx), W - max(0, dx))
            ys2 = slice(max(0, dy), H - max(0, -dy))
            xs2 = slice(max(0, dx), W - max(0, -dx))
            O2[ys, xs] = self.O[ys2, xs2]
            M2[ys, xs] = self.M[ys2, xs2]
            front = op & (M2 >= 0) & (O2 > self.O) & self.lines[np.clip(O2, 0, len(self.lines) - 1)] & ~hit
            if front.any():
                for mat in MATS:
                    s2 = front & (M2 == mat.id)
                    if s2.any():
                        line_col[s2] = mat.line
                hit |= front
        self.rgb[hit] = line_col[hit]
        self.over |= hit

    def outline(self, amount=0.7, mats=None):
        """kit.outline(): each empty pixel next to an outlined material takes its darkest neighbour,
        pulled toward near-black."""
        H, W = self.M.shape
        ok = np.zeros((H, W), bool)
        for mat in MATS:
            if mat.outline and (mats is None or mat in mats) and mat.alpha == 255:
                ok |= self.M == mat.id
        lum = self.rgb @ np.array([0.3, 0.59, 0.11])
        best = np.full((H, W), 1e9)
        col = np.zeros((H, W, 3))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ok2 = np.zeros((H, W), bool)
            l2 = np.full((H, W), 1e9)
            c2 = np.zeros((H, W, 3))
            ys = slice(max(0, -dy), H - max(0, dy))
            xs = slice(max(0, -dx), W - max(0, dx))
            ys2 = slice(max(0, dy), H - max(0, -dy))
            xs2 = slice(max(0, dx), W - max(0, -dx))
            ok2[ys, xs] = ok[ys2, xs2]
            l2[ys, xs] = lum[ys2, xs2]
            c2[ys, xs] = self.rgb[ys2, xs2]
            take = ok2 & (l2 < best) & (self.M < 0)
            best[take] = l2[take]
            col[take] = c2[take]
        add = best < 1e9
        self.rgb[add] = mixc(col[add], OUTLINE, amount)
        self.a[add] = 255
        self.over |= add
        self.M = np.where(add, -2, self.M)

    def image(self):
        out = np.zeros((self.H, self.W, 4), np.uint8)
        out[..., :3] = np.clip(np.round(self.rgb), 0, 255).astype(np.uint8)
        out[..., 3] = self.a
        return Image.fromarray(out, 'RGBA')


# ------------------------------------------------------------------ shapes

def tube_fields(layer, pts, radii, pad=2):
    """Distance fields of a tapered tube along a polyline (1x coords). Returns (slice, inside mask,
    u across in [-1, 1] (left to right of the direction of travel), v arc length in px, tangent x/y)."""
    pts = np.asarray(pts, float)
    radii = np.asarray(radii, float)
    x0 = pts[:, 0].min() - radii.max() - pad
    x1 = pts[:, 0].max() + radii.max() + pad
    y0 = pts[:, 1].min() - radii.max() - pad
    y1 = pts[:, 1].max() + radii.max() + pad
    b = layer.box(x0, y0, x1, y1)
    if b is None:
        return None
    sl, X, Y = b
    best = np.full(X.shape, 1e9)
    U = np.zeros(X.shape)
    V = np.zeros(X.shape)
    TX = np.zeros(X.shape)
    TY = np.zeros(X.shape)
    acc = 0.0
    for i in range(len(pts) - 1):
        ax, ay = pts[i]
        bx, by = pts[i + 1]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-6
        tx, ty = dx / L, dy / L
        t = np.clip(((X - ax) * tx + (Y - ay) * ty) / L, 0, 1)
        px = ax + dx * t
        py = ay + dy * t
        r = radii[i] + (radii[i + 1] - radii[i]) * t
        ox, oy = X - px, Y - py
        d = np.hypot(ox, oy)
        nd = d / np.maximum(r, 1e-3)
        take = nd < best
        best[take] = nd[take]
        # Signed: positive on the side of (-ty, tx), the right of the travel direction on screen
        # (y down), so the surface normal is U * (-ty, tx) + sqrt(1 - U^2) toward the viewer.
        side = np.sign(ox * (-ty) + oy * tx)
        side[side == 0] = 1
        U[take] = (np.clip(nd, 0, 1) * side)[take]
        V[take] = (acc + t * L)[take]
        TX[take] = tx
        TY[take] = ty
        acc += L
    inside = best <= 1
    return sl, inside, U, V, TX, TY, X, Y


def spline(pts, radii=None, step=3.0):
    """Resamples a polyline as a Catmull-Rom spline every ~step px (smooth tangents, no seams);
    radii (one per input point) are interpolated along it."""
    P = np.asarray(pts, float)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    rr = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int(math.hypot(*(p2 - p1)) / step))
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            out.append(q)
            if radii is not None:
                rr.append(radii[i - 1] + (radii[i] - radii[i - 1]) * t)
    out.append(P[-2])
    if radii is not None:
        rr.append(radii[-1])
        return np.array(out), np.array(rr)
    return np.array(out)


def bezier(p0, p1, p2, p3=None, n=24):
    """Points along a quadratic (or cubic) bezier."""
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2 = (np.asarray(p, float) for p in (p0, p1, p2))
    if p3 is None:
        return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2
    p3 = np.asarray(p3, float)
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3


def ellipse_mask(X, Y, cx, cy, rx, ry, rot=0.0):
    c, s = math.cos(rot), math.sin(rot)
    u = ((X - cx) * c + (Y - cy) * s) / rx
    v = (-(X - cx) * s + (Y - cy) * c) / ry
    return u * u + v * v <= 1, u, v


def poly_mask(X, Y, pts):
    """Even-odd polygon test (pts in 1x coords)."""
    inside = np.zeros(X.shape, bool)
    n = len(pts)
    for i in range(n):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % n]
        cond = ((ay <= Y) & (by > Y)) | ((by <= Y) & (ay > Y))
        with np.errstate(divide='ignore', invalid='ignore'):
            xi = ax + (Y - ay) / (by - ay) * (bx - ax)
        inside ^= cond & (X < xi)
    return inside


# ------------------------------------------------------------------ foliage

def leaf(layer, x, y, ang, L, Wd, mat, val, obj, warm=None, tipv=0.08, sidev=0.1):
    """One leaf: an almond from (x, y) pointing along `ang`, length L, width Wd (1x px). The half
    facing the moon is a touch lighter, the tip lighter still."""
    ca, sa = math.cos(ang), math.sin(ang)
    ex, ey = x + ca * L, y + sa * L
    b = layer.box(min(x, ex) - Wd, min(y, ey) - Wd, max(x, ex) + Wd, max(y, ey) + Wd)
    if b is None:
        return
    sl, X, Y = b
    a = ((X - x) * ca + (Y - y) * sa) / L
    w = (-(X - x) * sa + (Y - y) * ca)
    half = Wd / 2 * np.sin(np.pi * np.clip(a, 0, 1)) ** 0.75
    m = (a >= 0) & (a <= 1) & (np.abs(w) <= half + 0.05)
    if not m.any():
        return
    # Which side of the midrib faces the moon (upper right).
    nx, ny = -sa, ca
    facing = np.sign(nx * MOON_L[0] + ny * MOON_L[1]) or 1.0
    v = val + sidev * np.where(w * facing > 0, 1, -1) * (np.abs(w) > 0.25) + tipv * (a - 0.5)
    layer.put(sl, m, mat, v.astype(np.float32), obj, warm)


def clump(layer, cx, cy, rx, ry, mat, seed, obj, n=None, leaf_len=(4.0, 7.0), leaf_w=(2.2, 3.2), base=0.0, gain=1.0,
          droop=0.5, warm=None, fill=True, fill_val=None, light=None, lobes=4, density=1.0):
    """A leaf clump: a few overlapping lobes (never one round dome), a dark ragged core filled first,
    then many small leaves drawn back to front. Each leaf is lit by its place on its lobe and on the
    clump (moon from the upper right), so lobes read as rounded masses of separate leaves."""
    L = [(cx, cy + ry * 0.12, rx * 0.78, ry * 0.74, 0.0)]
    for j in range(lobes):
        a = -math.pi / 2 + (j - (lobes - 1) / 2) * (2.4 / max(1, lobes - 1)) + (rnd(seed, j, 11) - 0.5) * 0.7
        d = 0.42 + rnd(seed, j, 12) * 0.2
        s = 0.42 + rnd(seed, j, 13) * 0.22
        L.append((cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d * 0.9, rx * s, ry * s * 1.05, 0.2 + 0.1 * j))
    if fill:
        b = layer.box(cx - rx * 1.2, cy - ry * 1.2, cx + rx * 1.2, cy + ry * 1.2)
        if b is not None:
            sl, X, Y = b
            m = np.zeros(X.shape, bool)
            dd = np.full(X.shape, -9.0)
            for (lx, ly, lrx, lry, _) in L:
                q = 1 - ((X - lx) / (lrx * 0.84)) ** 2 - ((Y - ly) / (lry * 0.82)) ** 2
                dd = np.maximum(dd, q)
            m = dd + (noise(X, Y, 2.0, seed + 5) - 0.5) * 0.5 > 0.05
            fv = fill_val if fill_val is not None else base + 0.02
            layer.put(sl, m, mat, np.full(X.shape, fv, np.float32), obj, warm)
    leaves = []
    for li, (lx, ly, lrx, lry, lz) in enumerate(L):
        cnt = int(math.pi * lrx * lry / 5.0 * density) if n is None else n // len(L)
        for k in range(cnt):
            r = math.sqrt(rnd(seed + li * 977, k, 1)) * 1.05
            th = rnd(seed + li * 977, k, 2) * math.tau
            u = r * math.cos(th)
            v = r * math.sin(th)
            z = math.sqrt(max(0.0, 1 - min(1.0, r * r)))
            leaves.append((z * 0.6 - lz - v * 0.15, u, v, z, li, k))
    leaves.sort()
    for _, u, v, z, li, k in leaves:
        lx, ly, lrx, lry, _ = L[li]
        px = lx + u * lrx
        py = ly + v * lry
        # Blend the lobe's normal with the whole clump's so the mass still shades as one form.
        cu, cv = (px - cx) / rx, (py - cy) / ry
        nx, ny = u * 0.55 + cu * 0.45, v * 0.55 + cv * 0.45
        nz = math.sqrt(max(0.05, 1 - min(0.95, nx * nx + ny * ny)))
        if light is not None:
            lv = light(nx, ny, nz, px, py)
        else:
            lv = moon_light(nx, ny, nz, 0.06)
        # Lower lobe edges sit in the shadow of the lobe above.
        lv -= 0.18 * max(0.0, v - 0.35)
        val = base + gain * lv + (rnd(seed + li * 977, k, 3) - 0.5) * 0.14
        ang = math.atan2(v * 0.6 + droop, u) + (rnd(seed + li * 977, k, 4) - 0.5) * 2.0
        Lh = leaf_len[0] + (leaf_len[1] - leaf_len[0]) * rnd(seed + li * 977, k, 5)
        Wd = leaf_w[0] + (leaf_w[1] - leaf_w[0]) * rnd(seed + li * 977, k, 6)
        leaf(layer, px - math.cos(ang) * Lh * 0.35, py - math.sin(ang) * Lh * 0.35, ang, Lh, Wd, mat, val, obj, warm)


def save(img, path):
    """Writes the PNG whole: to a temporary name first, then renamed over the target."""
    import os
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    img.save(tmp, format='PNG', optimize=True)
    os.replace(tmp, path)
