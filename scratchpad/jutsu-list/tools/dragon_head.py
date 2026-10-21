"""Rough mockup crop of the dragon head from the enhanced Annihilation's burn row (the owner's
pixels, with the smoke behind it masked out by colour). For the preview only, not for the game.
Usage: python3 -I dragon_head.py <repo> <outdir>"""
import os, sys
from collections import deque
import numpy as np
from PIL import Image

repo, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = Image.open(os.path.join(repo, 'src/assets/world/vfx_fire/annihilation_enh.png')).convert('RGBA')
FW, FH = 1016, 968
X0, Y0, X1, Y1 = 660, 300, 1000, 585  # head and neck; the neck's base goes into the flames


def keep_mask(a):
    rgb = a[..., :3].astype(np.float32) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    m = (a[..., 3] > 0) & ((s >= 0.6) | (mx >= 0.75))
    return m


def biggest(m, seed_box):
    """The connected piece that holds the head (seeded inside seed_box), 8-connected."""
    h, w = m.shape
    lab = np.zeros(m.shape, np.int32)
    best, best_n, cur = 0, 0, 0
    x0, y0, x1, y1 = seed_box
    for sy in range(y0, y1):
        for sx in range(x0, x1):
            if m[sy, sx] and not lab[sy, sx]:
                cur += 1
                q = deque([(sy, sx)])
                lab[sy, sx] = cur
                n = 0
                while q:
                    y, x = q.popleft()
                    n += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = y + dy, x + dx
                            if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                                lab[yy, xx] = cur
                                q.append((yy, xx))
                if n > best_n:
                    best, best_n = cur, n
    return lab == best


for i in range(6):
    f = np.array(im.crop((i * FW, 3 * FH, (i + 1) * FW, 4 * FH)))
    reg = f[Y0:Y1, X0:X1].copy()
    m = keep_mask(reg)
    # Seed in the snout / eye area so the head's own piece is kept, not a flame tongue.
    m = biggest(m, (150, 20, 260, 120))
    # Grow by one pixel so the dark outline next to the kept pixels comes along.
    g = m.copy()
    g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
    rgb = reg[..., :3].astype(int)
    dark = rgb.max(-1) < 110
    m = m | (g & dark & (reg[..., 3] > 0))
    # Mockup only: drop the breath fire past the teeth (it runs off his frame's edge) and the bits
    # of his flame wall caught in the bottom-left corner.
    yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
    m &= ~((xx < 48) & (yy >= 196))
    m &= ~((xx < 40) & (yy >= 150))
    a = np.where(m, reg[..., 3], 0).astype(np.float32)
    ramp = np.clip((332 - xx) / 40.0, 0, 1)  # the breath past the teeth fades out
    a = np.where(yy >= 120, a * ramp, a)
    reg[..., 3] = a.astype(np.uint8)
    Image.fromarray(reg).save(os.path.join(out, f'dragon_head_{i}.png'))
print('ok')
