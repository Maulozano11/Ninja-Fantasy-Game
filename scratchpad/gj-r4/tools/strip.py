# strip.py groupDir out.png name anim frames(comma or all) [x0 y0 x1 y1] [zoom] [bg: green|dark]
import sys, json
from PIL import Image, ImageDraw
import numpy as np
stage, out, name, anim = sys.argv[1:5]
man = json.load(open(stage + '/manifest.json'))['sprites'][name]
fw, fh = man['frameW'], man['frameH']
a = man['anims'][anim]
frames = range(a['frames']) if sys.argv[5] == 'all' else [int(v) for v in sys.argv[5].split(',')]
x0, y0, x1, y1 = map(int, sys.argv[6:10]) if len(sys.argv) > 9 else (0, 0, fw, fh)
z = int(sys.argv[10]) if len(sys.argv) > 10 else 2
bg = (84, 110, 70) if (len(sys.argv) <= 11 or sys.argv[11] == 'green') else (32, 32, 42)
sheet = Image.open(stage + '/' + man['file']).convert('RGBA')
w, h = x1 - x0, y1 - y0
cols = min(len(frames), int(sys.argv[12]) if len(sys.argv) > 12 else 4)
rows = (len(frames) + cols - 1) // cols
O = Image.new('RGB', (cols * (w * z + 6), rows * (h * z + 16)), (0, 0, 0))
d = ImageDraw.Draw(O)
for j, fi in enumerate(frames):
    fr = sheet.crop((fi * fw + x0, a['row'] * fh + y0, fi * fw + x1, a['row'] * fh + y1))
    B = Image.new('RGBA', (w, h), bg + (255,)); B.alpha_composite(fr)
    X, Y = (j % cols) * (w * z + 6), (j // cols) * (h * z + 16)
    O.paste(B.convert('RGB').resize((w * z, h * z), Image.NEAREST), (X, Y + 14))
    d.text((X + 2, Y + 1), f'{name} {anim}[{fi}]', fill=(255, 255, 0))
O.save(out)
