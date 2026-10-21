# side.py id N x0 y0 x1 y1 Z out: his crop (bicubic) and ours (nearest) side by side on the region (N coords)
import sys
from PIL import Image
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r4-work'
jid,N,x0,y0,x1,y1,Z,out=sys.argv[1],*map(int,sys.argv[2:8]),sys.argv[8]
his=Image.open(f'{W}/stage/ref/{jid}.png').convert('RGB'); w,h=his.size
t=his.crop((1,1,w-1,h-1)).resize((N*Z,N*Z),Image.BICUBIC).crop((x0*Z,y0*Z,x1*Z,y1*Z))
o=Image.open(f'{W}/stage/{jid}{"@2x" if N==88 else ""}.png').convert('RGB').resize((N*Z,N*Z),Image.NEAREST).crop((x0*Z,y0*Z,x1*Z,y1*Z))
c=Image.new('RGB',(t.width*2+10,t.height),(0,0,0)); c.paste(t,(0,0)); c.paste(o,(t.width+10,0)); c.save(out)
