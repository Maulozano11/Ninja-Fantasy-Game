from PIL import Image, ImageDraw
import numpy as np, os
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
O=S+'/review-ui-icons-r5'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
xs=[33,285,537,789]
BG=(16,17,22)
for i,k in enumerate(ids):
    his=ref.crop((xs[i],276,xs[i]+201,482))
    h88=his.resize((88,88),Image.LANCZOS)
    h44=his.resize((44,44),Image.BOX)
    o88=Image.open(f'{S}/staging/ui_icons/{k}@2x.png').convert('RGBA')
    o44=Image.open(f'{S}/staging/ui_icons/{k}.png').convert('RGBA')
    def onbg(im):
        b=Image.new('RGBA',im.size,BG+(255,)); b.alpha_composite(im); return b.convert('RGB')
    o88=onbg(o88); o44=onbg(o44)
    # sheet: his 88 x6, ours 88 x6
    Z=6
    W=Image.new('RGB',(88*Z*2+30,88*Z+20),BG)
    W.paste(h88.resize((88*Z,88*Z),Image.NEAREST),(10,10)); W.paste(o88.resize((88*Z,88*Z),Image.NEAREST),(88*Z+20,10))
    W.save(f'{O}/{k}-his88-vs-our88-x6.png')
    Z=12
    W=Image.new('RGB',(44*Z*2+30,44*Z+20),BG)
    W.paste(h44.resize((44*Z,44*Z),Image.NEAREST),(10,10)); W.paste(o44.resize((44*Z,44*Z),Image.NEAREST),(44*Z+20,10))
    W.save(f'{O}/{k}-hisbox44-vs-our44-x12.png')
    W=Image.new('RGB',(201*2+44*4+88*2+60, 206*2+20),BG)
    W.paste(his.resize((402,412),Image.LANCZOS),(10,10)); W.paste(o88.resize((176,176),Image.NEAREST),(422,10)); W.paste(o44.resize((176,176),Image.NEAREST),(608,10))
    W.paste(o44,(608,200)); W.paste(o88,(660,200))
    W.save(f'{O}/{k}-overview.png')
