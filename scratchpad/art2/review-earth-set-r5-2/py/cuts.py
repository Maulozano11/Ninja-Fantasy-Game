import sys; sys.path.insert(0,'.')
from load import *
def runs(mask):
    # longest run of True along axis 0 for each column -> return (len, col, start)
    best=(0,0,0)
    H,W=mask.shape
    for x in range(W):
        col=mask[:,x]; n=0
        for y in range(H):
            if col[y]:
                n+=1
                if n>best[0]: best=(n,x,y-n+1)
            else: n=0
    return best
def cuts(f,hi=96,lo=8):
    a=f[:,:,3].astype(int)
    A=a>=hi; C=a<=lo
    pad=lambda m:np.pad(m,1,constant_values=True)
    Cp=pad(C)
    H,W=a.shape
    left=A&Cp[1:-1,0:-2]; right=A&Cp[1:-1,2:]
    up=A&Cp[0:-2,1:-1]; down=A&Cp[2:,1:-1]
    v=max(runs(left),runs(right))
    h=max(runs(up.T),runs(down.T))
    return v,h
names=sys.argv[1:] or [n for n in man()['sprites'] if n!='beast']
for n in names:
    for an,fr in frames(n).items():
        out=[]
        for i,f in enumerate(fr):
            v,h=cuts(f)
            out.append(f"{i}:v{v[0]}@x{v[1]},y{v[2]} h{h[0]}@y{h[1]},x{h[2]}")
        print(n,an); print('  '+'\n  '.join(out))
