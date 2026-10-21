import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fs=frames('blast','blast')
# find thin vertical runs: columns where a pixel with alpha>=40 has transparent (alpha<20) left and right neighbours, run length >=6
for i,f in enumerate(fs):
    a=f[...,3].astype(int)
    thin=(a>=40)&(np.pad(a,((0,0),(1,0)))[:,:-1]<20)&(np.pad(a,((0,0),(0,1)))[:,1:]<20)
    res=[]
    H,W=a.shape
    for x in range(W):
        y=0
        while y<H:
            if thin[y,x]:
                y0=y
                while y<H and thin[y,x]: y+=1
                if y-y0>=6: res.append((x,y0,y-1,int(a[y0:y,x].mean()),tuple(int(v) for v in f[(y0+y)//2,x,:3])))
            y+=1
    if res: print(i,res)
