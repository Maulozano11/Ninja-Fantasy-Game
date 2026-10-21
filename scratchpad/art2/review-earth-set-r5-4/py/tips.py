import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fr=frames('blast','blast')
K=fr[4]
# crystal pixels: opaque and relatively bright orange (R>150,G>90) in key
def crys(f):
    a=f[...,3]; r,g,b=f[...,0].astype(int),f[...,1].astype(int),f[...,2].astype(int)
    return (a==255)&(r>170)&(g>110)&(b<120)
H,W=K.shape[:2]
top=np.full(W,999)
m=crys(K)
for x in range(W):
    ys=np.nonzero(m[:,x])[0]
    if len(ys): top[x]=ys.min()
# local minima tips with prominence
tips=[]
for x in range(2,W-2):
    if top[x]<120 and top[x]==top[max(0,x-6):x+7].min() and (not tips or x-tips[-1]>6): tips.append(x)
print('tips x:',tips)
print('top y at tips per frame (top of opaque px alpha==255 in +-2 cols, above y 120)')
for x in tips:
    row=[]
    for i,f in enumerate(fr):
        a=f[:,x-1:x+2,3]==255
        ys=np.nonzero(a.any(1))[0]
        cm=crys(f)[:,x-1:x+2].any(1)
        yc=np.nonzero(cm)[0]
        row.append(int(yc.min()) if len(yc) else -1)
    print(f'x={x:3d} key top={top[x]:3d}:',row)
