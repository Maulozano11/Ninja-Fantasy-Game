# fbstat.py work_dir : fireball core chroma (r<4 of 44) and lightness percentiles, his box vs ours, at 44 and 88
import sys, numpy as np
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from kx import oklab
from PIL import Image
w = sys.argv[1]
h = Image.open(f'{w}/out/ref/fireball_goukakyu.png').convert('RGB'); h = h.crop((1, 1, h.size[0]-1, h.size[1]-1))
for N, f in [(44, 'fireball_goukakyu.png'), (88, 'fireball_goukakyu@2x.png')]:
    k = N / 44; cx, cy = 21.6*k + (k-1)/2, 22.4*k + (k-1)/2
    yy, xx = np.mgrid[0:N, 0:N]; r = np.hypot(xx - cx, yy - cy) / k
    for nm, a in [('his', np.array(h.resize((N, N), Image.BOX)).astype(float)), ('ours', np.array(Image.open(f'{w}/out/{f}').convert('RGB')).astype(float))]:
        lab = oklab(a); C = np.hypot(lab[..., 1], lab[..., 2])
        print(N, nm, 'chroma r<4', round(float(C[r < 4].mean()), 3), 'r<2', round(float(C[r < 2].mean()), 3), 'L pct', np.percentile(lab[..., 0], [10, 25, 50]).round(3), 'L r18-24', round(float(lab[..., 0][(r > 18) & (r < 24)].mean()), 3))
