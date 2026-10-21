import sys
from PIL import Image
import numpy as np
ref=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
H,W,_=ref.shape
# background colour
print('bg samples', ref[5,5], ref[1000,1960], ref[400,600])
# panel border detection: look for long horizontal runs of a lighter grey
lum=ref.sum(2)
bg=lum[5,5]
# find rows where many pixels are border-like (slightly lighter than bg)
cand=(np.abs(ref[:,:,0]-ref[:,:,2])<30)&(lum>bg+25)&(lum<bg+140)
rows=cand.sum(1)
for y in range(H):
    if rows[y]>200: print('row',y,rows[y])
