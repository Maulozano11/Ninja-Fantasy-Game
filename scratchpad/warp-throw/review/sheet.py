# python3 -I sheet.py <capdir> <out.png> <step_ms> <first> <last> [every] [cols] [scale] [crop x0,y0,x1,y1]
import sys, os
from PIL import Image, ImageDraw
d, out, step, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
every = int(sys.argv[6]) if len(sys.argv) > 6 else 1
cols = int(sys.argv[7]) if len(sys.argv) > 7 else 6
sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
crop = tuple(int(v) for v in sys.argv[9].split(',')) if len(sys.argv) > 9 else None
ims = []
for i in range(a, b + 1, every):
    p = os.path.join(d, 'f%03d.png' % i)
    if not os.path.exists(p): break
    im = Image.open(p).convert('RGB')
    if crop: im = im.crop(crop)
    if sc != 1: im = im.resize((int(im.width * sc), int(im.height * sc)), Image.NEAREST)
    ims.append((i, im))
w, h = ims[0][1].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 4), rows * (h + 22)), (20, 20, 20))
dr = ImageDraw.Draw(sheet)
for k, (i, im) in enumerate(ims):
    x = (k % cols) * (w + 4); y = (k // cols) * (h + 22)
    sheet.paste(im, (x, y + 20))
    dr.text((x + 4, y + 4), f'f{i}  {i*step} ms', fill=(255, 255, 0))
sheet.save(out)
print(sheet.size, len(ims))
