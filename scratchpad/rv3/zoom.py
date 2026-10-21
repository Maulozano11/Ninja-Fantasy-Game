from PIL import Image
import numpy as np, sys
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
O=R+'review-poison-beast-r2/'
ref=Image.open(R+'REF-poison-set-owner.jpg').convert('RGB')
sheet=Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')
FW,FH=176,105; AX,AY=98,58; bg=(32,34,46)
def frame(i):
    f=Image.new('RGBA',(FW,FH),bg+(255,)); f.alpha_composite(sheet.crop((i*FW,0,(i+1)*FW,FH))); return f.convert('RGB')
name=sys.argv[1]; box=tuple(int(v) for v in sys.argv[2].split(',')); s=int(sys.argv[3])
fr=[int(v) for v in sys.argv[4].split(',')]
show_his = len(sys.argv)<6 or sys.argv[5]!='nohis'
tiles=[]
for fi in fr:
    if show_his and fi in (0,5):
        hx,hy=(304,745) if fi==0 else (477,745)
        his=ref.crop((hx-AX,hy-AY,hx-AX+FW,hy-AY+FH)).crop(box); tiles.append(his)
    tiles.append(frame(fi).crop(box))
w=box[2]-box[0]; h=box[3]-box[1]
out=Image.new('RGB',((w*s+6)*len(tiles),h*s),(255,255,255))
for k,t in enumerate(tiles): out.paste(t.resize((w*s,h*s),Image.NEAREST),(k*(w*s+6),0))
out.save(O+name)
print(out.size)
