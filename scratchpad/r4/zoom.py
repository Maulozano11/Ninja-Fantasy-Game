import sys
from PIL import Image
# usage: zoom.py src x0 y0 x1 y1 scale out [resample]
src, x0, y0, x1, y1, sc, out = sys.argv[1:8]
im = Image.open(src).convert('RGB').crop((int(x0), int(y0), int(x1), int(y1)))
im = im.resize((im.width*int(sc), im.height*int(sc)), Image.NEAREST)
im.save(out)
