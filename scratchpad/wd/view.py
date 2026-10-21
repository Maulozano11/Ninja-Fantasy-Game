# usage: view.py <staging/vfx_fire> <out.png> <anim> <x0> <y0> <x1> <y1> <scale> [grass] [frames]
import sys, os, json
from PIL import Image
d, out, an = sys.argv[1:4]; x0, y0, x1, y1 = map(int, sys.argv[4:8]); k = int(sys.argv[8])
grass = len(sys.argv) > 9 and sys.argv[9] == 'grass'
pick = list(map(int, sys.argv[10].split(','))) if len(sys.argv) > 10 else None
s = json.load(open(os.path.join(d, 'manifest.json')))['sprites']['wall_diag']
im = Image.open(os.path.join(d, s['file'])).convert('RGBA'); info = s['anims'][an]; fw, fh = s['frameW'], s['frameH']
idx = pick or list(range(info['frames']))
cols = min(len(idx), 4); rows = (len(idx) + cols - 1) // cols
w, h = (x1 - x0) * k, (y1 - y0) * k
c = Image.new('RGB', (cols * (w + 6), rows * (h + 6)), (0, 0, 0))
for n, i in enumerate(idx):
    f = im.crop((i * fw + x0, info['row'] * fh + y0, i * fw + x1, info['row'] * fh + y1))
    g = Image.new('RGBA', f.size, (74, 112, 52, 255) if grass else (27, 28, 38, 255))
    if grass:
        for yy in range(f.height):
            for xx in range(f.width):
                if (xx * 7 + yy * 3) % 11 == 0: g.putpixel((xx, yy), (64, 100, 46, 255))
    g.alpha_composite(f)
    c.paste(g.convert('RGB').resize((w, h), Image.NEAREST), ((n % cols) * (w + 6), (n // cols) * (h + 6)))
c.save(out)
