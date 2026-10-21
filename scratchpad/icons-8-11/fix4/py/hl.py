"""hl.py <out.png> <id> <z> Lmin Lmax Cmin Cmax Hlo Hhi [x0 y0 x1 y1]: his window (his pixels) at z, with pixels in the LCH band
highlighted (green outline) and a grid every 10 of his pixels; prints the count and the band's colours by frequency."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
from PIL import Image, ImageDraw
import m
from collections import Counter

out, jid, z = sys.argv[1], sys.argv[2], int(sys.argv[3])
Lmin, Lmax, Cmin, Cmax, Hlo, Hhi = map(float, sys.argv[4:10])
W = np.asarray(m.his_win(jid)).astype(float)
h, w = W.shape[:2]
box = list(map(int, sys.argv[10:14])) if len(sys.argv) > 13 else [0, 0, w, h]
L, C, H = m.lch(W)
hm = (H >= Hlo) & (H <= Hhi) if Hlo <= Hhi else (H >= Hlo) | (H <= Hhi)
k = (L >= Lmin) & (L <= Lmax) & (C >= Cmin) & (C <= Cmax) & hm
sub = np.zeros_like(k)
sub[box[1]:box[3], box[0]:box[2]] = True
k &= sub
img = Image.fromarray(W.astype(np.uint8)).resize((w * z, h * z), Image.NEAREST)
d = ImageDraw.Draw(img)
for y, x in zip(*np.nonzero(k)):
    d.rectangle([x * z, y * z, x * z + z - 1, y * z + z - 1], outline=(0, 255, 90))
for x in range(0, w, 10):
    d.line([(x * z, 0), (x * z, h * z)], fill=(255, 255, 255))
    d.text((x * z + 2, 2), str(x), fill=(255, 255, 255))
for y in range(0, h, 10):
    d.line([(0, y * z), (w * z, y * z)], fill=(255, 255, 255))
    d.text((2, y * z + 2), str(y), fill=(255, 255, 255))
img.crop((box[0] * z, box[1] * z, box[2] * z, box[3] * z)).save(out)
cnt = Counter(m.hexc(W[y, x]) for y, x in zip(*np.nonzero(k)))
print('count', k.sum())
print(' '.join(f'{c}:{n}' for c, n in cnt.most_common(30)))
