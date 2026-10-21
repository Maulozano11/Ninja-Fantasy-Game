import sys; sys.path.insert(0, sys.argv[1])
from lib import *
names=sys.argv[2].split(',')
def counts(f):
    a=f[...,3].astype(int); P=np.pad(a,1)
    L=P[1:-1,:-2]; R=P[1:-1,2:]; U=P[:-2,1:-1]; D=P[2:,1:-1]
    sl=((L-a>=50)&(R-a>=50))|((U-a>=50)&(D-a>=50))
    sp=(L-a>=50)&(R-a>=50)&(U-a>=50)&(D-a>=50)
    up_=(a-L>=50)&(a-R>=50)&(a-U>=50)&(a-D>=50)
    return int(sl.sum()), int(sp.sum()), int(up_.sum())
for n in names:
    an=list(M['sprites'][n]['anims'])
    for a_ in an:
        r=[counts(f) for f in frames(n,a_)]
        print(f'{n:12s} {a_:5s} slits', ' '.join(str(x[0]) for x in r), '| dips', ' '.join(str(x[1]) for x in r), '| peaks', ' '.join(str(x[2]) for x in r))
