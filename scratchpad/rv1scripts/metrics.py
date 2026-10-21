import sys, colorsys
from PIL import Image, ImageFilter
import numpy as np
REF=sys.argv[1]; ICONS=sys.argv[2]
ref=Image.open(REF).convert('RGB')
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
xs=[33,285,537,789]
def lab(a):
    a=a/255.0
    l=np.where(a<=0.04045,a/12.92,((a+0.055)/1.055)**2.4)
    R,G,B=l[...,0],l[...,1],l[...,2]
    L=np.cbrt(0.4122214708*R+0.5363325363*G+0.0514459929*B)
    M=np.cbrt(0.2119034982*R+0.6806995451*G+0.1073969566*B)
    S=np.cbrt(0.0883024619*R+0.2817188376*G+0.6299787005*B)
    return np.stack([0.2104542553*L+0.793617785*M-0.0040720468*S,1.9779984951*L-2.428592205*M+0.4505937099*S,0.0259040371*L+0.7827717662*M-0.808675766*S],-1)

def blur(a,k):
    r=k//2
    if r<1: return a
    p=np.pad(a,((r,r),(r,r),(0,0)),mode='edge')
    c=np.cumsum(np.cumsum(p,0),1); c=np.pad(c,((1,0),(1,0),(0,0)))
    n=2*r+1; H,W=a.shape[:2]
    return (c[n:n+H,n:n+W]-c[0:H,n:n+W]-c[n:n+H,0:W]+c[0:H,0:W])/(n*n)
def comps(mask):
    H,W=mask.shape; seen=np.zeros_like(mask,bool); sizes=[]
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not seen[y,x]:
                st=[(y,x)]; seen[y,x]=True; n=0
                while st:
                    cy,cx=st.pop(); n+=1
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not seen[ny,nx]:
                                seen[ny,nx]=True; st.append((ny,nx))
                sizes.append(n)
    return sizes
for i,iid in enumerate(ids):
    crop=ref.crop((xs[i]+1,277,xs[i]+200,481))
    for N,fn in ((88,f'{iid}@2x.png'),(44,f'{iid}.png')):
        his=np.asarray(crop.resize((N,N),Image.BOX)).astype(float)
        o=np.asarray(Image.open(f'{ICONS}/{fn}').convert('RGB')).astype(float)
        # low-frequency compare: blur both by box of N/11
        k=max(1,N//11)
        hb=blur(his,k); ob=blur(o,k)
        Lh,Lo=lab(hb),lab(ob)
        d=np.sqrt(((Lh-Lo)**2).sum(-1))
        # hue of mid-tone saturated px
        lh,lo=lab(his),lab(o)
        def stats(L):
            C=np.hypot(L[...,1],L[...,2]); h=np.degrees(np.arctan2(L[...,2],L[...,1]))%360
            m=C>0.06
            return L[...,0].mean(), C.mean(), np.median(h[m]) if m.any() else -1
        sh,so=stats(lh),stats(lo)
        # connected components per colour (fragmentation) and lone px
        q=o.astype(int); key=q[...,0]*65536+q[...,1]*256+q[...,2]
        ncomp=0; small=0
        for v in np.unique(key):
            sizes=np.array(comps(key==v))
            ncomp+=len(sizes); small+=int((sizes<=2).sum())
        print(f'{iid:26s} {N:3d}: lowfreq dE mean {d.mean():.3f} p90 {np.percentile(d,90):.3f} | his L {sh[0]:.3f} C {sh[1]:.3f} hue {sh[2]:.0f} | ours L {so[0]:.3f} C {so[1]:.3f} hue {so[2]:.0f} | colours {len(np.unique(key))} comps {ncomp} tiny(<=2px) {small} ({small/(N*N)*100:.1f}% of px count)')
