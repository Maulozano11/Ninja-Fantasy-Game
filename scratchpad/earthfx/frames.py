# frames.py <dir> <name> <anim> <frames csv> <out> [scale] [bg r,g,b] [crop x0,y0,x1,y1] [cols]
import sys,json
from PIL import Image
d,name,an,fl,out=sys.argv[1:6]; fl=[int(v) for v in fl.split(',')]
k=int(sys.argv[6]) if len(sys.argv)>6 else 4
bg=tuple(int(v) for v in (sys.argv[7] if len(sys.argv)>7 else '222,214,190').split(','))
crop=tuple(int(v) for v in sys.argv[8].split(',')) if len(sys.argv)>8 and sys.argv[8]!='-' else None
cols=int(sys.argv[9]) if len(sys.argv)>9 else len(fl)
m=json.load(open(d+'/manifest.json'))['sprites'][name]
im=Image.open(d+'/'+m['file']).convert('RGBA'); fw,fh=m['frameW'],m['frameH']; a=m['anims'][an]
ts=[]
for i in fl:
    f=im.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh))
    if crop: f=f.crop(crop)
    c=Image.new('RGBA',f.size,bg+(255,)); c.alpha_composite(f); ts.append(c.convert('RGB').resize((f.width*k,f.height*k),Image.NEAREST))
W,H=ts[0].size; rows=(len(ts)+cols-1)//cols
o=Image.new('RGB',(cols*(W+6),rows*(H+6)),(255,0,255))
for j,t in enumerate(ts): o.paste(t,((j%cols)*(W+6),(j//cols)*(H+6)))
o.save(out); print(o.size)
