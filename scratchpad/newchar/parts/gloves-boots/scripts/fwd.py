import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import scarlet_ref as R, numpy as np
seg = sys.argv[1]
pts = [tuple(float(v) for v in p.split(',')) for p in sys.argv[2:]]
out = R.forward(R.SEGMENTS[seg], np.array(pts))
for p, q in zip(pts, out):
    print(p, '->', np.round(q, 2))
