from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
O=S+'/review-ui-icons-r5'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
his=ref.crop((285,276,486,482))
o44=Image.open(f'{S}/staging/ui_icons/kirin_thunder.png').convert('RGB')
Z=20
# head region x 18..44, y 6..36 at 44 scale
x0,y0,x1,y1=18,4,44,36
w=(x1-x0)*Z; h=(y1-y0)*Z
hisr=his.resize((44*Z,int(44*Z*206/201)),Image.LANCZOS).resize((44*Z,44*Z),Image.LANCZOS).crop((x0*Z,y0*Z,x1*Z,y1*Z))
our=o44.resize((44*Z,44*Z),Image.NEAREST).crop((x0*Z,y0*Z,x1*Z,y1*Z))
W=Image.new('RGB',(w*2+30,h+20),(16,17,22))
W.paste(hisr,(10,10)); W.paste(our,(w+20,10))
d=ImageDraw.Draw(W)
for X in range(x0,x1+1):
    for off in (10,w+20):
        d.line([(off+(X-x0)*Z,10),(off+(X-x0)*Z,10+h)],fill=(60,60,60) if X%5 else (200,80,80))
for Y in range(y0,y1+1):
    for off in (10,w+20):
        d.line([(off,10+(Y-y0)*Z),(off+w,10+(Y-y0)*Z)],fill=(60,60,60) if Y%5 else (200,80,80))
W.save(f'{O}/kirin44-head-his-vs-ours-x20-grid.png')
