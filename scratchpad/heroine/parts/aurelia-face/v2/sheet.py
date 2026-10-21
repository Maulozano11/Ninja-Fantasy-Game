"""Side-by-side sheet with Spanish labels.

sheet.py <out.png> <tile> [<tile> ...]
tile = label|png|x0,y0,w,h|k     (png 'NATIVE' = her native pixels)
Transparent pixels show as light grey.
"""
import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import heroine_ref as H

font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
tiles = []
for spec in sys.argv[2:]:
    label, path, box, k = spec.split('|')
    x0, y0, w, h = map(int, box.split(','))
    k = int(k)
    if path == 'NATIVE':
        a = H.native('aurelia').astype(np.uint8)
        c = np.concatenate([a[y0:y0 + h, x0:x0 + w], np.full((h, w, 1), 255, np.uint8)], 2)
    else:
        a = np.asarray(Image.open(path).convert('RGBA'))
        c = a[y0:y0 + h, x0:x0 + w]
    o = np.full(c.shape[:2] + (3,), 205, np.uint8)
    m = c[..., 3] > 0
    o[m] = c[m, :3]
    tiles.append((label, Image.fromarray(o).resize((w * k, h * k), Image.NEAREST)))
pad = 16
W = sum(t.width for _, t in tiles) + pad * (len(tiles) + 1)
Hh = max(t.height for _, t in tiles) + 46 + pad
sheet = Image.new('RGB', (W, Hh), (236, 236, 240))
d = ImageDraw.Draw(sheet)
x = pad
for label, t in tiles:
    d.text((x, 12), label, fill=(20, 20, 30), font=font)
    sheet.paste(t, (x, 42))
    x += t.width + pad
sheet.save(sys.argv[1])
