import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/gj-r3/tools')
from common import *
from collections import deque
def label(mask):
    H,W=mask.shape; lab=np.zeros((H,W),np.int32); n=0
    ys,xs=np.nonzero(mask)
    for y0,x0 in zip(ys,xs):
        if lab[y0,x0]: continue
        n+=1; q=deque([(y0,x0)]); lab[y0,x0]=n
        while q:
            y,x=q.popleft()
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                yy,xx=y+dy,x+dx
                if 0<=yy<H and 0<=xx<W and mask[yy,xx] and not lab[yy,xx]:
                    lab[yy,xx]=n; q.append((yy,xx))
    return lab,n
def holes(f, thr=200, maxsize=12):
    a=np.asarray(f)[...,3].astype(int)
    solid=a>=thr; clear=a<40
    lab,n=label(clear)
    H,W=a.shape
    border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]).tolist())
    sizes=np.bincount(lab.ravel(),minlength=n+1)
    out=[]
    for i in range(1,n+1):
        if i in border or sizes[i]>maxsize: continue
        ys,xs=np.nonzero(lab==i)
        ring=[]
        for y,x in zip(ys,xs):
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    yy,xx=y+dy,x+dx
                    if 0<=yy<H and 0<=xx<W and lab[yy,xx]!=i: ring.append(solid[yy,xx])
        if ring and np.mean(ring)>=0.75: out.append((int(xs[0]),int(ys[0]),int(sizes[i])))
    return out
if __name__=='__main__':
    for n in sys.argv[1].split(','):
        for an,fl in frames(n).items():
            res=[holes(f) for f in fl]
            print('%-11s %-5s holes/frame: %s'%(n,an,' '.join('%d'%len(r) for r in res)))
