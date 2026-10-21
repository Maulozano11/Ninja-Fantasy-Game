import os, sys
import numpy as np
CONV = sys.argv[1]
os.environ['CROWS_DEV'] = '1'
src = open(CONV).read()
cut = src.index("frames = {'fly': fly(), 'summon': summon()}")
g = {'__name__': 'conv', '__file__': CONV}
sys.argv = [CONV, '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
exec(compile(src[:cut], CONV, 'exec'), g)
for n in g['ORDER']['L']:
    sc = g['SHEET'][n]
    print(n, 'sheet gap px', int(sc['gap'].sum()), 'sheet mask', int(sc['mask'].sum()), 'game see', [int(g['pose'](n, md)[3].sum()) for md in ('up', 'mid', 'down')])
    # how many vivid px inside the crow poly but not in mask (open, not enclosed)
