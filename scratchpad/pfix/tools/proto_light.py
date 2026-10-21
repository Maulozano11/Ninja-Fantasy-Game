import numpy as np
from PIL import Image
from collections import deque
REF='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-poison-set-owner.jpg'
im=np.asarray(Image.open(REF).convert('RGB')).astype(float)
def gauss(a,s):
    r=max(1,int(round(s*3))); k=np.exp(-0.5*(np.arange(-r,r+1)/s)**2); k/=k.sum()
    out=a.astype(float)
    for ax in (0,1):
        pad=[(0,0)]*out.ndim; pad[ax]=(r,r); p=np.pad(out,pad,mode='edge'); acc=np.zeros_like(out)
        for i,w in enumerate(k):
            sl=[slice(None)]*out.ndim; sl[ax]=slice(i,i+out.shape[ax]); acc+=w*p[tuple(sl)]
        out=acc
    return out
S=gauss(im,0.55)
BG=np.array([31,33,46.])
d=S-BG
dG=d[...,1]; dR=d[...,0]; dB=d[...,2]
x0,y0,x1,y1=339,179,582,345
sub=lambda a:a[y0:y1,x0:x1]
near=np.sqrt((d**2).sum(-1))<14
lightlike=(dG>6)&(dR>=0.2*dG)&(dR<=0.85*dG)&(dB>=0.06*dG)&(dB<=0.55*dG)&(S[...,1]<185)
ok=near|lightlike
img=np.zeros(im.shape)
img[ok&lightlike]=(0,200,0); img[ok&near]=(60,60,120); img[~ok]=(200,0,0)
Image.fromarray(sub(img).astype(np.uint8)).resize(((x1-x0)*3,(y1-y0)*3),Image.NEAREST).save('look/proto-lightlike.png')
from PIL import ImageDraw
CH=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/vfx-poison-v3-character.png').convert('RGBA')).astype(float)
H0,W0=im.shape[:2]
def char_mask(fx,fy,kx,ky,grow):
    m=np.zeros((H0,W0),bool)
    ys,xs=np.nonzero(CH[...,3]>0)
    for v,u in zip(ys,xs):
        xa,xb=fx+(u-64)*kx,fx+(u+1-64)*kx; ya,yb=fy+(v-120)*ky,fy+(v+1-120)*ky
        m[int(np.floor(ya)):int(np.ceil(yb)),int(np.floor(xa)):int(np.ceil(xb))]=True
    for _ in range(grow):
        o=m.copy(); o[1:]|=m[:-1]; o[:-1]|=m[1:]; o[:,1:]|=m[:,:-1]; o[:,:-1]|=m[:,1:]
        o[1:,1:]|=m[:-1,:-1]; o[:-1,:-1]|=m[1:,1:]; o[1:,:-1]|=m[:-1,1:]; o[:-1,1:]|=m[1:,:-1]; m=o
    return m
def poly(p):
    mm=Image.new('L',(W0,H0),0); ImageDraw.Draw(mm).polygon(p,fill=255); return np.asarray(mm)>0
CM=char_mask(561.0,292.4,1.0,1.02,2)
R=poly([(466,180),(581,180),(581,344),(470,344),(470,300),(488,288),(492,266),(466,264)])
pas=(ok|CM)&R
seen=np.zeros((H0,W0),bool); q=deque()
for s in [(230,540),(250,578),(300,540)]:
    seen[s]=True; q.append(s)
while q:
    y,x=q.popleft()
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        yy,xx=y+dy,x+dx
        if pas[yy,xx] and not seen[yy,xx]: seen[yy,xx]=True; q.append((yy,xx))
img2=np.asarray(Image.open(REF).convert('RGB')).astype(float).copy()
img2[seen]=img2[seen]*0.4+np.array([255,0,255])*0.6
img2[CM]=img2[CM]*0.5+np.array([0,0,255])*0.5
Image.fromarray(sub(img2).astype(np.uint8)).resize(((x1-x0)*3,(y1-y0)*3),Image.NEAREST).save('look/proto-flood.png')
np.save('look/flood.npy',seen)
known=seen&~CM&lightlike&(dG>8)
c=S[known]; g=dG[known]
# fit F-BG direction by least squares: d = a*v with a = g/vG
for lo,hi in ((8,30),(30,60),(60,90),(90,120),(120,200)):
    k=(g>=lo)&(g<hi); 
    if k.sum(): dd=(c[k]-BG); print(lo,hi,k.sum(),'dR/dG %.3f dB/dG %.3f'%((dd[:,0]/dd[:,1]).mean(),(dd[:,2]/dd[:,1]).mean()))
dd=c-BG
rr_=(dd[:,0]*dd[:,1]).sum()/(dd[:,1]**2).sum(); bb=(dd[:,2]*dd[:,1]).sum()/(dd[:,1]**2).sum()
pred=BG+np.stack([rr_*dd[:,1],dd[:,1],bb*dd[:,1]],-1)
print('ratios',rr_,bb,'resid',np.abs(pred-c).mean(0))
print('max gex in known', g.max(), np.percentile(g,99))
