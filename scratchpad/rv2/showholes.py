import sys
import numpy as np
from PIL import Image, ImageDraw
sys.argv_saved=sys.argv; 
exec(open('holes.py').read().split("if __name__")[0])
name,anim=sys.argv[1],sys.argv[2]; fis=[int(x) for x in sys.argv[3].split(',')]; k=int(sys.argv[4])
ims=[]
for i in fis:
    fr=frame(name,anim,i); a=np.asarray(fr)[...,3]; op=a>0
    holes=(~op)&~outside(~op)
    o=np.asarray(on(fr,(205,205,200))).copy(); o[holes]=(255,0,255)
    ims.append(up(Image.fromarray(o),k))
out=Image.new('RGB',(sum(i.width+6 for i in ims),ims[0].height+14),(0,0,0)); d=ImageDraw.Draw(out); x=0
for i,im in zip(fis,ims): out.paste(im,(x,14)); d.text((x+2,1),'%s %d holes=magenta'%(anim,i),fill=(255,255,255)); x+=im.width+6
out.save(OUT+'/holes-%s-%s.png'%(name,anim)); print(out.size)
