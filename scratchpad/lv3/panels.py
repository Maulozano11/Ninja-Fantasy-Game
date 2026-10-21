import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
tgt = np.array([0x20,0x21,0x2b]); tol = int(sys.argv[2])
m = (np.abs(im - tgt).sum(2) <= tol)
H, W = m.shape
# connected components of panel colour, report bounding boxes of big ones
from collections import deque
seen = np.zeros_like(m)
boxes = []
for y in range(0, H, 3):
    for x in range(0, W, 3):
        if m[y,x] and not seen[y,x]:
            q = deque([(y,x)]); seen[y,x]=1; n=0; x0=x1=x; y0=y1=y
            while q:
                a,b = q.popleft(); n+=1
                x0=min(x0,b);x1=max(x1,b);y0=min(y0,a);y1=max(y1,a)
                for da,db in ((1,0),(-1,0),(0,1),(0,-1)):
                    u,v=a+da,b+db
                    if 0<=u<H and 0<=v<W and m[u,v] and not seen[u,v]:
                        seen[u,v]=1; q.append((u,v))
            if n > 400: boxes.append((x0,y0,x1,y1,n))
for b in sorted(boxes, key=lambda b:(b[1]//40,b[0])): print(b, 'w',b[2]-b[0]+1,'h',b[3]-b[1]+1)
