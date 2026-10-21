import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import scarlet_ref as R
from PIL import Image, ImageDraw

OUT = sys.argv[1]
N = R.native()
np.save(os.path.join(OUT, 'native.npy'), N)


def crop(name, x0, y0, x1, y1, k=10, grid=True):
    a = N[y0:y1, x0:x1].astype(np.uint8)
    im = Image.fromarray(a).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    if grid:
        for x in range(x0, x1):
            if x % 5 == 0:
                d.line(((x - x0) * k, 0, (x - x0) * k, im.height), fill=(0, 255, 255) if x % 10 == 0 else (0, 120, 120))
                if x % 10 == 0:
                    d.text(((x - x0) * k + 2, 2), str(x), fill=(0, 255, 255))
        for y in range(y0, y1):
            if y % 5 == 0:
                d.line((0, (y - y0) * k, im.width, (y - y0) * k), fill=(0, 255, 255) if y % 10 == 0 else (0, 120, 120))
                if y % 10 == 0:
                    d.text((2, (y - y0) * k + 2), str(y), fill=(0, 255, 255))
    im.save(os.path.join(OUT, f'n-{name}.png'))


crop('head', 52, 18, 106, 62, 14)
crop('torso', 44, 50, 114, 126, 10)
crop('legs', 50, 120, 110, 194, 10)
crop('sword', 0, 95, 70, 185, 9)
