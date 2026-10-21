import sys
import numpy as np
from PIL import Image
D, OUT = sys.argv[1], sys.argv[2]
fly = np.load(D + '/cobra-fly.npy')
n, H, W = fly.shape[:3]
ys, xs = np.nonzero(fly[..., 3].max(0))
x0, x1, y0, y1 = xs.min() - 1, xs.max() + 2, ys.min() - 1, ys.max() + 2
fr = [Image.fromarray(f[y0:y1, x0:x1], 'RGBA') for f in fly]
w, h = fr[0].size
for bgname, bg in (('grass', (92, 108, 84, 255)), ('dark', (31, 33, 46, 255))):
    out = Image.new('RGBA', ((w + 2) * 4, (h + 2) * 2), (0, 0, 0, 255))
    for i, f in enumerate(fr):
        c = Image.new('RGBA', (w, h), bg); c.alpha_composite(f)
        out.paste(c, ((i % 4) * (w + 2), (i // 4) * (h + 2)))
    out.resize((out.width * 3, out.height * 3), Image.NEAREST).save(f'{OUT}-{bgname}.png')
# tails
box = (0, 15, 75, 85)
out = Image.new('RGBA', ((75 + 1) * 4, (70 + 1) * 2), (255, 255, 255, 255))
for i, f in enumerate(fr):
    c = Image.new('RGBA', (w, h), (31, 33, 46, 255)); c.alpha_composite(f)
    out.paste(c.crop(box), ((i % 4) * 76, (i // 4) * 71))
out.resize((out.width * 5, out.height * 5), Image.NEAREST).save(f'{OUT}-tails.png')
print('size', (w, h))
