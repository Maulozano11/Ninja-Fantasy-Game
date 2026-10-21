"""chroma.py <in.png> <out-prefix>: writes L and C maps (x6) and prints a histogram of C for dark pixels."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from lab import oklab
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
lab = oklab(a)
L = lab[..., 0]
C = np.hypot(lab[..., 1], lab[..., 2])
H = (np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) + 360) % 360
out = sys.argv[2]
Image.fromarray(np.clip(L * 255, 0, 255).astype(np.uint8)).resize((a.shape[1] * 6, a.shape[0] * 6), Image.NEAREST).save(out + '-L.png')
Image.fromarray(np.clip(C / 0.2 * 255, 0, 255).astype(np.uint8)).resize((a.shape[1] * 6, a.shape[0] * 6), Image.NEAREST).save(out + '-C.png')
np.save(out + '-lab.npy', lab)
for lo, hi in [(0, 0.2), (0.2, 0.3), (0.3, 0.4), (0.4, 0.5), (0.5, 0.6), (0.6, 0.7), (0.7, 0.8), (0.8, 1.01)]:
    s = (L >= lo) & (L < hi)
    if s.sum():
        print('L %.1f-%.1f n %5d  C pct10/50/90 %s' % (lo, hi, s.sum(), np.round(np.percentile(C[s], [10, 50, 90]), 3)))
