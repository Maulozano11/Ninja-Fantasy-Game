import json, numpy as np
from PIL import Image
ART2='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
ST=ART2+'/staging/vfx_poison_v3'
R=ART2+'/review-poison-set-r5-2'
M=json.load(open(ST+'/manifest.json'))
def frames(name, anim=None):
    s=M['sprites'][name]; im=np.array(Image.open(ST+'/'+s['file']).convert('RGBA'))
    out={}
    for k,a in s['anims'].items():
        fw,fh=s['frameW'],s['frameH']; r=a['row']
        out[k]=[im[r*fh:(r+1)*fh, i*fw:(i+1)*fw].copy() for i in range(a['frames'])]
    return out if anim is None else out[anim]
def comp(fr, bg):
    a=fr[...,3:4]/255.0
    return (fr[...,:3]*a + np.asarray(bg,float)*(1-a)).clip(0,255).astype(np.uint8)
def up(img, k):
    return np.repeat(np.repeat(img,k,0),k,1)
PANEL=(24,26,33)
def grass(h,w,seed=1):
    rng=np.random.RandomState(seed)
    base=np.array([74,110,52],float)
    g=base+rng.randint(-10,10,(h,w,1))*np.array([0.6,1,0.5])
    # blades
    for _ in range(h*w//40):
        y=rng.randint(0,h); x=rng.randint(0,w); g[y,x]=[96,140,64]
    return g.clip(0,255)
def reach_from_border(see):
    r=np.zeros_like(see); r[0]=see[0]; r[-1]=see[-1]; r[:,0]|=see[:,0]; r[:,-1]|=see[:,-1]
    while True:
        d=r.copy(); d[1:]|=r[:-1]; d[:-1]|=r[1:]; d[:,1:]|=r[:,:-1]; d[:,:-1]|=r[:,1:]
        d&=see
        if (d==r).all(): return r
        r=d
def enclosed(alpha, thr):
    see=alpha<thr
    return see & ~reach_from_border(see)
def label(mask, conn=4):
    h,w=mask.shape; lab=np.zeros((h,w),int); n=0; comps=[]
    ys,xs=np.nonzero(mask)
    nb=[(1,0),(-1,0),(0,1),(0,-1)]+([(1,1),(1,-1),(-1,1),(-1,-1)] if conn==8 else [])
    for y0,x0 in zip(ys,xs):
        if lab[y0,x0]: continue
        n+=1; st=[(y0,x0)]; lab[y0,x0]=n; pts=[]
        while st:
            y,x=st.pop(); pts.append((y,x))
            for dy,dx in nb:
                yy,xx=y+dy,x+dx
                if 0<=yy<h and 0<=xx<w and mask[yy,xx] and not lab[yy,xx]:
                    lab[yy,xx]=n; st.append((yy,xx))
        comps.append(pts)
    return lab,comps
