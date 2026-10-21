import sys, numpy as np
from PIL import Image
R=sys.argv[1]; name=sys.argv[2]; z=int(sys.argv[3]); bgn=sys.argv[4]
bgs={'grass':(92,110,82),'dark':(31,31,41),'sand':(190,170,130)}
bg=np.array(bgs[bgn],float)
a=np.asarray(Image.open(f'{R}/v5-{name}.png')).astype(float); al=a[:,:,3:4]/255
o=(a[:,:,:3]*al+bg*(1-al)).astype(np.uint8)
im=Image.fromarray(o); im.resize((im.width*z,im.height*z),Image.NEAREST).save(f'{R}/v5-big-{name}-{bgn}.png')
