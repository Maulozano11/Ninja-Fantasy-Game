# Finds the "dead" (see-through) spaces under the dragon in annihilation_enh.png.
# usage: python3 -I check_holes.py <annihilation_enh.png> <out_dir>
# A hole is a pixel the background shows through (alpha < 255) that lies inside the closed
# silhouette of the wall + dragon (a morphological closing of the opaque mask), in the band
# under the dragon (x 180..940, y 430..940 of the 1016x968 frame).
import sys, os
import numpy as np
from PIL import Image

W, H = 1016, 968
X0, X1, Y0, Y1 = 180, 940, 430, 940
R = 9  # closing radius (px): gaps narrower than ~2R between opaque parts count as holes

def shift_or(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r:
                continue
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out

def closing(m, r):
    d = shift_or(m, r)
    return ~shift_or(~d, r)

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
sheet = np.array(Image.open(src).convert('RGBA'))
rows = sheet.shape[0] // H
names = ['surge', 'burn', 'fade']
for row in range(rows):
    cols = sheet.shape[1] // W
    for col in range(cols):
        f = sheet[row * H:(row + 1) * H, col * W:(col + 1) * W]
        a = f[..., 3]
        if not a.any():
            continue
        opaque = a == 255
        roi = np.zeros_like(opaque)
        roi[Y0:Y1, X0:X1] = True
        closed = closing(opaque, R)
        holes = closed & ~opaque & roi
        clear = holes & (a == 0)
        semi = (a > 0) & (a < 255) & roi
        tag = f'{names[row] if row < 3 else row}{col}'
        print(f'{tag:7s} see-through holes under the dragon: {int(holes.sum()):6d} px '
              f'(fully clear {int(clear.sum()):6d}); dark translucent px in band: {int(semi.sum()):5d}')
        if row == 1 and col == 0:
            bg = np.zeros((H, W, 4), np.uint8); bg[...] = (18, 20, 34, 255)
            im = Image.alpha_composite(Image.fromarray(bg), Image.fromarray(f))
            hl = np.array(im)
            hl[holes] = (0, 255, 255, 255)
            hl[semi & ~holes] = (255, 0, 255, 255)
            Image.fromarray(hl).crop((X0 - 20, Y0 - 20, X1, Y1)).save(os.path.join(out, 'holes-burn0.png'))
            im.crop((X0 - 20, Y0 - 20, X1, Y1)).save(os.path.join(out, 'burn0-dark.png'))
