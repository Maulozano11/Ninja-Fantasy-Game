import sys; sys.path.insert(0,'.')
from load import *
from grid import compf
name,anim=sys.argv[1],sys.argv[2]
y0,y1=int(sys.argv[3]),int(sys.argv[4])
MINRUN=int(sys.argv[5]) if len(sys.argv)>5 else 12
fr=frames(name,anim)
for i,f in enumerate(fr):
    a=f[:,:,3]
    L=compf(f.astype(float),'grass').astype(float).mean(2)
    res=[]
    for y in range(max(1,y0),min(y1,f.shape[0]-1)):
        up=L[y]-L[y-1]; dn=L[y]-L[y+1]
        line=((up<-12)&(dn<-12))|((up>12)&(dn>12))
        line&=(a[y]>200)
        n=0
        for x in range(f.shape[1]+1):
            if x<f.shape[1] and line[x]: n+=1
            else:
                if n>=MINRUN: res.append((y,x-n,x-1))
                n=0
    print(i,res)
