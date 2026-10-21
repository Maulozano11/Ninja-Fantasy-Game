from fr import *
import sys
g=sys.argv[1]
fs,(ax,ay)=frames('wall_depth','rise',g)
H,W=fs[0].shape[:2]
L=[]
for f in fs:
    a=f[:,:,3]; low=[]
    for x in range(W):
        ys=np.nonzero(a[:,x]>=128)[0]; low.append(int(ys.max()) if len(ys) else -1)
    L.append(low)
L=np.array(L)
for x in range(0,30):
    print(x,' '.join('%3d'%v for v in L[:,x]))
# columns where lowest row changes between consecutive frames by >2 (excluding heap)
for i in range(1,12):
    ch=[(x,int(L[i-1,x]),int(L[i,x])) for x in range(W) if abs(L[i,x]-L[i-1,x])>2]
    print('frame',i-1,'->',i,'changed cols',len(ch),ch[:12])
