"""Shared helpers for the owner's bare female body (docs/reference/female-base-owner-reference.jpg).

He sent it on 2026-10-21 so we understand the female body: a woman in a black sports top and briefs,
no clothes, standing in our 3/4 view facing right. His words: "aqui tienes una base del cuerpo femenino
sin ropa para que entiendas la base del cuerpo". The picture is 2000x2000: a 100x100 grid of his pixels,
20 picture pixels each, phase 0 (found from the black line: the column and row edges repeat every 20.00
picture pixels and start at 0). One of his pixels is one fine pixel of our sprites: with his soles on
ours (his row 98 on our row 218) a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our
256 x 256 frame, the place his game-scale heroines sit (heroine_ref.py).

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repo root.
"""

import os

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(REPO, 'docs', 'reference', 'female-base-owner-reference.jpg')
PITCH = 20.0
CELLS = 100
OFFSET = (73, 120)
# Colours of his within this distance (per channel) are one colour of his: the picture is a JPEG, so a
# flat colour of his comes back a few steps either way.
TOL = 8


def native():
    """His pixels: the median of the middle half of every cell, as a (100, 100, 3) int array."""
    a = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    n = np.zeros((CELLS, CELLS, 3), int)
    for j in range(CELLS):
        for i in range(CELLS):
            y0, y1 = int(j * PITCH + PITCH * 0.25), int(j * PITCH + PITCH * 0.75) + 1
            x0, x1 = int(i * PITCH + PITCH * 0.25), int(i * PITCH + PITCH * 0.75) + 1
            n[j, i] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), 0)
    return n


def luma(c):
    return 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]


def background(n):
    """His white page: round the figure and in the gaps it encloses (between the near arm and the waist).
    The white of her eye (its glint, row 18) is his pixel, not page."""
    L = luma(n)
    bg = (L > 238) & (n.min(axis=2) > 225)
    for x, y in EYE_WHITE:
        bg[y, x] = False
    return bg


# The white of her near eye, enclosed by the eye's dark pixels.
EYE_WHITE = [(52, 18)]


def palette(n, bg):
    """His colours: every pixel joined to the first colour within TOL of it (scanning top to bottom),
    each colour then the median of its pixels. Returns (index map, list of '#rrggbb'); -1 is page."""
    idx = np.full(n.shape[:2], -1)
    refs = []
    for y in range(CELLS):
        for x in range(CELLS):
            if bg[y, x]:
                continue
            c = n[y, x]
            for i, r in enumerate(refs):
                if np.abs(r - c).max() <= TOL:
                    idx[y, x] = i
                    break
            else:
                refs.append(c.copy())
                idx[y, x] = len(refs) - 1
    cols = ['#%02x%02x%02x' % tuple(int(v) for v in np.median(n[idx == i], 0)) for i in range(len(refs))]
    return idx, cols


def hex_rgb(h):
    return np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])


def is_line(h):
    """His near-black line (the cloth's darkest grey is lighter)."""
    return luma(hex_rgb(h).astype(float)) < 22


def is_cloth(h):
    """The grey of the sports top and briefs (not his line, not skin)."""
    c = hex_rgb(h).astype(int)
    return not is_line(h) and abs(c[0] - c[2]) < 30 and abs(c[1] - c[2]) < 30 and luma(c.astype(float)) < 120


def spans(text):
    """Rows of a region written as 'y: x0-x1 x0-x1 ...' lines -> set of (x, y)."""
    out = set()
    for line in text.strip().splitlines():
        line = line.split('#')[0].strip()
        if not line:
            continue
        y, rest = line.split(':')
        for part in rest.split():
            a, b = (part.split('-') + [part])[:2]
            for x in range(int(a), int(b) + 1):
                out.add((x, int(y)))
    return out


def save(arr, path, k=8):
    img = Image.fromarray(arr.astype(np.uint8), 'RGBA' if arr.shape[2] == 4 else 'RGB')
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    tmp = path + '.tmp.png'
    img.save(tmp)
    os.replace(tmp, path)
