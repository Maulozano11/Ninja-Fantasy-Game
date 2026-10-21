import json
from PIL import Image
import numpy as np
from collections import deque
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2'; G=A+'/staging/vfx_poison_v3'
man=json.load(open(G+'/manifest.json'))['sprites']
def frames(name):
    m=man[name]; im=np.array(Image.open(G+'/'+m['file']).convert('RGBA'))
    fw,fh=m['frameW'],m['frameH']
    out=[]
    for an,a in m['anims'].items():
        for i in range(a['frames']):
            out.append((an,i,im[a['row']*fh:(a['row']+1)*fh, i*fw:(i+1)*fw]))
    return out
def holes(f,thr=200):
    a=f[:,:,3]; h,w=a.shape
    solid=a>=thr
    seen=np.zeros_like(solid)
    q=deque()
    for x in range(w):
        for y in (0,h-1):
            if not solid[y,x] and not seen[y,x]: seen[y,x]=1; q.append((y,x))
    for y in range(h):
        for x in (0,w-1):
            if not solid[y,x] and not seen[y,x]: seen[y,x]=1; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and not solid[ny,nx] and not seen[ny,nx]:
                seen[ny,nx]=1; q.append((ny,nx))
    hole=(~solid)&(~seen)
    return hole
import sys
if __name__=="__main__":
  for name in sys.argv[1:]:
   for an,i,f in frames(name):
        hl=holes(f)
        n=int(hl.sum())
        if n:
            ys,xs=np.nonzero(hl)
            # alpha values in holes
            av=f[:,:,3][hl]
            print(name,an,i,'holes px',n,'transparent(a<64)',int((av<64).sum()),'bbox',xs.min(),ys.min(),xs.max(),ys.max())
