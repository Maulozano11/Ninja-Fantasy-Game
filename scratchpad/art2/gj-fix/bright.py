import sys,numpy as np
from PIL import Image
pd=sys.argv[1]
for name in sys.argv[2:]:
    im=np.asarray(Image.open(f'{pd}/{name}.png').convert('RGB')).astype(float)
    H=im.shape[0]
    for z in (4,2):
        if (im.shape[1]-20)%(3*z)==0: break
    W=(im.shape[1]-20)//(3*z)
    his=im[::z, :W*z:z]; ours=im[::z, W*z+10:W*z+10+W*z:z]
    L=lambda c:0.299*c[...,0]+0.587*c[...,1]+0.114*c[...,2]
    for t in (200,215):
        print(name,t,'his %.2f%%'%(100*(L(his)>t).mean()),'ours %.2f%%'%(100*(L(ours)>t).mean()))
