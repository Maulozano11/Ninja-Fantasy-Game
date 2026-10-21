import sys
from PIL import Image, ImageDraw
R=sys.argv[1]; name=sys.argv[2]; box=tuple(int(v) for v in sys.argv[3].split(',')); Z=int(sys.argv[4]); cols=int(sys.argv[5]) if len(sys.argv)>5 else 4
bg=(33,31,45)
fr=[Image.open(R+'/f%d.png'%i) for i in range(8)]
w=box[2]-box[0]; h=box[3]-box[1]
rows=(8+cols-1)//cols
out=Image.new('RGB',(cols*(w*Z+8),rows*(h*Z+18)),(255,255,255))
d=ImageDraw.Draw(out)
for i,f in enumerate(fr):
    b=Image.new('RGBA',f.size,bg+(255,)); b.alpha_composite(f)
    c=b.convert('RGB').crop(box).resize((w*Z,h*Z),Image.NEAREST)
    x=(i%cols)*(w*Z+8); y=(i//cols)*(h*Z+18)
    out.paste(c,(x,y+16)); d.text((x+2,y+2),'f%d'%i,fill=(0,0,0))
out.save(R+'/g-%s.png'%name)
