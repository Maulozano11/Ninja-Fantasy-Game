"""Her parts tinted over her pixels, zoomed with a grid. python3 -I partsview.py which x0 y0 x1 y1 k out.png"""
import importlib.util
import os
import sys
sys.path.insert(0, os.path.abspath('tools/refs'))
import numpy as np
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('study', 'tools/refs/heroine-study.py')
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
w = sys.argv[1]
x0, y0, x1, y1, k = map(int, sys.argv[2:7])
N, Q, M = S.her(w)
show = (N * 0.35 + 140).astype(np.uint8)
for name, m in M.items():
    show[m] = (N[m] * 0.6 + np.array(S.TINT[name]) * 0.4).astype(np.uint8)
sub = show[y0:y1, x0:x1]
Mg = 28
im = Image.fromarray(sub).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
c = Image.new('RGB', (im.width + Mg, im.height + Mg), (255, 255, 255))
c.paste(im, (Mg, Mg))
d = ImageDraw.Draw(c)
for x in range(x0, x1 + 1):
    if x % 5 == 0:
        X = Mg + (x - x0) * k
        d.line((X, Mg, X, c.height), fill=(255, 0, 255) if x % 10 == 0 else (120, 200, 255), width=1)
        if x % 10 == 0:
            d.text((X + 1, 2), str(x), fill=(0, 0, 0))
for y in range(y0, y1 + 1):
    if y % 5 == 0:
        Y = Mg + (y - y0) * k
        d.line((Mg, Y, c.width, Y), fill=(255, 0, 255) if y % 10 == 0 else (120, 200, 255), width=1)
        if y % 10 == 0:
            d.text((1, Y + 1), str(y), fill=(0, 0, 0))
c.save(sys.argv[7])
