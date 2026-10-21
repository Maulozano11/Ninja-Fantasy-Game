# clearslit.py libdir names: per frame, clear-ish pixels (alpha<60) lying between two solid pixels
# (alpha>=200) within 2 px on each side along a row, column or diagonal: total, and those not so in frame 0
import sys; sys.path.insert(0, sys.argv[1])
from lib import *
def slit(a):
    H,W=a.shape; P=np.pad(a,2); s=np.zeros((H,W),bool)
    for dx,dy in ((1,0),(0,1),(1,1),(1,-1)):
        sh=lambda k: P[2+k*dy:2+k*dy+H, 2+k*dx:2+k*dx+W]
        A=np.maximum(sh(1),sh(2)); B=np.maximum(sh(-1),sh(-2))
        s|=(A>=200)&(B>=200)
    return s&(a<60)
for n in sys.argv[2].split(','):
    for an in M['sprites'][n]['anims']:
        fr=frames(n,an); s0=slit(fr[0][...,3].astype(int))
        out=[]
        for f in fr:
            s=slit(f[...,3].astype(int)); out.append(f'{int(s.sum())}/{int((s&~s0).sum())}')
        print(f'{n:12s} {an:5s}', ' '.join(out))
