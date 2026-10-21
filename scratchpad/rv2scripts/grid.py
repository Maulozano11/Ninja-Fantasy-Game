import sys
import numpy as np
from PIL import Image, ImageDraw
ST='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons'
OUT='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r2'
im=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
lefts={'fireball_goukakyu':33,'kirin_thunder':285,'great_fire_annihilation':537,'water_shield_suijinheki':789}
jid=sys.argv[1]; Z=int(sys.argv[2]) if len(sys.argv)>2 else 14
his=im.crop((lefts[jid],276,lefts[jid]+201,482))
h=his.resize((44*Z,44*Z),Image.LANCZOS)
o=Image.open(f'{ST}/{jid}.png').convert('RGB').resize((44*Z,44*Z),Image.NEAREST)
s=Image.new('RGB',(44*Z*2+30,44*Z+30),(20,22,28)); s.paste(h,(25,25)); s.paste(o,(44*Z+30+25-25,25))
d=ImageDraw.Draw(s)
for base in (25,44*Z+30):
  for k in range(0,45,4):
    c=(255,255,255) if k%8==0 else (120,120,120)
    d.line([(base+k*Z,25),(base+k*Z,25+44*Z)],fill=c+(0,),width=1)
    d.line([(base,25+k*Z),(base+44*Z,25+k*Z)],fill=c,width=1)
    d.text((base+k*Z+2,5),str(k),fill=(255,255,0))
    d.text((base-22 if base==25 else base+44*Z-20, 25+k*Z+2),str(k),fill=(255,255,0))
s.save(f'{OUT}/{jid}-grid-his-vs-our44.png')
