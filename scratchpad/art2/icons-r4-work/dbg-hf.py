# find small bright flecks in his water hollow at 44/88 coords via a top-hat in numpy
import numpy as np
from PIL import Image, ImageFilter
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r4-work'
his=Image.open(f'{W}/stage/ref/water_shield_suijinheki.png').convert('RGB'); w,h=his.size
t=his.crop((1,1,w-1,h-1))
a=np.asarray(t).astype(float)/255
L=0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
im=Image.fromarray((L*255).astype(np.uint8))
op=np.asarray(im.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))).astype(float)/255
th=L-op
H,Wd=L.shape
from collections import deque
m=th>0.12
seen=np.zeros_like(m)
out=[]
for y in range(H):
    for x in range(Wd):
        if m[y,x] and not seen[y,x]:
            q=deque([(x,y)]); seen[y,x]=1; comp=[]
            while q:
                cx,cy=q.popleft(); comp.append((cx,cy))
                for dx in (-1,0,1):
                    for dy in (-1,0,1):
                        nx,ny=cx+dx,cy+dy
                        if 0<=nx<Wd and 0<=ny<H and m[ny,nx] and not seen[ny,nx]: seen[ny,nx]=1; q.append((nx,ny))
            xs=[p[0] for p in comp]; ys=[p[1] for p in comp]
            cx=np.mean(xs)*88/Wd; cy=np.mean(ys)*88/H
            if 14<=cx<=36 and 28<=cy<=58: out.append((round(cx,1),round(cy,1),len(comp),round(max(th[p[1],p[0]] for p in comp),2)))
for o in sorted(out,key=lambda o:o[1]): print(o)
print(len(out))
