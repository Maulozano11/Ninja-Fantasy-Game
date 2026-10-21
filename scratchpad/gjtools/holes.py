import json, sys, numpy as np
from PIL import Image
from collections import deque
G='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_genjutsu_v3'
man=json.load(open(G+'/manifest.json'))['sprites']
KEY={'hit':('hit',3),'blast':('blast',4)}
def label(empty):
    h,w=empty.shape; lab=np.zeros((h,w),int); n=0
    for y in range(h):
        for x in range(w):
            if empty[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n
                while q:
                    a,b=q.popleft()
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        u,v=a+dy,b+dx
                        if 0<=u<h and 0<=v<w and empty[u,v] and not lab[u,v]: lab[u,v]=n; q.append((u,v))
    return lab,n
for n,s in man.items():
    if n=='beast': continue
    an,i=KEY.get(n,('idle' if 'idle' in s['anims'] else list(s['anims'])[0],0))
    a=s['anims'][an]; sh=np.asarray(Image.open(G+'/'+s['file']).convert('RGBA'))
    f=sh[a['row']*s['frameH']:(a['row']+1)*s['frameH'], i*s['frameW']:(i+1)*s['frameW']]
    lab,nl=label(f[...,3]==0)
    border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]).tolist())
    cnt=np.bincount(lab.ravel(),minlength=nl+1)
    sizes=sorted([int(cnt[k]) for k in range(1,nl+1) if k not in border],reverse=True)
    print(f"{n:11s} enclosed holes {len(sizes):4d} px {sum(sizes):5d} biggest {sizes[:8]}")
