import sys, numpy as np
from PIL import Image
def oklab(rgb):
    c = rgb/255.0
    l = np.where(c <= 0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
    R,G,B = l[...,0], l[...,1], l[...,2]
    L_ = np.cbrt(0.4122214708*R+0.5363325363*G+0.0514459929*B)
    M_ = np.cbrt(0.2119034982*R+0.6806995451*G+0.1073969566*B)
    S_ = np.cbrt(0.0883024619*R+0.2817188376*G+0.6299787005*B)
    return np.stack([0.2104542553*L_+0.793617785*M_-0.0040720468*S_, 1.9779984951*L_-2.428592205*M_+0.4505937099*S_, 0.0259040371*L_+0.7827717662*M_-0.808675766*S_], -1)
def hexs(h): return np.array([int(h[i:i+2],16) for i in (1,3,5)], float)
PAL = '#181639 #1a2351 #1a3269 #1d3f82 #1d4f91 #225da1 #296fad #2f7fbc #328fc8 #3ea0cf #48b2da #56c3e2 #5ed5ea #77e6f2 #96f3f8 #d3fbfb'.split()
P = np.array([hexs(h) for h in PAL]); PL = oklab(P)
def quant(img):
    lab = oklab(img.astype(float))
    d = ((lab[...,None,:]-PL[None,None])*np.array([1.4,1,1]))**2
    return d.sum(-1).argmin(-1)
def comps(q):
    H,W = q.shape; lab = -np.ones((H,W),int); sizes=[]
    for y in range(H):
        for x in range(W):
            if lab[y,x]>=0: continue
            st=[(x,y)]; lab[y,x]=len(sizes); n=0; mem=[]
            while st:
                a,b=st.pop(); n+=1; mem.append((a,b))
                for dx in (-1,0,1):
                    for dy in (-1,0,1):
                        xx,yy=a+dx,b+dy
                        if 0<=xx<W and 0<=yy<H and lab[yy,xx]<0 and q[yy,xx]==q[b,a]:
                            lab[yy,xx]=len(sizes); st.append((xx,yy))
            sizes.append(mem)
    return lab,sizes
def cleanup(q, ref, maxs=2, rounds=12):
    q=q.copy(); H,W=q.shape; rl = oklab(ref.astype(float))
    for r in range(rounds):
        lab,sizes=comps(q); ch=0
        for mem in sizes:
            if len(mem)>maxs: continue
            col=q[mem[0][1],mem[0][0]]
            if any(q[b,a]!=col for a,b in mem): continue
            border={}
            m=np.mean([rl[b,a] for a,b in mem],0)
            for a,b in mem:
                for dx in (-1,0,1):
                    for dy in (-1,0,1):
                        xx,yy=a+dx,b+dy
                        if 0<=xx<W and 0<=yy<H and q[yy,xx]!=col: border[q[yy,xx]]=border.get(q[yy,xx],0)+1
            if not border: continue
            best=min(border, key=lambda v: (((m-PL[v])*np.array([1.4,1,1]))**2).sum()-border[v]*1e-6)
            for a,b in mem: q[b,a]=best
            ch+=1
        if not ch: break
    return q
def img(q): return P[q].astype(np.uint8)
