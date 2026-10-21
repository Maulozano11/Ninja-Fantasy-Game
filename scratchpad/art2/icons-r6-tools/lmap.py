# lmap.py lib work id N S x0 y0 x1 y1 : his lightness on an N grid supersampled S times, as characters (0-9 by L)
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image
W, iid, N, S = sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
x0, y0, x1, y1 = [float(v) for v in sys.argv[6:10]]
src = load_his(W + f'/out/ref/{iid}.png')
H, Wd = src.shape[:2]
L = oklab(src)[..., 0]
ys = np.arange(y0, y1, 1 / S); xs = np.arange(x0, x1, 1 / S)
hdr = ''.join((str(int(x) % 10) if abs(x - round(x)) < 1e-6 else ' ') for x in xs)
print('      ' + hdr)
for y in ys:
    r = L[min(H - 1, int((y + 0.5 / S) * H / N))]
    line = ''.join(' .:-=+*#%@'[min(9, max(0, int((r[min(Wd - 1, int((x + 0.5 / S) * Wd / N))] - 0.3) / 0.07)))] for x in xs)
    print(f'{y:5.2f} ' + line)
