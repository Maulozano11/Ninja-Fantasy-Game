# crisp.py work_dir icon_id N : edge energy (mean |dL| to next pixel) and share of strong edges (|dL| > 0.1) of his box vs ours
import sys, numpy as np
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from kx import oklab
from PIL import Image
w, iid, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
h = Image.open(f'{w}/out/ref/{iid}.png').convert('RGB'); h = h.crop((1, 1, h.size[0]-1, h.size[1]-1))
hb = np.array(h.resize((N, N), Image.BOX)).astype(float)
o = np.array(Image.open(f'{w}/out/{iid}.png' if N == 44 else f'{w}/out/{iid}@2x.png').convert('RGB')).astype(float)
def m(a):
    L = oklab(a)[..., 0]; d = np.concatenate([np.abs(np.diff(L, axis=1)).ravel(), np.abs(np.diff(L, axis=0)).ravel()])
    return round(float(d.mean()), 4), round(float((d > 0.1).mean()), 3), np.percentile(L, [10, 25, 50, 75, 90]).round(3)
print(iid, N, 'his box', m(hb), 'ours', m(o))
