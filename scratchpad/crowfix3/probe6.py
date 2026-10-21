import os, sys
import numpy as np
CONV = sys.argv[1]
os.environ['CROWS_DEV'] = '1'
src = open(CONV).read()
cut = src.index("frames = {'fly': fly(), 'summon': summon()}")
g = {'__name__': 'conv', '__file__': CONV}
sys.argv = [CONV, '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
exec(compile(src[:cut], CONV, 'exec'), g)
L = g['LAY']['L']; x0, y0 = g['PICS']['L'][:2]
cr = [c for c in L['crows'] if c['name'] == 'L3'][0]
sc = g['SHEET']['L3']
P = g['PADS']
for y in range(850, 874):
    row = ''
    for x in range(374, 404):
        on = cr['mask'][y - y0, x - x0]
        f = sc['mask'][y - y0 + P, x - x0 + P]
        lu = L['rgb'][y - y0, x - x0].mean()
        row += ('#' if on else ('+' if f else ('.' if lu < 40 else ':')))
    print(y, row)
