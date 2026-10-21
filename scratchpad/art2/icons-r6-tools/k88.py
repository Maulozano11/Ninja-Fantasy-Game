import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image, ImageDraw
W = sys.argv[2]
src = load_his(W + '/out/ref/kirin_thunder.png')
pal = hexes('#181639 #1a2351 #1a3269 #1d3f82 #1d4f91 #225da1 #296fad #2f7fbc #328fc8 #3ea0cf #48b2da #56c3e2 #5ed5ea #77e6f2 #96f3f8 #d3fbfb #feffff')
N = 88; X0, Y0, X1, Y1 = 46, 22, 88, 76; Z = 14
b = box(src, N, N)
np.save(W + '/box88.npy', b)
def view(im, z=Z):
    v = big(im[Y0:Y1, X0:X1], z); d = ImageDraw.Draw(v)
    for g in range(X0, X1 + 1, 2):
        d.line([((g - X0) * z, 0), ((g - X0) * z, 4)], fill=(255, 255, 0)); d.text(((g - X0) * z + 1, 5), str(g) if g % 4 == 0 else '', fill=(255, 255, 0))
    for g in range(Y0, Y1 + 1, 2):
        d.line([(0, (g - Y0) * z), (4, (g - Y0) * z)], fill=(255, 255, 0)); d.text((5, (g - Y0) * z + 1), str(g) if g % 4 == 0 else '', fill=(255, 255, 0))
    return v
# his raw pixels of that region at matching scale
sx = src.shape[1] / N; sy = src.shape[0] / N
cx0, cy0, cx1, cy1 = int(X0 * sx), int(Y0 * sy), int(np.ceil(X1 * sx)), int(np.ceil(Y1 * sy))
raw = Image.fromarray(src[cy0:cy1, cx0:cx1].astype(np.uint8)).resize(((X1 - X0) * Z, (Y1 - Y0) * Z), Image.NEAREST)
row([raw, view(pal[quant(np.clip(b, 0, 255), pal)])]).save(W + '/k88-his-boxq.png')
