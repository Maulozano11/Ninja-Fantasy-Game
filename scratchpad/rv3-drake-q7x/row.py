from PIL import Image, ImageDraw
import sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
OUT=S+'art2/review-beast-r3/'
BG=(34,34,44)
sheet=Image.open(S+'art2/staging/vfx_beasts/earth.png').convert('RGBA')
W,H=287,167
def ours(f):
    fr=sheet.crop((f*W,0,(f+1)*W,H))
    b=Image.new('RGBA',(W,H),BG+(255,)); b.alpha_composite(fr); return b.convert('RGB')
name=sys.argv[1]; frames=[int(v) for v in sys.argv[2].split(',')]; box=tuple(int(v) for v in sys.argv[3:7]); k=int(sys.argv[7])
w=box[2]-box[0]; h=box[3]-box[1]
c=Image.new('RGB',((w*k+6)*len(frames),h*k+14),(255,255,255))
d=ImageDraw.Draw(c)
for i,f in enumerate(frames):
    c.paste(ours(f).crop(box).resize((w*k,h*k),Image.NEAREST),(i*(w*k+6),14))
    d.text((i*(w*k+6)+3,1),'f%d'%f,fill=(0,0,0))
c.save(OUT+name)
