import sys
from PIL import Image
ICONS=sys.argv[1]; OUT=sys.argv[2]
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
bg=(15,17,22,255)
for iid in ids:
    o=Image.open(f'{ICONS}/{iid}.png').convert('RGBA')
    b=Image.new('RGBA',o.size,bg); b.alpha_composite(o)
    b.resize((44*10,44*10),Image.NEAREST).save(f'{OUT}/{iid}-44-x10.png')
# 1x on bar with frame, plus 2x and 3x nearest of that bar
fr=Image.open(f'{ICONS}/skill_slot_steel.png').convert('RGBA')
fa=Image.open(f'{ICONS}/skill_slot_steel_active.png').convert('RGBA')
bar=Image.new('RGBA',(4*60+8+60,64),(12,13,18,255))
for i,iid in enumerate(ids+['fireball_goukakyu']):
    o=Image.open(f'{ICONS}/{iid}.png').convert('RGBA')
    x=4+i*60
    bar.alpha_composite(o,(x+6,4+6))
    bar.alpha_composite(fa if i==4 else fr,(x,4))
bar.save(f'{OUT}/bar-1x.png')
bar.resize((bar.width*3,bar.height*3),Image.NEAREST).save(f'{OUT}/bar-x3.png')
fr.resize((56*10,56*10),Image.NEAREST).save(f'{OUT}/frame-x10.png')
fa.resize((56*10,56*10),Image.NEAREST).save(f'{OUT}/frame-active-x10.png')
print(fr.getpixel((28,28)), fr.getpixel((6,6)), fr.getpixel((5,5)))
