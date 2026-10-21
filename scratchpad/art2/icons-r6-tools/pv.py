# pv.py lib work id out [x0 y0 x1 y1 in 44 coords]: his box44 | ours 44 | his raw (on 88 grid) | ours 88 -- region zoom; plus 1x/2x/3x strip
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image, ImageDraw
W, iid, out = sys.argv[2], sys.argv[3], sys.argv[4]
x0, y0, x1, y1 = [int(v) for v in sys.argv[5:9]] if len(sys.argv) > 8 else (0, 0, 44, 44)
src = load_his(W + f'/out/ref/{iid}.png')
o44 = np.asarray(Image.open(W + f'/out/{iid}.png').convert('RGB')).astype(float)
o88 = np.asarray(Image.open(W + f'/out/{iid}@2x.png').convert('RGB')).astype(float)
b44 = box(src, 44, 44)
Z = max(6, min(22, 560 // (x1 - x0)))
def lab(im, z, n, xo, yo, step):
    d = ImageDraw.Draw(im)
    for g in range(0, im.size[0] // z + 1):
        if (g + xo) % step == 0: d.line([(g * z, 0), (g * z, 5)], fill=(255, 255, 0)); d.text((g * z + 1, 6), str(g + xo), fill=(255, 255, 0))
    for g in range(0, im.size[1] // z + 1):
        if (g + yo) % step == 0: d.line([(0, g * z), (5, g * z)], fill=(255, 255, 0)); d.text((6, g * z + 1), str(g + yo), fill=(255, 255, 0))
    return im
a = lab(big(b44[y0:y1, x0:x1], Z), Z, 44, x0, y0, 2)
b = lab(big(o44[y0:y1, x0:x1], Z), Z, 44, x0, y0, 2)
z2 = Z // 2
H, Wd = src.shape[:2]
hh, ww = (y1 - y0) * 2 * z2, (x1 - x0) * 2 * z2
ys = ((2 * y0 + (np.arange(hh) + 0.5) / z2) * H / 88).astype(int).clip(0, H - 1)
xs = ((2 * x0 + (np.arange(ww) + 0.5) / z2) * Wd / 88).astype(int).clip(0, Wd - 1)
c = lab(Image.fromarray(src[ys][:, xs].astype(np.uint8)), z2, 88, 2 * x0, 2 * y0, 4)
d = lab(big(o88[2 * y0:2 * y1, 2 * x0:2 * x1], z2), z2, 88, 2 * x0, 2 * y0, 4)
top = row([a, b]); mid = row([c, d])
his44 = Image.fromarray(np.clip(b44, 0, 255).astype(np.uint8))
strip = row([his44, Image.fromarray(o44.astype(np.uint8)), his44.resize((132, 132), Image.NEAREST), Image.fromarray(o44.astype(np.uint8)).resize((132, 132), Image.NEAREST), Image.fromarray(o88.astype(np.uint8)), Image.fromarray(np.asarray(Image.fromarray(src.astype(np.uint8)).resize((88, 88), Image.LANCZOS)))])
col([top, mid, strip]).save(out)
