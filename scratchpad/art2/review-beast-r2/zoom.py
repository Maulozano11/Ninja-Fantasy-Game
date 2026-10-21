import sys
from PIL import Image
S=sys.argv[1]; R=sys.argv[2]
W,H=276,160
sh=Image.open(f'{S}/art2/staging/vfx_beasts/earth.png').convert('RGBA')
def ours(i):
    f=sh.crop((i*W,0,(i+1)*W,H)); b=Image.new('RGBA',(W,H),(34,34,44,255)); b.alpha_composite(f); return b.convert('RGB')
regs={'f5-belly':(5,(95,75,190,130)),'f5-clod':(5,(180,0,225,30)),'f5-pile':(5,(10,100,110,160)),'f5-eye':(5,(225,45,270,85)),'f0-eye':(0,(225,65,270,105)),'f0-belly':(0,(110,80,230,135))}
for nm,(i,b) in regs.items():
    h=Image.open(f'{R}/his-f{i}-game.png').crop(b); o=ours(i).crop(b)
    w=b[2]-b[0]; hh=b[3]-b[1]
    s=8 if w<60 else 6
    c=Image.new('RGB',(w*2+2,hh),(255,0,255)); c.paste(h,(0,0)); c.paste(o,(w+2,0))
    c.resize((c.width*s,c.height*s),Image.NEAREST).save(f'{R}/z-{nm}.png')
