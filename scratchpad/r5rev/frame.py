from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
O=S+'/review-ui-icons-r5'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
# his slot 1 (fireball) and 4 water corner tl at native, x8
his=ref.crop((14,256,254,501))
tl=his.crop((0,0,48,48)).resize((48*8,48*8),Image.NEAREST)
br=his.crop((240-48,245-48,240,245)).resize((48*8,48*8),Image.NEAREST)
fr=Image.open(f'{S}/staging/ui_icons/skill_slot_steel.png').convert('RGBA')
fa=Image.open(f'{S}/staging/ui_icons/skill_slot_steel_active.png').convert('RGBA')
def onbg(im,c=(16,17,22)):
    b=Image.new('RGBA',im.size,c+(255,)); b.alpha_composite(im); return b.convert('RGB')
Z=10
W=Image.new('RGB',(48*8*2+56*Z*2+50,max(48*8*2+10,56*Z)+20),(16,17,22))
W.paste(tl,(10,10)); W.paste(br,(10,48*8+20))
W.paste(onbg(fr).resize((56*Z,56*Z),Image.NEAREST),(48*8+20,10))
W.paste(onbg(fa).resize((56*Z,56*Z),Image.NEAREST),(48*8+30+56*Z,10))
W.save(f'{O}/frame-his-corners-x8-ours-x10.png')
# his slot reduced to 56 box vs ours
h56=his.resize((56,56),Image.BOX)
W=Image.new('RGB',(56*8*2+30,56*8+20),(16,17,22))
W.paste(h56.resize((448,448),Image.NEAREST),(10,10)); W.paste(onbg(fr).resize((448,448),Image.NEAREST),(468,10))
W.save(f'{O}/frame-hisbox56-vs-ours-x8.png')
a=np.asarray(fr)
print('alpha uniq', np.unique(a[...,3]))
print('window alpha sum', a[6:50,6:50,3].astype(int).sum(), 'nonzero', (a[6:50,6:50,3]>0).sum())
cols=set(map(tuple,a[a[...,3]>0][:, :4].tolist())); print('colours',len(cols))
for c in sorted(cols): print('#%02x%02x%02x a%d'%c)
