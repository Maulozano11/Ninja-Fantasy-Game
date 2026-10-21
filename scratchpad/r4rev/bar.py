from PIL import Image, ImageDraw
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
fr=Image.open(D+'skill_slot_steel.png').convert('RGBA'); fa=Image.open(D+'skill_slot_steel_active.png').convert('RGBA')
# his row: slots 18..250 x, 261..498 y; scale factor so his window(202)->44 => 0.2178
sc=44/202
hisrow=ref.crop((0,240,1024,520)); hisrow=hisrow.resize((round(1024*sc),round(280*sc)),Image.BOX)
bar=Image.new('RGBA',(300,150),(17,19,24,255))
bar.paste(hisrow.crop((0,0,hisrow.width,hisrow.height)),(0,0))
y=75
for i,n in enumerate(ids):
    ic=Image.open(D+n+'.png').convert('RGBA')
    x=6+i*62
    slot=Image.new('RGBA',(56,56),(15,17,22,255)); slot.alpha_composite(ic,(6,6)); slot.alpha_composite(fa if i==0 and False else fr)
    bar.alpha_composite(slot,(x,y))
bar.save(R+'bar-his-top-ours-bottom-1x.png')
for k in (2,3,4): bar.resize((300*k,150*k),Image.NEAREST).save(R+'bar-his-top-ours-bottom-x%d.png'%k)
