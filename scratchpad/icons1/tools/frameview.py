from PIL import Image
S='../art2/staging/ui_icons'
f=Image.open(S+'/skill_slot_steel.png'); a=Image.open(S+'/skill_slot_steel_active.png')
his=Image.open(S+'/ref/slot_fireball_goukakyu.png').convert('RGB')
# his slot outer box inside the crop: crop origin (14,256); outer black line at x=16..250, y=259..498
h56=his.crop((2,3,237,243)).resize((56,56),Image.LANCZOS)
o=Image.new('RGB',(56*8*3+40,56*8*2+30),(20,22,28))
o.paste(h56.resize((448,448),Image.NEAREST),(10,10))
for i,fr in enumerate([f,a]):
  c=fr.resize((448,448),Image.NEAREST); o.paste(c,(468+i*458,10),c)
# corners at 16x
o.paste(h56.crop((0,0,18,18)).resize((288,288),Image.NEAREST),(10,468))
c=f.crop((0,0,18,18)).resize((288,288),Image.NEAREST); o.paste(c,(310,468),c)
c=f.crop((38,38,56,56)).resize((288,288),Image.NEAREST); o.paste(c,(610,468),c)
o.paste(h56.crop((38,38,56,56)).resize((288,288),Image.NEAREST),(910,468))
o.save('iter/frame-v2.png')
