# Zoom a fine-pixel numpy image with a labelled grid: zoom.py in.npy out.png x0 y0 x1 y1 [k]
import sys
import numpy as np
from PIL import Image, ImageDraw
a = np.load(sys.argv[1])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
k = int(sys.argv[7]) if len(sys.argv) > 7 else 16
c = np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)
H, W = c.shape[:2]
m = 24
img = Image.new('RGB', (W * k + m, H * k + m), (10, 10, 10))
img.paste(Image.fromarray(c[..., :3]).resize((W * k, H * k), Image.NEAREST), (m, m))
d = ImageDraw.Draw(img)
for i in range(W + 1):
    X = m + i * k
    col = (200, 200, 0) if (x0 + i) % 5 == 0 else (45, 45, 45)
    d.line([(X, m), (X, m + H * k)], fill=col)
    if (x0 + i) % 5 == 0 and i < W:
        d.text((X + 2, 4), str(x0 + i), fill=(255, 255, 0))
for j in range(H + 1):
    Y = m + j * k
    col = (200, 200, 0) if (y0 + j) % 5 == 0 else (45, 45, 45)
    d.line([(m, Y), (m + W * k, Y)], fill=col)
    if (y0 + j) % 5 == 0 and j < H:
        d.text((2, Y + 2), str(y0 + j), fill=(255, 255, 0))
img.save(sys.argv[2])
