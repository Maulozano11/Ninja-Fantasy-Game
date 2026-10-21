"""Side by side: his picture box-filtered to game scale on our anchor | our frame, over a background.

python3 -I cmp.py <earth.ts> <frame> <key 0|5> <x0,y0,x1,y1 sheet coords> <zoom> <out.png> [bg r,g,b]
"""
import sys

import numpy as np
from PIL import Image

exec(open(__file__.replace('cmp.py', 'metrics.py')).read().split('\ndef comps')[0])

ts, fi, key, box, Z, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], int(sys.argv[5]), sys.argv[6]
bg = tuple(int(v) for v in sys.argv[7].split(',')) if len(sys.argv) > 7 else (34, 34, 44)
frames, anchor, off = load(ts)
H, W = frames[0].shape[:2]
ref = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-earth-set-owner.jpg').convert('RGB')
s = 96 / 228
torso = {0: (792, 1755), 5: (1448, 1755)}[key]
x0 = torso[0] - anchor[0] / s
y0 = torso[1] - anchor[1] / s
his = ref.resize((W, H), Image.BOX, box=(x0, y0, x0 + W / s, y0 + H / s))
if bg != (34, 34, 44):
    # his panel colour swapped for bg where his picture is panel
    h = np.asarray(his).astype(float)
    d = np.abs(h - np.array([34, 34, 44])).sum(2)
    a = np.clip((d - 10) / 40, 0, 1)[..., None]
    his = Image.fromarray((h * a + np.array(bg) * (1 - a)).astype(np.uint8))
o = Image.new('RGBA', (W, H), bg + (255,))
o.alpha_composite(Image.fromarray(frames[fi], 'RGBA'))
bx = [int(v) for v in box.split(',')]
a = his.crop(bx)
b = o.convert('RGB').crop(bx)
w, h = a.size
img = Image.new('RGB', (w * Z * 2 + 8, h * Z), (255, 255, 255))
img.paste(a.resize((w * Z, h * Z), Image.NEAREST), (0, 0))
img.paste(b.resize((w * Z, h * Z), Image.NEAREST), (w * Z + 8, 0))
img.save(out)
