import sys; sys.path.insert(0, '.')
from partial import run
import numpy as np
sw, dl = sys.argv[1], sys.argv[2]
g = run('if FAILS:\n    raise SystemExit', subs=[("'far': {'root': FAR_ROOT, 'swing': 96.0, 'flex': 0.0, 'ease': 7.0, 'short': 0.10, 'delay': 0.13}",
                                                  f"'far': {{'root': FAR_ROOT, 'swing': {sw}, 'flex': 0.0, 'ease': 7.0, 'short': 0.10, 'delay': {dl}}}")])
L = [l[0] for l in g['LIGHT']]
sl = []
for k in [1, 2]:
    so = g['solids'][k]; far = g['pieces_at'][k]['far'] > 0
    top = {}
    for x in range(so.shape[1]):
        ys = np.nonzero(so[:, x])[0]
        if len(ys) and far[ys[0], x]: top[x] = ys[0]
    xs = sorted(top)
    if not xs: sl.append(None); continue
    tip = min(xs, key=lambda x: (top[x], x))
    right = [x for x in xs if tip < x <= tip + 30]
    sl.append((len(xs), round(float(np.degrees(np.arctan(np.polyfit(right, [top[x] for x in right], 1)[0]))), 1) if len(right) > 2 else None))
print(f'swing {sw} delay {dl}', 'steps', [round(L[(k+1)%8]/L[k],2) for k in range(8)], 'runs', g['RUNS'], 'far f1/f2 (cols, slope)', sl, 'holes', g['HOLES'], 'FAILS', g['FAILS'])
