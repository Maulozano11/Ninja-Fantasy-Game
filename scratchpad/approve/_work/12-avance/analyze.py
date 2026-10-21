import json, colorsys, sys
import numpy as np
from PIL import Image
W=sys.argv[1]
m=json.load(open(W+'/snap/new/manifest.json'))['sprites']
HUES={'water':[(165,235)],'wind':[(120,200),(55,75)],'lightning':[(180,260),(40,70)],'earth':[(0,60),(60,110),(40,80)],
      'genjutsu':[(240,345)],'chakra':[(180,250)],'poison':[(60,140),(40,70),(330,360),(0,10)]}
for n,s in m.items():
    im=np.array(Image.open(W+'/snap/new/'+s['file']).convert('RGBA')).astype(int)
    fw,fh=s['frameW'],s['frameH']; a=s['anims']['fly']
    print(f"== {n} {fw}x{fh} frames={a['frames']} fps={a['fps']} sheet={im.shape[1]}x{im.shape[0]} expected={fw*a['frames']}x{fh}")
    for f in range(a['frames']):
        fr=im[:fh, f*fw:(f+1)*fw]
        al=fr[...,3]
        op=al>0
        ys,xs=np.nonzero(op)
        bbox=(xs.min(),ys.min(),xs.max(),ys.max()) if len(xs) else None
        edge=int(op[0,:].sum()+op[-1,:].sum()+op[:,0].sum()+op[:,-1].sum())
        semi=int(((al>0)&(al<255)).sum())
        alvals=sorted(set(al[op].tolist()))
        # off-hue
        off=[]
        for y,x in zip(ys,xs):
            r,g,b,_=fr[y,x]
            h,l,sat=colorsys.rgb_to_hls(r/255,g/255,b/255)
            if sat>0.35 and 0.15<l<0.9:
                hd=h*360
                if not any(lo<=hd<=hi for lo,hi in HUES[n]): off.append((x,y,(r,g,b,fr[y,x,3]),int(hd)))
        print(f"  f{f} bbox={bbox} opaque={int(op.sum())} edgepx={edge} semi={semi} alphas={alvals[:6]}{'...' if len(alvals)>6 else ''} offhue={len(off)} {off[:4]}")
