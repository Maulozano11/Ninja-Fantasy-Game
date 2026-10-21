import sys, json; sys.path.insert(0, sys.argv[1])
from lib import *
REF=SP+'/art2/REF-earth-set-owner.jpg'
ref=np.array(Image.open(REF).convert('RGB')).astype(float)
P={'bolt':(25,101,266,335),'stream':(649,101,1287,324),'stream_head':(649,101,1287,324),'breath':(1316,101,1635,361),'sphere':(1664,101,1923,347),
'slash':(25,435,266,678),'multi':(298,435,575,678),'multi_hit':(577,435,808,678),'hit':(811,435,1120,678),'blast':(1159,435,1787,797),
'wall':(25,868,900,1253),'aura':(929,868,1192,1214),'wall_diag':(1222,868,1975,1490),'wall_depth':(25,1361,450,1974)}
KEY={'hit':('hit',3),'multi_hit':('hit',3),'blast':('blast',4),'wall':('rise',11),'wall_diag':('rise',11),'wall_depth':('rise',11)}
from numpy.fft import rfft2, irfft2
def corr(D, T):
    # valid correlation: out[dy,dx]=sum T[y,x]*D[y+dy,x+dx]
    H,W=D.shape; h,w=T.shape
    F=rfft2(D,(H,W)); G=rfft2(T[::-1,::-1],(H,W))
    c=irfft2(F*G,(H,W))
    return c[h-1:H, w-1:W]
def keyframe(name):
    an,i=KEY.get(name,(None,0))
    return frames(name,an)[i]
def match(name, scales, mask_fn=None, K=None, phases=((0,0),)):
    x0,y0,x1,y1=P[name]
    reg=ref[y0:y1+1,x0:x1+1]
    if K is None: K=keyframe(name)
    a=K[...,3]/255.0
    bgc=np.median(reg.reshape(-1,3),0)
    T=K[...,:3]*a[...,None]+bgc*(1-a[...,None])
    m=(a>0.05).astype(float)
    if mask_fn is not None: m=m*mask_fn
    best=None
    for s in scales:
      for ph in phases:
        reg=ref[y0+ph[1]:y1+1,x0+ph[0]:x1+1]
        Wd=int(round(reg.shape[1]/s)); Hd=int(round(reg.shape[0]/s))
        D=np.array(Image.fromarray(reg.astype(np.uint8)).resize((Wd,Hd),Image.BOX)).astype(float)
        h,w=m.shape
        PD=np.zeros((Hd+2*h,Wd+2*w,3))+bgc; PD[h:h+Hd,w:w+Wd]=D; D=PD
        ssd=0
        for c in range(3):
            Dc=D[...,c]; Tc=T[...,c]
            ssd=ssd+corr(Dc*Dc,m)-2*corr(Dc,m*Tc)+(m*Tc*Tc).sum()
        ssd=ssd/m.sum()
        idx=np.unravel_index(np.argmin(ssd),ssd.shape)
        v=ssd[idx]
        if best is None or v<best[0]: best=(float(v),s,int(idx[1])-m.shape[1],int(idx[0])-m.shape[0],ph)
    return best,bgc
if __name__=='__main__':
    out={}
    names=sys.argv[2].split(',') if len(sys.argv)>2 else list(P)
    for n in names:
        sc=np.arange(2.20,2.56,0.01)
        if n.startswith('stream'): sc=np.arange(2.30,2.60,0.01)
        (v,s,dx,dy,D),bgc=match(n,sc)
        # refine
        (v2,s2,dx2,dy2,ph),_=match(n,np.arange(s-0.012,s+0.0125,0.003),phases=[(a,b) for a in (0,1,2) for b in (0,1,2)])
        out[n]=dict(rms=v2**0.5,scale=round(float(s2),4),dx=dx2,dy=dy2,ph=ph,bg=bgc.tolist())
        print(n,out[n],flush=True)
    json.dump(out,open(R+'/align-'+('all' if len(sys.argv)<=2 else sys.argv[2].replace(',','_'))+'.json','w'),indent=1)
