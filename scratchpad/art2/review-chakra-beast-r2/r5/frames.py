import sys
from PIL import Image, ImageDraw
S=sys.argv[1]
sh=Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
W,H=127,93
def fr(f,bg):
    b=Image.new('RGBA',(W,H),bg+(255,)); b.alpha_composite(sh.crop((f*W,0,(f+1)*W,H))); return b.convert('RGB')
k=4
for name,bg in [('dark',(32,31,39)),('grass',(74,110,52))]:
    for half in (0,1):
        out=Image.new('RGB',(W*k*2+10,(H*k+16)*2+10),(0,0,0))
        for i in range(4):
            f=half*4+i
            x=(i%2)*(W*k+10); y=(i//2)*(H*k+26)
            out.paste(fr(f,bg).resize((W*k,H*k),Image.NEAREST),(x,y+16))
            d=ImageDraw.Draw(out); d.text((x+3,y+2),'f%d'%f,fill=(255,255,255))
            # anchor
            ax,ay=76,59
            d.rectangle((x+ax*k,y+16+ay*k,x+ax*k+k-1,y+16+ay*k+k-1),outline=(255,0,255))
        out.save('frames%d-%d-%s-x4.png'%(half*4,half*4+3,name))
