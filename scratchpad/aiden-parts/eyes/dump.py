import os, sys
sys.path.insert(0, 'tools/refs')
import numpy as np
import aiden_ref as R
OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/'
a = R.native()
np.save(OUT + 'native.npy', a)
# 16x crop with grid lines and coordinates
from PIL import Image, ImageDraw
x0, x1, y0, y1 = 38, 64, 10, 30
k = 32
crop = a[y0:y1, x0:x1].astype(np.uint8)
img = Image.fromarray(crop, 'RGB').resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
d = ImageDraw.Draw(img)
for i in range(x1 - x0 + 1):
    d.line([(i * k, 0), (i * k, img.height)], fill=(128, 128, 128))
for j in range(y1 - y0 + 1):
    d.line([(0, j * k), (img.width, j * k)], fill=(128, 128, 128))
for i in range(x1 - x0):
    d.text((i * k + 2, 2), str(x0 + i), fill=(0, 255, 0))
for j in range(y1 - y0):
    d.text((2, j * k + 2), str(y0 + j), fill=(0, 255, 0))
img.save(OUT + 'his_face_grid.png')
for y in range(14, 25):
    print(y, ' '.join('%02x%02x%02x' % tuple(a[y, x]) for x in range(44, 60)))
