import json, numpy as np
from PIL import Image
d=json.load(open('dev/light-blast.json')); w,h=d['w'],d['h']; A=np.array(d['a'],np.float64).reshape(h,w)/255
P={p:np.asarray(Image.open('dev/piece-blast-%s.png'%p).convert('RGBA')).astype(np.float64) for p in ['glow','mist','main','pool','drops']}
# art4 alpha (over composite of the pieces)
al=np.zeros((h,w))
for p in ['glow','mist','main','pool','drops']:
    a=P[p][...,3]/255; al=a+al*(1-a)
opaque=al>=0.999
semi=(al>0)&~opaque
D=opaque|(semi&(A==0))
print('D px',D.sum(),'opaque',opaque.sum(),'semi&A0',(semi&(A==0)).sum(), 'semi&A>0',(semi&(A>0)).sum())
# CG Laplace on D, Dirichlet A elsewhere
def shift(m,dy,dx):
    o=np.zeros_like(m); H,W=m.shape
    ys=slice(max(dy,0),H+min(dy,0)); yd=slice(max(-dy,0),H+min(-dy,0))
    xs=slice(max(dx,0),W+min(dx,0)); xd=slice(max(-dx,0),W+min(-dx,0))
    o[ys,xs]=m[yd,xd]; return o
Df=D.astype(float)
inb=np.ones((h,w))
N4=[(0,1),(0,-1),(1,0),(-1,0)]
diag=sum(shift(inb,dy,dx) for dy,dx in N4)
kv=np.where(D,0,A)
b=sum(shift(kv,dy,dx) for dy,dx in N4)*Df
def op(x): return (diag*x-sum(shift(x,dy,dx) for dy,dx in N4))*Df
x=np.zeros((h,w)); r=b-op(x); p=r.copy(); rs=(r*r).sum(); bb=(b*b).sum()
for it in range(5000):
    if rs<=1e-12*bb: break
    Ap=op(p); al_=rs/(p*Ap).sum(); x+=al_*p; r-=al_*Ap; rn=(r*r).sum(); p=r+rn/rs*p; rs=rn
print('iters',it)
F=np.where(D,x,A)
np.save('dev/F.npy',F)
# semi-transparent art over D: F there
s=semi&(A==0)
print('semi&A0 F stats: max %.3f, >24/255: %d px'%(F[s].max()*255,(F[s]>24/255).sum()))
im=np.zeros((h,w,3)); im[...,1]=F*255*1.5; im[opaque]=im[opaque]*0.5+np.array([60,0,60])
Image.fromarray(np.clip(im,0,255).astype(np.uint8)).resize((w*3,h*3),Image.NEAREST).save('dev/F.png')
im2=np.zeros((h,w,3)); im2[...,1]=np.clip(F*255*1.5,0,255); 
Image.fromarray(im2.astype(np.uint8)).resize((w*3,h*3),Image.NEAREST).save('dev/F-only.png')
