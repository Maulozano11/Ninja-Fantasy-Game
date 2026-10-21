from PIL import Image, ImageDraw
import numpy as np, sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=S+'/review-ui-icons-r3'; U=S+'/staging/ui_icons'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
boxes={'fireball_goukakyu':(33,276,234,482),'kirin_thunder':(285,276,486,482),'great_fire_annihilation':(537,276,738,482),'water_shield_suijinheki':(789,276,990,482)}
BG=(20,22,28)
for n,b in boxes.items():
    his=ref.crop(b)
    h44=his.resize((44,44),Image.BOX); h88=his.resize((88,88),Image.BOX)
    o44=Image.open(f'{U}/{n}.png').convert('RGBA'); o88=Image.open(f'{U}/{n}@2x.png').convert('RGBA')
    def flat(im):
        bg=Image.new('RGBA',im.size,BG+(255,)); bg.alpha_composite(im); return bg.convert('RGB')
    o44=flat(o44); o88=flat(o88)
    # 44 side by side x8
    W=44*8; c=Image.new('RGB',(W*2+16,W),BG)
    c.paste(h44.resize((W,W),Image.NEAREST),(0,0)); c.paste(o44.resize((W,W),Image.NEAREST),(W+16,0))
    c.save(f'{R}/{n}-44-hisbox-vs-ours-x8.png')
    # 88: his crop smooth at 352, ours x4
    W=352; c=Image.new('RGB',(W*2+16,W),BG)
    c.paste(his.resize((W,W),Image.LANCZOS),(0,0)); c.paste(o88.resize((W,W),Image.NEAREST),(W+16,0))
    c.save(f'{R}/{n}-88-his-vs-ours-x4.png')
    # alpha check
    a44=np.asarray(Image.open(f'{U}/{n}.png').convert('RGBA'))[...,3]; a88=np.asarray(Image.open(f'{U}/{n}@2x.png').convert('RGBA'))[...,3]
    print(n, Image.open(f'{U}/{n}.png').mode, 'alpha44 min/max', a44.min(), a44.max(), 'alpha88', a88.min(), a88.max(),
          'colors44', len(set(map(tuple,np.asarray(o44).reshape(-1,3)))), 'colors88', len(set(map(tuple,np.asarray(o88).reshape(-1,3)))))
