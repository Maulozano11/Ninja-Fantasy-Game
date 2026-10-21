"""view.py <module.ts> <out.png> [anim] [frames] [zoom] [crop x0,y0,x1,y1]"""
import sys, runpy
ts, out = sys.argv[1], sys.argv[2]
anim = sys.argv[3] if len(sys.argv) > 3 else 'fly'
sel = [int(v) for v in sys.argv[4].split(',')] if len(sys.argv) > 4 and sys.argv[4] else None
z = int(sys.argv[5]) if len(sys.argv) > 5 else 2
crop = [int(v) for v in sys.argv[6].split(',')] if len(sys.argv) > 6 else None
sys.argv = ['m', ts]
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    g = runpy.run_path('measure.py', run_name='x')
import numpy as np
from PIL import Image
fr = g['frames'][anim]
sel = sel if sel is not None else list(range(len(fr)))
W, H = g['W'], g['H']
x0, y0, x1, y1 = crop if crop else (0, 0, W, H)
tiles = []
for i in sel:
    t = Image.new('RGBA', (W, H), (0x5d, 0x6b, 0x57, 255))
    t.alpha_composite(Image.fromarray(fr[i], 'RGBA'))
    tiles.append(t.crop((x0, y0, x1, y1)))
w, h = x1 - x0, y1 - y0
sheet = Image.new('RGBA', ((w + 3) * len(tiles), h), (0, 0, 0, 255))
for k, t in enumerate(tiles):
    sheet.paste(t, (k * (w + 3), 0))
sheet.resize((sheet.width * z, sheet.height * z), Image.NEAREST).save(out)
