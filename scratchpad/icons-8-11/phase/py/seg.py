"""seg.py <in.png> <out-prefix>: candidate ninja masks by colour, shown over the window (x6)."""
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
solid = (L < 0.5) & (C < 0.1)
smear = ~solid & (L < 0.72) & (C < 0.085)
skin = (H > 20) & (H < 90) & (C > 0.03)
o = a.copy()
o[solid] = o[solid] * 0.4 + np.array([255, 0, 200]) * 0.6
o[smear] = o[smear] * 0.4 + np.array([255, 220, 0]) * 0.6
o[skin] = o[skin] * 0.4 + np.array([0, 255, 0]) * 0.6
Image.fromarray(o.astype(np.uint8)).resize((a.shape[1] * 6, a.shape[0] * 6), Image.NEAREST).save(sys.argv[2] + '-seg.png')
print('solid', solid.sum(), 'smear', smear.sum(), 'skin', skin.sum())
