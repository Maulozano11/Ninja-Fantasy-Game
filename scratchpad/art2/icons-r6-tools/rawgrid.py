# rawgrid.py lib work id N x0 y0 x1 y1 Z out [contrast]: his raw crop pixels (nearest) under an N-grid, region in N coords
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image, ImageDraw
W, iid, N = sys.argv[2], sys.argv[3], int(sys.argv[4])
x0, y0, x1, y1 = [float(v) for v in sys.argv[5:9]]
Z, out = int(sys.argv[9]), sys.argv[10]
con = float(sys.argv[11]) if len(sys.argv) > 11 else 1.0
src = load_his(W + f'/out/ref/{iid}.png')
H, Wd = src.shape[:2]
sx, sy = Wd / N, H / N
# output canvas: each N px = Z screen px; sample his pixel under each screen px (nearest)
w, h = int((x1 - x0) * Z), int((y1 - y0) * Z)
ys = ((y0 + (np.arange(h) + 0.5) / Z) * sy).astype(int).clip(0, H - 1)
xs = ((x0 + (np.arange(w) + 0.5) / Z) * sx).astype(int).clip(0, Wd - 1)
img = src[ys][:, xs]
if con != 1.0:
    m = img.mean(axis=(0, 1)); img = (img - m) * con + m
pad = 26
c = Image.new('RGB', (w + pad, h + pad), (20, 20, 24)); c.paste(Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)), (pad, pad)); d = ImageDraw.Draw(c)
for g in range(int(np.ceil(x0)), int(x1) + 1):
    X = pad + int((g - x0) * Z)
    d.line([(X, pad), (X, c.size[1])], fill=(255, 60, 60) if g % 10 == 0 else (0, 0, 0))
    d.text((X + 1, 4 + (g % 2) * 10), str(g), fill=(255, 255, 0))
for g in range(int(np.ceil(y0)), int(y1) + 1):
    Y = pad + int((g - y0) * Z)
    d.line([(pad, Y), (c.size[0], Y)], fill=(255, 60, 60) if g % 10 == 0 else (0, 0, 0))
    d.text((2 + (g % 2) * 12, Y + 1), str(g), fill=(255, 255, 0))
c.save(out)
