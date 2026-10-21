# usage: row.py out.png scale  path:w:h:i  path:w:h:i ...   (frames from strips with 2px gaps)
import sys
from PIL import Image
out, k = sys.argv[1], int(sys.argv[2])
items=[]
for a in sys.argv[3:]:
    p,w,h,i=a.split(':'); w,h,i=int(w),int(h),int(i)
    im=Image.open(p).convert('RGBA'); items.append(im.crop((i*(w+2),0,i*(w+2)+w,h)))
W=sum(i.width for i in items)+20*len(items); H=max(i.height for i in items)
o=Image.new('RGBA',(W,H),(93,107,87,255)); x=0
for im in items: o.alpha_composite(im,(x,H-im.height)); x+=im.width+20
o.resize((W*k,H*k),Image.NEAREST).save(out)
