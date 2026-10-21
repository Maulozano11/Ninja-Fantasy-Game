import sys
from PIL import Image, ImageDraw
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/art2/REF-poison-set-owner.jpg').convert('RGB')
sh=Image.open(S+'/art2/staging/vfx_beasts_cobra/poison.png').convert('RGBA')
W,H=176,105; ax,ay=98,58
fr=[sh.crop((i*W,0,i*W+W,H)) for i in range(8)]
bgc=ref.getpixel((215,700))
print('his bg', bgc)
def his(cx,cy): return ref.crop((cx-ax,cy-ay,cx-ax+W,cy-ay+H))
L=his(304,745); Rr=his(477,745)
def over(f,c):
    b=Image.new('RGBA',(W,H),c+(255,)); b.alpha_composite(f); return b.convert('RGB')
def up(im,k=3): return im.resize((im.width*k,im.height*k),Image.NEAREST)
for name,h,f in [('f0',L,fr[0]),('f5',Rr,fr[5])]:
    o=over(f,bgc)
    out=Image.new('RGB',(W*3*2+6,H*3),(255,255,255))
    out.paste(up(h),(0,0)); out.paste(up(o),(W*3+6,0))
    out.save(R+'/r5-cmp-%s-x3.png'%name)
    # blink diff: abs diff
    from PIL import ImageChops
    d=ImageChops.difference(h,o)
    d=d.point(lambda v:min(255,v*2))
    up(d).save(R+'/r5-diff-%s-x3.png'%name)
# all frames on his bg, 4 per row, x3
rows=[]
for k in range(2):
    out=Image.new('RGB',(W*3*4+18,H*3),(255,255,255))
    for j in range(4):
        out.paste(up(over(fr[k*4+j],bgc)),(j*(W*3+6),0))
    out.save(R+'/r5-frames-%d-x3.png'%k)
L.save(R+'/r5-hisL-1x.png'); Rr.save(R+'/r5-hisR-1x.png')
