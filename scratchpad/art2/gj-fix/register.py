import sys, numpy as np
from PIL import Image
S=sys.argv[1]
ref=np.asarray(Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(float)
ch=Image.open(S+'/vfx-genjutsu-v3-character.png').convert('RGBA')
def lum(c): return 0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2]
def grad(L):
    gx=np.zeros_like(L); gy=np.zeros_like(L)
    gx[:,1:-1]=L[:,2:]-L[:,:-2]; gy[1:-1]=L[2:]-L[:-2]
    return gx,gy
def reg(fx,fy,s,rng=12,step=0.5, mode='lum'):
    # place char scaled by s; char (64,120) at his (fx,fy)
    best=[]
    for dy in np.arange(-rng,rng+0.01,step):
        for dx in np.arange(-rng,rng+0.01,step):
            # his region: char box (0..128) maps to his fx-64*s.. etc
            x0=fx+dx-64*s; y0=fy+dy-120*s
            W=int(round(128*s)); 
            # resample his image into char grid at his scale (W x W) starting at x0,y0 (subpixel)
            im=Image.fromarray(ref.astype(np.uint8))
            his=np.asarray(im.resize((W,W),Image.BILINEAR,box=(x0,y0,x0+W,y0+W))).astype(float)
            c=np.asarray(ch.resize((W,W),Image.BOX)).astype(float)
            a=c[...,3]>200
            if mode=='lum':
                A=lum(c[...,:3])[a]; B=lum(his)[a]
            else:
                gx1,gy1=grad(lum(c[...,:3])); gx2,gy2=grad(lum(his))
                m=a
                A=np.concatenate([gx1[m],gy1[m]]); B=np.concatenate([gx2[m],gy2[m]])
            A=A-A.mean(); B=B-B.mean()
            r=(A*B).sum()/np.sqrt((A*A).sum()*(B*B).sum())
            best.append((r,dx,dy))
    best.sort(reverse=True)
    return best[:3]
for name,(fx,fy,s) in {'blastchar':(800,401,1.30),'aura':(528.5,646,1.31)}.items():
    for mode in ('lum','grad'):
        for s2 in (s-0.02,s,s+0.02):
            print(name,mode,s2,[(round(r,3),dx,dy) for r,dx,dy in reg(fx,fy,s2,rng=14 if name=='aura' else 20,step=1.0,mode=mode)])
