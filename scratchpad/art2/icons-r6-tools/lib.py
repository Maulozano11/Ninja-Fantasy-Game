# helpers for the r6 experiments (numpy): oklab, box resize, quantize, views
import numpy as np
from PIL import Image, ImageDraw
def load_his(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float64)
    return im[1:-1, 1:-1]
def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def oklab(rgb):
    R, G, B = [lin(rgb[..., k]) for k in range(3)]
    l = np.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    m = np.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    s = np.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    return np.stack([0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s], -1)
def box(src, w, h):
    H, W = src.shape[:2]
    out = np.zeros((h, w, src.shape[2]))
    sx, sy = W / w, H / h
    for y in range(h):
        y0, y1 = y * sy, (y + 1) * sy
        for x in range(w):
            x0, x1 = x * sx, (x + 1) * sx
            acc = 0; wt = 0
            for yy in range(int(np.floor(y0)), int(np.ceil(y1))):
                cy = min(y1, yy + 1) - max(y0, yy)
                for xx in range(int(np.floor(x0)), int(np.ceil(x1))):
                    c = (min(x1, xx + 1) - max(x0, xx)) * cy
                    acc = acc + src[min(yy, H - 1), min(xx, W - 1)] * c; wt += c
            out[y, x] = acc / wt
    return out
def hexes(s):
    return np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in s.split()], float)
def quant(img, pal, cw=1.0):
    a = oklab(img); b = oklab(pal)
    d = ((a[..., None, 0] - b[None, None, :, 0]) * 1.4) ** 2 + ((a[..., None, 1] - b[None, None, :, 1]) * cw) ** 2 + ((a[..., None, 2] - b[None, None, :, 2]) * cw) ** 2
    return d.argmin(-1)
def big(img, z):
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((img.shape[1] * z, img.shape[0] * z), Image.NEAREST)
def gridify(im, z, n, step=5):
    d = ImageDraw.Draw(im)
    for g in range(0, n + 1, step):
        d.line([(g * z, 0), (g * z, n * z)], fill=(255, 60, 60)); d.line([(0, g * z), (n * z, g * z)], fill=(255, 60, 60))
        if g < n: d.text((g * z + 2, 1), str(g), fill=(255, 255, 0)); d.text((1, g * z + 2), str(g), fill=(255, 255, 0))
    return im
def row(ims, gap=10, bg=(17, 18, 24)):
    W = sum(i.size[0] for i in ims) + gap * (len(ims) + 1); H = max(i.size[1] for i in ims) + 2 * gap
    o = Image.new('RGB', (W, H), bg); x = gap
    for i in ims: o.paste(i, (x, gap)); x += i.size[0] + gap
    return o
def col(ims, gap=10, bg=(17, 18, 24)):
    H = sum(i.size[1] for i in ims) + gap * (len(ims) + 1); W = max(i.size[0] for i in ims) + 2 * gap
    o = Image.new('RGB', (W, H), bg); y = gap
    for i in ims: o.paste(i, (gap, y)); y += i.size[1] + gap
    return o
def gauss2(v, s):
    r = int(np.ceil(s * 2.5)); k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * s * s)); k /= k.sum()
    def c1(a, axis):
        a = np.moveaxis(a, axis, -1); p = np.concatenate([np.repeat(a[..., :1], r, -1), a, np.repeat(a[..., -1:], r, -1)], -1)
        o = sum(k[i] * p[..., i:i + a.shape[-1]] for i in range(2 * r + 1))
        return np.moveaxis(o, -1, axis)
    return c1(c1(v, 0), 1)
def gaussrgb(im, s):
    return np.stack([gauss2(im[..., k], s) for k in range(im.shape[2])], -1)
def dpid(src, w, h, lam=1.0, eps=1e-3):
    # Detail-preserving downscaling (Weber et al. 2016): footprint pixels weighted by their distance to
    # the smoothed box guidance, raised to lam (0 = box).
    H, W = src.shape[:2]
    g = box(src, w, h)
    k = np.array([[1, 2, 1], [2, 4, 2], [1, 2, 1]], float) / 16
    gp = np.pad(g, ((1, 1), (1, 1), (0, 0)), mode='edge')
    gs = sum(k[i, j] * gp[i:i + h, j:j + w] for i in range(3) for j in range(3))
    lab = oklab(src); glab = oklab(gs)
    out = np.zeros((h, w, 3))
    sx, sy = W / w, H / h
    for y in range(h):
        y0, y1 = y * sy, (y + 1) * sy
        for x in range(w):
            x0, x1 = x * sx, (x + 1) * sx
            acc = 0; wt = 0
            for yy in range(int(np.floor(y0)), int(np.ceil(y1))):
                cy = min(y1, yy + 1) - max(y0, yy)
                for xx in range(int(np.floor(x0)), int(np.ceil(x1))):
                    c = (min(x1, xx + 1) - max(x0, xx)) * cy
                    d = lab[min(yy, H - 1), min(xx, W - 1)] - glab[y, x]
                    wgt = c * (np.sqrt((d[0] * 1.4) ** 2 + d[1] ** 2 + d[2] ** 2) + eps) ** lam
                    acc = acc + src[min(yy, H - 1), min(xx, W - 1)] * wgt; wt += wgt
            out[y, x] = acc / wt
    return out
def medianL(src, w, h, q=0.5, trim=0.25):
    # per target cell: the mean of his pixels around the lightness quantile q (q +- trim/2 of the cell's pixels by lightness)
    H, W = src.shape[:2]; L = oklab(src)[..., 0]
    out = np.zeros((h, w, 3))
    for y in range(h):
        for x in range(w):
            ys0, ys1 = int(np.floor(y * H / h)), int(np.ceil((y + 1) * H / h)); xs0, xs1 = int(np.floor(x * W / w)), int(np.ceil((x + 1) * W / w))
            px = src[ys0:ys1, xs0:xs1].reshape(-1, 3); l = L[ys0:ys1, xs0:xs1].reshape(-1)
            o = np.argsort(l, kind='stable'); n = len(o)
            a = int(max(0, min(n - 1, np.floor((q - trim / 2) * n)))); b = int(max(a + 1, min(n, np.ceil((q + trim / 2) * n))))
            out[y, x] = px[o[a:b]].mean(0)
    return out
