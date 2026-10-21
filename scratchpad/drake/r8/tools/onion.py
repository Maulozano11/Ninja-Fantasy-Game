"""onion.py <earth.png> <out.png> [fw fh]: consecutive frame pairs (red this, cyan next, grey both)."""
import sys
import numpy as np
from PIL import Image, ImageDraw
im = np.asarray(Image.open(sys.argv[1]).convert('RGBA'))
fw = int(sys.argv[3]) if len(sys.argv) > 3 else 284
fh = int(sys.argv[4]) if len(sys.argv) > 4 else 167
n = im.shape[1] // fw
fr = [im[:fh, i * fw:(i + 1) * fw, 3] > 128 for i in range(n)]
tiles = []
for i in range(n):
    a, b = fr[i], fr[(i + 1) % n]
    t = np.full((fh, fw, 3), 20, np.uint8)
    t[a & ~b] = (255, 60, 60)
    t[b & ~a] = (50, 220, 255)
    t[a & b] = (150, 150, 150)
    img = Image.fromarray(t).resize((fw * 2, fh * 2), Image.NEAREST)
    ImageDraw.Draw(img).text((4, 4), f'{i}->{(i + 1) % n}', fill=(255, 255, 0))
    tiles.append(img)
out = Image.new("RGB", (fw * 4 + 6, ((n + 1) // 2) * (fh * 2 + 6)), (255, 255, 255))
for i, t in enumerate(tiles):
    out.paste(t, ((i % 2) * (fw * 2 + 6), (i // 2) * (fh * 2 + 6)))
out.save(sys.argv[2])
