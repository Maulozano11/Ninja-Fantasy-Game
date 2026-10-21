import sys; sys.path.insert(0, sys.argv[1])
from lib import *
def pm(f):
    a=f[...,3:4]/255.0
    return np.concatenate([f[...,:3]*a, f[...,3:4]],-1)
def track(fr, key, blocks, r=40, bs=7):
    out={}
    K=pm(fr[key])
    for (bx,by) in blocks:
        T=K[by:by+bs,bx:bx+bs]
        traj=[]
        for t,f in enumerate(fr):
            F=pm(f); H,W=F.shape[:2]
            best=(1e18,0,0)
            for dy in range(-r,r+1):
                for dx in range(-r,r+1):
                    y0,x0=by+dy,bx+dx
                    if y0<0 or x0<0 or y0+bs>H or x0+bs>W: continue
                    e=((F[y0:y0+bs,x0:x0+bs]-T)**2).mean()
                    if e<best[0]: best=(e,dx,dy)
            traj.append((best[1],best[2],int(best[0]**0.5)))
        out[(bx,by)]=traj
    return out
if __name__=='__main__':
    name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]; key=int(sys.argv[4])
    blocks=[tuple(map(int,b.split(','))) for b in sys.argv[5].split(';')]
    fr=frames(name,anim)
    res=track(fr,key,blocks)
    for b,tr in res.items():
        print(b,' '.join(f'{dx:+d},{dy:+d}({e})' for dx,dy,e in tr))
