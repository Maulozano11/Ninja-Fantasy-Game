import sys
from PIL import Image
import numpy as np
S,R,k,gx0,gy0,gx1,gy1,name,thr=sys.argv[1],sys.argv[2],int(sys.argv[3]),*map(int,sys.argv[4:8]),sys.argv[8],int(sys.argv[9])
sc=96/228
ox,oy={0:(438,1560),5:(1104,1540)}[k]
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
Z=6
hc=ref.crop((round(ox+gx0/sc),round(oy+gy0/sc),round(ox+gx1/sc),round(oy+gy1/sc)))
a=np.asarray(hc).astype(int)
bg=np.array([34,34,44])
isbg=(np.abs(a-bg).sum(2)<thr)
b=a.copy(); b[isbg]=(255,0,255)
hc2=Image.fromarray(b.astype(np.uint8)).resize(((gx1-gx0)*Z,(gy1-gy0)*Z),Image.NEAREST)
f=Image.open(R+'/ours-f%d.png'%k).convert('RGBA').crop((gx0,gy0,gx1,gy1))
bgi=Image.new('RGBA',f.size,(255,0,255,255)); bgi.alpha_composite(f)
oc=bgi.convert('RGB').resize(((gx1-gx0)*Z,(gy1-gy0)*Z),Image.NEAREST)
out=Image.new('RGB',(hc2.width*2+8,hc2.height),(255,255,255))
out.paste(hc2,(0,0)); out.paste(oc,(hc2.width+8,0)); out.save(R+'/key-%s.png'%name)
