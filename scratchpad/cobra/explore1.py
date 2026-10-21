import sys
from PIL import Image
import numpy as np
ref=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
X0,Y0,X1,Y1=208,688,551,798
c=ref[Y0:Y1,X0:X1]
BG=np.array([31,32,45],np.float32)
r,g,b=c[...,0],c[...,1],c[...,2]
diff=np.abs(c-BG).sum(2)
lum=c.sum(2)
purple=(r-g>12)&(b-g>12)&(diff>25)
dark=(lum<BG.sum()-25)
snake=((diff>45)&~purple)|dark
vis=np.zeros(c.shape,np.uint8)
vis[...]= (c*0.35).astype(np.uint8)
vis[snake]=(c[snake]).astype(np.uint8)
vis[purple]=(255,0,255)
vis[dark&~((diff>45)&~purple)]=(255,255,0)
Image.fromarray(vis).resize((vis.shape[1]*5,vis.shape[0]*5),Image.NEAREST).save('work/class.png')
print(np.percentile(lum,[1,5,50]))
