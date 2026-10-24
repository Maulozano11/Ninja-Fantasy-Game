"""Shared helpers for lifting parts out of the owner's Aiden picture (docs/reference/aiden-owner-reference.jpg).

His picture (1932x1932) is our Aiden painted over by the owner, in his own pixels of about 19.32
picture pixels each: one of his pixels is one fine pixel of our sprites. Lined up with our Aiden
(male, idle frame 0), a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our
256 x 256 frame. JOINTS are our rig's joints at that frame, in his pixels.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import os

import numpy as np
from PIL import Image

REF = 'docs/reference/aiden-owner-reference.jpg'
PITCH = 19.318
PHASE = (0.6, 0.7)
OFFSET = (75, 120)
# Our male rig at idle frame 0, in his pixels (fine pixel coordinates of the joint points).
JOINTS = {
    'head': (51.0, 18.0),
    'neck': (52.18, 27.65),
    'shoulderN': (39.01, 32.51),
    'shoulderF': (59.27, 31.81),
    'elbowN': (35.13, 44.50),
    'elbowF': (62.09, 44.08),
    'wristN': (32.62, 55.21),
    'wristF': (67.52, 53.65),
    'handN': (31.80, 58.72),
    'handF': (69.30, 56.78),
    'pelvis': (52.0, 56.87),
    'hipN': (46.58, 56.46),
    'hipF': (56.51, 53.12),
    'kneeN': (47.17, 72.65),
    'kneeF': (63.23, 67.86),
    'ankleN': (43.42, 87.59),
    'ankleF': (60.94, 83.08),
}


def native(path=REF):
    """His pixels: the median of each block's interior, as an (H, W, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
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


def background(a):
    """The white around him, reached from the picture's edge."""
    H, W, _ = a.shape
    L = luma(a)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or L[y, x] <= 225:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg


def pack(col, mask, chars='abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'):
    """A mask's pixels as rows of palette characters (one per colour of his; colours within 3 share
    one) and the palette; returns rows, origin (x0, y0) in his pixels and palette."""
    H, W = mask.shape
    grid = np.full((H, W), '.', dtype='<U1')
    palette = {}
    seen = []
    for y in range(H):
        for x in range(W):
            if not mask[y, x]:
                continue
            c = col[y, x]
            for ch, ref in seen:
                if np.abs(ref - c).max() <= 3:
                    grid[y, x] = ch
                    break
            else:
                ch = chars[len(seen)]
                seen.append((ch, c))
                palette[ch] = '#%02x%02x%02x' % tuple(int(v) for v in c)
                grid[y, x] = ch
    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    return [''.join(grid[y, x0:x1]) for y in range(y0, y1)], (int(x0), int(y0)), palette


def ts_piece(name, doc, rows, origin, palette, pivot_his, angle):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: its pivot is the cell over the joint
    `pivot_his` (his pixels), `angle` the limb's angle in his picture."""
    import re
    ox, oy = origin
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(np.floor(pivot_his[0])) - ox}, {int(np.floor(pivot_his[1])) - oy}],',
           f'  angle: {angle:.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def save(arr, path, k=8):
    img = Image.fromarray(arr.astype(np.uint8), 'RGBA' if arr.shape[2] == 4 else 'RGB')
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    tmp = path + '.tmp.png'
    img.save(tmp)
    os.replace(tmp, path)
