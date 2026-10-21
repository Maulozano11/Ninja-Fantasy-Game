"""Sheet of renders: argv = render dir, layout JSON (list of rows of names), out png, k, half (crop
half-size around the head; 0 = full frame)."""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

rdir, layout, out, k, half = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
heads = json.load(open(os.path.join(rdir, 'heads.json')))
cells = []
for row in layout:
    line = []
    for name in row:
        a = np.fromfile(os.path.join(rdir, name + '.rgba'), np.uint8).reshape(256, 256, 4)
        if half:
            hx, hy = heads[name]
            x0, y0 = int(hx) - half, int(hy) - half + (int(sys.argv[6]) if len(sys.argv) > 6 else -4)
            pad = np.zeros((256 + 4 * half, 256 + 4 * half, 4), np.uint8)
            pad[2 * half:2 * half + 256, 2 * half:2 * half + 256] = a
            a = pad[y0 + 2 * half:y0 + 4 * half, x0 + 2 * half:x0 + 4 * half]
        line.append((name, a))
    cells.append(line)
w = max(len(r) for r in cells)
cw, ch = cells[0][0][1].shape[1] * k, cells[0][0][1].shape[0] * k
lab = 14
img = Image.new('RGB', (w * (cw + 4), len(cells) * (ch + lab + 4)), (235, 235, 235))
d = ImageDraw.Draw(img)
for j, row in enumerate(cells):
    for i, (name, a) in enumerate(row):
        bg = np.full(a.shape[:2] + (3,), 200, np.uint8)
        bg[(np.indices(a.shape[:2]).sum(0) // 1) % 2 == 0] = 215
        m = a[..., 3:4] / 255.0
        rgb = (a[..., :3] * m + bg * (1 - m)).astype(np.uint8)
        im = Image.fromarray(rgb).resize((cw, ch), Image.NEAREST)
        x, y = i * (cw + 4), j * (ch + lab + 4)
        img.paste(im, (x, y + lab))
        d.text((x + 2, y + 1), name, fill=(0, 0, 0))
img.save(out)
print(out, img.size)
