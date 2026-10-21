# usage: grid.py <img> <zoom> <dest> [x0 y0 x1 y1]  -- nearest zoom with grid lines every px and labels every 5
import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
Z = int(sys.argv[2])
if len(sys.argv) > 4:
    x0, y0, x1, y1 = (int(v) for v in sys.argv[4:8])
else:
    x0, y0, x1, y1 = 0, 0, im.width, im.height
c = im.crop((x0, y0, x1, y1))
M = 22
out = Image.new('RGB', (c.width * Z + M, c.height * Z + M), (0, 0, 0))
out.paste(c.resize((c.width * Z, c.height * Z), Image.NEAREST), (M, M))
d = ImageDraw.Draw(out)
for i in range(c.width + 1):
    col = (90, 90, 90) if (x0 + i) % 5 else (255, 60, 60)
    d.line([(M + i * Z, M), (M + i * Z, M + c.height * Z)], fill=col, width=1)
    if (x0 + i) % 5 == 0 and i < c.width:
        d.text((M + i * Z + 1, 2), str(x0 + i), fill=(255, 255, 0))
for j in range(c.height + 1):
    col = (90, 90, 90) if (y0 + j) % 5 else (255, 60, 60)
    d.line([(M, M + j * Z), (M + c.width * Z, M + j * Z)], fill=col, width=1)
    if (y0 + j) % 5 == 0 and j < c.height:
        d.text((1, M + j * Z + 1), str(y0 + j), fill=(255, 255, 0))
out.save(sys.argv[3])
