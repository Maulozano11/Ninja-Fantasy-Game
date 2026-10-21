# strip.py out.png scale x0 y0 x1 y1 file1.rgba [file2.rgba ...]: frames side by side on our background.
import sys
import numpy as np
from PIL import Image
G = 256
out, k = sys.argv[1], int(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
files = sys.argv[7:]
bg = np.array([38, 42, 58.])
ims = []
for f in files:
    im = np.frombuffer(open(f, 'rb').read(), np.uint8).reshape(G, G, 4).astype(float)
    a = im[..., 3:] / 255
    c = im[..., :3] * a + bg * (1 - a)
    c = np.clip(c[y0:y1, x0:x1], 0, 255).astype(np.uint8)
    ims.append(Image.fromarray(c).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST))
W = sum(i.width for i in ims) + 4 * (len(ims) - 1)
s = Image.new('RGB', (W, ims[0].height), (0, 0, 0))
x = 0
for i in ims:
    s.paste(i, (x, 0))
    x += i.width + 4
s.save(out)
