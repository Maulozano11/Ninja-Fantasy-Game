import numpy as np
from PIL import Image
im = np.asarray(Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(int)
H,W,_=im.shape
sheet = np.array([20,20,28])
m = np.abs(im - sheet).sum(-1) > 12
# label components via BFS on a coarse level: use row runs
import sys
sys.setrecursionlimit(10000)
lab = np.zeros((H,W),np.int32); n=0
boxes=[]
for y in range(H):
    for x in range(W):
        if m[y,x] and not lab[y,x]:
            n+=1; st=[(y,x)]; lab[y,x]=n; ys=[y];xs=[x]; cnt=0
            x0=x1=x;y0=y1=y
            while st:
                a,b=st.pop(); cnt+=1
                if a<y0:y0=a
                if a>y1:y1=a
                if b<x0:x0=b
                if b>x1:x1=b
                for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    u,v=a+dy,b+dx
                    if 0<=u<H and 0<=v<W and m[u,v] and not lab[u,v]:
                        lab[u,v]=n; st.append((u,v))
            if cnt>2000: boxes.append((cnt,x0,y0,x1,y1))
for b in sorted(boxes,key=lambda b:(b[2],b[1])): print(b, 'w',b[3]-b[1]+1,'h',b[4]-b[2]+1)
