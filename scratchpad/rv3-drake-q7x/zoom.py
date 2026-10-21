from PIL import Image
import sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
OUT=S+'art2/review-beast-r3/'
BG=(34,34,44)
sheet=Image.open(S+'art2/staging/vfx_beasts/earth.png').convert('RGBA')
W,H=287,167
def ours(f,bg=BG):
    fr=sheet.crop((f*W,0,(f+1)*W,H))
    b=Image.new('RGBA',(W,H),bg+(255,)); b.alpha_composite(fr); return b.convert('RGB')
name=sys.argv[1]; f=int(sys.argv[2]); box=tuple(int(v) for v in sys.argv[3:7]); k=int(sys.argv[7])
his=Image.open(OUT+('his-f0-game.png' if f==0 else 'his-f5-game.png')).crop(box)
o=ours(f).crop(box)
w,h=his.size
c=Image.new('RGB',(w*2*k+6,h*k),(255,255,255))
c.paste(his.resize((w*k,h*k),Image.NEAREST),(0,0))
c.paste(o.resize((w*k,h*k),Image.NEAREST),(w*k+6,0))
c.save(OUT+name)
