import sys; sys.path.insert(0, sys.argv[1])
from lib import *
for name in M['sprites']:
    if name=='beast': continue
    for an,lst in frames(name).items():
        loop=M['sprites'][name]['anims'][an]['loop']
        n=len(lst); A=[f[...,3].astype(int) for f in lst]
        Y=[(0.3*f[...,0]+0.59*f[...,1]+0.11*f[...,2])*f[...,3]/255 for f in lst]
        rng=range(n) if loop else range(1,n-1)
        fl=[];yfl=[];chg=[]
        for i in rng:
            a,b,c=A[(i-1)%n],A[i],A[(i+1)%n]
            up_=(b-a>100)&(b-c>100); dn=(a-b>100)&(c-b>100)
            fl.append(int(up_.sum()+dn.sum()))
            ya,yb,yc=Y[(i-1)%n],Y[i],Y[(i+1)%n]
            yfl.append(int((((yb-ya>60)&(yb-yc>60))|((ya-yb>60)&(yc-yb>60))).sum()))
        for i in range(n if loop else n-1):
            d=np.abs(A[(i+1)%n]-A[i]); chg.append(int((d>128).sum()))
        tot=[int((x>0).sum()) for x in A]
        print('%-11s %-5s alpha-flicker/frame %s'%(name,an,fl))
        print('%-11s %-5s luma-flicker/frame  %s'%('',an,yfl))
        print('%-11s %-5s px alpha change>128 per step %s  (drawn px %d..%d)'%('',an,chg,min(tot),max(tot)))
