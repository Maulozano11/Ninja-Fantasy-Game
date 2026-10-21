import os, sys
import numpy as np
from PIL import Image, ImageDraw

D = sys.argv[1]
name, x0, y0, x1, y1, k = sys.argv[2], *map(int, sys.argv[3:8])
a = np.asarray(Image.open(os.path.join(D, name + '.png')).convert('RGBA')).astype(np.float64)
bg = np.array([236, 236, 240.0])
al = a[..., 3:4] / 255
c = (a[..., :3] * al + bg * (1 - al)).astype(np.uint8)[y0:y1, x0:x1]
im = Image.fromarray(c).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range(x0, x1):
    if x % 5 == 0:
        d.line(((x - x0) * k, 0, (x - x0) * k, im.height), fill=(0, 200, 255) if x % 10 == 0 else (120, 200, 220))
        if x % 10 == 0:
            d.text(((x - x0) * k + 2, 2), str(x), fill=(0, 0, 255))
for y in range(y0, y1):
    if y % 5 == 0:
        d.line((0, (y - y0) * k, im.width, (y - y0) * k), fill=(0, 200, 255) if y % 10 == 0 else (120, 200, 220))
        if y % 10 == 0:
            d.text((2, (y - y0) * k + 2), str(y), fill=(0, 0, 255))
im.save(os.path.join(D, f'o-{name}-{x0}-{y0}.png'))
