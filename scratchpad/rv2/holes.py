import sys
import numpy as np
from PIL import Image, ImageDraw
exec(open('cmp.py').read().split('stats={}')[0])
def outside(clear):
    H,W=clear.shape; im=Image.new('L',(W+2,H+2),255)
    a=np.full((H+2,W+2),255,np.uint8); a[1:-1,1:-1]=np.where(clear,0,255); a[0,:]=0;a[-1,:]=0;a[:,0]=0;a[:,-1]=0
    im=Image.fromarray(a).copy(); ImageDraw.floodfill(im,(0,0),128); r=np.asarray(im)[1:-1,1:-1]
    return r==128
def dil(m,n):
    for _ in range(n):
        o=m.copy(); o[1:]|=m[:-1]; o[:-1]|=m[1:]; o[:,1:]|=m[:,:-1]; o[:,:-1]|=m[:,1:]; m=o
    return m
def ero(m,n): return ~dil(~m,n)
def comps(mask):
    # count components via repeated floodfill (small images ok)
    H,W=mask.shape; seen=np.zeros_like(mask); sizes=[]
    ys,xs=np.nonzero(mask)
    a=np.where(mask,255,0).astype(np.uint8); im=Image.fromarray(a).copy()
    for y,x in zip(ys,xs):
        if im.getpixel((int(x),int(y)))==255:
            ImageDraw.floodfill(im,(int(x),int(y)),100)
            arr=np.asarray(im); s=(arr==100).sum(); sizes.append(int(s))
            im=Image.fromarray(np.where(arr==100,50,arr).astype(np.uint8)).copy()
    return sizes
if __name__=='__main__':
    name,anim=sys.argv[1],sys.argv[2]; thr=int(sys.argv[3]) if len(sys.argv)>3 else 0
    m=M[name]; n=m['anims'][anim]['frames']
    for i in range(n):
        a=np.asarray(frame(name,anim,i))[...,3]
        op=a>thr; holes=(~op)&~outside(~op)
        sizes=comps(holes) if holes.sum() else []
        notch=ero(dil(op,3),3)&~op
        print('%s %s[%d] opaque %5d enclosed-clear %4d (pinholes<6px %d, holes>=6px %d, largest %d) clear-in-3px-close %4d'%(name,anim,i,op.sum(),holes.sum(),sum(1 for s in sizes if s<6),sum(1 for s in sizes if s>=6),max(sizes) if sizes else 0,notch.sum()))
