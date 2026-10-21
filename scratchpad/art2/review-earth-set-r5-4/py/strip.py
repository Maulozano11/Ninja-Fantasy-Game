import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
# args: libdir name anim bg scale cols out [crop x0,y0,x1,y1] [frames a-b]
name,anim,bgk,k,cols,out=sys.argv[2],sys.argv[3],sys.argv[4],int(sys.argv[5]),int(sys.argv[6]),sys.argv[7]
crop=[int(v) for v in sys.argv[8].split(',')] if len(sys.argv)>8 and sys.argv[8]!='-' else None
fr=frames(name,anim if anim!='-' else None)
idx=list(range(len(fr)))
if len(sys.argv)>9:
    a,b=map(int,sys.argv[9].split('-')); idx=list(range(a,b+1))
tiles=[]
for i in idx:
    f=fr[i]
    if crop: f=f[crop[1]:crop[3],crop[0]:crop[2]]
    h,w=f.shape[:2]
    if bgk=='dark': bg=np.zeros((h,w,3))+PANEL
    elif bgk=='light': bg=np.zeros((h,w,3))+LIGHT
    elif bgk=='grass': bg=grass(h,w)
    elif bgk=='check':
        yy,xx=np.mgrid[0:h,0:w]; c=((xx//4+yy//4)%2)[...,None]; bg=np.where(c,np.array([255,0,255]),np.array([0,255,255])).astype(float)
    elif bgk=='white': bg=np.zeros((h,w,3))+255
    t=up(over(f,bg),k)
    im=Image.fromarray(t); d=ImageDraw.Draw(im); d.text((2,2),str(i),fill=(255,60,60)); tiles.append(np.array(im))
h,w=tiles[0].shape[:2]; rows=(len(tiles)+cols-1)//cols
S=np.zeros((rows*(h+4),cols*(w+4),3),np.uint8)+80
for j,t in enumerate(tiles):
    r,c=divmod(j,cols); S[r*(h+4):r*(h+4)+h, c*(w+4):c*(w+4)+w]=t
save(S,out)
