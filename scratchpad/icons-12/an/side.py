"""Put images side by side, each scaled (nearest) to the same height. usage: side.py out.png height img...; optional crop via env CROP=x0,y0,x1,y1 (in each image's own pixels, applied before scaling)."""
import os
import sys
from PIL import Image

out, H = sys.argv[1], int(sys.argv[2])
crop = os.environ.get('CROP')
ims = []
for p in sys.argv[3:]:
    im = Image.open(p).convert('RGB')
    if crop:
        im = im.crop(tuple(int(v) for v in crop.split(',')))
    k = H / im.size[1]
    ims.append(im.resize((round(im.size[0] * k), H), Image.NEAREST))
W = sum(i.size[0] for i in ims) + 8 * (len(ims) - 1)
c = Image.new('RGB', (W, H), (16, 16, 20))
x = 0
for i in ims:
    c.paste(i, (x, 0))
    x += i.size[0] + 8
c.save(out)
