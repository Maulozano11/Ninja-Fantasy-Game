import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fr=frames('blast')
x0,y0,x1,y1=[int(v) for v in sys.argv[2].split(',')]
out=[]
for i in range(7,16):
    a=fr[i][...,3].astype(int); P=np.pad(a,1)
    L=P[1:-1,:-2]; R=P[1:-1,2:]; U=P[:-2,1:-1]; D=P[2:,1:-1]
    m=np.minimum(np.minimum(L,R),np.minimum(U,D))
    dip=(m-a>=20)&(a>0)
    dip3=((L-a>=20).astype(int)+(R-a>=20)+(U-a>=20)+(D-a>=20)>=3)&(a>0)
    sub=lambda z: int(z[y0:y1,x0:x1].sum())
    out.append(f'{i}:{sub(dip)}/{sub(dip3)}/{int(dip.sum())}')
print(' '.join(out))
