import sys, json
from PIL import Image
import numpy as np
from collections import deque
S=sys.argv[1]
man=json.load(open(S+'/staging/vfx_genjutsu_v3/manifest.json'))['sprites']
key={'bolt':('fly',0),'stream':('fly',0),'stream_head':('fly',0),'breath':('fly',0),'sphere':('fly',0),'slash':('fly',0),'multi':('fly',0),'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'aura':('idle',0),'aura_back':('idle',0),'wall_diag':('idle',0),'wall_depth':('idle',0)}
def comps(mask):
    H,W=mask.shape; seen=np.zeros_like(mask); out=[]
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not seen[y,x]:
                q=deque([(y,x)]); seen[y,x]=True; pts=[]
                while q:
                    cy,cx=q.popleft(); pts.append((cy,cx))
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not seen[ny,nx]:
                            seen[ny,nx]=True; q.append((ny,nx))
                out.append(pts)
    return out
for name,(anim,fi) in key.items():
    m=man[name]; im=np.asarray(Image.open(S+'/staging/vfx_genjutsu_v3/'+m['file']).convert('RGBA')).astype(int)
    fw,fh=m['frameW'],m['frameH']; row=m['anims'][anim]['row']
    f=im[row*fh:(row+1)*fh, fi*fw:(fi+1)*fw]; a=f[:,:,3]
    low=a<100
    holes=[]
    for pts in comps(low):
        if len(pts)>120: continue
        ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
        if min(ys)==0 or min(xs)==0 or max(ys)==fh-1 or max(xs)==fw-1: continue
        # rim: 4-neighbours not in comp
        S_=set(pts); rim=[]
        for (y,x) in pts:
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                if (y+dy,x+dx) not in S_: rim.append((y+dy,x+dx))
        ra=np.array([a[p] for p in rim])
        if (ra>=200).mean()>=0.7:
            holes.append((len(pts),min(xs),min(ys),int(a[ys[0],xs[0]])))
    tot=sum(h[0] for h in holes)
    print(f'{name:11s} enclosed low-alpha holes: {len(holes):3d} ({tot} px)', sorted(holes,key=lambda h:-h[0])[:6])
