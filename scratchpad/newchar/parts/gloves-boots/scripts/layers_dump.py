import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import scarlet_ref as R, numpy as np
lay = R.reduced_layers()
red = R.reduced_index()
name = sys.argv[1]
x0, y0, x1, y1 = [int(a) for a in sys.argv[2:6]]
src = red if name == 'all' else lay[name]
print('    ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    print('%3d ' % y + ''.join('.' if src[y, x] == 255 else R.CHARS[src[y, x]] for x in range(x0, x1)))
