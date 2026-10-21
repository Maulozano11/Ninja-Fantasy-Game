"""Count Aurelia's colours on her face and arms (native pixels): skin.py"""
import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import numpy as np
import heroine_ref as H
N = H.native('aurelia')
q = H.quantize(N, 'aurelia')
P = H.PALETTES['aurelia']
for name, (x0, y0, x1, y1) in {'face': (100, 27, 118, 42), 'mouth': (104, 34, 116, 40)}.items():
    reg = q[y0:y1, x0:x1].ravel()
    vals, cnt = np.unique(reg, return_counts=True)
    order = np.argsort(-cnt)
    print(name, ' '.join(f'{P[vals[i]]}:{cnt[i]}' for i in order[:14]))
