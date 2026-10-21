import sys; sys.path.insert(0, sys.argv[1])
from lib import *
def box(a,k):
    # sum over kxk window centered (k odd), same size, zero pad
    p=k//2; a=np.pad(a,((p+1,p),(p+1,p)))
    c=a.cumsum(0).cumsum(1)
    return c[k:,k:]-c[:-k,k:]-c[k:,:-k]+c[:-k,:-k]
def pm(f):
    a=f[...,3:4]/255.0
    return np.concatenate([f[...,:3]*a, f[...,3:4]*1.0],-1)
def popmap(f0,f1,r=6,k=5):
    A=pm(f0); B=pm(f1); H,W=B.shape[:2]
    best=np.full((H,W),1e18)
    P=np.zeros((H+2*r,W+2*r,4)); P[r:r+H,r:r+W]=A
    for dy in range(-r,r+1):
        for dx in range(-r,r+1):
            S=P[r+dy:r+dy+H, r+dx:r+dx+W]
            d=((S-B)**2).sum(-1)
            e=box(d,k)/(k*k*4)
            best=np.minimum(best,e)
    return np.sqrt(best)
def comps(mask):
    H,W=mask.shape; lab=np.zeros((H,W),int); n=0; out=[]
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not lab[y,x]:
                n+=1; st=[(y,x)]; lab[y,x]=n; pts=[]
                while st:
                    cy,cx=st.pop(); pts.append((cy,cx))
                    for ny,nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
                        if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not lab[ny,nx]:
                            lab[ny,nx]=n; st.append((ny,nx))
                ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
                out.append((len(pts),min(xs),min(ys),max(xs),max(ys)))
    return sorted(out,reverse=True)
if __name__=='__main__':
    name=sys.argv[2]; anim=sys.argv[3] if len(sys.argv)>3 and sys.argv[3]!='-' else None
    thr=float(sys.argv[4]) if len(sys.argv)>4 else 40
    fr=frames(name,anim); loop=M['sprites'][name]['anims'][anim or list(M['sprites'][name]['anims'])[0]]['loop']
    pairs=[(i,i+1) for i in range(len(fr)-1)]+([(len(fr)-1,0)] if loop else [])
    for a,b in pairs:
        e=popmap(fr[a],fr[b])
        # only where frame b is solid-ish (new content)
        m=(e>thr)&(fr[b][...,3]>=128)
        cs=comps(m)
        e2=popmap(fr[b],fr[a]); m2=(e2>thr)&(fr[a][...,3]>=128); cs2=comps(m2)
        print(f'{name} {a}->{b}: new {m.sum()} px, comps {cs[:4]} | vanished {m2.sum()} px, comps {cs2[:4]}')
