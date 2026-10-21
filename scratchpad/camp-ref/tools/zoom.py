# zoom.py out.png x0,y0,x1,y1 scale parts file|label ...
import os
import sys
from PIL import Image, ImageDraw

G = 256
out, crop, scale, parts = sys.argv[1], tuple(int(v) for v in sys.argv[2].split(',')), int(sys.argv[3]), sys.argv[4]
items = [a.split('|') for a in sys.argv[5:]]
x0, y0, x1, y1 = crop
cw, ch = (x1 - x0) * scale, (y1 - y0) * scale
ncol = min(len(items), 4)
nrow = (len(items) + ncol - 1) // ncol
W, H = ncol * (cw + 30) + 30, nrow * (ch + 30) + 10
img = Image.new('RGB', (W, H), (20, 20, 26))
d = ImageDraw.Draw(img)
PC = {1: (255, 80, 80), 2: (80, 200, 80), 3: (40, 120, 40), 4: (80, 80, 255), 5: (120, 160, 255), 6: (255, 255, 0), 7: (200, 80, 255), 8: (240, 140, 255), 9: (255, 160, 0), 17: (0, 255, 255)}
for n, (fn, label) in enumerate(items):
    im = Image.frombytes('RGBA', (G, G), open(fn, 'rb').read())
    bg = Image.new('RGBA', (G, G), (38, 43, 57, 255))
    bg.alpha_composite(im)
    c = bg.crop(crop).convert('RGB').resize((cw, ch), Image.NEAREST)
    ox, oy = 30 + (n % ncol) * (cw + 30), 20 + (n // ncol) * (ch + 30)
    img.paste(c, (ox, oy))
    if parts:
        pm = open(fn + '.part', 'rb').read()
        for y in range(y0, y1):
            for x in range(x0, x1):
                p = pm[y * G + x]
                if p in PC:
                    X, Y = ox + (x - x0) * scale, oy + (y - y0) * scale
                    d.rectangle([X + scale // 2 - 1, Y + scale // 2 - 1, X + scale // 2 + 1, Y + scale // 2 + 1], fill=PC[p])
    if scale >= 6:
        for x in range(x0, x1):
            if x % 4 == 0:
                d.line([(ox + (x - x0) * scale, oy), (ox + (x - x0) * scale, oy + ch)], fill=(70, 70, 70))
                if x % 8 == 0:
                    d.text((ox + (x - x0) * scale + 1, oy - 10), str(x), fill=(220, 220, 0))
        for y in range(y0, y1):
            if y % 4 == 0:
                d.line([(ox, oy + (y - y0) * scale), (ox + cw, oy + (y - y0) * scale)], fill=(70, 70, 70))
                if y % 8 == 0:
                    d.text((ox - 26, oy + (y - y0) * scale + 1), str(y), fill=(220, 220, 0))
    d.text((ox, oy + ch + 2), label, fill=(230, 230, 230))
    os.remove(fn)
    if parts:
        os.remove(fn + '.part')
img.save(out)
print(out, img.size)
