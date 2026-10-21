import numpy as np, sys, importlib.util
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
from scipy import ndimage as ndi
im=np.asarray(Image.open(S+'/art2/REF-earth-set-owner.jpg').convert('RGB')).astype(float)
x0,y0,x1,y1=929,867,1193,1216
c=im[y0:y1,x0:x1]
def gauss(a,s):
    return np.stack([ndi.gaussian_filter(a[...,k],s) for k in range(3)],-1)
c=gauss(c,0.7)
L=0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2]
mx=c.max(-1); mn=c.min(-1); sat=(mx-mn)/np.maximum(mx,1)
gold=(sat>=float(sys.argv[1]))&(L>=float(sys.argv[2]))
green=(c[...,1]>c[...,0]+4)&(c[...,1]>c[...,2]+20)&(L>=45)
g=gold|green
g=ndi.binary_closing(g,np.ones((5,5)))
g=ndi.binary_fill_holes(g)
g=ndi.binary_opening(g,np.ones((int(sys.argv[3]),)*2))
lab,n=ndi.label(g)
sz=ndi.sum(g,lab,range(1,n+1))
g=np.isin(lab,1+np.nonzero(sz>=40)[0])
g2=ndi.binary_dilation(g,np.ones((5,5)))
img=np.where(g2[...,None],c,c*0.3)
img[g2&~g]=[255,0,0]
big=np.concatenate([c,img],1)
Image.fromarray(np.clip(big,0,255).astype(np.uint8)).resize((big.shape[1]*2,big.shape[0]*2),Image.NEAREST).save('proto-aura.png')
