from PIL import Image
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
W=176
s=Image.new('RGB',(4*(W+8)+8,3*(W+8)+8),(16,17,22))
for i,n in enumerate(ids):
    his=Image.open('his_'+n+'.png')
    s.paste(his.resize((W,W),Image.LANCZOS),(8+i*(W+8),8))
    s.paste(Image.open(D+n+'@2x.png').convert('RGB').resize((W,W),Image.NEAREST),(8+i*(W+8),8+W+8))
    s.paste(Image.open(D+n+'.png').convert('RGB').resize((W,W),Image.NEAREST),(8+i*(W+8),8+2*(W+8)))
s.save(R+'all-his-our88-our44-at176.png')
