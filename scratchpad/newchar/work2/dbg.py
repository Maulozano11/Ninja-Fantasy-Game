import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import importlib.util
import numpy as np
spec = importlib.util.spec_from_file_location('study', 'tools/refs/scarlet-study.py')
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
R = S.R
N, Q, N0, Q0, M = S.his()
x0, y0, x1, y1 = map(int, sys.argv[2:6])
name = sys.argv[1]
src = (N0, Q0) if name in ('hilt', 'blade') else (N, Q)
print('    ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    print(f'{y:3d} ' + ''.join(R.CHARS[src[1][y, x]] if M[name][y, x] else '.' for x in range(x0, x1)))
