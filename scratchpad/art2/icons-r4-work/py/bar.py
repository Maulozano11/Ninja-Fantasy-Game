# bar.py <work>: his box44 (top) and ours (bottom) in our slot frame on the dark bar, 1x and x3
import sys
from PIL import Image
W=sys.argv[1]
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
fr=Image.open(f'{W}/stage/skill_slot_steel.png').convert('RGBA')
bar=Image.new('RGBA',(4*56+5*8,2*56+3*8),(20,22,28,255))
for i,j in enumerate(ids):
    his=Image.open(f'{W}/stage/ref/{j}.png').convert('RGB'); w,h=his.size
    hb=his.crop((1,1,w-1,h-1)).resize((44,44),Image.BOX)
    o=Image.open(f'{W}/stage/{j}.png').convert('RGBA')
    x=8+i*64
    for y,img in ((8,hb),(72,o)):
        bar.paste(img.convert('RGBA'),(x+6,y+6)); bar.alpha_composite(fr,(x,y))
bar.save(f'{W}/bar-1x.png'); bar.resize((bar.width*3,bar.height*3),Image.NEAREST).save(f'{W}/bar-x3.png')
