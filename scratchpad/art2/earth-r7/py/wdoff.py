import sys, numpy as np
sys.path.insert(0, sys.path[0])
from fr import frames
g=sys.argv[1]
fs,_=frames('wall_depth','rise',g)
k=fs[11]
x0,x1,y0,y1=15,110,225,264
for i in range(5,11):
    f=fs[i]
    best=None
    for s in range(0,40):
        sh=np.zeros_like(k); sh[s:]=k[:k.shape[0]-s]
        reg=(slice(y0,y1),slice(x0,x1))
        op=f[reg][:,:,3]>0
        match=((f[reg]==sh[reg]).all(-1)&op).sum()
        if best is None or match>best[1]: best=(s,match,op.sum())
    s=best[0]
    sh=np.zeros_like(k); sh[s:]=k[:k.shape[0]-s]
    reg=(slice(y0,y1),slice(x0,x1))
    op=f[reg][:,:,3]>0; mm=(f[reg]==sh[reg]).all(-1)&op
    # other offsets: pixels not matched at s but matched at another s2 within 0..12
    other={}
    for s2 in range(0,40):
        if s2==s: continue
        sh2=np.zeros_like(k); sh2[s2:]=k[:k.shape[0]-s2]
        m2=(f[reg]==sh2[reg]).all(-1)&op&~mm
        if m2.sum()>15: other[s2]=int(m2.sum())
    print(f'frame {i}: best shift {s}: {best[1]}/{best[2]} opaque px match; unmatched {best[2]-best[1]}; other shifts with >15 unique matches {other}')
