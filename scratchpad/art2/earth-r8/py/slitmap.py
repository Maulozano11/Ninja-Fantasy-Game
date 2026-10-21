# slitmap.py libdir name frames out: the frames on a light ground at 4x with the 1-px slits (a pixel
# 50+ alpha below both neighbours along a row or column) marked red, and where they sit (next to rock
# = alpha 255 neighbour, or in dust)
import sys; sys.path.insert(0, sys.argv[1])
from lib import *
name=sys.argv[2]; idx=[int(v) for v in sys.argv[3].split(',')]; out=sys.argv[4]
fr=frames(name)
tiles=[]
for i in idx:
    f=fr[i]; a=f[...,3].astype(int); P=np.pad(a,1)
    L=P[1:-1,:-2]; R=P[1:-1,2:]; U=P[:-2,1:-1]; D=P[2:,1:-1]
    h=(L-a>=50)&(R-a>=50); v=(U-a>=50)&(D-a>=50); sl=h|v
    rock=((h&((L==255)|(R==255)))|(v&((U==255)|(D==255))))
    img=over(f,LIGHT).copy()
    img[sl&rock]=[255,0,0]; img[sl&~rock]=[0,0,255]
    print(name,i,'slits',int(sl.sum()),'next to rock',int((sl&rock).sum()),'in dust',int((sl&~rock).sum()))
    tiles.append(up(img,4))
h=max(t.shape[0] for t in tiles); W=sum(t.shape[1]+4 for t in tiles)
S=np.zeros((h,W,3),np.uint8)+90; x=0
for t in tiles: S[:t.shape[0],x:x+t.shape[1]]=t; x+=t.shape[1]+4
save(S,out)
