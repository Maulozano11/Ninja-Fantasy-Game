# cmp88.py lib work id x0 y0 x1 y1 Z out : his raw on the 88 grid | ours @2x, same region, grid every px
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image, ImageDraw
W, iid = sys.argv[2], sys.argv[3]
x0, y0, x1, y1, Z = [int(v) for v in sys.argv[4:9]]
out = sys.argv[9]
src = load_his(W + f'/out/ref/{iid}.png'); H, Wd = src.shape[:2]
o88 = np.asarray(Image.open(W + f'/out/{iid}@2x.png').convert('RGB')).astype(np.uint8)
hh, ww = (y1 - y0) * Z, (x1 - x0) * Z
ys = ((y0 + (np.arange(hh) + 0.5) / Z) * H / 88).astype(int).clip(0, H - 1)
xs = ((x0 + (np.arange(ww) + 0.5) / Z) * Wd / 88).astype(int).clip(0, Wd - 1)
a = Image.fromarray(src[ys][:, xs].astype(np.uint8)); b = Image.fromarray(o88[y0:y1, x0:x1]).resize((ww, hh), Image.NEAREST)
def g(im):
    d = ImageDraw.Draw(im)
    for x in range(x0, x1 + 1):
        d.line([((x - x0) * Z, 0), ((x - x0) * Z, hh)], fill=(0, 0, 0) if x % 5 else (255, 60, 60))
        if x % 2 == 0: d.text(((x - x0) * Z + 1, 1), str(x), fill=(255, 255, 0))
    for y in range(y0, y1 + 1):
        d.line([(0, (y - y0) * Z), (ww, (y - y0) * Z)], fill=(0, 0, 0) if y % 5 else (255, 60, 60))
        if y % 2 == 0: d.text((1, (y - y0) * Z + 1), str(y), fill=(255, 255, 0))
    return im
row([g(a), g(b)]).save(out)
