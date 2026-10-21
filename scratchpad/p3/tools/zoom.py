"""zoom.py out.png zoom crop(x0,y0,x1,y1|-) img1 [img2 ...]  (side by side on dark, checker for clear)"""
import sys
from PIL import Image, ImageDraw
out, z, crop = sys.argv[1], int(sys.argv[2]), sys.argv[3]
ims = [Image.open(p).convert('RGBA') for p in sys.argv[4:]]
if crop != '-':
    c = tuple(int(v) for v in crop.split(','))
    ims = [i.crop(c) for i in ims]
W = sum(i.width * z + 6 for i in ims); H = max(i.height for i in ims) * z
img = Image.new('RGB', (W, H + 12), (90, 0, 90))
d = ImageDraw.Draw(img)
x = 0
for k, i in enumerate(ims):
    bg = Image.new('RGBA', i.size, (21, 21, 29, 255)); bg.alpha_composite(i)
    img.paste(bg.convert('RGB').resize((i.width * z, i.height * z), Image.NEAREST), (x, 12))
    d.text((x + 2, 0), sys.argv[4 + k].split('/')[-1][:30], fill=(255, 255, 0))
    x += i.width * z + 6
img.save(out); print(img.size)
