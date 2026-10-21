import sys, runpy, types
OUT = sys.argv[3]
import numpy as np
from PIL import Image
# run the extractor's top half by exec up to the build loop
src = open('/home/user/Ninja-Fantasy-Game/tools/refs/poison-from-ref.py').read()
cut = src.index('# --- build every key frame')
sys.argv = ['x', sys.argv[1], '/dev/null', sys.argv[2]]
g = {'__name__': 'dbg'}
exec(compile(src[:cut], 'x', 'exec'), g)
for name, box in (('blast', (440, 180, 582, 345)), ('wall_diag', (560, 440, 760, 658))):
    cfg = g['SPRITES'][name]
    cls = g['classify_his'](name, cfg)
    x0, y0, x1, y1 = box
    a = cls['a'][y0:y1, x0:x1]
    rgb = np.zeros(a.shape + (3,))
    rgb[..., 1] = np.clip(a / 0.5, 0, 1) * 255
    rgb[cls['removed'][y0:y1, x0:x1], 0] = 160
    rgb[cls['body'][y0:y1, x0:x1], 2] = 200
    Image.fromarray(rgb.astype(np.uint8)).resize(((x1 - x0) * 3, (y1 - y0) * 3), Image.NEAREST).save(OUT + '/dbg-' + name + '.png')
