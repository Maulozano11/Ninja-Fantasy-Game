# usage: pair.py out.png zoom refcrop.png piece.png [bg]
# his crop (at our scale) beside our piece (screen scale), both zoomed nearest, on a dark green bg
import sys
from PIL import Image
out, z = sys.argv[1], float(sys.argv[2])
ims = [Image.open(p).convert('RGBA') for p in sys.argv[3:]]
ims = [i.resize((round(i.width*z), round(i.height*z)), Image.NEAREST) for i in ims]
W = sum(i.width for i in ims) + 12*(len(ims)-1); H = max(i.height for i in ims)
o = Image.new('RGBA', (W, H), (51, 70, 58, 255))
x = 0
for i in ims:
    o.alpha_composite(i, (x, 0)); x += i.width + 12
o.convert('RGB').save(out)
