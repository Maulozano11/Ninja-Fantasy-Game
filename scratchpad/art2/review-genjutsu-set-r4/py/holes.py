import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from common import *
from collections import deque
def label(mask):
    H,W=mask.shape; lab=np.zeros((H,W),int); k=0
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not lab[y,x]:
                k+=1; q=deque([(y,x)]); lab[y,x]=k
                while q:
                    cy,cx=q.popleft()
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not lab[ny,nx]:
                            lab[ny,nx]=k; q.append((ny,nx))
    return lab,k
thr_clear=int(sys.argv[1]) if len(sys.argv)>1 else 1
MAXSZ=int(sys.argv[2]) if len(sys.argv)>2 else 40
RING=float(sys.argv[3]) if len(sys.argv)>3 else 0.75
res={}
for n,s in man.items():
    if n=='beast': continue
    for an,a in s['anims'].items():
        for i in range(a['frames']):
            al=np.array(frame(n,an,i))[:,:,3].astype(int)
            clear=al<thr_clear
            lab,k=label(clear)
            border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])).tolist())
            counts=np.bincount(lab.ravel(),minlength=k+1)
            out=[]
            for j in range(1,k+1):
                if j in border or counts[j]>MAXSZ: continue
                m=lab==j
                d=m.copy(); d[1:]|=m[:-1]; d[:-1]|=m[1:]; d[:,1:]|=m[:,:-1]; d[:,:-1]|=m[:,1:]
                ring=d&~m
                solid=(al[ring]>=200).mean()
                if solid>=RING:
                    ys,xs=np.nonzero(m); out.append((int(counts[j]),round(float(solid),2),int(xs.mean()),int(ys.mean())))
            if out: res[(n,an,i)]=out
for k,v in res.items(): print(k,len(v),sorted(v,reverse=True)[:5])
print('frames with holes (clear<%d, <=40px, ring>=75%% alpha>=200):'%thr_clear,len(res))
