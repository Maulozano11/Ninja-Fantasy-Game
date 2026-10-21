import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image, ImageDraw
W = sys.argv[2]
src = load_his(W + '/out/ref/kirin_thunder.png')
pal = hexes('#181639 #1a2351 #1a3269 #1d3f82 #1d4f91 #225da1 #296fad #2f7fbc #328fc8 #3ea0cf #48b2da #56c3e2 #5ed5ea #77e6f2 #96f3f8 #d3fbfb #feffff')
X0, Y0, X1, Y1 = 18, 6, 44, 38
Z = 16
def crop44(im):
    return im[Y0:Y1, X0:X1]
def view(im):
    v = big(crop44(im), Z)
    d = ImageDraw.Draw(v)
    for g in range(X0, X1 + 1):
        if g % 2 == 0: d.line([((g - X0) * Z, 0), ((g - X0) * Z, v.size[1])], fill=(255, 60, 60) if g % 10 == 0 else (60, 60, 60))
        if g % 2 == 0: d.text(((g - X0) * Z + 2, 1), str(g), fill=(255, 255, 0))
    for g in range(Y0, Y1 + 1):
        if g % 2 == 0: d.line([(0, (g - Y0) * Z), (v.size[0], (g - Y0) * Z)], fill=(255, 60, 60) if g % 10 == 0 else (60, 60, 60))
        if g % 2 == 0: d.text((1, (g - Y0) * Z + 2), str(g), fill=(255, 255, 0))
    return v
# his crop resampled bicubic onto the 44 grid at Z
hisbig = Image.fromarray(src.astype(np.uint8)).resize((44 * Z, 44 * Z), Image.BICUBIC)
hv = np.asarray(hisbig).astype(float)
hb = Image.fromarray(hv[Y0 * Z:Y1 * Z, X0 * Z:X1 * Z].astype(np.uint8))
d = ImageDraw.Draw(hb)
for g in range(X0, X1 + 1):
    if g % 2 == 0: d.line([((g - X0) * Z, 0), ((g - X0) * Z, hb.size[1])], fill=(255, 60, 60) if g % 10 == 0 else (90, 90, 90)); d.text(((g - X0) * Z + 2, 1), str(g), fill=(255, 255, 0))
for g in range(Y0, Y1 + 1):
    if g % 2 == 0: d.line([(0, (g - Y0) * Z), (hb.size[0], (g - Y0) * Z)], fill=(255, 60, 60) if g % 10 == 0 else (90, 90, 90)); d.text((1, (g - Y0) * Z + 2), str(g), fill=(255, 255, 0))
b = box(src, 44, 44)
row([hb, view(b)]).save(W + '/kh-his-box.png')
def usm(im, s, a): return im + a * (im - gaussrgb(im, s))
ps = box(usm(src, 2.0, 0.8), 44, 44)
row([view(pal[quant(np.clip(b, 0, 255), pal)]), view(pal[quant(np.clip(ps, 0, 255), pal)])]).save(W + '/kh-q.png')
