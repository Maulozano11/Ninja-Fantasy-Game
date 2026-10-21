# usage: ptile.py dir out.png scale name1 name2 ...  (from plants-<name>-zoom.png at 6x)
import sys
from PIL import Image
d, out, k = sys.argv[1], sys.argv[2], int(sys.argv[3])
ims=[]
for n in sys.argv[4:]:
    im=Image.open(f'{d}/plants-{n}-zoom.png').convert('RGBA')
    f=6//k
    ims.append(im.resize((im.width//f, im.height//f), Image.NEAREST))
W=sum(i.width for i in ims)+10*len(ims); H=max(i.height for i in ims)
o=Image.new('RGBA',(W,H),(93,107,87,255)); x=0
for im in ims: o.alpha_composite(im,(x,H-im.height)); x+=im.width+10
o.save(out); print(o.size)
