import numpy as np
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
M='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/06-09-tierra-genjutsu-chakra-veneno/'
box=(1380,360,1560,620)
ims=[np.asarray(Image.open(A+'vfx-%s.png'%e).convert('RGB').crop(box)).astype(int) for e in ['earth','genjutsu','chakra','poison']]
same=np.all([np.all(ims[0]==x,axis=-1) for x in ims[1:]],axis=0)
bg1=np.all(ims[0]==[20,18,26],axis=-1); bg2=np.all(ims[0]==[33,30,42],axis=-1)
mask=same&~bg1&~bg2
ys,xs=np.nonzero(mask); print('bbox',xs.min(),xs.max(),ys.min(),ys.max())
# check 2x phase
x0,y0=xs.min(),ys.min()
for px in (0,1):
  for py in (0,1):
    a=ims[0][py::2,px::2]; b=ims[0][py::2,(1-px)::2]
    pass
# find phase: pixel blocks 2x2 uniform
best=None
for px in (0,1):
  for py in (0,1):
    sub=ims[0][py:py+250, px:px+178]
    h=(sub.shape[0]//2)*2; w=(sub.shape[1]//2)*2
    sub=sub[:h,:w]
    blk=sub.reshape(h//2,2,w//2,2,3)
    uni=np.all(blk==blk[:,0:1,:,0:1,:],axis=(1,3,4)).mean()
    print(px,py,uni)
rgb=ims[0][::2,::2]; mk=mask[::2,::2]
out=np.zeros(rgb.shape[:2]+(4,),np.uint8); out[...,:3]=rgb; out[...,3]=mk*255
im=Image.fromarray(out); im=im.crop(im.getbbox()); im.save(M+'char_1x.png'); print(im.size)
o=Image.open(M+'../03-05-agua-viento-rayo/char_1x.png').convert('RGBA')
if o.size==im.size: print('diff px', (np.asarray(o)!=np.asarray(im)).any(-1).sum())
bg=Image.new('RGBA',im.size,(255,0,255,255)); bg.alpha_composite(im); bg.resize((im.width*4,im.height*4),Image.NEAREST).save(M+'t_char4.png')
