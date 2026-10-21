"""Which items cover given points of a frame: python3 who.py conv anim idx x,y x,y ... (final cropped frame coords)."""
import os, sys
import numpy as np
CONV, anim, idx = sys.argv[1], sys.argv[2], int(sys.argv[3])
pts = [tuple(map(int, p.split(','))) for p in sys.argv[4:]]
os.environ['CROWS_DEV'] = '1'
src = open(CONV).read()
cut = src.index("frames = {'fly': fly(), 'summon': summon()}")
g = {'__name__': 'conv', '__file__': CONV}
sys.argv = [CONV, '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
exec(compile(src[:cut], CONV, 'exec'), g)
NAMES = {}
oat = g['at']
def at(name, pos, **kw):
    r = oat(name, pos, **kw); NAMES[id(r)] = name + str(kw.get('wings', '')); return r
g['at'] = at
ovx = g['vortex']
def vortex(*a, **k):
    r = ovx(*a, **k); NAMES[id(r)] = 'vortex' + str(a); return r
g['vortex'] = vortex
osm = g['smoke']
def smoke(*a, **k):
    r = osm(*a, **k); NAMES[id(r)] = 'smoke'; return r
g['smoke'] = smoke
REC = []
oc = g['compose']
def compose(items, his=None):
    f = oc(items, his); REC.append(([NAMES.get(id(it), it[0]) for it in items], items, f)); return f
g['compose'] = compose
fr = g[anim]()
# crop offsets: recompute union over all frames is costly; use the converter's printed crop via both anims
fl = fr if anim == 'fly' else g['fly']()
sm = fr if anim == 'summon' else g['summon']()
union = np.zeros(fl[0].shape[:2], bool)
for f in fl + sm:
    union |= f[..., 3] > 0
ys, xs = np.nonzero(union)
CX0, CY0 = int(xs.min()) - 1, int(ys.min()) - 1
calls = [r for r in REC if r[2] is fr[idx]]
names, items, f = calls[0]
for (x, y) in pts:
    X, Y = x + CX0, y + CY0
    cov = []
    for n, it in zip(names, items):
        m = it[1][..., 3] > 0 if it[0] == 'veil' else it[1]
        if m[Y, X]:
            cov.append(n)
    print((x, y), 'final', f[Y, X].tolist(), 'covered by', cov)
