import sys
from PIL import Image
R=sys.argv[1]; names=sys.argv[2].split(','); sc=int(sys.argv[3])
for n in names:
    h=Image.open(R+'/his_'+n+'_1x.png').convert('RGB'); o=Image.open(R+'/ours_'+n+'_1x.png').convert('RGB')
    can=Image.new('RGB',(h.width*2+2,h.height),(255,0,255)); can.paste(h,(0,0)); can.paste(o,(h.width+2,0))
    can.resize((can.width*sc,can.height*sc),Image.NEAREST).save(R+'/z_'+n+'.png')
