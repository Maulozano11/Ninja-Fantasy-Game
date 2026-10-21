import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import scarlet_ref as R, numpy as np
WD = sys.argv[1]
if os.path.exists(WD + '/native.npy'):
    N = np.load(WD + '/native.npy')
else:
    N = R.native()
    np.save(WD + '/native.npy', N)
Q = R.quantize(N)
bg = R.background(N)
def show(y0, y1, x0, x1):
    print('    ' + ''.join(str(x % 10) for x in range(x0, x1)))
    for y in range(y0, y1):
        print('%3d ' % y + ''.join('.' if bg[y, x] else R.CHARS[Q[y, x]] for x in range(x0, x1)))
args = [int(a) for a in sys.argv[2:6]]
show(*args)
