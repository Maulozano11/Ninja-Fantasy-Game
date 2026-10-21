import json, colorsys, sys
import numpy as np
from PIL import Image
W=sys.argv[1]
m=json.load(open(W+'/snap/new/manifest.json'))['sprites']
for n,s in m.items():
    im=np.array(Image.open(W+'/snap/new/'+s['file']).convert('RGBA')).astype(int)
    a=im[...,3]>0
    px=im[a]
    hist={}
    pink=[];green=[]
    ys,xs=np.nonzero(a)
    for (r,g,b,al),y,x in zip(px,ys,xs):
        h,l,sat=colorsys.rgb_to_hls(r/255,g/255,b/255)
        if sat<0.12 or l<0.08 or l>0.95: hist['grey']=hist.get('grey',0)+1; continue
        hb=int(h*360)//30*30
        hist[hb]=hist.get(hb,0)+1
        hd=h*360
        if 290<=hd<=345: pink.append((x%s['frameW'],y,x//s['frameW'],(r,g,b,al)))
        if 75<=hd<=160: green.append((x%s['frameW'],y,x//s['frameW'],(r,g,b,al)))
    print(n, dict(sorted(hist.items(),key=lambda t:str(t[0]))), 'pink',len(pink),pink[:3],'green',len(green),green[:3])
