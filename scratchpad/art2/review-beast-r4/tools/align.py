import sys, numpy as np, json
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-beast-r4'
ref=Image.open(S+'/art2/REF-earth-set-owner.jpg').convert('RGB')
s=96/228
W,H=284,167
def his_game(px,py,x0,x1):
    # crop his half picture with phase px,py; region x0..x1, y 1544..1975
    c=ref.crop((x0+px,1544+py,x1+px,1975+py))
    w=round(c.width*s); h=round(c.height*s)
    return np.asarray(c.resize((w,h),Image.BOX)).astype(int)
res={}
for key,(x0,x1) in {0:(502,1118),5:(1118,1758)}.items():
    f=np.asarray(Image.open(R+'/f%d.png'%key)).astype(int)
    om=f[...,3]>128
    best=None
    for px in range(0,3):
      for py in range(0,3):
        g=his_game(px,py,x0,x1)
        hm=np.abs(g-np.array([34,34,44])).sum(2)>30
        gh,gw=hm.shape
        # place his crop at offset (ox,oy) in our frame coords: his pixel (u,v) -> frame (u+ox, v+oy)
        for ox in range(-60,60):
          for oy in range(-40,40):
            # overlap region
            fx0=max(0,ox); fy0=max(0,oy); fx1=min(W,ox+gw); fy1=min(H,oy+gh)
            if fx1<=fx0 or fy1<=fy0: continue
            a=om[fy0:fy1,fx0:fx1]; b=hm[fy0-oy:fy1-oy,fx0-ox:fx1-ox]
            # count mismatch: include our pixels outside overlap
            mis=(a!=b).sum()+om.sum()-a.sum()
            if best is None or mis<best[0]: best=(mis,px,py,ox,oy)
    print(key,best, 'our opaque',om.sum())
    res[key]=best
json.dump({str(k):v for k,v in res.items()},open(R+'/align.json','w'))
