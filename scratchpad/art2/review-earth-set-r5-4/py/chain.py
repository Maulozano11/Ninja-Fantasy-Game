import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
T=frames('stream'); Hd=frames('stream_head')
st=M['sprites']['stream']; sh=M['sprites']['stream_head']
ntiles=3
def chain(i):
    th,tw=T[0].shape[:2]; hh,hw=Hd[0].shape[:2]
    W=ntiles*64+hw-32+4; H=max(th,hh)+4
    C=np.zeros((H,W,4))
    jx=2+ntiles*64  # joint x (end of tiles)
    ay=2+st['anchor'][1]
    def paste(img,x0,y0):
        a=img[...,3:4]/255.0
        Cs=C[y0:y0+img.shape[0],x0:x0+img.shape[1]]
        ca=Cs[...,3:4]/255.0
        oa=a+ca*(1-a)
        rgb=(img[...,:3]*a+Cs[...,:3]*ca*(1-a))/np.maximum(oa,1e-6)
        C[y0:y0+img.shape[0],x0:x0+img.shape[1]]=np.concatenate([rgb,oa*255],-1)
    for k in range(ntiles):
        paste(T[i].astype(float), jx-64*(k+1), ay-st['anchor'][1])
    paste(Hd[i].astype(float), jx-sh['anchor'][0], ay-sh['anchor'][1])
    return C.round().astype(np.uint8)
bgk=sys.argv[2]; k=int(sys.argv[3]); idx=[int(v) for v in sys.argv[4].split(',')]; out=sys.argv[5]
tiles=[]
for i in idx:
    C=chain(i); h,w=C.shape[:2]
    bg={'dark':np.zeros((h,w,3))+PANEL,'light':np.zeros((h,w,3))+LIGHT,'grass':grass(h,w)}[bgk]
    t=up(over(C,bg),k); im=Image.fromarray(t); d=ImageDraw.Draw(im); d.text((2,2),str(i),fill=(255,40,40)); tiles.append(np.array(im))
h,w=tiles[0].shape[:2]
S=np.zeros((len(tiles)*(h+3),w,3),np.uint8)+90
for j,t in enumerate(tiles): S[j*(h+3):j*(h+3)+h]=t
save(S,out)
