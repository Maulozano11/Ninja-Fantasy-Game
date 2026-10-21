import sys
from PIL import Image
import numpy as np
S,R,k,gx0,gy0,gx1,gy1,name=sys.argv[1],sys.argv[2],int(sys.argv[3]),*map(int,sys.argv[4:8]),sys.argv[8]
sc=96/228
ox,oy={0:(438,1560),5:(1104,1540)}[k]
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
Z=6
hc=ref.crop((round(ox+gx0/sc),round(oy+gy0/sc),round(ox+gx1/sc),round(oy+gy1/sc))).resize(((gx1-gx0)*Z,(gy1-gy0)*Z),Image.LANCZOS)
f=Image.open(R+'/ours-f%d.png'%k).convert('RGBA').crop((gx0,gy0,gx1,gy1))
bg=Image.new('RGBA',f.size,(255,0,255,255)); bg.alpha_composite(f)
oc=bg.convert('RGB').resize(((gx1-gx0)*Z,(gy1-gy0)*Z),Image.NEAREST)
out=Image.new('RGB',(hc.width*2+8,hc.height),(255,255,255))
out.paste(hc,(0,0)); out.paste(oc,(hc.width+8,0)); out.save(R+'/zoom-%s.png'%name)
