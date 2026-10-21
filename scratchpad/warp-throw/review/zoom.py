# python3 -I zoom.py <capdir> <out> <step> <crop x0,y0,x1,y1> <scale> <cols> <frames comma list or a-b>
import sys
from PIL import Image, ImageDraw
d, out, step = sys.argv[1], sys.argv[2], int(sys.argv[3])
crop = tuple(int(v) for v in sys.argv[4].split(','))
sc = float(sys.argv[5]); cols = int(sys.argv[6])
fs = sys.argv[7]
if '-' in fs and ',' not in fs:
    a, b = fs.split('-'); frames = list(range(int(a), int(b) + 1))
else:
    frames = [int(v) for v in fs.split(',')]
ims = []
for i in frames:
    try: im = Image.open(f'{d}/f{i:03d}.png').convert('RGB')
    except FileNotFoundError: break
    im = im.crop(crop)
    im = im.resize((int(im.width * sc), int(im.height * sc)), Image.NEAREST)
    ims.append((i, im))
w, h = ims[0][1].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 4), rows * (h + 18)), (0, 0, 0))
dr = ImageDraw.Draw(sheet)
for k, (i, im) in enumerate(ims):
    x = (k % cols) * (w + 4); y = (k // cols) * (h + 18)
    sheet.paste(im, (x, y + 18)); dr.text((x + 4, y + 3), f'f{i} {i*step}ms', fill=(255, 255, 0))
sheet.save(out); print(sheet.size, len(ims))
