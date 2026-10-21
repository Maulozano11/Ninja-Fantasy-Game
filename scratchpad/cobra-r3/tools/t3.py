import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, io, contextlib
from pre import load
with contextlib.redirect_stdout(io.StringIO()):
    g = load()
C = g['C']; PIECE = g['PIECE']
for a, w in (('L', 0.2), ('L', 0.4), ('L', 0.6), ('L', 0.8), ('R', 1/3), ('R', 2/3)):
    src, th, phi, jt = g['tip_plan'](a, w)
    P = C['L']['Pm'] * (1 - w) + C['R']['Pm'] * w if a == 'L' else C['R']['Pm'] * (1 - w) + C['L']['Pm'] * w
    try:
        Q = g['curl_tail'](P, a, 'R' if a == 'L' else 'L', w)
        print(a, round(w, 2), src, 'theta', round(np.degrees(th), 1), 'ok tip', Q[0].round(1))
    except SystemExit as e:
        print('  ', e)
