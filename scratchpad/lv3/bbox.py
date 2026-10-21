import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
x0,y0,x1,y1,tol = map(int, sys.argv[2:7])
reg = im[y0:y1, x0:x1]
bg = np.median(reg.reshape(-1,3), axis=0)
d = np.abs(reg - bg).sum(2)
m = d > tol
# row/col occupancy profile
rows = m.sum(1); cols = m.sum(0)
ys = np.where(rows >= 2)[0]; xs = np.where(cols >= 2)[0]
print('bg', bg, 'bbox x', x0+xs.min(), x0+xs.max(), 'y', y0+ys.min(), y0+ys.max(), 'h', ys.max()-ys.min()+1)
