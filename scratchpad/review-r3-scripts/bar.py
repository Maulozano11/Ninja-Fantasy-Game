from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=S+'/review-ui-icons-r3'; U=S+'/staging/ui_icons'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGBA')
names=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
slots=[(14,256,254,501),(266,506-0,506,501)]
slots=[(14,256,254,501),(266,256,506,501),(518,256,758,501),(770,256,1010,501)]
frame=Image.open(U+'/skill_slot_steel.png').convert('RGBA')
act=Image.open(U+'/skill_slot_steel_active.png').convert('RGBA')
W=4*64+16; H=2*64+16
bar=Image.new('RGBA',(W,H),(18,20,26,255))
for i,n in enumerate(names):
    his=ref.crop(slots[i]).resize((56,56),Image.BOX)
    bar.paste(his,(8+i*64,8))
    ic=Image.open(f'{U}/{n}.png').convert('RGBA')
    t=Image.new('RGBA',(56,56),(0,0,0,0)); t.paste(ic,(6,6)); t.alpha_composite(act if i==0 else frame)
    bar.alpha_composite(t,(8+i*64,8+64))
bar.save(R+'/bar-his-top-ours-bottom-1x.png')
for k in (2,3,4):
    bar.resize((W*k,H*k),Image.NEAREST).save(R+f'/bar-his-top-ours-bottom-x{k}.png')
