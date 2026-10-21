import sys
from PIL import Image
REF=sys.argv[1]; ICONS=sys.argv[2]; OUT=sys.argv[3]
ref=Image.open(REF).convert('RGB')
crop=ref.crop((286,277,485,481))  # 199x204
# head region in his crop approx x 70..199, y 50..170
hb=(70,40,199,170)
his=crop.crop(hb).resize(((hb[2]-hb[0])*4,(hb[3]-hb[1])*4),Image.LANCZOS)
o88=Image.open(f'{ICONS}/kirin_thunder@2x.png').convert('RGB')
sx=88/199; sy=88/204
ob=(round(hb[0]*sx),round(hb[1]*sy),round(hb[2]*sx),round(hb[3]*sy))
our=o88.crop(ob); Z=his.width//our.width
our=our.resize((our.width*Z,our.height*Z),Image.NEAREST)
o44=Image.open(f'{ICONS}/kirin_thunder.png').convert('RGB')
ob4=(round(hb[0]*sx/2),round(hb[1]*sy/2),round(hb[2]*sx/2),round(hb[3]*sy/2))
o4=o44.crop(ob4); o4=o4.resize((o4.width*Z*2,o4.height*Z*2),Image.NEAREST)
W=his.width+our.width+o4.width+24
s=Image.new('RGB',(W,max(his.height,our.height,o4.height)),(15,17,22))
s.paste(his,(0,0)); s.paste(our,(his.width+12,0)); s.paste(o4,(his.width+our.width+24,0))
s.save(f'{OUT}/kirin-head-his-our88-our44.png'); print(s.size)
