from PIL import Image, ImageDraw
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
xs=[33,285,537,789]
for i,n in enumerate(ids):
    his=ref.crop((xs[i],276,xs[i]+202,482))
    his.save('his_'+n+'.png')
    h88=his.resize((88,88),Image.BOX); h44=his.resize((44,44),Image.BOX)
    o88=Image.open(D+n+'@2x.png').convert('RGBA'); o44=Image.open(D+n+'.png').convert('RGBA')
    print(n, o88.size, o44.size, o88.mode, np.unique(np.asarray(o88)[...,3]), np.unique(np.asarray(o44)[...,3]))
    # sheet: his crop at 352 (lanczos), ours 88 x4, ours44 x8, his box44 x8
    W=352; sheet=Image.new('RGB',(W*4+50,W+30),(16,17,22))
    sheet.paste(his.resize((W,W),Image.LANCZOS),(10,20))
    sheet.paste(o88.resize((W,W),Image.NEAREST).convert('RGB'),(10+W+10,20))
    sheet.paste(o44.resize((W,W),Image.NEAREST).convert('RGB'),(10+2*(W+10),20))
    sheet.paste(h44.resize((W,W),Image.NEAREST),(10+3*(W+10),20))
    d=ImageDraw.Draw(sheet)
    for k,t in enumerate(['his crop','ours 88 x4','ours 44 x8','his box44 x8']): d.text((10+k*(W+10),4),t,fill=(220,220,220))
    sheet.save(R+n+'-cmp.png')
