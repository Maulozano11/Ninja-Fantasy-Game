import sys, numpy as np
a=np.load(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6])
r,g,b=a[...,0],a[...,1],a[...,2]
L=0.299*r+0.587*g+0.114*b
print('    '+' '.join('%6d'%x for x in range(x0,x1)))
for y in range(y0,y1):
    print('%3d '%y+' '.join('%02x%02x%02x'%tuple(a[y,x]) for x in range(x0,x1)))
