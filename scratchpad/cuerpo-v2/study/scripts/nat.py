"""Cache the four native arrays + figure masks as npy in work/ (run from the extracted tree root)."""
import os, sys
sys.path.insert(0, 'tools/refs')
import numpy as np
import heroine_ref as R
out = sys.argv[1]
for w in R.WHICH:
    N = R.native(w)
    F = R.figure(w)
    np.save(os.path.join(out, f'{w}-native.npy'), N)
    np.save(os.path.join(out, f'{w}-fig.npy'), F)
    print(w, N.shape, F.sum())
