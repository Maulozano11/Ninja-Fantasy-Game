import sys
from PIL import Image
R=sys.argv[1]; n=sys.argv[2]; sc=int(sys.argv[3]); box=tuple(int(v) for v in sys.argv[4].split(',')) if len(sys.argv)>4 else None
h=Image.open(R+'/his_'+n+'_1x.png').convert('RGB'); o=Image.open(R+'/ours_'+n+'_1x.png').convert('RGB')
if box: h=h.crop(box); o=o.crop(box)
tag=sys.argv[5] if len(sys.argv)>5 else ''
if h.width>=h.height:
    can=Image.new('RGB',(h.width,h.height*2+2),(255,0,255)); can.paste(h,(0,0)); can.paste(o,(0,h.height+2))
else:
    can=Image.new('RGB',(h.width*2+2,h.height),(255,0,255)); can.paste(h,(0,0)); can.paste(o,(h.width+2,0))
can.resize((can.width*sc,can.height*sc),Image.NEAREST).save(R+'/zv_'+n+tag+'.png')
