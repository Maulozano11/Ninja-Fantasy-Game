import sys
from PIL import Image
import numpy as np
REF=sys.argv[1]; ICONS=sys.argv[2]
ref=Image.open(REF).convert('RGB')
def show(iid,x0,box):
    crop=ref.crop((x0+1,277,x0+200,481)).resize((88,88),Image.BOX)
    h=np.asarray(crop).astype(int); o=np.asarray(Image.open(f'{ICONS}/{iid}@2x.png').convert('RGB')).astype(int)
    x1,y1,x2,y2=box
    hm=h[y1:y2,x1:x2].reshape(-1,3); om=o[y1:y2,x1:x2].reshape(-1,3)
    print(iid,box,'his mean',hm.mean(0).round(),'ours mean',om.mean(0).round())
    # brightest 10%
    hl=hm.sum(1); ol=om.sum(1)
    print('   his top10%',hm[hl>=np.percentile(hl,90)].mean(0).round(),' ours top10%',om[ol>=np.percentile(ol,90)].mean(0).round())
show('water_shield_suijinheki',789,(28,30,50,62))  # inside curl
show('water_shield_suijinheki',789,(50,30,80,80))  # wave face right
show('water_shield_suijinheki',789,(0,0,20,20))  # bg TL
show('kirin_thunder',285,(36,40,56,60))  # mouth glow
show('kirin_thunder',285,(0,0,88,88))
show('kirin_thunder',285,(60,60,88,88)) # bg lower right
show('fireball_goukakyu',33,(0,0,10,10))
show('fireball_goukakyu',33,(36,36,52,52))
show('great_fire_annihilation',537,(40,20,70,40)) # smoke
