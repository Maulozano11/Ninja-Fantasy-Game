import sys, numpy as np
sys.path.insert(0, sys.path[0])
from fr import frames
g=sys.argv[1]
fs,_=frames('wall_depth','rise',g)
print('opaque px rows 244-265:', [int((f[244:266,:,3]>0).sum()) for f in fs])
print('bottom row:', [int(np.nonzero((f[:,:,3]>0).any(1))[0].max()) for f in fs])
low=[]
for f in fs:
    a=f[:,28:101,3]>0
    low.append([int(np.nonzero(a[:,x])[0].max()) if a[:,x].any() else -1 for x in range(a.shape[1])])
print('cols whose lowest row changes:', [sum(1 for x in range(len(low[0])) if low[i][x]!=low[i+1][x]) for i in range(11)])
