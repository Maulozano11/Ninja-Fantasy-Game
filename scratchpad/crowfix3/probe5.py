import os, sys
import numpy as np
from PIL import Image
CONV = sys.argv[1]; name = sys.argv[2]; mode = sys.argv[3]
os.environ['CROWS_DEV'] = '1'
src = open(CONV).read()
cut = src.index("frames = {'fly': fly(), 'summon': summon()}")
g = {'__name__': 'conv', '__file__': CONV}
sys.argv = [CONV, '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
exec(compile(src[:cut], CONV, 'exec'), g)
m, rgba, e = g['pose'](name, mode)
ys, xs = np.nonzero(m)
y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
crop = rgba[y0:y1, x0:x1]
bg = Image.new('RGBA', (crop.shape[1], crop.shape[0]), (0x5d, 0x6b, 0x57, 255))
bg.alpha_composite(Image.fromarray(crop, 'RGBA'))
bg.resize((bg.width * 8, bg.height * 8), Image.NEAREST).save(f'pose-{name}-{mode}.png')
key = g['BY'][name]
k = key['rgba'][y0:y1, x0:x1]
bg = Image.new('RGBA', (k.shape[1], k.shape[0]), (31, 31, 41, 255))
bg.alpha_composite(Image.fromarray(k, 'RGBA'))
bg.resize((bg.width * 8, bg.height * 8), Image.NEAREST).save(f'key-{name}.png')
print('bbox', x0, y0, x1, y1)
