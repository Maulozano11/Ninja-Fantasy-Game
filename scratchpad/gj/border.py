import numpy as np
from PIL import Image
R = np.asarray(Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(float)
L = R.mean(-1)
def edges(name, x0,y0,x1,y1):
    # panel: find transitions from sheet bg (~22) to panel (~35) along middle row/col
    sub = L[y0:y1, x0:x1]
    # column means over rows in the box, row means over cols
    cm = np.median(sub, axis=0); rm = np.median(sub, axis=1)
    cols = [x0+i for i in range(1,len(cm)) if (cm[i-1] < 27) != (cm[i] < 27)]
    rows = [y0+i for i in range(1,len(rm)) if (rm[i-1] < 27) != (rm[i] < 27)]
    print(name, 'col transitions', cols, 'row transitions', rows)
edges('bolt', 0, 50, 120, 145)
edges('stream', 325, 50, 690, 145)
edges('breath', 680, 50, 850, 200)
edges('sphere', 845, 50, 965, 145)
edges('slash', 0, 225, 120, 322)
edges('multi', 140, 225, 260, 322)
edges('hit', 285, 225, 400, 322)
edges('blast', 425, 225, 850, 460)
edges('wall', 0, 485, 460, 660)
edges('aura', 455, 485, 585, 660)
edges('diag', 605, 485, 1022, 790)
edges('depth', 0, 695, 240, 1018)
