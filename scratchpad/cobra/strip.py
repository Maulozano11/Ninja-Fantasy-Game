import sys, numpy as np
from PIL import Image
# usage: strip.py out.png k frames.npy
fr=np.load(sys.argv[3]); k=int(sys.argv[2])
n,H,W,_=fr.shape
out=Image.new('RGBA',(n*(W+2),H),(93,107,87,255))
for i in range(n):
    out.alpha_composite(Image.fromarray(fr[i],'RGBA'),(i*(W+2),0))
out=out.resize((out.width*k,out.height*k),Image.NEAREST); out.save(sys.argv[1])
