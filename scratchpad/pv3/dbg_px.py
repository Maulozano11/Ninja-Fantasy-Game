import sys
import numpy as np
src = open('/home/user/Ninja-Fantasy-Game/tools/refs/poison-from-ref.py').read()
cut = src.index('# --- build every key frame')
name, x0, y0, x1, y1 = sys.argv[3], *map(int, sys.argv[4:8])
sys.argv = ['x', sys.argv[1], '/dev/null', sys.argv[2]]
g = {'__name__': 'dbg'}
exec(compile(src[:cut], 'x', 'exec'), g)
cls = g['classify_his'](name, g['SPRITES'][name])
c = g['SMOOTH']
for y in range(y0, y1):
    print(y, ' '.join(('B' if cls['body'][y, x] else 'O' if cls['outline'][y, x] else 'g' if cls['glow'][y, x] else '.') + '%02x%02x%02x' % tuple(int(v) for v in c[y, x]) for x in range(x0, x1)))
