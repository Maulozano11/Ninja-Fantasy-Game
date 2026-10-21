import sys, numpy as np
from PIL import Image
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
BG=np.array([31,31,41])
sc=0.774
def his(box):
    c=ref.crop(box)
    return np.asarray(c.resize((round(c.width*sc),round(c.height*sc)),Image.BOX)).astype(float)
def ours(i,kind='fly'):
    a=np.asarray(Image.open(f'{R}/v5-{kind}{i}.png')).astype(float)
    al=a[:,:,3:4]/255
    return a[:,:,:3]*al+BG*(1-al), a[:,:,3]
for name,box,fi,dx,dy in [('L',(262,796,522,1009),0,21,-3),('R',(522,796,785,1009),4,5,-1)]:
    h=his(box); hh,ww,_=h.shape
    canvas=np.zeros((167,212,3))+BG
    ys0=max(0,dy); xs0=max(0,dx); ys1=min(167,dy+hh); xs1=min(212,dx+ww)
    canvas[ys0:ys1,xs0:xs1]=h[ys0-dy:ys1-dy,xs0-dx:xs1-dx]
    np.save(f'{R}/v5scripts/his{name}.npy',canvas)
    o,A=ours(fi)
    d=np.abs(canvas-o).sum(2)
    print(name,'mean abs err per ch %.2f'%(np.abs(canvas-o).mean()))
    dimg=np.clip(d*2,0,255)
    dimg=np.stack([dimg]*3,2)
    gap=np.zeros((167,4,3))+80
    row=np.concatenate([canvas,gap,o,gap,dimg],1).astype(np.uint8)
    im=Image.fromarray(row); im.resize((im.width*3,im.height*3),Image.NEAREST).save(f'{R}/v5-cmp-{name}-3x.png')
    # also individual 3x
    Image.fromarray(canvas.astype(np.uint8)).resize((636,501),Image.NEAREST).save(f'{R}/v5-his{name}-3x.png')
    Image.fromarray(o.astype(np.uint8)).resize((636,501),Image.NEAREST).save(f'{R}/v5-our{name}-3x.png')
