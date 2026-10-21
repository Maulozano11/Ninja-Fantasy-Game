import sys, json
import numpy as np
from PIL import Image, ImageDraw
A, name, anim, S = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
frames = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 and sys.argv[5] != 'all' else None
bgname = sys.argv[6] if len(sys.argv) > 6 else 'dark'
BG = {'dark': (35, 35, 46), 'grass': (78, 104, 58), 'light': (205, 200, 185)}[bgname]
man = json.load(open(A + '/staging/vfx_earth_v3/manifest.json'))['sprites']
m = man[name]; W, H = m['frameW'], m['frameH']; b = m['anims'][anim]
im = Image.open(A + '/staging/vfx_earth_v3/' + m['file']).convert('RGBA')
frames = frames or list(range(b['frames']))
cols = min(len(frames), int(sys.argv[7]) if len(sys.argv) > 7 else 8)
rows = (len(frames) + cols - 1) // cols
canvas = Image.new('RGB', (cols * (W * S + 4) + 4, rows * (H * S + 16) + 4), (12, 12, 16))
dr = ImageDraw.Draw(canvas)
for i, f in enumerate(frames):
    fr = im.crop((f * W, b['row'] * H, (f + 1) * W, (b['row'] + 1) * H))
    t = Image.new('RGBA', (W, H), BG + (255,)); t.alpha_composite(fr)
    x = 4 + (i % cols) * (W * S + 4); y = 4 + (i // cols) * (H * S + 16)
    dr.text((x, y), 'f%d' % f, fill=(230, 230, 230))
    canvas.paste(t.convert('RGB').resize((W * S, H * S), Image.NEAREST), (x, y + 12))
out = A + '/review-set-r2/earth-v3-r2/s-%s-%s-%s.png' % (name, anim, bgname)
canvas.save(out); print(out, canvas.size)
