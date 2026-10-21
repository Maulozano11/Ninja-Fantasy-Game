"""The four heroines' eyes in their own pixels, side by side (Spanish labels): four-eyes.py <out.png>"""
import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import heroine_ref as H

font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
k = 12
tiles = []
for w in H.WHICH:
    N = H.native(w).astype(np.uint8)
    nx, ny = H.EYES[w]['near']
    x0, y0 = int(nx) - 6, int(ny) - 5
    c = N[y0:y0 + 11, x0:x0 + 22]
    tiles.append((H.NAMES[w] if isinstance(H.NAMES.get(w), str) else w, Image.fromarray(c).resize((c.shape[1] * k, c.shape[0] * k), Image.NEAREST)))
pad = 14
W = sum(t.width for _, t in tiles) + pad * (len(tiles) + 1)
sheet = Image.new('RGB', (W, tiles[0][1].height + 40 + pad), (236, 236, 240))
d = ImageDraw.Draw(sheet)
x = pad
for label, t in tiles:
    d.text((x, 10), label, fill=(20, 20, 30), font=font)
    sheet.paste(t, (x, 38))
    x += t.width + pad
sheet.save(sys.argv[1])
