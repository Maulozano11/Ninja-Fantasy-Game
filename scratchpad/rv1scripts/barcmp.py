import sys
from PIL import Image
REF=sys.argv[1]; ICONS=sys.argv[2]; OUT=sys.argv[3]
ref=Image.open(REF).convert('RGB')
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
xs=[33,285,537,789]
fr=Image.open(f'{ICONS}/skill_slot_steel.png').convert('RGBA')
bar=Image.new('RGBA',(4*60+8,64*2+4),(12,13,18,255))
for i,iid in enumerate(ids):
    x=4+i*60
    his=ref.crop((xs[i]+1,277,xs[i]+200,481)).resize((44,44),Image.BOX).convert('RGBA')
    bar.alpha_composite(his,(x+6,4+6)); bar.alpha_composite(fr,(x,4))
    o=Image.open(f'{ICONS}/{iid}.png').convert('RGBA')
    bar.alpha_composite(o,(x+6,68+6)); bar.alpha_composite(fr,(x,68))
bar.save(f'{OUT}/bar-his-box44-top-ours-bottom-1x.png')
bar.resize((bar.width*4,bar.height*4),Image.NEAREST).save(f'{OUT}/bar-his-box44-top-ours-bottom-x4.png')
# his whole slot row scaled so slot = 56
row=ref.crop((14,256,1010,501))
s=56/240
row.resize((round(row.width*s),round(row.height*s)),Image.LANCZOS).save(f'{OUT}/his-row-at-56.png')
r2=row.resize((round(row.width*s),round(row.height*s)),Image.LANCZOS)
r2.resize((r2.width*4,r2.height*4),Image.NEAREST).save(f'{OUT}/his-row-at-56-x4.png')
