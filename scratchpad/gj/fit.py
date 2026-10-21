import numpy as np
from PIL import Image
ref = Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')
R = np.asarray(ref).astype(float)
ch = Image.open('char.png').convert('RGBA').crop((27,27,83,123))  # 56x96
bg = np.array([32,32,42.])
def fit(name, box):
    x0,y0,x1,y1 = box
    best=None
    for s in np.arange(1.15, 1.45, 0.01):
        w,h = round(56*s), round(96*s)
        c = np.asarray(ch.resize((w,h), Image.BILINEAR)).astype(float)
        a = c[...,3:]/255
        comp = c[...,:3]*a + bg*(1-a)
        for oy in range(y0, y1-h+1):
            for ox in range(x0, x1-w+1):
                d = np.abs(R[oy:oy+h, ox:ox+w] - comp).mean()
                if best is None or d < best[0]: best=(d,s,ox,oy,w,h)
    print(name, 'err %.1f s %.2f at %d,%d size %dx%d  -> game/his = %.3f'%(best[0],best[1],best[2],best[3],best[4],best[5], 1/best[1]))



fit('blast', (758,278,846,432))
fit('diag', (930,590,1018,740))
