import json, sys, os
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
G=S+'/art2/staging/vfx_earth_v3/'
man=json.load(open(G+'manifest.json'))['sprites']
name,anim=sys.argv[1],sys.argv[2]; k=int(sys.argv[3]); per=int(sys.argv[4]); bg=tuple(map(int,sys.argv[5].split(','))) if len(sys.argv)>5 else (34,34,45)
sel=list(map(int,sys.argv[6].split(','))) if len(sys.argv)>6 else None
m=man[name]; a=m['anims'][anim]; fw,fh=m['frameW'],m['frameH']
sh=Image.open(G+m['file']).convert('RGBA')
idx=sel or list(range(a['frames']))
rows=(len(idx)+per-1)//per
out=Image.new('RGB',(per*(fw*k+4),rows*(fh*k+14)),(10,10,10))
d=ImageDraw.Draw(out)
for j,i in enumerate(idx):
    f=sh.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh))
    b=Image.new('RGBA',f.size,bg+(255,)); b.alpha_composite(f)
    x=(j%per)*(fw*k+4); y=(j//per)*(fh*k+14)
    out.paste(b.convert('RGB').resize((fw*k,fh*k),Image.NEAREST),(x,y+12))
    d.text((x+2,y),str(i),fill=(255,255,0))
out.save('s-%s-%s.png'%(name,anim))
