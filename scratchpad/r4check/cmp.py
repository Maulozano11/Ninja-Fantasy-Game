# usage: cmp.py out.png x0 y0 x1 y1 zoom  (1600x900 coords) -> his (resampled) over ours, at 1x and zoomed
import sys
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
mock=Image.open(sys.argv[7] if len(sys.argv)>7 else A+'/ui-battle-mockup.png').convert('RGB')
out=sys.argv[1]; x0,y0,x1,y1,z=map(int,sys.argv[2:7])
s=1600/1024
his=ref.crop((x0/s,y0/s,x1/s,y1/s)).resize((x1-x0,y1-y0),Image.LANCZOS)
ours=mock.crop((x0,y0,x1,y1))
w,h=x1-x0,y1-y0
W=w*z; H=h*z
im=Image.new('RGB',(max(W, w*2+8), h+8+H*2+8),(255,0,255))
im.paste(his,(0,0)); im.paste(ours,(w+8,0))
im.paste(his.resize((W,H),Image.NEAREST),(0,h+8))
im.paste(ours.resize((W,H),Image.NEAREST),(0,h+8+H+8))
im.save(out)
