from PIL import Image
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
bar=Image.new('RGB',(4*56+5*8,2*56+3*8),(20,22,28))
for i,id in enumerate(ids):
    his=Image.open('out/ref/%s.png'%id).convert('RGB'); w,h=his.size
    hb=his.crop((1,1,w-1,h-1)).resize((44,44),Image.BOX)
    o=Image.open('dbg/%s-44.png'%id).convert('RGB')
    fr=Image.open('out/skill_slot_steel.png').convert('RGBA') if False else None
    x=8+i*64
    bar.paste(hb,(x+6,8+6)); bar.paste(o,(x+6,8+56+8+6))
bar.resize((bar.width*4,bar.height*4),Image.NEAREST).save('bar-x4.png'); bar.save('bar-1x.png')
