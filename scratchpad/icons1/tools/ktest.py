import numpy as np
from PIL import Image, ImageFilter
pal='161638 1a2453 183270 1a4386 17559e 2169ab 267cbc 3091c9 3fa5d6 4ebbe2 56d2ed 6fe8f5 a1f5fa d8feff'.split()
P=np.array([[int(h[i:i+2],16) for i in (0,2,4)] for h in pal],float)
his=Image.open('../art2/staging/ui_icons/ref/kirin_thunder.png').convert('RGB').crop((1,1,200,205))
his=his.filter(ImageFilter.MedianFilter(3))
def q(a):
    d=((a[:,:,None,:]-P[None,None])**2).sum(-1); return P[d.argmin(-1)].astype(np.uint8)
outs=[]
for name,img in [('box',his.resize((44,44),Image.BOX)),('lanczos',his.resize((44,44),Image.LANCZOS)),('bicubic',his.resize((44,44),Image.BICUBIC))]:
    a=np.asarray(img).astype(float)
    outs.append(q(a))
    # contrast: s-curve on luminance around mean
    lum=a@[0.3,0.59,0.11]; m=lum.mean()
    k=1.35; a2=np.clip(m+(a-m)*k,0,255)
    outs.append(q(a2))
# unsharp on source then lanczos
u=his.filter(ImageFilter.UnsharpMask(radius=3,percent=150,threshold=0)).resize((44,44),Image.LANCZOS)
outs.append(q(np.asarray(u).astype(float)))
v=Image.new('RGB',(len(outs)*360,356),(20,20,26))
for i,o in enumerate(outs): v.paste(Image.fromarray(o).resize((352,352),Image.NEAREST),(i*360,2))
v.save('iter/ktest.png')
