"""The owner's crystal sword (docs/reference/crystal-sword-owner-reference.jpg) as a weapon template.

His picture (1932x1932) is our ninja drawn in his own pixels, about 19.32 picture pixels each: one of
his pixels is one fine pixel of our sprites (his figure is 94 of them tall, ours about 100). The
sword hangs from the near hand across the legs, the way our idle pose holds it (52 degrees).

This script takes his pixels back (the median of each block's interior), lifts the sword out of them
(the crystal blade and guard, the crystal pommel above the fist, his black line around them), puts
back the grip his fist hides, and sorts his colours into a short palette (darkest to lightest). It
writes, in <out>:

  crystal_sword.json   rows (one character per pixel), pivot (the grip cell under the fist), the
                       angle the blade hangs at in his picture, and the palette (character -> hex)
  study/sword@8.png    the sword lifted out, at 8x
  study/native@8.png   his figure in his own pixels, at 8x

The same picture always gives the same bytes. Run with python3 -I:

  python3 -I tools/refs/crystal-sword-from-ref.py docs/reference/crystal-sword-owner-reference.jpg <out>
"""

import json
import os
import sys

import numpy as np
from PIL import Image

PITCH = 19.318
PHASE = (0.6, 0.7)
# Where the sword is, in his pixels: the pommel above the fist, the grip under it, the blade below.
POMMEL_BOX = (22, 48, 30, 57)  # x0, y0, x1, y1 (exclusive)
GRIP = ((28.5, 55.5), (34.0, 61.0))  # the hidden grip, from the pommel to the guard
BLADE_BOX = (30, 58, 60, 99)
# The fist's centre on the grip: the template's pivot (where our hand holds it).
PIVOT = (31, 58)
# The angle our idle pose holds a blade at: the template is drawn at it, so at rest it is his pixels.
ANGLE = 52
COLOURS = 8
SEED = 7


def native(a):
    H, W, _ = a.shape
    nx = int((W - PHASE[0]) / PITCH)
    ny = int((H - PHASE[1]) / PITCH)
    xs = [int(np.floor(PHASE[0] + k * PITCH)) for k in range(nx + 1)]
    ys = [int(np.floor(PHASE[1] + k * PITCH)) for k in range(ny + 1)]
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            c = a[ys[j] + 3:ys[j + 1] - 3, xs[i] + 3:xs[i + 1] - 3].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def components(m):
    H, W = m.shape
    lab = np.zeros((H, W), np.int32)
    n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1
                st = [(y, x)]
                lab[y, x] = n
                while st:
                    py, px = st.pop()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            qy, qx = py + dy, px + dx
                            if 0 <= qy < H and 0 <= qx < W and m[qy, qx] and not lab[qy, qx]:
                                lab[qy, qx] = n
                                st.append((qy, qx))
    return lab, n


def kmeans(px, k, iters=40):
    px = px.astype(np.float64)
    order = np.argsort(luma(px))
    c = px[order[np.linspace(0, len(px) - 1, k).astype(int)]].copy()
    for _ in range(iters):
        lab = ((px[:, None, :] - c[None]) ** 2).sum(2).argmin(1)
        for i in range(k):
            if (lab == i).any():
                c[i] = np.median(px[lab == i], axis=0)
    lab = ((px[:, None, :] - c[None]) ** 2).sum(2).argmin(1)
    return np.round(c).astype(np.int32), lab


def save(arr, path, k=8):
    img = Image.fromarray(arr.astype(np.uint8), 'RGBA' if arr.shape[2] == 4 else 'RGB')
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    tmp = path + '.tmp.png'
    img.save(tmp)
    os.replace(tmp, path)


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = native(np.asarray(Image.open(ref).convert('RGB')).astype(np.int32))
    H, W, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = luma(a)
    ys, xs = np.mgrid[0:H, 0:W]

    def inbox(box):
        x0, y0, x1, y1 = box
        return (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)

    # The crystal: pale blue to white, bluer than it is red (the coat behind is dark navy).
    crystal = ((b > r + 20) & (L > 100)) | ((L > 200) & (b >= r) & (L < 240))
    lab, n = components(crystal & inbox(BLADE_BOX))
    biggest = max(range(1, n + 1), key=lambda i: (lab == i).sum())
    blade = lab == biggest
    # The pommel: his blue pixels above the fist (light and mid blue), not his black line.
    pommel = inbox(POMMEL_BOX) & (b > r + 12) & (L > 60)
    body = blade | pommel
    # The grip his fist hides: two pixels wide from the pommel to the guard, in his grip blue.
    grip = np.zeros_like(body)
    (gx0, gy0), (gx1, gy1) = GRIP
    for t in np.linspace(0, 1, 40):
        x = gx0 + (gx1 - gx0) * t
        y = gy0 + (gy1 - gy0) * t
        for ox, oy in ((0, 0), (1, 0)):
            xi, yi = int(np.floor(x)) + ox, int(np.floor(y)) + oy
            if not body[yi, xi]:
                grip[yi, xi] = True
    # The sword's shape: the crystal and the grip, with the gaps inside it closed (his darker
    # facet lines run through the blade), and his black line around it (sides, not corners).
    solid = body | grip
    outside = np.zeros_like(solid)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if outside[y, x] or solid[y, x]:
            continue
        outside[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            qy, qx = y + dy, x + dx
            if 0 <= qy < H and 0 <= qx < W and not outside[qy, qx] and not solid[qy, qx]:
                stack.append((qy, qx))
    shape = ~outside
    pad = np.pad(shape, 1)
    ring = (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]) & ~shape
    inner = shape & ~grip

    # His colours: everything inside the shape (crystal and his facet lines) sorted dark to light,
    # his grip, his line.
    pal, lab_px = kmeans(a[inner], COLOURS)
    order = np.argsort(luma(pal))
    rank = np.empty_like(order)
    rank[order] = np.arange(len(order))
    chars = '12345678'
    grid = np.full((H, W), '.', dtype='<U1')
    grid[inner] = np.array([chars[rank[i]] for i in lab_px])
    grid[grip] = 'g'
    grid[ring] = 'o'
    palette = {chars[rank[i]]: '#%02x%02x%02x' % tuple(pal[i]) for i in range(len(pal))}
    palette['g'] = '#2a3348'  # his grip under the fist: the dark blue of the pommel's shadow side
    palette['o'] = '#07060b'

    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    rows = [''.join(grid[y, x0:x1]) for y in range(y0, y1)]
    meta = {
        'source': 'docs/reference/crystal-sword-owner-reference.jpg',
        'rows': rows,
        'pivot': [PIVOT[0] - int(x0), PIVOT[1] - int(y0)],
        'angle': ANGLE,
        'palette': palette,
    }
    tmp = os.path.join(out, 'crystal_sword.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'crystal_sword.json'))

    # Studies: the sword lifted out, and his figure.
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                h = palette[ch]
                rgba[j, i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
    save(rgba, os.path.join(out, 'study', 'sword@8.png'))
    save(a, os.path.join(out, 'study', 'native@8.png'))
    save(a[y0:y1, x0:x1], os.path.join(out, 'study', 'his@8.png'))
    print(len(rows), 'rows x', len(rows[0]), 'pivot', meta['pivot'], 'palette', palette)


if __name__ == '__main__':
    main()
