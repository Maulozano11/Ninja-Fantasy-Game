import sys, numpy as np
from PIL import Image
R=sys.argv[1]
BG=np.array([31,31,41.])
for side,fi in [('L',0),('R',4)]:
    h=np.load(f'{R}/v5scripts/his{side}.npy')
    a=np.asarray(Image.open(f'{R}/v5-fly{fi}.png')).astype(float)
    A=a[:,:,3]
    dh=np.abs(h-BG).sum(2)
    for t in [10,20,30,45]:
        miss=(A==0)&(dh>t)
        print(side,'his differs from bg by >',t,'where ours transparent:',miss.sum(), ' ours opaque where his ~bg(<8):',((A>0)&(dh<8)).sum())
    miss=(A==0)&(dh>20)
    img=np.zeros(h.shape)+0; img[...]=h
    img[miss]=[255,255,0]
    extra=(A>0)&(dh<8)
    img[extra]=[0,255,255]
    im=Image.fromarray(img.astype(np.uint8)); im.resize((im.width*3,im.height*3),Image.NEAREST).save(f'{R}/v5-missing-{side}.png')
