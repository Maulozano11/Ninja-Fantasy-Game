# usage: cells.py <id> x0 y0 x1 y1 -> for each 44 cell, his pixels in it (by centre): darkest and lightest (as L) and the medoid hex
import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons23-tools')
import numpy as np
from PIL import Image
from ok import oklab
a=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons_23/ref/%s.png'%sys.argv[1]).convert('RGB')).astype(float)
H,W,_=a.shape
x0,y0,x1,y1=map(int,sys.argv[2:6])
lab=oklab(a)
cx=np.floor((np.arange(W)+0.5)*44/W).astype(int); cy=np.floor((np.arange(H)+0.5)*44/H).astype(int)
def cell(X,Y):
    xs=np.where(cx==X)[0]; ys=np.where(cy==Y)[0]
    return [(y,x) for y in ys for x in xs]
print('     '+' '.join('%-9d'%X for X in range(x0,x1)))
for Y in range(y0,y1):
    row1=[];row2=[]
    for X in range(x0,x1):
        px=cell(X,Y)
        Ls=[lab[p][0] for p in px]
        i=int(np.argmin(Ls)); j=int(np.argmax(Ls))
        row1.append('%02x%02x%02x'%tuple(a[px[i]].astype(int))+'%s'%('d' if Ls[i]<0.35 else ' '))
        row2.append('%02x%02x%02x'%tuple(a[px[j]].astype(int))+'%s'%('L' if Ls[j]>0.85 else ' '))
    print('%2d lo '%Y+' '.join('%-9s'%v for v in row1))
    print('%2d hi '%Y+' '.join('%-9s'%v for v in row2))
