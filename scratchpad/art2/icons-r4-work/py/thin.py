# thin.py img [minlen]: 1-px-thick straight horizontal and vertical runs (same colour, different colour on both sides) of length >= minlen
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB'); w,h=im.size; m=int(sys.argv[2]) if len(sys.argv)>2 else 6
g=lambda x,y: im.getpixel((x,y)) if 0<=x<w and 0<=y<h else None
out=[]
for y in range(h):
    x=0
    while x<w:
        c=g(x,y); e=x
        while e+1<w and g(e+1,y)==c and g(e+1,y-1)!=c and g(e+1,y+1)!=c: e+=1
        if g(x,y-1)!=c and g(x,y+1)!=c and e-x+1>=m: out.append(('row',y,x,e,'#%02x%02x%02x'%c))
        x=e+1
for x in range(w):
    y=0
    while y<h:
        c=g(x,y); e=y
        while e+1<h and g(x,e+1)==c and g(x-1,e+1)!=c and g(x+1,e+1)!=c: e+=1
        if g(x-1,y)!=c and g(x+1,y)!=c and e-y+1>=m: out.append(('col',x,y,e,'#%02x%02x%02x'%c))
        y=e+1
for o in out: print(o)
print(len(out),'thin runs >=',m)
