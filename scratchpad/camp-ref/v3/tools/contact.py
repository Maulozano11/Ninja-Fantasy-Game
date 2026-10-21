# contact.py dir preset weapon out.png [scale]: 4 bodies x 12 read frames.
import sys
from PIL import Image
G = 256
d, p, w, out = sys.argv[1:5]
k = int(sys.argv[5]) if len(sys.argv) > 5 else 3
crop = (96, 134, 150, 192)
cw, ch = (crop[2] - crop[0]) * k, (crop[3] - crop[1]) * k
img = Image.new('RGB', (12 * (cw + 3), 4 * (ch + 3)), (0, 0, 0))
for r, body in enumerate(['male', 'female', 'bulky', 'slender']):
    for f in range(12):
        im = Image.frombytes('RGBA', (G, G), open(f'{d}/p{p}-{body}-{w}-own-read-{f}.rgba', 'rb').read())
        bg = Image.new('RGBA', (G, G), (38, 42, 58, 255))
        bg.alpha_composite(im)
        c = bg.convert('RGB').crop(crop).resize((cw, ch), Image.NEAREST)
        img.paste(c, (f * (cw + 3), r * (ch + 3)))
img.save(out)
