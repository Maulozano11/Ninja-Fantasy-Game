import os, sys
import numpy as np
CONV = sys.argv[1]
os.environ['CROWS_DEV'] = '1'
src = open(CONV).read()
cut = src.index("frames = {'fly': fly(), 'summon': summon()}")
g = {'__name__': 'conv', '__file__': CONV}
sys.argv = [CONV, '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
exec(compile(src[:cut], CONV, 'exec'), g)
for n in g['ORDER']['L'] + g['ORDER']['R']:
    for mode in ('up', 'mid', 'down'):
        m, rgba, eyes = g['pose'](n, mode)
        comps = sorted((len(p) for p in g['components'](m)), reverse=True)
        print(n, mode, comps[:8])
for k in ('L', 'R'):
    for n in g['FEATHERS'][k]:
        p = g['BY'][n]
        print(n, int(p['fmask'].sum()), [len(c) for c in g['components'](p['fmask'])])
