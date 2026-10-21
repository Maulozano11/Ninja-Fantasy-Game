from PIL import Image, ImageDraw
import sys
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
f,x0,y0,x1,y1,k,out=sys.argv[1],*map(int,sys.argv[2:7]),sys.argv[7]
im=Image.open(D+f).convert('RGB').crop((x0,y0,x1,y1))
im=im.resize((im.width*k,im.height*k),Image.NEAREST)
d=ImageDraw.Draw(im)
for i in range(0,im.width,k): d.line([(i,0),(i,im.height)],fill=(0,0,0),width=1)
for j in range(0,im.height,k): d.line([(0,j),(im.width,j)],fill=(0,0,0),width=1)
for i in range(x0,x1):
    if i%5==0: d.text(((i-x0)*k+2,2),str(i),fill=(255,255,0))
for j in range(y0,y1):
    if j%5==0: d.text((2,(j-y0)*k+2),str(j),fill=(255,255,0))
im.save(R+out)
