import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fs=frames('blast','blast')
for i in [5,7,8,10,12]:
    al=fs[i][...,3].astype(int)
    enc=enclosed(al,32); L,n=label(enc,4)
    for k in range(1,n+1):
        ys,xs=np.nonzero(L==k)
        # neighbourhood alpha stats
        y0,y1,x0,x1=max(0,ys.min()-2),ys.max()+3,max(0,xs.min()-2),xs.max()+3
        ring=al[y0:y1,x0:x1][~(L[y0:y1,x0:x1]==k)]
        print('f%d pocket %d px at x%d-%d y%d-%d, ring alpha min %d med %d max %d'%(i,len(ys),xs.min(),xs.max(),ys.min(),ys.max(),ring.min(),np.median(ring),ring.max()))
