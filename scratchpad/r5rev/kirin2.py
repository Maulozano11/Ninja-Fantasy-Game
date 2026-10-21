from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
O=S+'/review-ui-icons-r5'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
his=ref.crop((285,276,486,482))
o44=np.asarray(Image.open(f'{S}/staging/ui_icons/kirin_thunder.png').convert('RGB'))
Z=20
big=his.resize((44*Z,44*Z),Image.LANCZOS)
d=ImageDraw.Draw(big)
navy={(0x1a,0x23,0x51),(0x1a,0x32,0x69),(0x18,0x16,0x39)}
white={(0xfe,0xff,0xff),(0xd3,0xfb,0xfb)}
for y in range(44):
    for x in range(44):
        c=tuple(o44[y,x])
        if c in navy and 18<=x and y<=34 and x>=20:
            d.rectangle([x*Z+6,y*Z+6,x*Z+Z-6,y*Z+Z-6],outline=(255,40,40),width=2)
        if c in white and x>=20 and y<=34:
            d.rectangle([x*Z+7,y*Z+7,x*Z+Z-7,y*Z+Z-7],outline=(255,255,0),width=2)
big=big.crop((16*Z,2*Z,44*Z,36*Z))
big.save(f'{O}/kirin44-our-navy(red)-white(yellow)-over-his.png')
