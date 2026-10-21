import sys
from PIL import Image
S=sys.argv[1]; R=sys.argv[2]; box=tuple(map(int,sys.argv[3].split(','))); Z=int(sys.argv[4]); name=sys.argv[5]
order=[int(c) for c in (sys.argv[6] if len(sys.argv)>6 else '01234567')]
sh=Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
FW,FH=127,93
w=box[2]-box[0]; h=box[3]-box[1]
cols=4 if len(order)>4 else len(order)
rows=(len(order)+cols-1)//cols
out=Image.new('RGB',(cols*(w*Z+4)+4, rows*(h*Z+4)+4),(90,90,90))
for k,i in enumerate(order):
    f=sh.crop((i*FW,0,(i+1)*FW,FH)); b=Image.new('RGBA',f.size,(32,31,39,255)); b.alpha_composite(f)
    c=b.convert('RGB').crop(box).resize((w*Z,h*Z),Image.NEAREST)
    out.paste(c,(4+(k%cols)*(w*Z+4),4+(k//cols)*(h*Z+4)))
out.save(R+'/'+name+'.png')
