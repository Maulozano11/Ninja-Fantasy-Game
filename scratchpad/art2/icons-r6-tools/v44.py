# v44.py lib work id out x0 y0 x1 y1 Z : his box44 | ours 44 | r5 44 (staging backup), region, zoom Z
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image, ImageDraw
W, iid, out = sys.argv[2], sys.argv[3], sys.argv[4]
x0, y0, x1, y1, Z = [int(v) for v in sys.argv[5:10]]
src = load_his(W + f'/out/ref/{iid}.png')
b = box(src, 44, 44)
o = np.asarray(Image.open(W + f'/out/{iid}.png').convert('RGB')).astype(float)
r5 = np.asarray(Image.open(W + f'/staging-r5-backup/{iid}.png').convert('RGB')).astype(float)
def v(im):
    i = big(im[y0:y1, x0:x1], Z); d = ImageDraw.Draw(i)
    for x in range(x0, x1 + 1):
        if x % 2 == 0: d.text(((x - x0) * Z + 1, 1), str(x), fill=(255, 255, 0))
    for y in range(y0, y1 + 1):
        if y % 2 == 0: d.text((1, (y - y0) * Z + 1), str(y), fill=(255, 255, 0))
    return i
row([v(b), v(o), v(r5)]).save(out)
