from PIL import Image, ImageDraw
import sys
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
n,x0,y0,x1,y1,k,S,out=sys.argv[1],*map(int,sys.argv[2:8]),sys.argv[8]
his=Image.open('his_'+n+'.png')
# his crop scaled with lanczos so 1 grid cell = 1 px at size S
big=his.resize((S*k,S*k),Image.LANCZOS).crop((x0*k,y0*k,x1*k,y1*k))
d=ImageDraw.Draw(big)
for i in range(0,big.width,k): d.line([(i,0),(i,big.height)],fill=(0,0,0),width=1)
for j in range(0,big.height,k): d.line([(0,j),(big.width,j)],fill=(0,0,0),width=1)
for i in range(x0,x1):
    if i%5==0: d.text(((i-x0)*k+2,2),str(i),fill=(255,255,0))
for j in range(y0,y1):
    if j%5==0: d.text((2,(j-y0)*k+2),str(j),fill=(255,255,0))
big.save(R+out)
