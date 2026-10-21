"""Sheets of renders with labels: python3 -I sheet.py <out.png> <k> <x0,y0,x1,y1> <cols> <path=label> ...
A path 'REDUCED' is the study's reduced reference (needs cwd = repo)."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

out, k, box, cols = sys.argv[1], int(sys.argv[2]), [int(v) for v in sys.argv[3].split(',')], int(sys.argv[4])
items = [a.split('=', 1) for a in sys.argv[5:]]
x0, y0, x1, y1 = box
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
BG = (226, 226, 232, 255)


def load(p):
    if p == 'REDUCED':
        sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
        import scarlet_ref as R
        return R.reduced()
    if p.startswith('LAYER:'):
        sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
        import scarlet_ref as R
        lay = R.reduced_layers()[p[6:]]
        a = np.zeros((256, 256, 4), np.uint8)
        m = lay != 255
        a[m, :3] = R.rgb()[lay[m]]
        a[m, 3] = 255
        return a
    return np.asarray(Image.open(p).convert('RGBA'))


tiles = []
for p, label in items:
    a = load(p)[y0:y1, x0:x1].copy()
    bgm = a[..., 3] == 0
    a[bgm] = BG
    im = Image.fromarray(a, 'RGBA').resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    t = Image.new('RGBA', (im.width, im.height + 28), (255, 255, 255, 255))
    t.paste(im, (0, 28))
    ImageDraw.Draw(t).text((4, 4), label, fill=(20, 20, 30, 255), font=font)
    tiles.append(t)
w, h = tiles[0].size
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * (w + 6) + 6, rows * (h + 6) + 6), (255, 255, 255, 255))
for i, t in enumerate(tiles):
    sheet.paste(t, (6 + (i % cols) * (w + 6), 6 + (i // cols) * (h + 6)))
sheet.save(out)
print(out, sheet.size)
