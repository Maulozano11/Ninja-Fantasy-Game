"""His pixels, his box to 44, ours 44 (and optionally another 44), all over the same 44 cells, with the 44 grid and coordinates.

usage: headcmp.py out.png his_square.png box44.png ours44.png [other44.png ...] -- cx0 cy0 cx1 cy1 (44 cells, exclusive end)
"""
import sys
from PIL import Image, ImageDraw

args = sys.argv[1:]
k = args.index('--')
files, (cx0, cy0, cx1, cy1) = args[:k], [int(v) for v in args[k + 1:]]
out, his, rest = files[0], files[1], files[2:]
Z = 30  # one 44 pixel = Z screen pixels
S = 115 / 44
M = 26
nx, ny = cx1 - cx0, cy1 - cy0
W = (nx * Z + 10) * (1 + len(rest)) + M
H = ny * Z + M
c = Image.new('RGB', (W, H), (16, 16, 20))
d = ImageDraw.Draw(c)
h = Image.open(his).convert('RGB')
# his pixels: crop his region and scale so 44 cells line up
hx0, hy0, hx1, hy1 = cx0 * S, cy0 * S, cx1 * S, cy1 * S
hc = h.transform((nx * Z, ny * Z), Image.EXTENT, (hx0, hy0, hx1, hy1), Image.NEAREST)
panels = [hc] + [Image.open(f).convert('RGB').crop((cx0, cy0, cx1, cy1)).resize((nx * Z, ny * Z), Image.NEAREST) for f in rest]
for i, p in enumerate(panels):
    x = M + i * (nx * Z + 10)
    c.paste(p, (x, M))
    for gx in range(nx + 1):
        d.line([(x + gx * Z, M), (x + gx * Z, M + ny * Z)], fill=(255, 0, 200) if i == 0 else (0, 0, 0))
    for gy in range(ny + 1):
        d.line([(x, M + gy * Z), (x + nx * Z, M + gy * Z)], fill=(255, 0, 200) if i == 0 else (0, 0, 0))
    for gx in range(nx):
        d.text((x + gx * Z + 8, 4), str((cx0 + gx) % 100), fill=(230, 230, 230))
for gy in range(ny):
    d.text((2, M + gy * Z + 8), str(cy0 + gy), fill=(230, 230, 230))
c.save(out)
