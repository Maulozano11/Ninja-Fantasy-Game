import sys
import numpy as np
from PIL import Image
S,R=sys.argv[1],sys.argv[2]
sh=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(int)
W,H=176,105
fr=[sh[:,i*W:(i+1)*W] for i in range(8)]
def body(f):
    r,g,b,a=f[...,0],f[...,1],f[...,2],f[...,3]
    pur=(r>g+10)&(b>g+10)
    return (a>128)&~pur
k=4
out=np.full((2*(H*k+6),4*(W*k+6),3),255,np.uint8)
for i in range(8):
    A=body(fr[i]); B=body(fr[(i+1)%8])
    img=np.zeros((H,W,3),np.uint8)+30
    img[A&B]=(120,120,120); img[A&~B]=(230,60,60); img[B&~A]=(60,200,230)
    print('%d->%d body xor %.1f%%  lost %d gained %d'%(i,(i+1)%8,(A^B).sum()/(A|B).sum()*100,(A&~B).sum(),(B&~A).sum()))
    up=np.kron(img,np.ones((k,k,1),np.uint8))
    rr,cc=divmod(i,4)
    out[rr*(H*k+6):rr*(H*k+6)+H*k, cc*(W*k+6):cc*(W*k+6)+W*k]=up
Image.fromarray(out).save(R+'/r5-onion-body-x4.png')
