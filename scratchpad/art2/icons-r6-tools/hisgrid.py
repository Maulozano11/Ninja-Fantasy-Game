# hisgrid.py lib work N x0 y0 x1 y1 Z out : his crop (trimmed) resampled bicubic onto the N grid, region in N px, grid every px, labels every 2
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image, ImageDraw
W, iid, N, x0, y0, x1, y1, Z, out = sys.argv[2], sys.argv[3], int(sys.argv[4]), *[int(v) for v in sys.argv[5:9]], int(sys.argv[9]), sys.argv[10]
src = load_his(W + f'/out/ref/{iid}.png')
im = Image.fromarray(src.astype(np.uint8)).resize((N * Z, N * Z), Image.BICUBIC).crop((x0 * Z, y0 * Z, x1 * Z, y1 * Z))
pad = 24
c = Image.new('RGB', (im.size[0] + pad, im.size[1] + pad), (20, 20, 24)); c.paste(im, (pad, pad)); d = ImageDraw.Draw(c)
for g in range(x0, x1 + 1):
    X = pad + (g - x0) * Z
    d.line([(X, pad), (X, c.size[1])], fill=(255, 60, 60) if g % 10 == 0 else (70, 70, 70))
    if g % 2 == 0: d.text((X + 1, 4), str(g), fill=(255, 255, 0))
for g in range(y0, y1 + 1):
    Y = pad + (g - y0) * Z
    d.line([(pad, Y), (c.size[0], Y)], fill=(255, 60, 60) if g % 10 == 0 else (70, 70, 70))
    if g % 2 == 0: d.text((2, Y + 1), str(g), fill=(255, 255, 0))
c.save(out)
