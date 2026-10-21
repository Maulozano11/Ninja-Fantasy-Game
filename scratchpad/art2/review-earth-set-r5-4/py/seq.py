import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
# libdir name anim crop k frames(list or a-b) out bgs(dark,light,grass)
name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]
c=[int(v) for v in sys.argv[4].split(',')]; k=int(sys.argv[5])
fs=sys.argv[6]
idx=list(range(int(fs.split('-')[0]),int(fs.split('-')[1])+1)) if '-' in fs else [int(v) for v in fs.split(',')]
out=sys.argv[7]; bgs=sys.argv[8].split(',') if len(sys.argv)>8 else ['dark']
fr=frames(name,anim)
rows=[]
for bgk in bgs:
    tiles=[]
    for i in idx:
        f=fr[i][c[1]:c[3],c[0]:c[2]]; h,w=f.shape[:2]
        if bgk=='dark': bg=np.zeros((h,w,3))+PANEL
        elif bgk=='light': bg=np.zeros((h,w,3))+LIGHT
        elif bgk=='grass': bg=grass(h,w)
        elif bgk=='white': bg=np.zeros((h,w,3))+255
        elif bgk=='check':
            yy,xx=np.mgrid[0:h,0:w]; cc=((xx//2+yy//2)%2)[...,None]; bg=np.where(cc,np.array([255,0,255]),np.array([0,255,255])).astype(float)
        elif bgk=='alpha':
            a=f[...,3]; t=np.stack([a,a,a],-1); tiles.append(up(t.astype(np.uint8),k)); continue
        t=up(over(f,bg),k); im=Image.fromarray(t); d=ImageDraw.Draw(im); d.text((2,2),str(i),fill=(255,40,40)); tiles.append(np.array(im))
    h,w=tiles[0].shape[:2]
    row=np.zeros((h,len(tiles)*(w+3),3),np.uint8)+90
    for j,t in enumerate(tiles): row[:,j*(w+3):j*(w+3)+w]=t
    rows.append(row)
W=max(r.shape[1] for r in rows); S=np.zeros((sum(r.shape[0]+3 for r in rows),W,3),np.uint8)+90; y=0
for r in rows: S[y:y+r.shape[0],:r.shape[1]]=r; y+=r.shape[0]+3
save(S,out)
