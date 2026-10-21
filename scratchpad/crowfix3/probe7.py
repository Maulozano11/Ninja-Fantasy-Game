import os, sys
import numpy as np
from PIL import Image
CONV = sys.argv[1]
os.environ['CROWS_DEV'] = '1'
src = open(CONV).read()
cut = src.index("frames = {'fly': fly(), 'summon': summon()}")
g = {'__name__': 'conv', '__file__': CONV}
sys.argv = [CONV, '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
exec(compile(src[:cut], CONV, 'exec'), g)
def cnt(v):
    rgb = v[..., :3].astype(float); a = v[..., 3] > 0
    bmg = rgb[..., 2] - rgb[..., 1]
    return int((a & (bmg > 80)).sum()), int((a & (bmg > 60)).sum()), int(a.sum())
hv = g['his_veil']('L')
print('his veil', cnt(hv))
v0 = g['vortex'](0)[1]
print('vortex(0)', cnt(v0))
print('vortex(20)', cnt(g['vortex'](20)[1]))
print('vortex(-25)', cnt(g['vortex'](-25)[1]))
# where his veil is visible (not hidden by crows), compare
hidden = np.zeros(hv.shape[:2], bool)
for k in g['ORDER']['L'] + g['FEATHERS']['L']:
    hidden |= g['BY'][k]['mask']
vis = (hv[..., 3] > 0) & ~hidden
def cntm(v, m):
    rgb = v[..., :3].astype(float)
    bmg = rgb[..., 2] - rgb[..., 1]
    return int((m & (v[..., 3] > 0) & (bmg > 80)).sum())
print('on his visible veil: his', cntm(hv, vis), 'vortex(0)', cntm(v0, vis))
# save comparison image of his veil vs vortex(0) vs vortex(20)
CY0, CX0 = 0, 0
strip = np.concatenate([hv, v0, g['vortex'](20)[1]], 1)
bg = Image.new('RGBA', (strip.shape[1], strip.shape[0]), (31, 31, 41, 255))
bg.alpha_composite(Image.fromarray(strip, 'RGBA'))
bg.crop((0, 40, bg.width, 200)).resize((bg.width * 3, 480), Image.NEAREST).save('vort-cmp.png')
