# usage: trees-crop.py sprite anim frame x y w h scale out [bg]
import sys, json
from PIL import Image
root='/home/user/Ninja-Fantasy-Game/src/assets/world/trees/'
man=json.load(open(root+'manifest.json'))['sprites']
name,anim,fr,x,y,w,h,k,out=sys.argv[1:10]
bg=sys.argv[10] if len(sys.argv)>10 else '#5d6b57'
s=man[name]; fw,fh=s['frameW'],s['frameH']; row=s['anims'][anim]['row']
im=Image.open(root+s['file']).convert('RGBA')
f=im.crop((int(fr)*fw,row*fh,int(fr)*fw+fw,row*fh+fh))
x,y,w,h,k=map(int,(x,y,w,h,k))
if w<=0: w=fw-x
if h<=0: h=fh-y
c=f.crop((x,y,x+w,y+h))
b=Image.new('RGBA',c.size,bg); b.alpha_composite(c)
b=b.resize((w*k,h*k),Image.NEAREST); b.save(out)
