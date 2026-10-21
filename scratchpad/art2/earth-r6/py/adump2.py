from fr import *
import sys
name,anim=sys.argv[1],sys.argv[2]
fi=[int(v) for v in sys.argv[3].split(',')]
x0,y0,x1,y1=[int(v) for v in sys.argv[4].split(',')]
fs,(ax,ay)=frames(name,anim)
def code(px):
    r,g,b,a=[int(v) for v in px]
    L=0.3*r+0.59*g+0.11*b
    if a==0: return '  .'
    c='D' if L<80 else ('m' if L<150 else 'l')
    return '%s%2d'%(c,round(a/255*9))
rows={}
for i in fi:
    f=fs[i]
    for y in range(y0,y1):
        rows.setdefault(y,[]).append(''.join(code(f[y,x]) for x in range(x0,x1)))
print('frames',fi)
for y in range(y0,y1): print('%3d '%y+' | '.join(rows[y]))
