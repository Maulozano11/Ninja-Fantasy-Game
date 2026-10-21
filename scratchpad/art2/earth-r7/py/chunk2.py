import sys, numpy as np
sys.path.insert(0, sys.path[0])
from fr import frames
from lab import label
g=sys.argv[1]
fs,_=frames('stream_head','fly',g)
f0=fs[0]; a=f0[:,:,3]==255
lab,s=label(a)
win=lab[8:27,133:151]; ids,c=np.unique(win[win>=0],return_counts=True)
m=lab==ids[np.argmax(c)]
ys,xs=np.nonzero(m)
print('chunk (opaque) px', m.sum())
out=[]
for i,f in enumerate(fs):
    best=None
    for dy in range(-1,7):
        for dx in range(-2,3):
            d=int(sum((f[y+dy,x+dx]!=f0[y,x]).any() for y,x in zip(ys,xs)))
            if best is None or d<best[0]: best=(d,dx,dy)
    # clear px adjacent to the moved chunk inside its convex rows (tear slit): px within the moved bbox, clear, with chunk px both left and right in the row
    d,dx,dy=best
    out.append(f'f{i}: shift ({dx},{dy}) differing px {d}')
print('; '.join(out))
