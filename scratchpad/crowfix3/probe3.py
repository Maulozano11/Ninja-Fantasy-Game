import os, sys
import numpy as np
CONV = sys.argv[1]
os.environ['CROWS_DEV'] = '1'
src = open(CONV).read()
cut = src.index("frames = {'fly': fly(), 'summon': summon()}")
g = {'__name__': 'conv', '__file__': CONV}
sys.argv = [CONV, '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
exec(compile(src[:cut], CONV, 'exec'), g)
L = np.array([0.3, 0.55, 0.15])
def light(v):
    return round(float((v[..., 3] / 255 * (v[..., :3] @ L)).sum()) / 1000, 1), int((v[..., 3] > 0).sum())
print('his veil L', light(g['his_veil']('L')))
for args in [(0, 1.0, 1.0), (20, 1.0, 1.0), (40, 0.85, 0.9), (60, 0.65, 0.75), (-20, 1.0, 1.0), (-20, 0.9, 0.85), (60, 0.72, 0.85)]:
    print('vortex', args, light(g['vortex'](*args)[1]))
kf = g['key_frame']('L')
print('key L', light(kf))
# crows only light in key frame
for n in g['ORDER']['L']:
    for mode in ('up', 'mid', 'down'):
        m, rgba, e = g['pose'](n, mode)
        print(n, mode, light(rgba))
