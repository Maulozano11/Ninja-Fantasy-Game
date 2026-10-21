from PIL import Image
import numpy as np
from collections import deque
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
W,H=221,170
sheet=np.asarray(Image.open(S+'/staging/vfx_beasts_crows/genjutsu.png').convert('RGBA')).astype(int)
def label(m,conn8=True):
    h,w=m.shape; lab=np.zeros((h,w),int); n=0; sizes=[]
    nb=[(-1,0),(1,0),(0,-1),(0,1)]+([(-1,-1),(-1,1),(1,-1),(1,1)] if conn8 else [])
    for y in range(h):
        for x in range(w):
            if m[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n; s=0
                while q:
                    cy,cx=q.popleft(); s+=1
                    for dy,dx in nb:
                        yy,xx=cy+dy,cx+dx
                        if 0<=yy<h and 0<=xx<w and m[yy,xx] and not lab[yy,xx]:
                            lab[yy,xx]=n; q.append((yy,xx))
                sizes.append(s)
    return lab,n,np.array(sizes)
def opening2(m):
    # pixel belongs to some 2x2 fully-opaque block
    b=m[:-1,:-1]&m[1:,:-1]&m[:-1,1:]&m[1:,1:]
    o=np.zeros_like(m)
    o[:-1,:-1]|=b; o[1:,:-1]|=b; o[:-1,1:]|=b; o[1:,1:]|=b
    return o
res={}
for r,nm in ((0,'fly'),(1,'summon')):
  for f in range(6):
    fr=sheet[r*H:(r+1)*H,f*W:(f+1)*W]
    al=fr[...,3]>0
    rgb=fr[...,:3]
    bmg=rgb[...,2]-rgb[...,1]
    mag=((bmg>80)&al).sum(); mag60=((bmg>60)&al).sum()
    eyes=((rgb[...,0]==225)&(rgb[...,1]==90)&al).sum()
    lab,n,sizes=label(al)
    hair=(al&~opening2(al)).sum()
    # holes: transparent components not touching border (4-conn)
    tl,tn,ts=label(~al,conn8=False)
    border=set(np.unique(np.concatenate([tl[0],tl[-1],tl[:,0],tl[:,-1]])))
    holes=sum(ts[i-1] for i in range(1,tn+1) if i not in border)
    print(nm,f,'mag>80',mag,'mag>60',mag60,'eyecore',eyes,'comps',n,'<=6',(sizes<=6).sum(),'<=12',(sizes<=12).sum(),'1px-wide',hair,'holes',holes)
