import sys
from PIL import Image, ImageDraw
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-throw-pierce/review/'
# usage: zoom.py out.png scale x0 y0 x1 y1 file1 file2 ...
out=sys.argv[1]; s=int(sys.argv[2]); box=tuple(int(a) for a in sys.argv[3:7]); files=sys.argv[7:]
ims=[]
for f in files:
  im=Image.open(D+'raw/'+f).crop(box)
  bg=Image.new('RGBA',im.size,(70,78,90,255)); bg.alpha_composite(im)
  ims.append(bg.resize((im.width*s,im.height*s),Image.NEAREST))
W=sum(i.width+6 for i in ims); H=ims[0].height+14
S=Image.new('RGB',(W,H),(20,20,20)); d=ImageDraw.Draw(S)
x=0
for f,i in zip(files,ims):
  S.paste(i,(x,14)); d.text((x+2,1),f,fill=(255,255,255)); x+=i.width+6
S.save(D+out)
