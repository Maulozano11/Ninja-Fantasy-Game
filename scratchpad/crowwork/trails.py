import json, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw
d = 'art2/staging/vfx_beasts_crows/'
m = json.load(open(d + 'manifest.json'))['sprites']['genjutsu']
im = np.asarray(Image.open(d + m['file']).convert('RGBA')).astype(int)
fw, fh = m['frameW'], m['frameH']
K = 4
cols = [(255, 60, 60), (255, 170, 0), (255, 255, 0), (0, 255, 0), (0, 220, 255), (220, 80, 255)]
def blobs(mask):
    seen = np.zeros_like(mask); out = []
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]: continue
        q = deque([(y, x)]); seen[y, x] = True; pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
        out.append(np.mean(pts, 0))
    return out
row = int(sys.argv[1]) if len(sys.argv) > 1 else 0
base = Image.new('RGBA', (fw * K, fh * K), (93, 107, 87, 255))
for i in range(6):
    f = im[row * fh:(row + 1) * fh, i * fw:(i + 1) * fw].astype(np.uint8).copy()
    f[..., 3] = (f[..., 3] * 0.25).astype(np.uint8)
    base.alpha_composite(Image.fromarray(f, 'RGBA').resize((fw * K, fh * K), Image.NEAREST))
dr = ImageDraw.Draw(base)
for i in range(6):
    f = im[row * fh:(row + 1) * fh, i * fw:(i + 1) * fw]
    red = (f[..., 0] > 110) & (f[..., 0] > f[..., 1] * 2.2) & (f[..., 3] == 255)
    for cy, cx in blobs(red):
        x, y = cx * K + 2, cy * K + 2
        dr.ellipse((x - 7, y - 7, x + 7, y + 7), outline=cols[i], width=3)
        dr.text((x + 8, y - 8), str(i), fill=cols[i])
base.save(f'crowwork/trails{row}.png')
