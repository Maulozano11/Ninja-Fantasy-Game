import sys; sys.path.insert(0,'.')
from load import *
from morph import label
def slit(f,lo=64,hi=200,r=3):
    a=f[:,:,3].astype(int); H,W=a.shape
    S=a>=hi; C=a<lo
    p=np.pad(S,r)
    res=np.zeros_like(C)
    for dy,dx in ((0,1),(1,0),(1,1),(1,-1)):
        side1=np.zeros_like(C); side2=np.zeros_like(C)
        for k in range(1,r+1):
            side1|=p[r+dy*k:r+dy*k+H, r+dx*k:r+dx*k+W]
            side2|=p[r-dy*k:r-dy*k+H, r-dx*k:r-dx*k+W]
        res|=C&side1&side2
    return res
m=man()['sprites']
names=sys.argv[1:] or [n for n in m if n!='beast']
for n in names:
    for an,fr in frames(n).items():
        cnt=[]; big=[]
        for f in fr:
            s=slit(f); cnt.append(int(s.sum()))
            lab,k=label(s); big.append(max([int((lab==q).sum()) for q in range(1,k+1)] or [0]))
        print(f'{n:11s} {an:5s} slit px {cnt}\n{"":17s} largest {big}')
