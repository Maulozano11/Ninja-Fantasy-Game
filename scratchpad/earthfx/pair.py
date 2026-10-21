# pair.py <stagingGroupDir> <revDir> <name> <anim> <frame> <out> [scale] [x0,y0,x1,y1 crop in ref coords]
import sys,json
from PIL import Image
import numpy as np
d,rev,name,an,fi,out=sys.argv[1:7]; fi=int(fi)
k=int(sys.argv[7]) if len(sys.argv)>7 else 4
m=json.load(open(d+'/manifest.json'))['sprites'][name]
refa=json.load(open(rev+'/his-anchors.json'))[name]
his=Image.open(rev+'/his-%s.png'%('aura' if name=='aura_back' else name)).convert('RGB')
W,H=his.size
im=Image.open(d+'/'+m['file']).convert('RGBA'); fw,fh=m['frameW'],m['frameH']; a=m['anims'][an]
f=im.crop((fi*fw,a['row']*fh,(fi+1)*fw,(a['row']+1)*fh))
# place ours on his grid
ox=refa[0]-m['anchor'][0]; oy=refa[1]-m['anchor'][1]
ours=Image.new('RGBA',(W,H),(0,0,0,0)); ours.alpha_composite(f,(0,0) if False else (0,0)) if False else None
ours=Image.new('RGBA',(W+200,H+200),(0,0,0,0)); ours.alpha_composite(f,(ox+100,oy+100)); ours=ours.crop((100,100,100+W,100+H))
crop=None
if len(sys.argv)>8: crop=tuple(int(v) for v in sys.argv[8].split(','))
def bgc(c):
    b=Image.new('RGBA',(W,H),c+(255,)); b.alpha_composite(ours); return b.convert('RGB')
tiles=[his,bgc((34,34,45)),bgc((222,214,190))]
if crop: tiles=[t.crop(crop) for t in tiles]
tw,th=tiles[0].size
c=Image.new('RGB',(3*(tw*k+8),th*k),(0,0,0))
for i,t in enumerate(tiles): c.paste(t.resize((tw*k,th*k),Image.NEAREST),(i*(tw*k+8),0))
c.save(out); print(c.size)
