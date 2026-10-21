import sys
from PIL import Image
d, names, out = sys.argv[1], sys.argv[2].split(','), sys.argv[3]
ims=[Image.open(f'{d}/f-{n}-green.png') for n in names]
o=Image.new('RGB',(sum(i.width for i in ims)+8*(len(ims)-1),ims[0].height),(0,0,0))
x=0
for i in ims: o.paste(i,(x,0)); x+=i.width+8
o.save(out)
