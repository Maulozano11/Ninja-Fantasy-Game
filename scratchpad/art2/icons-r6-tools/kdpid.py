import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image, ImageDraw
W = sys.argv[2]
src = load_his(W + '/out/ref/kirin_thunder.png')
pal = hexes('#181639 #1a2351 #1a3269 #1d3f82 #1d4f91 #225da1 #296fad #2f7fbc #328fc8 #3ea0cf #48b2da #56c3e2 #5ed5ea #77e6f2 #96f3f8 #d3fbfb #feffff')
X0, Y0, X1, Y1 = 18, 6, 44, 38
Z = 16
def view(im):
    v = big(im[Y0:Y1, X0:X1], Z); d = ImageDraw.Draw(v)
    for g in range(X0, X1 + 1, 2):
        d.line([((g - X0) * Z, 0), ((g - X0) * Z, v.size[1])], fill=(255, 60, 60) if g % 10 == 0 else (60, 60, 60)); d.text(((g - X0) * Z + 2, 1), str(g), fill=(255, 255, 0))
    for g in range(Y0, Y1 + 1, 2):
        d.line([(0, (g - Y0) * Z), (v.size[0], (g - Y0) * Z)], fill=(255, 60, 60) if g % 10 == 0 else (60, 60, 60)); d.text((1, (g - Y0) * Z + 2), str(g), fill=(255, 255, 0))
    return v
res = {}
for lam in (0.5, 1.0, 2.0):
    res[lam] = dpid(src, 44, 44, lam)
    np.save(W + f'/dpid44-{lam}.npy', res[lam])
row([view(res[0.5]), view(res[1.0]), view(res[2.0])]).save(W + '/kd-raw.png')
row([view(pal[quant(np.clip(res[l], 0, 255), pal)]) for l in (0.5, 1.0, 2.0)]).save(W + '/kd-q.png')
