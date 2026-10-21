"""Exec the converter up to the frames, record each compose() call's items, and attribute thin strays."""
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
REC = []
orig = g['compose']
def rec(items, his=None):
    f = orig(items, his)
    REC.append((items, f))
    return f
g['compose'] = rec
fly = g['fly'](); summon = g['summon']()
np.save('probe-fly.npy', np.stack(fly)); np.save('probe-summon.npy', np.stack(summon))
import pickle
names = []
for items, f in REC:
    # owner of each pixel: topmost item index
    own = -np.ones(f.shape[:2], int)
    labs = []
    for i, it in enumerate(items):
        if it[0] == 'veil':
            m = it[1][..., 3] > 0; labs.append('veil')
        else:
            m = it[1]
            # which piece? match by mask to BY
            labs.append('piece')
        own[m] = i
    names.append(labs)
# thin pixels: opaque with <=2 opaque 8-neighbours
def thin(f):
    a = f[..., 3] > 0
    p = np.pad(a, 1)
    n = sum(p[1 + dy:1 + dy + a.shape[0], 1 + dx:1 + dx + a.shape[1]] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    return a & (n <= 2)
for anim, frs in (('fly', fly), ('summon', summon)):
    for i, f in enumerate(frs):
        t = thin(f)
        print(anim, i, 'thin px', int(t.sum()))
