"""grid.py <manifest.json> <out.png> <k> <cols> : the renders in a labelled grid (Spanish labels)"""
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

man = json.load(open(sys.argv[1]))
k, cols = int(sys.argv[3]), int(sys.argv[4])
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
tiles = []
for m in man:
    a = np.asarray(Image.open(m['file']).convert('RGBA'))
    o = np.full(a.shape[:2] + (3,), 205, np.uint8)
    msk = a[..., 3] > 0
    o[msk] = a[msk, :3]
    tiles.append((m['name'], Image.fromarray(o).resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST)))
tw = max(t.width for _, t in tiles)
th = max(t.height for _, t in tiles)
pad, lab = 12, 26
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad), (236, 236, 240))
d = ImageDraw.Draw(sheet)
for i, (name, t) in enumerate(tiles):
    x = pad + (i % cols) * (tw + pad)
    y = pad + (i // cols) * (th + lab + pad)
    d.text((x, y), name, fill=(20, 20, 30), font=font)
    sheet.paste(t, (x, y + lab))
sheet.save(sys.argv[2])
