import sys
from PIL import Image
# zoom.py strip.png out.png cols i,j,... factor  -- crops cells from a 4x strip (cells are equal sized, 2px*4 gutters)
src, out, cols, idx, fac = sys.argv[1], sys.argv[2], int(sys.argv[3]), [int(v) for v in sys.argv[4].split(',')], float(sys.argv[5])
im = Image.open(src).convert('RGBA')
rows = None
# detect cell size from gutter colour #2a2e36 along the top row
W, H = im.size
gut = (0x2a, 0x2e, 0x36, 255)
cw = next(x for x in range(W) if im.getpixel((x, 4)) == gut)
ch = next(y for y in range(H) if im.getpixel((4, y)) == gut)
cells = []
for i in idx:
    X = (i % cols) * (cw + 8); Y = (i // cols) * (ch + 8)
    cells.append(im.crop((X, Y, X + cw, Y + ch)))
o = Image.new('RGBA', (cw * len(cells) + 8 * (len(cells) - 1), ch), gut)
for k, c in enumerate(cells): o.paste(c, (k * (cw + 8), 0))
o = o.resize((int(o.width * fac), int(o.height * fac)), Image.NEAREST)
o.save(out)
