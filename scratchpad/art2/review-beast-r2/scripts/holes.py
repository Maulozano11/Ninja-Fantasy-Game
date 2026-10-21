from PIL import Image
import numpy as np
from collections import deque
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
O=S+'/art2/review-beast-r2/'
im=np.asarray(Image.open(S+'/art2/staging/vfx_beasts/earth.png').convert('RGBA')).astype(int)
def label(mask):
    H,W=mask.shape; lab=np.zeros((H,W),int); n=0; comps=[]
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n; pts=[]
                while q:
                    cy,cx=q.popleft(); pts.append((cy,cx))
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not lab[ny,nx]:
                            lab[ny,nx]=n; q.append((ny,nx))
                comps.append(pts)
    return lab,comps
Z=3
rows=[]
for i in range(8):
    f=im[:,i*280:(i+1)*280]
    a=f[:,:,3]>0
    lab,comps=label(~a)
    H,W=a.shape
    enc=[]
    for k,pts in enumerate(comps):
        ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
        if min(ys)==0 or min(xs)==0 or max(ys)==H-1 or max(xs)==W-1: continue
        enc.append((len(pts),int(np.mean(xs)),int(np.mean(ys)),pts))
    enc.sort(key=lambda t:-t[0])
    print(i,'enclosed',len(enc),'px',sum(e[0] for e in enc),[(e[0],e[1],e[2]) for e in enc[:10]])
    vis=np.zeros((H,W,3),np.uint8); vis[:]=(255,0,255)
    al=f[:,:,3:4]/255.
    vis=(f[:,:,:3]*al+vis*(1-al)).astype(np.uint8)
    for e in enc:
        for (y,x) in e[3]: vis[y,x]=(0,255,0)
    rows.append(Image.fromarray(vis).resize((W*Z,H*Z),Image.NEAREST))
out=Image.new('RGB',(280*Z*2+6,163*Z*4+18),(255,255,255))
for i,r in enumerate(rows): out.paste(r,((i%2)*(280*Z+6),(i//2)*(163*Z+6)))
out.save(O+'n-holes-magenta.png')
