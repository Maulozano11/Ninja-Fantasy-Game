"""grid.py img out.png x0,y0,x1,y1 zoom : zoomed crop on dark with a pixel grid and coordinates every 5 px"""
import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGBA'); out = sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3].split(',')); z = int(sys.argv[4])
c = im.crop((x0, y0, x1, y1)); bg = Image.new('RGBA', c.size, (21, 21, 29, 255)); bg.alpha_composite(c)
W, H = c.width * z, c.height * z
img = Image.new('RGB', (W + 30, H + 20), (0, 0, 0)); img.paste(bg.convert('RGB').resize((W, H), Image.NEAREST), (30, 20))
d = ImageDraw.Draw(img)
for x in range(c.width + 1):
    col = (255, 0, 255) if (x0 + x) % 5 == 0 else (60, 60, 70)
    d.line([(30 + x * z, 20), (30 + x * z, 20 + H)], fill=col, width=1)
    if (x0 + x) % 5 == 0: d.text((30 + x * z + 1, 4), str(x0 + x), fill=(255, 255, 0))
for y in range(c.height + 1):
    col = (255, 0, 255) if (y0 + y) % 5 == 0 else (60, 60, 70)
    d.line([(30, 20 + y * z), (30 + W, 20 + y * z)], fill=col, width=1)
    if (y0 + y) % 5 == 0: d.text((2, 20 + y * z + 1), str(y0 + y), fill=(255, 255, 0))
img.save(out); print(img.size)
