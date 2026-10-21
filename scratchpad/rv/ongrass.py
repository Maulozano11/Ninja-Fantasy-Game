import sys, json
import numpy as np
from PIL import Image, ImageDraw
A = sys.argv[1]
names = sys.argv[3:]
S = int(sys.argv[2])
man = json.load(open(A + '/staging/vfx_earth_v3/manifest.json'))['sprites']
KEY = {'hit': ('hit', 3), 'multi_hit': ('hit', 3), 'blast': ('blast', 4), 'wall': ('rise', 11), 'wall_diag': ('rise', 11), 'wall_depth': ('rise', 11), 'aura': ('idle', 0)}
BGS = [(35, 35, 46), (78, 104, 58), (140, 118, 84), (205, 200, 185)]
for name in names:
    m = man[name]; W, H = m['frameW'], m['frameH']
    an, f = KEY.get(name, ('fly', 0))
    b = m['anims'][an]
    im = Image.open(A + '/staging/vfx_earth_v3/' + m['file']).convert('RGBA')
    fr = im.crop((f * W, b['row'] * H, (f + 1) * W, (b['row'] + 1) * H))
    canvas = Image.new('RGB', (len(BGS) * (W * S + 6) + 6, H * S + 12), (12, 12, 16))
    for i, bg in enumerate(BGS):
        t = Image.new('RGBA', (W, H), bg + (255,)); t.alpha_composite(fr)
        canvas.paste(t.convert('RGB').resize((W * S, H * S), Image.NEAREST), (6 + i * (W * S + 6), 6))
    canvas.save(A + '/review-set-r2/earth-v3-r2/g-%s.png' % name)
