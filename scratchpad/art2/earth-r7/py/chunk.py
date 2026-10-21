import sys, numpy as np
sys.path.insert(0, sys.path[0])
from fr import frames
from lab import label
g=sys.argv[1]
fs,_=frames('stream_head','fly',g)
ref=None
for i,f in enumerate(fs):
    a=f[:,:,3]>0
    lab,s=label(a)
    # component at the chunk: the one covering the most pixels in x 133-150, y 8-26
    win=lab[8:27,133:151]; ids,c=np.unique(win[win>=0],return_counts=True)
    k=ids[np.argmax(c)]; m=lab==k
    ys,xs=np.nonzero(m)
    px=f[m]
    sig=(m[ys.min():ys.max()+1, xs.min():xs.max()+1], f[ys.min():ys.max()+1, xs.min():xs.max()+1])
    if ref is None: ref=sig
    same = sig[0].shape==ref[0].shape and (sig[0]==ref[0]).all() and (sig[1][sig[0]]==ref[1][ref[0]]).all()
    # clear px enclosed in its bounding box hull rows (slit): clear px between opaque px on same row inside comp bbox
    sl=0
    for y in range(ys.min(), ys.max()+1):
        row=m[y]; xx=np.nonzero(row)[0]
        if len(xx): sl+=int((~row[xx.min():xx.max()+1]).sum())
    print(f'frame {i}: chunk comp {m.sum()} px at x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} identical-to-frame0={same} row-gaps={sl}')
