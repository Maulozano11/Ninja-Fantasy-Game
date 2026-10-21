import sys; sys.path.insert(0, sys.argv[1])
from lib import *
names=sys.argv[2].split(',')
def counts(f):
    a=f[...,3].astype(int); P=np.pad(a,1)
    L=P[1:-1,:-2]; R=P[1:-1,2:]; U=P[:-2,1:-1]; D=P[2:,1:-1]
    sl=((L-a>=50)&(R-a>=50))|((U-a>=50)&(D-a>=50))
    return int(sl.sum()), int((sl&(a<150)).sum()), int((sl&(a<150)&~((L==255)|(R==255)|(U==255)|(D==255))).sum())
for n in names:
    for a_ in M['sprites'][n]['anims']:
        r=[counts(f) for f in frames(n,a_)]
        print(f'{n:12s} {a_:5s} all', ' '.join(str(x[0]) for x in r), '| alpha<150', ' '.join(str(x[1]) for x in r), '| <150 in dust', ' '.join(str(x[2]) for x in r))
