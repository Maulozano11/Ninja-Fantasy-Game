import sys; sys.path.insert(0,'.')
from load import *
from morph import label
from grid import compf
m=man()['sprites']
names=sys.argv[1:] or [n for n in m if n!='beast']
for n in names:
    for an,b in m[n]['anims'].items():
        fr=frames(n,an)
        N=len(fr)
        pairs=[(i,i+1) for i in range(N-1)]+([(N-1,0)] if b['loop'] else [])
        out=[]
        for i,j in pairs:
            A=fr[i].astype(int); B=fr[j].astype(int)
            ca=compf(fr[i].astype(float),'dark'); cb=compf(fr[j].astype(float),'dark')
            d=np.abs(ca.astype(int)-cb.astype(int)).max(2)
            big=d>60
            lab,k=label(big)
            mx=max([int((lab==q).sum()) for q in range(1,k+1)] or [0])
            out.append(f'{i}>{j}:{int(big.sum())}/{mx}')
        print(f'{n:11s} {an:5s}',' '.join(out))
