import sys
from collections import deque
from PIL import Image, ImageDraw
import numpy as np
ref=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
BG=np.array([31,33,46],np.float32)
X0,Y0,X1,Y1=209,689,550,797
c=ref[Y0:Y1,X0:X1]
r,g,b=c[...,0],c[...,1],c[...,2]
diff=np.abs(c-BG).sum(2); lum=c.sum(2)
purple=(r-g>10)&(b-g>10)&(diff>20)
cand=((diff>40)&~purple)|(lum<BG.sum()-22)
vis=(c*0.25).astype(np.uint8)
vis[cand]=np.clip(c[cand]*0.6+60,0,255).astype(np.uint8)
vis[purple]=(120,0,120)
k=8
img=Image.fromarray(vis).resize((vis.shape[1]*k,vis.shape[0]*k),Image.NEAREST)
d=ImageDraw.Draw(img)
for x in range(X0-X0%5+5,X1,5):
    X=(x-X0)*k; d.line([(X,0),(X,img.height)],fill=(255,255,255) if x%10==0 else (70,70,70))
    if x%10==0: d.text((X+2,2),str(x),fill=(255,255,0))
for y in range(Y0-Y0%5+5,Y1,5):
    Y=(y-Y0)*k; d.line([(0,Y),(img.width,Y)],fill=(255,255,255) if y%10==0 else (70,70,70))
    if y%10==0: d.text((2,Y+2),str(y),fill=(255,255,0))
img.crop((0,0,172*k,img.height)).save('work/maskL.png')
img.crop((170*k,0,img.width,img.height)).save('work/maskR.png')
