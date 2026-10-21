import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fs=frames('blast','blast')
for i in [4,10,11,12,13,14,15]:
    f=fs[i]
    print('frame',i)
    for (x,y) in [(170,95),(175,100),(180,105),(185,110),(172,115),(190,100),(200,100)]:
        print('   (%d,%d) rgba %s'%(x,y,tuple(int(v) for v in f[y,x])))
# dark translucent pixels: luminance of colour < 40 with alpha > 20, count per frame, outside opaque
for i,f in enumerate(fs):
    r,g,b,a=[f[...,k].astype(int) for k in range(4)]
    lum=0.3*r+0.59*g+0.11*b
    dark=(a>=24)&(a<200)&(lum<45)
    darkop=(a>=200)&(lum<45)
    print(i,'dark translucent px (lum<45, alpha 24-199):',int(dark.sum()),' dark opaque:',int(darkop.sum()))
