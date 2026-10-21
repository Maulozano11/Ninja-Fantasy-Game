import sys
from PIL import Image
import numpy as np
from collections import deque
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
sc=96/228
BG=np.array([34,34,44])
def hiscrop(ox,oy):
    w=275/sc; h=180/sc
    return np.asarray(ref.crop((ox,oy,ox+w,oy+h)).resize((275,180),Image.BOX)).astype(float)
def flood_outside(mask):
    H,W=mask.shape; out=np.zeros_like(mask)
    q=deque()
    for x in range(W):
        for y in (0,H-1):
            if not mask[y,x] and not out[y,x]: out[y,x]=1; q.append((y,x))
    for y in range(H):
        for x in (0,W-1):
            if not mask[y,x] and not out[y,x]: out[y,x]=1; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy,xx=y+dy,x+dx
            if 0<=yy<H and 0<=xx<W and not mask[yy,xx] and not out[yy,xx]:
                out[yy,xx]=1; q.append((yy,xx))
    return out
for k,(ox,oy) in {0:(438,1560),5:(1104,1540)}.items():
    f=np.asarray(Image.open(R+'/ours-f%d.png'%k).convert('RGBA'))
    a=f[:,:,3]
    h=hiscrop(ox,oy)
    hism=np.abs(h-BG).sum(2)>30
    # his solid region (filled)
    hisfill=~flood_outside(hism)
    ourm=a>0
    ourfill=~flood_outside(ourm)
    holes=ourfill&~ourm
    print(k,'enclosed transparent holes in ours:',holes.sum())
    # transparent pixels in ours where his is clearly drake (not bg)
    miss=(~ourm)&hism
    extra=ourm&(~hism)
    print('  ours transparent where his drawn:',miss.sum(),' ours drawn where his bg:',extra.sum())
    vis=np.zeros((180,275,3),np.uint8)+40
    vis[hism&ourm]=(120,120,120)
    vis[miss]=(255,0,0)
    vis[extra]=(0,200,255)
    vis[holes]=(255,255,0)
    Image.fromarray(vis).resize((275*3,180*3),Image.NEAREST).save(R+'/mask-k%d.png'%k)
