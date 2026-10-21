import sys
from PIL import Image, ImageDraw
S=sys.argv[1]
his=Image.open('his-game-127x93.png').convert('RGB')
sh=Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
W,H=127,93
bg=(32,31,39)
def fr(f):
    b=Image.new('RGBA',(W,H),bg+(255,)); b.alpha_composite(sh.crop((f*W,0,(f+1)*W,H))); return b.convert('RGB')
f0=fr(0)
regions={'head':(85,10,127,60),'wings':(0,0,80,50),'body':(30,30,100,80),'legs':(70,45,127,93),'tail':(0,40,60,93)}
for n,b in regions.items():
    k=7
    w,h=b[2]-b[0],b[3]-b[1]
    out=Image.new('RGB',(w*k*2+10,h*k+18),(0,0,0))
    out.paste(his.crop(b).resize((w*k,h*k),Image.NEAREST),(0,18))
    out.paste(f0.crop(b).resize((w*k,h*k),Image.NEAREST),(w*k+10,18))
    d=ImageDraw.Draw(out); d.text((3,3),'HIS '+n,fill=(255,255,255)); d.text((w*k+13,3),'OURS f0',fill=(255,255,255))
    out.save('zoom-%s-x7.png'%n)
