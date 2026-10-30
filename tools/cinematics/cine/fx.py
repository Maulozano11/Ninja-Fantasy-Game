"""His effect sheets cut into named cells, and placing them on a frame.

A sheet is described by a JSON file: the sheet pictures (variants with the same layout), and per
effect the row band and the column ranges of its cells. A part of the drawing belongs to the cell
its middle falls in, so a ray that crosses into the next cell stays with its own effect; effects
that touch their neighbours are cut as rectangles with their sides faded (`rect`).
"""
import json
import math

import numpy as np
from PIL import Image
from scipy import ndimage

from .core import key_unmix


class Effects:
    def __init__(self, spec_path, root='.'):
        spec = json.load(open(spec_path))
        self.cells = {}
        self.dots = {}
        for v, path in spec['sheets'].items():
            pic = Image.open(f"{root}/{path}").convert('RGB')
            a = np.array(pic).astype(int)
            r, g, b = a[..., 0], a[..., 1], a[..., 2]
            fg = ~((b > 110) & (b > g + 60) & (r > 110))
            soft = key_unmix(pic)
            lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=2))
            cms = ndimage.center_of_mass(fg, lab, range(1, n + 1))
            for name, e in spec['effects'].items():
                y0, y1 = e['band']
                seq = []
                for x0, x1 in e['cells']:
                    if e.get('rect'):
                        m = np.zeros_like(fg)
                        m[y0:y1, x0:x1] = fg[y0:y1, x0:x1]
                        xs_ = np.arange(fg.shape[1])
                        fade = np.clip(np.minimum(xs_ - x0, x1 - 1 - xs_) / 20.0, 0, 1)[None, :].repeat(fg.shape[0], 0)
                    else:
                        keep = np.zeros(n + 1, bool)
                        for j, (cy, cx) in enumerate(cms, 1):
                            keep[j] = x0 <= cx < x1 and y0 <= cy < y1
                        m = keep[lab] & fg
                        fade = np.ones(fg.shape)
                    ys, xs = np.nonzero(m)
                    q = soft.copy()
                    q[..., 3] = np.where(m, (q[..., 3] * fade).astype(np.uint8), 0)
                    seq.append(Image.fromarray(q[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA'))
                self.cells[(v, name)] = seq
            for name, per in spec.get('dots', {}).get(v, {}).items():
                self.dots[(v, name)] = per

    def seq(self, variant, name):
        return self.cells[(variant, name)]


def step(seq, k):
    """Which picture of a sequence at progress k (0..1)."""
    return seq[min(len(seq) - 1, max(0, int(k * len(seq))))]


def put(fr, im, centre, diam, a=1.0):
    """His effect scaled so its larger side is `diam` px, centred on `centre`."""
    sc = diam / max(im.width, im.height)
    w, h = max(1, int(im.width * sc)), max(1, int(im.height * sc))
    e = im.resize((w, h), Image.BOX if sc < 1 else Image.NEAREST)
    if a < 1:
        q = np.array(e)
        q[..., 3] = (q[..., 3] * max(0.0, a)).astype(np.uint8)
        e = Image.fromarray(q, 'RGBA')
    fr.alpha_composite(e, (int(centre[0] - w / 2), int(centre[1] - h / 2)))


def put_on_pair(fr, im, dots, p1, p2, a=1.0):
    """His effect laid so two of its points (`dots`, in its own pixels) land exactly on p1 and p2:
    scaled to their spacing, turned to their slant (the eyes' burst on the two eyes of a tilted
    helmet)."""
    d1, d2 = (np.array(d, float) for d in dots)
    e1, e2 = np.array(p1, float), np.array(p2, float)
    s = np.linalg.norm(e2 - e1) / np.linalg.norm(d2 - d1)
    th = math.atan2(*(e2 - e1)[::-1]) - math.atan2(*(d2 - d1)[::-1])
    mo, mi = (e1 + e2) / 2, (d1 + d2) / 2
    c, sn = math.cos(th), math.sin(th)
    A, B, D, E = c / s, sn / s, -sn / s, c / s
    C, F = mi[0] - A * mo[0] - B * mo[1], mi[1] - D * mo[0] - E * mo[1]
    lay = im.transform(fr.size, Image.AFFINE, (A, B, C, D, E, F), resample=Image.BILINEAR)
    if a < 1:
        q = np.array(lay)
        q[..., 3] = (q[..., 3] * a).astype(np.uint8)
        lay = Image.fromarray(q, 'RGBA')
    fr.alpha_composite(lay)


def stretch_into(mask, im, a):
    """His effect stretched over a mask's box and kept only inside the mask (molten metal or lava
    veins over an armour piece), with its alpha times a."""
    ys, xs = np.nonzero(mask)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    out = np.zeros(mask.shape + (4,), np.uint8)
    out[y0:y1, x0:x1] = np.array(im.resize((x1 - x0, y1 - y0), Image.BOX))
    out[..., 3] = np.where(mask, (out[..., 3].astype(np.float32) * max(0.0, a)).astype(np.uint8), 0)
    return Image.fromarray(out, 'RGBA')
