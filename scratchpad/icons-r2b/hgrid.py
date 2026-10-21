# usage: hgrid.py <hiscrop> <N> <Z> <dest> [x0 y0 x1 y1 in N coords]: his trimmed crop at N*Z (Lanczos) with the N-grid
import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
im = im.crop((1, 1, im.width - 1, im.height - 1))
N, Z = int(sys.argv[2]), int(sys.argv[3])
big = im.resize((N * Z, N * Z), Image.LANCZOS)
x0, y0, x1, y1 = (0, 0, N, N) if len(sys.argv) < 9 else (int(v) for v in sys.argv[5:9])
c = big.crop((x0 * Z, y0 * Z, x1 * Z, y1 * Z))
M = 22
out = Image.new('RGB', (c.width + M, c.height + M), (0, 0, 0))
out.paste(c, (M, M))
d = ImageDraw.Draw(out)
for i in range(x1 - x0 + 1):
    col = (70, 70, 70) if (x0 + i) % 5 else (255, 60, 60)
    d.line([(M + i * Z, M), (M + i * Z, M + c.height)], fill=col, width=1)
    if (x0 + i) % 5 == 0: d.text((M + i * Z + 1, 2), str(x0 + i), fill=(255, 255, 0))
for j in range(y1 - y0 + 1):
    col = (70, 70, 70) if (y0 + j) % 5 else (255, 60, 60)
    d.line([(M, M + j * Z), (M + c.width, M + j * Z)], fill=col, width=1)
    if (y0 + j) % 5 == 0: d.text((1, M + j * Z + 1), str(y0 + j), fill=(255, 255, 0))
out.save(sys.argv[4])
