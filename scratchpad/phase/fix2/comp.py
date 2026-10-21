# Composite a phase body the way the renderer draws it: 'color' pass (hue), source-over, 'lighter'.
import numpy as np
ADD = 0.4
def lum(c): return 0.3*c[...,0] + 0.59*c[...,1] + 0.11*c[...,2]
def clip_color(c):
    l = lum(c)[..., None]
    n = c.min(-1, keepdims=True); x = c.max(-1, keepdims=True)
    c = np.where(n < 0, l + (c - l) * l / np.maximum(l - n, 1e-6), c)
    c = np.where(x > 1, l + (c - l) * (1 - l) / np.maximum(x - l, 1e-6), c)
    return c
def set_lum(c, l):
    d = l - lum(c)
    return clip_color(c + d[..., None])
def color_blend(cb, cs):
    # hue+sat of source, luminosity of backdrop (all 0..1)
    return set_lum(cs, lum(cb))
def composite(body, ground, k=1.0, hue=1.0, alpha=1.0, add=ADD, cover=True):
    """body: HxWx4 uint8 (phase body), ground HxWx3 float 0..255. Returns float HxWx3."""
    c = body[..., :3].astype(float) / 255
    a = body[..., 3:4].astype(float) / 255
    g = ground.astype(float) / 255
    if hue > 0:
        ah = a * min(1.0, hue * alpha)
        g = g * (1 - ah) + color_blend(g, c) * ah
    if cover:
        ac = a * k * alpha
        g = g * (1 - ac) + c * ac
    g = g + c * a * k * alpha * add
    return np.clip(g, 0, 1) * 255
