import numpy as np
from PIL import Image, ImageFilter
pal='161638 1a2453 183270 1a4386 17559e 2169ab 267cbc 3091c9 3fa5d6 4ebbe2 56d2ed 6fe8f5 a1f5fa d8feff'.split()
P=np.array([[int(h[i:i+2],16) for i in (0,2,4)] for h in pal],float)
P8=P[[0,1,3,5,7,9,11,13]]
his=Image.open('../art2/staging/ui_icons/ref/kirin_thunder.png').convert('RGB').crop((1,1,200,205)).filter(ImageFilter.MedianFilter(3))
def q(a,P=P):
    d=((a[:,:,None,:]-P[None,None])**2).sum(-1); return P[d.argmin(-1)].astype(np.uint8)
outs=[]
for r,pc in [(2,150),(3,200),(4,250),(6,200)]:
    u=his.filter(ImageFilter.UnsharpMask(radius=r,percent=pc,threshold=0)).resize((44,44),Image.LANCZOS)
    outs.append(q(np.asarray(u).astype(float)))
u=his.filter(ImageFilter.UnsharpMask(radius=3,percent=200,threshold=0)).resize((44,44),Image.LANCZOS)
outs.append(q(np.asarray(u).astype(float),P8))
v=Image.new('RGB',(len(outs)*360,356+60),(20,20,26))
for i,o in enumerate(outs):
    im=Image.fromarray(o); v.paste(im.resize((352,352),Image.NEAREST),(i*360,2)); v.paste(im,(i*360+10,362))
v.save('iter/ktest2.png')
