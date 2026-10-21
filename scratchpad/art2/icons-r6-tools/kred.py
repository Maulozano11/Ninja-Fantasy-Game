import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image

W = sys.argv[2]
src = load_his(W + '/out/ref/kirin_thunder.png')
pal = hexes('#181639 #1a2351 #1a3269 #1d3f82 #1d4f91 #225da1 #296fad #2f7fbc #328fc8 #3ea0cf #48b2da #56c3e2 #5ed5ea #77e6f2 #96f3f8 #d3fbfb #feffff')
b = box(src, 44, 44)
lz = np.asarray(Image.fromarray(src.astype(np.uint8)).resize((44, 44), Image.LANCZOS)).astype(float)
def usm(im, s, a):
    bl = gaussrgb(im, s)
    return im + a * (im - bl)
# pre-sharpen at source then box
ps = box(usm(src, 2.0, 0.8), 44, 44)
outs = [('box', b), ('lanczos', lz), ('box+usm.6', usm(b, 0.8, 0.6)), ('presharp', ps), ('box+usm1', usm(b, 0.8, 1.0))]
ims = []
for name, im in outs:
    q = pal[quant(np.clip(im, 0, 255), pal)]
    ims.append(gridify(big(q, 8), 8, 44))
row(ims[:3]).save(W + '/kred-a.png'); row(ims[3:] + [gridify(big(b, 8), 8, 44)]).save(W + '/kred-b.png')
