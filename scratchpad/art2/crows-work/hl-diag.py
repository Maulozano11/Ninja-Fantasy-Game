import sys, runpy
sys.argv = ['measure.py', sys.argv[1]]
g = runpy.run_path('measure.py')
import numpy as np
from PIL import Image
frames, his_box, luma, dil4, eye_pixels = g['frames'], g['his_box'], g['luma'], g['dil4'], g['eye_pixels']
W, H = g['W'], g['H']
rows = []
for key, i in (('L', 0), ('R', 4)):
    f = frames['fly'][i]
    c = f[..., :3].astype(np.float32)
    ez = dil4(eye_pixels(f), 2)
    h = his_box(key)
    Lh, Lo = luma(h), luma(c)
    sel = (Lh > 90) & ~ez
    print(key, 'his>90 n', sel.sum(), 'ours there: mean', Lo[sel].mean().round(1), 'alpha0', (f[..., 3][sel] == 0).sum(), 'semi', ((f[..., 3][sel] > 0) & (f[..., 3][sel] < 255)).sum())
    # where ours is dark under his bright: colour samples
    d = sel & (Lo < 80)
    ys, xs = np.nonzero(d)
    for y, x in list(zip(ys, xs))[:0]:
        print(' ', (x, y), h[y, x].astype(int), c[y, x].astype(int), f[y, x, 3])
    # 1-pixel neighbourhood max: does ours have a bright pixel within 1 px?
    from itertools import product
    mx = np.zeros_like(Lo)
    for dy, dx in product((-1, 0, 1), repeat=2):
        mx = np.maximum(mx, np.roll(np.roll(Lo, dy, 0), dx, 1))
    print('  his>90 with ours>80 within 1px:', (sel & (mx > 80)).sum())
    img = np.zeros((H, W * 2 + 4, 3), np.uint8)
    img[:, :W] = (np.clip(h, 0, 255) * 0.5).astype(np.uint8)
    img[:, W + 4:] = (c * 0.5).astype(np.uint8)
    for off, L_ in ((0, Lh), (W + 4, Lo)):
        for t, col in ((90, (0, 200, 255)), (100, (255, 255, 0)), (115, (255, 60, 60))):
            m = (L_ > t) & ~ez
            img[:, off:off + W][m] = col
    rows.append(img)
Image.fromarray(np.concatenate(rows, 0)).resize(((W * 2 + 4) * 3, H * 2 * 3), Image.NEAREST).save('hl-diag.png')
