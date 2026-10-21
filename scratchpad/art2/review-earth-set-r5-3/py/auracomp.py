import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
char=np.array(Image.open(SP+'/art2/earth-v3-work/character.png').convert('RGBA')).astype(float)
B=frames('aura_back'); F=frames('aura')
k=int(sys.argv[2]); bgk=sys.argv[3]; idx=[int(v) for v in sys.argv[4].split(',')]; out=sys.argv[5]
crop=[int(v) for v in sys.argv[6].split(',')] if len(sys.argv)>6 else [0,0,108,134]
def ov(top,bot):
    ta=top[...,3:4]/255; ba=bot[...,3:4]/255; oa=ta+ba*(1-ta)
    rgb=(top[...,:3]*ta+bot[...,:3]*ba*(1-ta))/np.maximum(oa,1e-6)
    return np.concatenate([rgb,oa*255],-1)
H,W=B[0].shape[:2]; C=np.zeros((H,W,4)); ox,oy=-6,-1
for y in range(H):
    for x in range(W):
        cy,cx=y-oy,x-ox
        if 0<=cy<128 and 0<=cx<128: C[y,x]=char[cy,cx]
tiles=[]
for i in idx:
    comp=ov(F[i].astype(float),ov(C,B[i].astype(float))).round().clip(0,255).astype(np.uint8)
    comp=comp[crop[1]:crop[3],crop[0]:crop[2]]; h,w=comp.shape[:2]
    bg={'dark':np.zeros((h,w,3))+PANEL,'light':np.zeros((h,w,3))+LIGHT,'grass':grass(h,w)}[bgk]
    t=up(over(comp,bg),k); im=Image.fromarray(t); ImageDraw.Draw(im).text((2,2),str(i),fill=(255,40,40)); tiles.append(np.array(im))
th,tw=tiles[0].shape[:2]
S=np.zeros((th,len(tiles)*(tw+3),3),np.uint8)+90
for j,t in enumerate(tiles): S[:,j*(tw+3):j*(tw+3)+tw]=t
save(S,out)
