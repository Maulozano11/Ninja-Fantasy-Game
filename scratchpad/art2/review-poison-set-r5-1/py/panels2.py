import sys; sys.path.insert(0, sys.argv[1])
from lib import *
im=np.array(Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg').convert('RGB')).astype(int)
bg=np.array([18,20,32])
nb=np.abs(im-bg).sum(2)>12
L,n=label(nb,8)
boxes=[]
for i in range(1,n+1):
    ys,xs=np.nonzero(L==i)
    if len(ys)<2000: continue
    boxes.append((xs.min(),ys.min(),xs.max(),ys.max(),len(ys)))
for b in sorted(boxes,key=lambda b:(b[1]//50,b[0])): print(b)
