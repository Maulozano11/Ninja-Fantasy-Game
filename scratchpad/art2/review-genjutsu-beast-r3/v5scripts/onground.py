import sys, numpy as np
from PIL import Image
R=sys.argv[1]; kind=sys.argv[2]; idxs=[int(i) for i in sys.argv[3].split(',')]; bgname=sys.argv[4]; z=int(sys.argv[5])
bgs={'grass':(92,110,82),'sand':(190,170,130),'dark':(31,31,41),'snow':(225,228,235)}
bg=np.array(bgs[bgname],float)
rows=[]
for i in idxs:
    a=np.asarray(Image.open(f'{R}/v5-{kind}{i}.png')).astype(float); al=a[:,:,3:4]/255
    o=a[:,:,:3]*al+bg*(1-al)
    o[0,:]=o[-1,:]=o[:,0]=o[:,-1]=[255,0,255]
    rows.append(o)
    rows.append(np.zeros((167,3,3))+255)
img=np.concatenate(rows[:-1],1).astype(np.uint8)
im=Image.fromarray(img); im.resize((im.width*z,im.height*z),Image.NEAREST).save(f'{R}/v5-{kind}-{sys.argv[3].replace(",","")}-{bgname}.png')
