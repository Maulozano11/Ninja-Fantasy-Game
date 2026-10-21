import sys, numpy as np
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
names = [('idle0','reposo'),('attack0','ataque 1'),('attack1','ataque 2'),('attack2','ataque 3'),('cast0','jutsu'),('hurt0','herido'),('victory0','victoria'),
         ('charge0','carga'),('walk2','caminar'),('run1','correr'),('crouch0','agachado'),('handsigns0','sellos'),('sit0','sentado'),('downed0','caído')]
G=256
ims=[np.fromfile(f'{src}/{n}.rgba',np.uint8).reshape(G,G,4) for n,_ in names]
a=np.zeros((G,G),bool)
for im in ims: a|=im[...,3]>0
ys,xs=np.where(a); y0,y1,x0,x1=ys.min()-2,ys.max()+3,xs.min()-2,xs.max()+3
K=3; cw,ch=(x1-x0)*K,(y1-y0)*K; cols=7
sheet=Image.new('RGB',(cols*cw,2*(ch+22)),(38,40,52)); d=ImageDraw.Draw(sheet)
for i,(im,(n,lab)) in enumerate(zip(ims,names)):
    c=Image.fromarray(im[y0:y1,x0:x1]).resize((cw,ch),Image.NEAREST)
    X=(i%cols)*cw; Y=(i//cols)*(ch+22)
    sheet.paste(c,(X,Y+22),c); d.text((X+6,Y+5),lab,fill=(235,225,200))
sheet.save(out)
print(sheet.size)
