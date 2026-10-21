# Sheets from raw 256x256 RGBA frames.
import os
import sys
from PIL import Image, ImageDraw

G = 256
BG = (38, 42, 58, 255)


def load(path):
    with open(path, 'rb') as f:
        return Image.frombytes('RGBA', (G, G), f.read())


def bbox(paths):
    x0 = y0 = G
    x1 = y1 = 0
    for p in paths:
        b = load(p).getbbox()
        if not b:
            continue
        x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
    return (max(0, x0 - 2), max(0, y0 - 2), min(G, x1 + 2), min(G, y1 + 2))


def grid(rows, out, scale=3, crop=None, col_labels=None, label_w=110, pairs=False):
    """rows: [(label, [path or None, ...])]."""
    allp = [p for _, ps in rows for p in ps if p]
    crop = crop or bbox(allp)
    cw, ch = crop[2] - crop[0], crop[3] - crop[1]
    ncol = max(len(ps) for _, ps in rows)
    top = 16 if col_labels else 0
    W = label_w + ncol * (cw * scale + 4)
    H = top + len(rows) * (ch * scale + 4)
    img = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(img)
    if col_labels:
        for c, t in enumerate(col_labels):
            d.text((label_w + c * (cw * scale + 4) + 2, 2), t, fill=(230, 230, 230, 255))
    for r, (label, ps) in enumerate(rows):
        y = top + r * (ch * scale + 4)
        d.text((4, y + 4), label, fill=(230, 230, 230, 255))
        for c, p in enumerate(ps):
            if not p or not os.path.exists(p):
                continue
            im = load(p).crop(crop).resize((cw * scale, ch * scale), Image.NEAREST)
            x = label_w + c * (cw * scale + 4)
            img.alpha_composite(im, (x, y))
    img.convert('RGB').save(out)
    return crop
