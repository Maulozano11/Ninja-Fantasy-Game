import numpy as np, sys, os
from PIL import Image, ImageDraw
IM = np.asarray(Image.open('../art2/REF-wind-set-owner.jpg').convert('RGB')).astype(np.float64)
S = 1.0875
FILL = np.array([32., 32., 42.]); SHEET = np.array([21., 21., 29.]); BORDER = np.array([40., 40., 50.])

def gauss(a, s):
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim; pad[ax] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim; sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out

def lum(c): return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
def shift(m, dy, dx):
    out = np.zeros_like(m); H, W = m.shape
    ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
    xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
    out[ys, xs] = m[yd, xd]; return out
def dilate(m, n=1):
    for _ in range(n):
        o = m.copy()
        for dy, dx in N4: o |= shift(m, dy, dx)
        m = o
    return m
def poly_mask(h, w, x0, y0, polys):
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    for p in polys: d.polygon([(x - x0, y - y0) for x, y in p], fill=255)
    return np.asarray(m) > 0

def prep(panel, src, drop=()):
    px0, py0, px1, py1 = panel
    sx0, sy0, sx1, sy1 = src
    c = gauss(IM, 0.6)[sy0:sy1, sx0:sx1].copy()
    raw = IM[sy0:sy1, sx0:sx1]
    H, W = c.shape[:2]
    yy, xx = np.mgrid[sy0:sy1, sx0:sx1]
    inside = (xx >= px0) & (xx < px1) & (yy >= py0) & (yy < py1)
    B = np.where(inside[..., None], FILL, SHEET)
    border = ((xx == px0 - 1) | (xx == px1) ) & (yy >= py0 - 1) & (yy <= py1) | ((yy == py0 - 1) | (yy == py1)) & (xx >= px0 - 1) & (xx <= px1)
    bl = border & (np.abs(raw - BORDER).sum(-1) < 30)
    dm = poly_mask(H, W, sx0, sy0, drop) | bl
    c[dm] = B[dm]
    return c, B, dm

def rgba(c, B, Ts=26, solid_extra=None):
    d = c - B
    L, LB = lum(c), lum(B)
    dsum = np.abs(d).sum(-1)
    painted = dsum > 14
    core = (L - LB >= Ts) & painted
    if solid_extra is not None: core |= solid_extra & painted
    near = dilate(core, 2)
    darkish = (L < LB + 14) & (dsum >= 16)
    solid = core | (dilate(core, 1) & painted) | (darkish & near)
    lighter = painted & ~solid & (d.max(-1) > 0)
    a_light = np.clip((np.maximum(d, 0) / (255 - B)).max(-1), 0, 1)
    dv = darkish & ~solid  # dark veil
    alpha = np.where(solid, 1.0, np.where(dv, 0.7, np.where(lighter, a_light, 0)))
    F = np.where(alpha[..., None] > 0, B + d / np.maximum(alpha, 1e-6)[..., None], 0)
    F = np.clip(F, 0, 255)
    cls = np.where(solid, 2, np.where(dv, 1, np.where(lighter & (a_light > 0.02), 3, 0)))
    return alpha, F, cls, solid

def down(alpha, F, solid, origin, size, s=S):
    """Box-resample to game res: game pixel (gx, gy) covers his [origin + g*s, origin + (g+1)*s)."""
    ox, oy = origin; W, H = size
    pad = 8
    def rs(a):
        z = np.pad(a.astype(np.float32), pad)
        im = Image.fromarray(z, 'F')
        return np.asarray(im.resize((W, H), Image.BOX, box=(ox + pad, oy + pad, ox + pad + W * s, oy + pad + H * s)))
    Cs = rs(solid.astype(np.float32))
    Ps = np.stack([rs(F[..., k] * solid) for k in range(3)], -1)
    tr = alpha * (~solid)
    At = rs(tr)
    Pt = np.stack([rs(F[..., k] * tr) for k in range(3)], -1)
    return Cs, Ps, At, Pt

def compose(Cs, Ps, At, Pt):
    H, W = Cs.shape
    out = np.zeros((H, W, 4))
    op = Cs >= 0.5
    out[op, :3] = Ps[op] / Cs[op, None]; out[op, 3] = 1
    tA = Cs + At
    tr = ~op & (tA > 0.08)
    out[tr, :3] = (Ps[tr] + Pt[tr]) / tA[tr, None]
    out[tr, 3] = np.minimum(tA[tr], 0.95)
    return out

def show(rgba_img, raw, k, path, bgs=((32, 32, 42), (96, 128, 70), (150, 140, 120))):
    H, W = rgba_img.shape[:2]
    tiles = [np.asarray(Image.fromarray(raw.astype(np.uint8)).resize((W, H), Image.BOX)).astype(np.float64)]
    for b in bgs:
        a = rgba_img[..., 3:]
        tiles.append(rgba_img[..., :3] * a + np.array(b) * (1 - a))
    row = np.concatenate([np.pad(t, ((0, 0), (0, 4), (0, 0))) for t in tiles], 1)
    Image.fromarray(np.clip(row, 0, 255).astype(np.uint8)).resize((row.shape[1] * k, H * k), Image.NEAREST).save(path)

if __name__ == '__main__':
    name, panel, src, k = sys.argv[1], eval(sys.argv[2]), eval(sys.argv[3]), int(sys.argv[4])
    drop = eval(sys.argv[5]) if len(sys.argv) > 5 else []
    Ts = int(sys.argv[6]) if len(sys.argv) > 6 else 26
    c, B, dm = prep(panel, src, drop)
    alpha, F, cls, solid = rgba(c, B, Ts)
    gx0 = (src[0] - panel[0]) / S; gy0 = (src[1] - panel[1]) / S
    gl, gt = int(np.floor(gx0)), int(np.floor(gy0))
    W = int(np.ceil((src[2] - panel[0]) / S)) - gl; H = int(np.ceil((src[3] - panel[1]) / S)) - gt
    origin = (gl * S - (src[0] - panel[0]), gt * S - (src[1] - panel[1]))
    Cs, Ps, At, Pt = down(alpha, F, solid, origin, (W, H))
    img = compose(Cs, Ps, At, Pt)
    raw = c.copy()
    # raw at game res (for comparison)
    rawg = np.stack([np.asarray(Image.fromarray(np.pad(raw[..., i], 8, mode='edge').astype(np.float32), 'F').resize((W, H), Image.BOX, box=(origin[0] + 8, origin[1] + 8, origin[0] + 8 + W * S, origin[1] + 8 + H * S))) for i in range(3)], -1)
    show(img, rawg, k, f'look/x0-{name}.png')
    cl = np.array([[0, 0, 0], [40, 90, 80], [140, 230, 200], [230, 90, 200]])[cls].astype(np.uint8)
    Image.fromarray(cl).resize((cl.shape[1] * 3, cl.shape[0] * 3), Image.NEAREST).save(f'look/x0-{name}-cls.png')
