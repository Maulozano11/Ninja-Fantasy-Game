import sys
from PIL import Image
# zoomf.py strip.png out.png x0 y0 x1 y1 k frames...  (strip = debug x3 strip; coords in game px)
im = Image.open(sys.argv[1]); n = 8; W = im.width // n // 3; H = im.height // 3
x0, y0, x1, y1, k = map(int, sys.argv[3:8]); fr = [int(a) for a in sys.argv[8:]]
small = im.resize((im.width // 3, im.height // 3), Image.NEAREST)
tiles = [small.crop((f * W + x0, y0, f * W + x1, y1)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST) for f in fr]
out = Image.new('RGB', (sum(t.width for t in tiles) + 4 * len(tiles), tiles[0].height), 'white')
x = 0
for t in tiles:
    out.paste(t, (x, 0)); x += t.width + 4
out.save(sys.argv[2])
