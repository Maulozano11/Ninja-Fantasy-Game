import sys; sys.path.insert(0,'.')
from load import *
from morph import label, dil
# report opaque components (alpha>=200) of >= MIN px that vanish (no opaque px within R in next frame) or appear (none within R in previous)
MIN=int(sys.argv[3]) if len(sys.argv)>3 else 16
R=3
name,anim=sys.argv[1],sys.argv[2]
fr=frames(name,anim)
loop=man()['sprites'][name]['anims'][anim]['loop']
n=len(fr)
pairs=[(i,i+1) for i in range(n-1)]+([(n-1,0)] if loop else [])
for i,j in pairs:
    A=fr[i][:,:,3]>=200; B=fr[j][:,:,3]>=200
    la,na=label(A); lb,nb=label(B)
    Bd=dil(B,R); Ad=dil(A,R)
    gone=[]; new=[]
    for k in range(1,na+1):
        m=la==k; s=int(m.sum())
        if s>=MIN:
            ov=(m&Bd).sum()/s
            if ov<0.5:
                ys,xs=np.nonzero(m); gone.append((s,int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max()),round(float(ov),2)))
    for k in range(1,nb+1):
        m=lb==k; s=int(m.sum())
        if s>=MIN:
            ov=(m&Ad).sum()/s
            if ov<0.5:
                ys,xs=np.nonzero(m); new.append((s,int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max()),round(float(ov),2)))
    if gone or new: print(f'{i}->{j}', 'GONE', gone, 'NEW', new)
