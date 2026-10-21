import sys
from PIL import Image, ImageDraw, ImageFont
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref'
R=D+'/v3/review/raw'
G=256; BG=(38,42,58)
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
HIS0=Image.open(f'{D}/owner-camp-poses.webp').convert('RGB')
PAD=60
HIS=Image.new('RGB',(HIS0.width+2*PAD,HIS0.height+2*PAD),(38,43,57)); HIS.paste(HIS0,(PAD,PAD))
P,U,V=2.1482,66.37,17.10
def load(name,crop,s):
    im=Image.frombytes('RGBA',(G,G),open(f'{R}/{name}.rgba','rb').read())
    bg=Image.new('RGBA',(G,G),BG+(255,)); bg.alpha_composite(im)
    c=bg.convert('RGB').crop(crop); return c.resize((c.width*s,c.height*s),Image.NEAREST)
def his(crop,s,dy=1):
    x0,y0,x1,y1=crop
    box=(PAD+U+(x0-81)*P,PAD+V+(y0-dy-129)*P,PAD+U+(x1-81)*P,PAD+V+(y1-dy-129)*P)
    return HIS.resize((round((x1-x0)*s),round((y1-y0)*s)),Image.NEAREST,box=box)
def grid(im,s):
    d=ImageDraw.Draw(im)
    for x in range(0,im.width,s): d.line([(x,0),(x,im.height)],fill=(0,0,0),width=1)
    for y in range(0,im.height,s): d.line([(0,y),(im.width,y)],fill=(0,0,0),width=1)
    return im
