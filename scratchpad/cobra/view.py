import sys, numpy as np
from PIL import Image
fr=np.load(sys.argv[1]); idx=[int(v) for v in sys.argv[2].split(',')]; k=int(sys.argv[3]); out=sys.argv[4]
crop=None
if len(sys.argv)>5: crop=[int(v) for v in sys.argv[5].split(',')]
ims=[]
for i in idx:
    im=Image.new('RGBA',fr.shape[2:0:-1],(93,107,87,255)); im.alpha_composite(Image.fromarray(fr[i],'RGBA'))
    if crop: im=im.crop(crop)
    ims.append(im)
W=sum(i.width+3 for i in ims); H=ims[0].height
o=Image.new('RGBA',(W,H),(0,0,0,255)); x=0
for i in ims: o.paste(i,(x,0)); x+=i.width+3
o.resize((o.width*k,o.height*k),Image.NEAREST).save(out)
