from fr import *
import sys
name,anim=sys.argv[1],sys.argv[2]
fi=[int(v) for v in sys.argv[3].split(',')]
x0,y0,x1,y1=[int(v) for v in sys.argv[4].split(',')]
fs,(ax,ay)=frames(name,anim)
def code(px):
    r,g,b,a=[int(v) for v in px]
    if a==0: return ' .'
    if a==255: return ' #' if (0.3*r+0.59*g+0.11*b)>80 else ' @'
    return '%2d'%(round(a/235*8))
for i in fi:
    f=fs[i]
    print('frame',i,'x',x0,'..',x1-1)
    for y in range(y0,y1):
        print('%3d '%y+''.join(code(f[y,x]) for x in range(x0,x1)))
