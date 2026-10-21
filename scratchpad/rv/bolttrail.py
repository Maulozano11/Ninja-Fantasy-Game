import sys
import numpy as np
from PIL import Image
A = sys.argv[1]
sys.argv = [sys.argv[0], A]
exec(open(A + '/../rv/colstat.py').read().split("for name in ['wall'")[0])
his, k, kb = his_aligned('bolt')
a = k[..., 3]
lum = lambda c: (0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2])
# trail core rows 28..48, columns 0..60 in steps of 4
print('col  his_lum ours_lum(on his bg) ours_alpha_mean (rows 30-46)')
for x in range(0, 64, 4):
    hs = lum(his[30:47, x:x + 4]).mean(); os_ = lum(kb[30:47, x:x + 4]).mean(); am = a[30:47, x:x + 4].mean()
    print('%3d  %6.1f  %6.1f  %6.1f' % (x, hs, os_, am))
