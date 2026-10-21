# usage: trees-strip.py sprite anim x y w h scale out  -> all frames of anim side by side (crop region)
import sys, json
from PIL import Image
root='/home/user/Ninja-Fantasy-Game/src/assets/world/trees/'
man=json.load(open(root+'manifest.json'))['sprites']
name,anim,x,y,w,h,k,out=sys.argv[1:9]
s=man[name]; fw,fh=s['frameW'],s['frameH']; a=s['anims'][anim]; row=a['row']
x,y,w,h,k=map(int,(x,y,w,h,k))
if w<=0: w=fw-x
if h<=0: h=fh-y
im=Image.open(root+s['file']).convert('RGBA')
n=a['frames']
o=Image.new('RGBA',((w+3)*n,h),'#5d6b57')
for i in range(n):
    f=im.crop((i*fw+x,row*fh+y,i*fw+x+w,row*fh+y+h))
    b=Image.new('RGBA',f.size,'#5d6b57'); b.alpha_composite(f); o.paste(b,(i*(w+3),0))
o=o.resize((o.width*k,o.height*k),Image.NEAREST); o.save(out)
