import json, sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2'; R=A+'/review-poison-set-r1'; G=A+'/staging/vfx_poison_v3'
man=json.load(open(G+'/manifest.json'))['sprites']
# name anim zoom bg(dark|grass) [frames] [crop x0,y0,x1,y1] [cols]
name,an,Z,bgn=sys.argv[1],sys.argv[2],int(sys.argv[3]),sys.argv[4]
sel=sys.argv[5] if len(sys.argv)>5 and sys.argv[5]!='-' else None
crop=tuple(map(int,sys.argv[6].split(','))) if len(sys.argv)>6 and sys.argv[6]!='-' else None
cols=int(sys.argv[7]) if len(sys.argv)>7 else 99
bg={'dark':(28,30,38),'grass':(92,128,64)}[bgn]
m=man[name]; a=m['anims'][an]; fw,fh=m['frameW'],m['frameH']
im=Image.open(G+'/'+m['file']).convert('RGBA')
idxs=list(range(a['frames'])) if not sel else [int(x) for x in sel.split(',')]
if not crop: crop=(0,0,fw,fh)
w,h=crop[2]-crop[0],crop[3]-crop[1]
cols=min(cols,len(idxs)); rows=(len(idxs)+cols-1)//cols
out=Image.new('RGB',(cols*(w*Z+6),rows*(h*Z+14)),(80,80,80))
d=ImageDraw.Draw(out)
for k,i in enumerate(idxs):
    f=im.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh)).crop(crop)
    p=Image.new('RGBA',(w,h),bg+(255,)); p.alpha_composite(f)
    x=(k%cols)*(w*Z+6); y=(k//cols)*(h*Z+14)
    out.paste(p.convert('RGB').resize((w*Z,h*Z),Image.NEAREST),(x,y+14))
    d.text((x+2,y+1),'%s %s f%d'%(name,an,i),fill=(255,255,0))
fn='strip-%s-%s-%s%s.png'%(name,an,bgn,('-'+sys.argv[8]) if len(sys.argv)>8 else '')
out.save(R+'/'+fn); print(fn,out.size)
