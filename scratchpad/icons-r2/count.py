import sys, numpy as np
from PIL import Image
from collections import deque
def comps(a, conn):
    h,w,_=a.shape
    key=(a[...,0].astype(np.int64)<<16)|(a[...,1].astype(np.int64)<<8)|a[...,2]
    lab=-np.ones((h,w),int); sizes=[]
    nb=[(-1,0),(1,0),(0,-1),(0,1)] + ([(-1,-1),(1,-1),(-1,1),(1,1)] if conn==8 else [])
    for y in range(h):
        for x in range(w):
            if lab[y,x]>=0: continue
            q=deque([(y,x)]); lab[y,x]=len(sizes); n=0
            while q:
                cy,cx=q.popleft(); n+=1
                for dy,dx in nb:
                    yy,xx=cy+dy,cx+dx
                    if 0<=yy<h and 0<=xx<w and lab[yy,xx]<0 and key[yy,xx]==key[cy,cx]:
                        lab[yy,xx]=lab[y,x]; q.append((yy,xx))
            sizes.append(n)
    s=np.array(sizes)
    return (s<=2).sum(), (s==1).sum()
for p in sys.argv[1:]:
    a=np.asarray(Image.open(p).convert('RGB'))
    print(p.split('/')[-1], 'n4<=2,n4==1', comps(a,4), 'n8', comps(a,8), 'colours', len(np.unique(a.reshape(-1,3),axis=0)))
