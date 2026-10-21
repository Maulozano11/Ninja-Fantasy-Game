import sys
import numpy as np
from PIL import Image
# usage: view.py sheet.png out.png x0 y0 x1 y1 k [frames]
sheet, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, k = map(int, sys.argv[3:8])
frames = [int(f) for f in sys.argv[8].split(',')] if len(sys.argv) > 8 else list(range(8))
a = np.array(Image.open(sheet).convert('RGBA')).astype(np.float32)
FW = 284
tiles = []
for f in frames:
    t = a[y0:y1, f * FW + x0:f * FW + x1]
    bg = np.zeros(t.shape[:2] + (3,), np.float32)
    bg[:] = (34, 34, 44)
    # checker under alpha to show partial alpha
    yy, xx = np.mgrid[0:t.shape[0], 0:t.shape[1]]
    bg[((yy // 4 + xx // 4) % 2) == 0] = (44, 44, 56)
    al = t[..., 3:4] / 255
    c = t[..., :3] * al + bg * (1 - al)
    c = np.kron(c, np.ones((k, k, 1)))
    tiles.append(c)
    tiles.append(np.full((c.shape[0], 6, 3), 200.0))
im = np.concatenate(tiles[:-1], 1)
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(out)
