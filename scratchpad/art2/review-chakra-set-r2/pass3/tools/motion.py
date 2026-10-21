import sys
from common import *
def pm(f):
    a=np.asarray(f).astype(float); return a[...,:3]*a[...,3:4]/255, a[...,3]
def motion(n,an):
    fr=frames(n,an); out=[]
    N=len(fr); loop=MAN['sprites'][n]['anims'][an]['loop']
    for i in range(N if loop else N-1):
        A,aa=pm(fr[i]); B,bb=pm(fr[(i+1)%N])
        d=np.abs(A-B).sum(2)
        out.append((i,(i+1)%N,round(float(d.mean()),2),int((d>60).sum()),round(float(np.abs(aa-bb).mean()),2)))
    return out
if __name__=='__main__':
    for n,an in [a.split(':') for a in sys.argv[1:]]:
        m=motion(n,an); mean=np.mean([x[2] for x in m])
        print(n,an,' '.join('%d>%d:%.1f/%d/%.1f'%x for x in m),'| max/mean %.2f min/mean %.2f'%(max(x[2] for x in m)/mean,min(x[2] for x in m)/mean))
