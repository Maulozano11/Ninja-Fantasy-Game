import sys; sys.path.insert(0,'.')
from load import *
from grid import compf
name,anim=sys.argv[1],sys.argv[2]
pairs=[tuple(map(int,p.split('-'))) for p in sys.argv[3].split(',')]
B=int(sys.argv[4]) if len(sys.argv)>4 else 8
Rr=int(sys.argv[5]) if len(sys.argv)>5 else 6
fr=frames(name,anim)
for i,j in pairs:
    A=compf(fr[i].astype(float),'dark').astype(float); Bf=compf(fr[j].astype(float),'dark').astype(float)
    aB=fr[j][:,:,3]
    H,W=aB.shape
    bad=[]
    for y in range(Rr,H-B-Rr,B//2):
        for x in range(Rr,W-B-Rr,B//2):
            if (aB[y:y+B,x:x+B]>=200).mean()<0.5: continue
            p=Bf[y:y+B,x:x+B]
            if p.std()<18: continue
            best=1e9
            for dy in range(-Rr,Rr+1):
                for dx in range(-Rr,Rr+1):
                    q=A[y+dy:y+dy+B,x+dx:x+dx+B]
                    d=np.abs(p-q).mean()
                    if d<best: best=d
            bad.append((round(best,1),x,y))
    bad.sort(reverse=True)
    print(f'{i}->{j}: worst patches (residual,x,y):',bad[:6])
