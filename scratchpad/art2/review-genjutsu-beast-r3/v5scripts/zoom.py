import sys, numpy as np
from PIL import Image
R=sys.argv[1]; side=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); z=int(sys.argv[7]); out=sys.argv[8]
BG=np.array([31,31,41])
h=np.load(f'{R}/v5scripts/his{side}.npy')
fi=0 if side=='L' else 4
a=np.asarray(Image.open(f'{R}/v5-fly{fi}.png')).astype(float); al=a[:,:,3:4]/255
o=a[:,:,:3]*al+BG*(1-al)
A=a[:,:,3]
# alpha map: transparent = black, semi = mid grey, opaque=white
am=np.stack([A]*3,2)
gap=np.zeros((y1-y0,1,3))+120
row=np.concatenate([h[y0:y1,x0:x1],gap,o[y0:y1,x0:x1],gap,am[y0:y1,x0:x1]],1).astype(np.uint8)
im=Image.fromarray(row); im.resize((im.width*z,im.height*z),Image.NEAREST).save(out)
