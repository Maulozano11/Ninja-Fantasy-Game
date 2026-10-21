import sys, json
from PIL import Image, ImageDraw
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
man=json.load(open(A+'/staging/vfx_earth_v3/manifest.json'))['sprites']
n,anim=sys.argv[1],sys.argv[2]; frames=[int(x) for x in sys.argv[3].split(',')]; z=int(sys.argv[4]); cols=int(sys.argv[5]) if len(sys.argv)>5 else len(frames)
bgname=sys.argv[6] if len(sys.argv)>6 else 'dark'
bg={'dark':(36,36,48),'light':(200,200,190),'grass':(96,128,64)}[bgname]
m=man[n]; im=Image.open(A+'/staging/vfx_earth_v3/'+m['file']).convert('RGBA'); fw,fh=m['frameW'],m['frameH']; row=m['anims'][anim]['row']
ax,ay=m['anchor']
rows=(len(frames)+cols-1)//cols
out=Image.new('RGB',((fw+3)*cols,(fh+3)*rows),(255,0,255))
for i,f in enumerate(frames):
    fr=im.crop((f*fw,row*fh,(f+1)*fw,(row+1)*fh))
    b=Image.new('RGBA',(fw,fh),bg+(255,)); b.alpha_composite(fr)
    d=ImageDraw.Draw(b); d.point((ax,ay),fill=(255,0,0))
    out.paste(b.convert('RGB'),((i%cols)*(fw+3),(i//cols)*(fh+3)))
out=out.resize((out.width*z,out.height*z),Image.NEAREST)
fn=f'{A}/review-set-r4/s-{n}-{anim}-{"_".join(map(str,frames[:1]+frames[-1:]))}-{bgname}.png'
out.save(fn); print(fn, out.size)
