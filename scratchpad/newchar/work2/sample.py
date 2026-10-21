import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import scarlet_ref as R

D = os.path.dirname(os.path.abspath(__file__))
N = np.load(os.path.join(D, 'native.npy'))
Q = R.quantize(N)
C = R.CHARS
bg = R.background(N)
x0, y0, x1, y1 = map(int, sys.argv[1:5])
print('    ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    print(f'{y:3d} ' + ''.join('.' if bg[y, x] else C[Q[y, x]] for x in range(x0, x1)))
used = sorted(set(Q[y0:y1, x0:x1][~bg[y0:y1, x0:x1]].tolist()))
print(' '.join(f'{C[i]}={R.PALETTE[i]}' for i in used))
