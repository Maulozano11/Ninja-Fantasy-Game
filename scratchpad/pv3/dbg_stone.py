import sys
import numpy as np
from PIL import Image
OUT = sys.argv[3]
src = open('/home/user/Ninja-Fantasy-Game/tools/refs/poison-from-ref.py').read()
cut = src.index('# --- build every key frame')
sys.argv = ['x', sys.argv[1], '/dev/null', sys.argv[2]]
g = {'__name__': 'dbg'}
exec(compile(src[:cut], 'x', 'exec'), g)
name = 'wall_diag'
cfg = g['SPRITES'][name]
cls = g['classify_his'](name, cfg)
x0, y0, x1, y1 = 480, 480, 560, 657
rgb = np.zeros((y1 - y0, x1 - x0, 3))
rgb[cls['body'][y0:y1, x0:x1], 2] = 220
rgb[cls['outline'][y0:y1, x0:x1], 0] = 220
rgb[cls['glow'][y0:y1, x0:x1], 1] = 160
Image.fromarray(rgb.astype(np.uint8)).resize(((x1 - x0) * 4, (y1 - y0) * 4), Image.NEAREST).save(OUT + '/dbg-stone.png')
c = g['SMOOTH']
for y in range(560, 580, 4):
    print(y, [(int(v[0]), int(v[1]), int(v[2])) for v in c[y, 494:500]], cls['body'][y, 494:500].astype(int), g['family_of'](c)[y, 494:500])
