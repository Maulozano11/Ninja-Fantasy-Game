import sys
from PIL import Image, ImageDraw, ImageFont
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/'
name=sys.argv[1]; idxs=sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 3
scale=float(sys.argv[4]) if len(sys.argv)>4 else 1.0
im=Image.open(A+name)
n=im.n_frames
if idxs=='all': ids=list(range(n))
elif idxs=='fml': ids=sorted(set([0,n//2,n-1]))
else: ids=[int(x) if int(x)>=0 else n+int(x) for x in idxs.split(',')]
frames=[]
for i in ids:
    im.seek(i); frames.append((i,im.convert('RGB').copy(),im.info.get('duration')))
w,h=frames[0][1].size
if scale!=1: w2,h2=int(w*scale),int(h*scale)
else: w2,h2=w,h
rows=(len(frames)+cols-1)//cols
out=Image.new('RGB',(cols*(w2+6),rows*(h2+26)),(255,0,255))
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
d=ImageDraw.Draw(out)
for k,(i,fr,du) in enumerate(frames):
    if scale!=1: fr=fr.resize((w2,h2),Image.NEAREST)
    x=(k%cols)*(w2+6); y=(k//cols)*(h2+26)
    out.paste(fr,(x,y+22)); d.text((x+2,y+2),f'f{i} {du}ms',fill=(255,255,255),font=f)
o=A+'_work/qa/strip_'+name.replace('.gif','')+'.png'
out.save(o); print(o,out.size,n)
