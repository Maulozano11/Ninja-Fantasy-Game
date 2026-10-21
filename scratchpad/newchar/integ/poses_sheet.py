"""Compose pose frames into a labelled sheet.
python3 -I poses_sheet.py <dir with i.png> <labels comma-separated> <out.png> <k> <cols> [title]"""
import sys
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

d, labels, out, k, cols = sys.argv[1], sys.argv[2].split(','), sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
title = sys.argv[6] if len(sys.argv) > 6 else ''
BG = (236, 230, 220)
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
TFONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 32)
frames = [np.asarray(Image.open(os.path.join(d, f'{i}.png')).convert('RGBA')) for i in range(len(labels))]
m = np.zeros(frames[0].shape[:2], bool)
for f in frames:
    m |= f[..., 3] > 0
ys, xs = np.nonzero(m)
y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
cw, ch = (x1 - x0) * k, (y1 - y0) * k
lab_h = 40
top = 56 if title else 10
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (cw + 16) + 16, top + rows * (ch + lab_h + 16)), BG)
dr = ImageDraw.Draw(sheet)
if title:
    dr.text((16, 12), title, font=TFONT, fill=(40, 30, 24))
for i, (f, lab) in enumerate(zip(frames, labels)):
    r, c = divmod(i, cols)
    x, y = 16 + c * (cw + 16), top + r * (ch + lab_h + 16)
    crop = f[y0:y1, x0:x1]
    o = np.empty(crop.shape[:2] + (3,), np.uint8)
    o[:] = (226, 219, 207)
    mm = crop[..., 3] > 0
    o[mm] = crop[mm, :3]
    img = Image.fromarray(np.kron(o, np.ones((k, k, 1), np.uint8)))
    dr.text((x, y + 4), lab, font=FONT, fill=(40, 30, 24))
    sheet.paste(img, (x, y + lab_h))
sheet.save(out)
print(sheet.size)
