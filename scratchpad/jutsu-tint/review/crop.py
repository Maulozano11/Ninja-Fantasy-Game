import sys
from PIL import Image
src, out, x0, y0, x1, y1 = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
k = float(sys.argv[7]) if len(sys.argv) > 7 else 1
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
if k != 1: im = im.resize((int(im.width*k), int(im.height*k)), Image.NEAREST)
im.save(out); print(im.size)
