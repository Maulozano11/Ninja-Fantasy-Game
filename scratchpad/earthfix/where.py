import json, sys
import numpy as np
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
G=S+'/art2/staging/vfx_earth_v3/'
man=json.load(open(G+'manifest.json'))['sprites']
n,a,i=sys.argv[1],sys.argv[2],int(sys.argv[3])
m=man[n]; d=m['anims'][a]; fw,fh=m['frameW'],m['frameH']
f=np.asarray(Image.open(G+m['file']).convert('RGBA'))[d['row']*fh:(d['row']+1)*fh, i*fw:(i+1)*fw]
al=f[...,3]; clear=al==0; H,W=al.shape
seen=np.zeros_like(clear); st=[(y,x) for y in range(H) for x in (0,W-1) if clear[y,x]]+[(y,x) for x in range(W) for y in (0,H-1) if clear[y,x]]
for y,x in st: seen[y,x]=True
while st:
    y,x=st.pop()
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        u,v=y+dy,x+dx
        if 0<=u<H and 0<=v<W and clear[u,v] and not seen[u,v]: seen[u,v]=True; st.append((u,v))
enc=clear&~seen
ys,xs=np.nonzero(enc)
for y,x in zip(ys,xs):
    nb=[tuple(f[y+dy,x+dx]) for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)) if 0<=y+dy<H and 0<=x+dx<W]
    print(y,x,[ (int(p[3])) for p in nb])
