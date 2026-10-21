import sys; sys.path.insert(0, sys.argv[1])
from lib import *
def straight_cuts(a, minlen=7, hi=60):
    H,W=a.shape; out=[]
    # vertical edges: between column x and x+1, a[y,x]>=hi and a[y,x+1]==0 (right edge) or reverse (left edge)
    for side in ('R','L'):
        if side=='R': e=(a[:,:-1]>=hi)&(a[:,1:]==0)
        else: e=(a[:,1:]>=hi)&(a[:,:-1]==0)
        for x in range(W-1):
            y=0
            while y<H:
                if e[y,x]:
                    s=y
                    while y<H and e[y,x]: y+=1
                    if y-s>=minlen: out.append(('vert'+side,x,s,y-1,y-s))
                else: y+=1
    for side in ('B','T'):
        if side=='B': e=(a[:-1]>=hi)&(a[1:]==0)
        else: e=(a[1:]>=hi)&(a[:-1]==0)
        for y in range(H-1):
            x=0
            while x<W:
                if e[y,x]:
                    s=x
                    while x<W and e[y,x]: x+=1
                    if x-s>=minlen: out.append(('horz'+side,y,s,x-1,x-s))
                else: x+=1
    return out
name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]
for i,f in enumerate(frames(name,anim)):
    c=straight_cuts(f[...,3].astype(int))
    if c: print(name,anim,i,c[:8])
