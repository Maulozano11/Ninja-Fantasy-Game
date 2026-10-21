import sys
import numpy as np
from PIL import Image
im=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
x0,y0,x1,y1,tol=map(int,sys.argv[2:7])
reg=im[y0:y1,x0:x1]; bg=np.median(reg.reshape(-1,3),axis=0); d=np.abs(reg-bg).sum(2)>tol
r=d.sum(1); ys=[y0+i for i,v in enumerate(r) if v>=2]
c=d.sum(0); xs=[x0+i for i,v in enumerate(c) if v>=2]
print('bg',bg,'y',ys[0],ys[-1],'h',ys[-1]-ys[0]+1,'x',xs[0],xs[-1])
