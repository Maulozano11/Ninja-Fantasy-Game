import sys, numpy as np
from PIL import Image
R=sys.argv[1]; name=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); z=int(sys.argv[7]); out=sys.argv[8]
bg=np.array([31,31,41.]); bg2=np.array([92,110,82.])
a=np.asarray(Image.open(f'{R}/v5-{name}.png')).astype(float); al=a[:,:,3:4]/255
o=a[:,:,:3]*al+bg*(1-al); g=a[:,:,:3]*al+bg2*(1-al)
row=np.concatenate([o[y0:y1,x0:x1],np.zeros((y1-y0,1,3))+255,g[y0:y1,x0:x1]],1).astype(np.uint8)
im=Image.fromarray(row); im.resize((im.width*z,im.height*z),Image.NEAREST).save(out)
