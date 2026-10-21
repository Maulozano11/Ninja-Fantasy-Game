import sys; sys.path.insert(0, sys.argv[1])
from lib import *
comps=np.load(R+'/aura_comps.npy')
for i in [2,4,7,8,9]:
    al=comps[i][...,3].astype(int)
    e=enclosed(al,128); L,n=label(e,4)
    for k in range(1,n+1):
        ys,xs=np.nonzero(L==k)
        vals=al[ys,xs]
        print(i,'pocket %d px x%d-%d y%d-%d alpha min %d max %d'%(len(ys),xs.min(),xs.max(),ys.min(),ys.max(),vals.min(),vals.max()))
