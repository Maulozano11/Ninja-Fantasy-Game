import numpy as np
from PIL import Image
im = np.asarray(Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(int)
bg = np.array([32,32,42])
def meas(name, x0,y0,x1,y1):
    c = im[y0:y1, x0:x1]
    d = np.abs(c-bg).sum(-1) > 40
    rows = np.nonzero(d.sum(1) >= 2)[0]; cols = np.nonzero(d.sum(0) >= 2)[0]
    print(name, 'y', y0+rows.min(), y0+rows.max(), 'h', rows.max()-rows.min()+1, 'x', x0+cols.min(), x0+cols.max())
    # print profile of row counts
    prof = d.sum(1)
    print('  rows:', ' '.join(str(v) for v in prof))
meas('blastchar', 762, 270, 842, 430)
meas('wallchar', 372, 505, 450, 652)
meas('diagchar', 935, 580, 1015, 735)
meas('depthchar', 150, 860, 232, 1005)
