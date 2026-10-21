from PIL import Image
import sys
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-beast-r2'
# z1.py frame x0 y0 x1 y1 k out  -> dark | grass | alpha-mask(magenta)
f=Image.open(R+'/'+sys.argv[1]).convert('RGBA')
x0,y0,x1,y1,k=map(int,sys.argv[2:7]); out=sys.argv[7]
c=f.crop((x0,y0,x1,y1)); W=(x1-x0)*k; H=(y1-y0)*k
img=Image.new('RGB',(W*3+16,H),(255,255,0))
for j,bg in enumerate([(31,31,41),(96,112,80),(255,0,255)]):
    b=Image.new('RGBA',c.size,bg+(255,)); b.alpha_composite(c)
    img.paste(b.convert('RGB').resize((W,H),Image.NEAREST),(j*(W+8),0))
img.save(R+'/'+out)
