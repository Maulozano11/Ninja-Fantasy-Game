from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
O=S+'/review-ui-icons-r5'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
his=ref.crop((285,276,486,482)).resize((88*10,88*10),Image.LANCZOS)
o=Image.open(f'{S}/staging/ui_icons/kirin_thunder@2x.png').convert('RGB').resize((880,880),Image.NEAREST)
box=(40*10,8*10,88*10,72*10)
a=his.crop(box); b=o.crop(box)
W=Image.new('RGB',(a.width*2+30,a.height+20),(16,17,22)); W.paste(a,(10,10)); W.paste(b,(a.width+20,10)); W.save(f'{O}/kirin88-head-his-vs-ours-x10.png')
# GFA 44 & water 44 & fireball at 1x and 3x on dark bar, isolated
