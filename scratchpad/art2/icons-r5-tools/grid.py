# usage: grid.py src.png out.png N scale [x0 y0 x1 y1 in N-grid coords]
# Draws src (his crop, any size) resampled to N*scale with an N-grid and labels.
import sys
from PIL import Image, ImageDraw
src, out, N, Z = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
box = [int(v) for v in sys.argv[5:9]] if len(sys.argv) > 8 else [0, 0, N, N]
im = Image.open(src).convert('RGB')
# his crop trimmed 1px as in prep
if im.size[0] > 150:
    im = im.crop((1, 1, im.size[0]-1, im.size[1]-1))
big = im.resize((N*Z, N*Z), Image.LANCZOS) if im.size[0] != N else im.resize((N*Z, N*Z), Image.NEAREST)
big = big.crop((box[0]*Z, box[1]*Z, box[2]*Z, box[3]*Z))
d = ImageDraw.Draw(big)
for gx in range(box[0], box[2]+1):
    X = (gx-box[0])*Z
    d.line([(X, 0), (X, big.size[1])], fill=(0, 0, 0) if gx % 5 else (255, 60, 60), width=1)
for gy in range(box[1], box[3]+1):
    Y = (gy-box[1])*Z
    d.line([(0, Y), (big.size[0], Y)], fill=(0, 0, 0) if gy % 5 else (255, 60, 60), width=1)
for gx in range(box[0], box[2]):
    if gx % 5 == 0: d.text(((gx-box[0])*Z+2, 1), str(gx), fill=(255, 255, 0))
for gy in range(box[1], box[3]):
    if gy % 5 == 0: d.text((1, (gy-box[1])*Z+2), str(gy), fill=(255, 255, 0))
big.save(out)
